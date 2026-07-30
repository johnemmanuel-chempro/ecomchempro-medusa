import { Container, Heading, Text, Button, Input, Label, FocusModal } from "@medusajs/ui"
import { adminFetch } from "../../lib/sdk"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Folder, Trash2, Pencil, FolderOpen, FolderPlus, Eye, Info, Copy, ClipboardPaste, Scissors, Upload, ChevronRight, ChevronDown, Check, Link } from "lucide-react"
import * as ContextMenu from "@radix-ui/react-context-menu"

// mode: "page" = full File Manager page
// mode: "picker" = used inside a modal to pick one image
// onSelectFile(file) = called in picker mode when user selects an image
export default function FileManager({ mode = "page", onSelectFile }) {
    const isPicker = mode === "picker"
    // current folder we are looking at (null = root)
    const [currentFolderId, setCurrentFolderId] = useState(null)
    const [folderPath, setFolderPath] = useState([]) // breadcrumb [{ id, name }]

    const [folders, setFolders] = useState([])
    const [files, setFiles] = useState([])

    // all folders for the left sidebar tree
    const [allFolders, setAllFolders] = useState([])
    // which folder ids are expanded in the sidebar: { [id]: true }
    const [expandedIds, setExpandedIds] = useState({})

    // create folder form
    const [createFolderOpen, setCreateFolderOpen] = useState(false)
    const [folderName, setFolderName] = useState("")

    // upload form (can select many images)
    const [uploadOpen, setUploadOpen] = useState(false)
    const [selectedFiles, setSelectedFiles] = useState([])

    // rename panel: { type: "folder" | "file", id, name }
    const [renameTarget, setRenameTarget] = useState(null)
    const [renameValue, setRenameValue] = useState("")

    // details / view panels
    const [detailsFolder, setDetailsFolder] = useState(null)
    const [viewFile, setViewFile] = useState(null)

    // multi-select: [{ type: "folder" | "file", id, name }]
    // Ctrl/Cmd + click to add/remove from selection
    const [selectedItems, setSelectedItems] = useState([])

    // clipboard: { mode: "copy" | "cut", items: [{ type, id, name }] }
    const [clipboard, setClipboard] = useState(null)

    const showToast = (message, type) => {
        toast[type](message, {
            position: "top-right",
        })
    }

    // convert bytes → readable size (KB / MB)
    const formatFileSize = (bytes) => {
        if (bytes === null || bytes === undefined) {
            return ""
        }

        const mb = bytes / (1024 * 1024)
        if (mb >= 1) {
            return `${mb.toFixed(2)} MB`
        }

        const kb = bytes / 1024
        if (kb >= 1) {
            return `${kb.toFixed(1)} KB`
        }

        return `${bytes} B`
    }

    // clear selection when you open another folder
    useEffect(() => {
        setSelectedItems([])
    }, [currentFolderId])

    // Esc clears selection
    useEffect(() => {
        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                setSelectedItems([])
            }
        }
        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [])

    const isItemSelected = (type, id) => {
        return selectedItems.some((item) => item.type === type && item.id === id)
    }

    const isItemCut = (type, id) => {
        return (
            clipboard?.mode === "cut" &&
            clipboard.items.some((item) => item.type === type && item.id === id)
        )
    }

    // click item: normal = select only this one, Ctrl/Cmd = toggle
    const handleSelectItem = (e, item) => {
        if (e.ctrlKey || e.metaKey) {
            setSelectedItems((prev) => {
                const exists = prev.some(
                    (s) => s.type === item.type && s.id === item.id
                )
                if (exists) {
                    return prev.filter(
                        (s) => !(s.type === item.type && s.id === item.id)
                    )
                }
                return [...prev, item]
            })
        } else {
            setSelectedItems([item])
        }
    }

    // if the clicked item is part of a multi-selection, act on all selected
    // otherwise act on only the clicked item
    const getItemsForAction = (clickedItem) => {
        const inSelection = selectedItems.some(
            (s) => s.type === clickedItem.type && s.id === clickedItem.id
        )
        if (inSelection && selectedItems.length > 1) {
            return selectedItems
        }
        return [clickedItem]
    }

    const fetchContents = async () => {
        try {
            const parentQuery =
                currentFolderId === null
                    ? ""
                    : `?parent_id=${encodeURIComponent(currentFolderId)}`
            const folderQuery =
                currentFolderId === null
                    ? ""
                    : `?folder_id=${encodeURIComponent(currentFolderId)}`

            const foldersResponse = await adminFetch(
                `/admin/media/folders${parentQuery}`,
                { method: "GET" }
            )
            const filesResponse = await adminFetch(
                `/admin/media/files${folderQuery}`,
                { method: "GET" }
            )

            // also refresh sidebar tree data
            const allFoldersResponse = await adminFetch(
                "/admin/media/folders?all=true",
                { method: "GET" }
            )

            setFolders(foldersResponse)
            setFiles(filesResponse)
            setAllFolders(allFoldersResponse)
        } catch (error) {
            showToast(error.message || "Failed to load file manager", "error")
        }
    }

    useEffect(() => {
        fetchContents()
    }, [currentFolderId])

    // keep sidebar ancestors expanded when path changes
    useEffect(() => {
        setExpandedIds((prev) => {
            const next = { ...prev }
            for (const item of folderPath) {
                next[item.id] = true
            }
            return next
        })
    }, [folderPath])

    // children of a parent (null = root level)
    const getChildFolders = (parentId) => {
        return allFolders.filter((folder) => {
            if (parentId === null) {
                return !folder.parent_id
            }
            return folder.parent_id === parentId
        })
    }

    const toggleExpand = (folderId) => {
        setExpandedIds((prev) => ({
            ...prev,
            [folderId]: !prev[folderId],
        }))
    }

    // click a folder in the sidebar → open it + build breadcrumb path
    const navigateToFolder = (folder) => {
        const byId = {}
        for (const f of allFolders) {
            byId[f.id] = f
        }

        // walk from folder up to root
        const chain = []
        let current = folder
        while (current) {
            chain.unshift({ id: current.id, name: current.name })
            current = current.parent_id ? byId[current.parent_id] : null
        }

        setFolderPath(chain)
        setCurrentFolderId(folder.id)
        setRenameTarget(null)
        setDetailsFolder(null)
        setViewFile(null)
        setSelectedItems([])
    }

    const handleCreateFolder = async () => {
        try {
            const response = await adminFetch("/admin/media/folders", {
                method: "POST",
                body: {
                    name: folderName,
                    parent_id: currentFolderId,
                },
            })

            if (response.id) {
                showToast("Folder created successfully", "success")
                closeCreateFolderModal()
                fetchContents()
            } else {
                showToast(response.message || "Failed to create folder", "error")
            }
        } catch (error) {
            showToast(error.message, "error")
        }
    }

    const handleUploadFile = async () => {
        if (!selectedFiles.length) {
            showToast("Please choose at least one image file", "error")
            return
        }

        try {
            // FormData for file upload (do not use adminFetch JSON body)
            const formData = new FormData()

            // append every selected file under the same field name "files"
            for (const file of selectedFiles) {
                formData.append("files", file)
            }

            if (currentFolderId) {
                formData.append("folder_id", currentFolderId)
            }

            const response = await fetch("/admin/media/files", {
                method: "POST",
                credentials: "include",
                body: formData,
            })

            const payload = await response.json()

            if (!response.ok) {
                throw new Error(payload.message || "Failed to upload file")
            }

            const count = payload.count || selectedFiles.length
            showToast(`Uploaded ${count} image(s) successfully`, "success")
            closeUploadModal()
            fetchContents()
        } catch (error) {
            showToast(error.message, "error")
        }
    }

    // fix: after closing a modal opened from right-click,
    // the page can stay "blocked" (pointer-events none).
    // this unlocks clicks / right-clicks again.
    const unlockPageClicks = () => {
        document.body.style.pointerEvents = ""
    }

    // open modal AFTER the right-click menu finishes closing
    // (opening instantly causes a Radix bug)
    const openAfterMenuClose = (openFn) => {
        setTimeout(() => {
            openFn()
        }, 50)
    }

    // open rename modal (from right-click menu)
    const startRenameFolder = (folder) => {
        openAfterMenuClose(() => {
            setDetailsFolder(null)
            setViewFile(null)
            setRenameTarget({ type: "folder", id: folder.id, name: folder.name })
            setRenameValue(folder.name)
        })
    }

    const startRenameFile = (file) => {
        openAfterMenuClose(() => {
            setDetailsFolder(null)
            setViewFile(null)
            setRenameTarget({ type: "file", id: file.id, name: file.name })
            setRenameValue(file.name)
        })
    }

    const startFolderDetails = (folder) => {
        openAfterMenuClose(() => {
            setRenameTarget(null)
            setViewFile(null)
            setDetailsFolder(folder)
        })
    }

    const startViewFile = (file) => {
        openAfterMenuClose(() => {
            setRenameTarget(null)
            setDetailsFolder(null)
            setViewFile(file)
        })
    }

    // picker mode: choose this image and send it back to the parent form
    const handlePickFile = (file) => {
        if (isPicker && onSelectFile) {
            onSelectFile(file)
        } else {
            startViewFile(file)
        }
    }

    // copy the public image URL to clipboard
    const handleCopyFileUrl = async (file) => {
        if (!file?.url) {
            showToast("This file has no URL", "error")
            return
        }

        try {
            await navigator.clipboard.writeText(file.url)
            showToast("Image URL copied", "success")
        } catch (error) {
            showToast("Failed to copy URL", "error")
        }
    }

    const closeRenameModal = () => {
        setRenameTarget(null)
        setRenameValue("")
        unlockPageClicks()
    }

    const closeDetailsModal = () => {
        setDetailsFolder(null)
        unlockPageClicks()
    }

    const closeViewModal = () => {
        setViewFile(null)
        unlockPageClicks()
    }

    const closeCreateFolderModal = () => {
        setCreateFolderOpen(false)
        setFolderName("")
        unlockPageClicks()
    }

    const closeUploadModal = () => {
        setUploadOpen(false)
        setSelectedFiles([])
        unlockPageClicks()
    }

    const handleSaveRename = async () => {
        if (!renameTarget) {
            return
        }

        if (!renameValue || !renameValue.trim()) {
            showToast("Name is required", "error")
            return
        }

        try {
            if (renameTarget.type === "folder") {
                const response = await adminFetch(
                    `/admin/media/folders/${renameTarget.id}`,
                    {
                        method: "PUT",
                        body: { name: renameValue.trim() },
                    }
                )

                if (response.id || response.name) {
                    showToast("Folder renamed successfully", "success")

                    // update breadcrumb name if this folder is in the path
                    setFolderPath((prev) =>
                        prev.map((item) =>
                            item.id === renameTarget.id
                                ? { ...item, name: renameValue.trim() }
                                : item
                        )
                    )
                } else {
                    showToast(response.message || "Failed to rename folder", "error")
                    return
                }
            } else {
                const response = await adminFetch(
                    `/admin/media/files/${renameTarget.id}`,
                    {
                        method: "PUT",
                        body: { name: renameValue.trim() },
                    }
                )

                if (response.id || response.name) {
                    showToast("File renamed successfully", "success")
                } else {
                    showToast(response.message || "Failed to rename file", "error")
                    return
                }
            }

            setRenameTarget(null)
            setRenameValue("")
            unlockPageClicks()
            fetchContents()
        } catch (error) {
            showToast(error.message, "error")
        }
    }

    const handleDeleteFolder = async (id) => {
        try {
            const response = await adminFetch(`/admin/media/folders/${id}`, {
                method: "DELETE",
            })
            return response
        } catch (error) {
            throw error
        }
    }

    const handleDeleteFile = async (id) => {
        try {
            const response = await adminFetch(`/admin/media/files/${id}`, {
                method: "DELETE",
            })
            return response
        } catch (error) {
            throw error
        }
    }

    // ---------- COPY / CUT / PASTE / DELETE (supports many items) ----------

    const handleCopyItems = (items) => {
        setClipboard({
            mode: "copy",
            items,
        })
        setSelectedItems([])
        showToast(`Copied ${items.length} item(s)`, "success")
    }

    const handleCutItems = (items) => {
        setClipboard({
            mode: "cut",
            items,
        })
        setSelectedItems([])
        showToast(`Cut ${items.length} item(s)`, "success")
    }

    const handleDeleteItems = async (items) => {
        if (!items.length) {
            return
        }

        const ok = window.confirm(
            `Delete ${items.length} selected item(s)?\nFolders must be empty to delete.`
        )
        if (!ok) {
            return
        }

        let successCount = 0
        let failCount = 0

        // delete files first, then folders (easier to empty folders)
        const filesToDelete = items.filter((item) => item.type === "file")
        const foldersToDelete = items.filter((item) => item.type === "folder")

        for (const item of filesToDelete) {
            try {
                await handleDeleteFile(item.id)
                successCount += 1
            } catch (error) {
                failCount += 1
                console.log(error)
            }
        }

        for (const item of foldersToDelete) {
            try {
                await handleDeleteFolder(item.id)
                successCount += 1
            } catch (error) {
                failCount += 1
                console.log(error)
            }
        }

        setSelectedItems([])

        if (failCount === 0) {
            showToast(`Deleted ${successCount} item(s)`, "success")
        } else {
            showToast(
                `Deleted ${successCount}, failed ${failCount} (folders may not be empty)`,
                "error"
            )
        }

        fetchContents()
    }

    const handlePaste = async (targetFolderId) => {
        // if no folder id was passed (toolbar Paste button),
        // use the folder we are currently looking at
        // NOTE: do not use default params — Button onClick passes the click event
        const destinationId =
            typeof targetFolderId === "string" || targetFolderId === null
                ? targetFolderId
                : currentFolderId

        if (!clipboard?.items?.length) {
            showToast("Nothing to paste. Copy or Cut first.", "error")
            return
        }

        // quick UI check: do not paste a folder into itself / inside itself
        // (backend also blocks this)
        const unsafeFolder = clipboard.items.find((item) => {
            if (item.type !== "folder") {
                return false
            }
            // paste into the same folder
            if (item.id === destinationId) {
                return true
            }
            // we are currently browsing inside this folder (breadcrumb)
            if (folderPath.some((pathItem) => pathItem.id === item.id)) {
                return true
            }
            if (currentFolderId === item.id) {
                return true
            }
            return false
        })

        if (unsafeFolder) {
            showToast(
                `Cannot paste folder "${unsafeFolder.name}" inside itself`,
                "error"
            )
            return
        }

        const isCut = clipboard.mode === "cut"
        const folderUrl = isCut
            ? "/admin/media/folders/move"
            : "/admin/media/folders/copy"
        const fileUrl = isCut
            ? "/admin/media/files/move"
            : "/admin/media/files/copy"

        let successCount = 0
        let failCount = 0
        let firstError = ""

        try {
            for (const item of clipboard.items) {
                try {
                    if (item.type === "folder") {
                        await adminFetch(folderUrl, {
                            method: "POST",
                            body: {
                                source_id: item.id,
                                parent_id: destinationId,
                            },
                        })
                    } else {
                        await adminFetch(fileUrl, {
                            method: "POST",
                            body: {
                                source_id: item.id,
                                folder_id: destinationId,
                            },
                        })
                    }
                    successCount += 1
                } catch (error) {
                    failCount += 1
                    if (!firstError) {
                        firstError = error.message || "Paste failed"
                    }
                    console.log(error)
                }
            }

            // only clear cut clipboard when everything moved successfully
            if (isCut && failCount === 0) {
                setClipboard(null)
            }

            if (failCount === 0) {
                showToast(
                    isCut
                        ? `Moved ${successCount} item(s)`
                        : `Pasted ${successCount} item(s)`,
                    "success"
                )
            } else {
                showToast(
                    firstError ||
                        `Done ${successCount}, failed ${failCount}`,
                    "error"
                )
            }

            fetchContents()
        } catch (error) {
            showToast(error.message, "error")
        }
    }

    // go inside a folder (nested folders use parent_id)
    const openFolder = (folder) => {
        setFolderPath((prev) => [...prev, { id: folder.id, name: folder.name }])
        setCurrentFolderId(folder.id)
        setRenameTarget(null)
        setDetailsFolder(null)
        setViewFile(null)
        setSelectedItems([])
    }

    const goToRoot = () => {
        setFolderPath([])
        setCurrentFolderId(null)
    }

    const goToBreadcrumb = (index) => {
        const nextPath = folderPath.slice(0, index + 1)
        setFolderPath(nextPath)
        setCurrentFolderId(nextPath[nextPath.length - 1].id)
    }

    // recursive sidebar tree row (beginner-friendly: defined inside the page)
    const renderFolderTreeNode = (folder, depth) => {
        const children = getChildFolders(folder.id)
        const hasChildren = children.length > 0
        const isExpanded = !!expandedIds[folder.id]
        const isActive = currentFolderId === folder.id
        const isCutItem = isItemCut("folder", folder.id)
        const item = {
            type: "folder",
            id: folder.id,
            name: folder.name,
        }

        return (
            <div key={folder.id}>
                <ContextMenu.Root>
                    <ContextMenu.Trigger asChild>
                        <div
                            className={`flex items-center gap-1 py-1.5 pr-2 rounded-md cursor-pointer text-sm select-none ${
                                isActive
                                    ? "bg-ui-bg-interactive text-ui-fg-on-color"
                                    : "hover:bg-ui-bg-subtle text-ui-fg-base"
                            } ${isCutItem ? "opacity-40" : ""}`}
                            style={{ paddingLeft: `${8 + depth * 14}px` }}
                            onClick={() => navigateToFolder(folder)}
                        >
                            <button
                                type="button"
                                className="shrink-0 w-4 h-4 flex items-center justify-center"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    if (hasChildren) {
                                        toggleExpand(folder.id)
                                    }
                                }}
                            >
                                {hasChildren ? (
                                    isExpanded ? (
                                        <ChevronDown size={14} />
                                    ) : (
                                        <ChevronRight size={14} />
                                    )
                                ) : (
                                    <span className="w-3.5" />
                                )}
                            </button>
                            <Folder size={14} className="shrink-0" />
                            <span className="truncate">
                                {folder.name}
                                {isCutItem ? " (cut)" : ""}
                            </span>
                        </div>
                    </ContextMenu.Trigger>

                    <ContextMenu.Portal>
                        <ContextMenu.Content
                            className="bg-white border rounded-md shadow-lg min-w-[180px] z-50"
                            onCloseAutoFocus={(e) => {
                                e.preventDefault()
                            }}
                        >
                            <ContextMenu.Item
                                className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                onSelect={() => navigateToFolder(folder)}
                            >
                                <FolderOpen size={16} /> Open
                            </ContextMenu.Item>

                            <ContextMenu.Item
                                className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                onSelect={() => startRenameFolder(folder)}
                            >
                                <Pencil size={16} /> Rename
                            </ContextMenu.Item>

                            <ContextMenu.Item
                                className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                onSelect={() => startFolderDetails(folder)}
                            >
                                <Info size={16} /> Details
                            </ContextMenu.Item>

                            <ContextMenu.Item
                                className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                onSelect={() => handleCopyItems([item])}
                            >
                                <Copy size={16} /> Copy
                            </ContextMenu.Item>

                            <ContextMenu.Item
                                className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                onSelect={() => handleCutItems([item])}
                            >
                                <Scissors size={16} /> Cut
                            </ContextMenu.Item>

                            {clipboard?.items?.length > 0 && (
                                <ContextMenu.Item
                                    className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                    onSelect={() => handlePaste(folder.id)}
                                >
                                    <ClipboardPaste size={16} /> Paste inside
                                </ContextMenu.Item>
                            )}

                            <ContextMenu.Separator className="h-px bg-gray-200" />

                            <ContextMenu.Item
                                className="text-sm outline-none px-4 py-2 text-red-500 hover:bg-red-50 cursor-pointer flex items-center gap-2"
                                onSelect={() => handleDeleteItems([item])}
                            >
                                <Trash2 size={16} /> Delete
                            </ContextMenu.Item>
                        </ContextMenu.Content>
                    </ContextMenu.Portal>
                </ContextMenu.Root>

                {isExpanded &&
                    children.map((child) =>
                        renderFolderTreeNode(child, depth + 1)
                    )}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-y-4">
            {mode === "page" && (
                <Container className="p-0">
                    <div className="px-6 py-4">
                        <Heading level="h1">File Manager</Heading>
                        <Text size="small" className="text-ui-fg-subtle">
                            Upload and organize images. Click to select, Ctrl/Cmd+click for multi-select, right-click for actions.
                        </Text>
                    </div>
                </Container>
            )}

            {isPicker && (
                <Text size="small" className="text-ui-fg-subtle px-1">
                    Double-click an image (or right-click → Use this image) to select it for the banner.
                </Text>
            )}

            <Container className="p-0 overflow-hidden">
                <div className={`flex ${isPicker ? "min-h-[480px] max-h-[70vh]" : "min-h-[560px]"}`}>
                    {/* ---------- LEFT SIDEBAR (folder tree) ---------- */}
                    <div className="w-64 shrink-0 border-r border-ui-border-base p-3 overflow-auto bg-ui-bg-subtle">
                        <Text
                            size="small"
                            className="px-2 mb-2 font-medium text-ui-fg-subtle"
                        >
                            Places
                        </Text>

                        {/* Root */}
                        <ContextMenu.Root>
                            <ContextMenu.Trigger asChild>
                                <div
                                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-sm mb-1 select-none ${
                                        currentFolderId === null
                                            ? "bg-ui-bg-interactive text-ui-fg-on-color"
                                            : "hover:bg-ui-bg-base text-ui-fg-base"
                                    }`}
                                    onClick={goToRoot}
                                >
                                    <FolderOpen size={14} />
                                    <span>Root</span>
                                </div>
                            </ContextMenu.Trigger>

                            <ContextMenu.Portal>
                                <ContextMenu.Content
                                    className="bg-white border rounded-md shadow-lg min-w-[180px] z-50"
                                    onCloseAutoFocus={(e) => {
                                        e.preventDefault()
                                    }}
                                >
                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={goToRoot}
                                    >
                                        <FolderOpen size={16} /> Open
                                    </ContextMenu.Item>

                                    {clipboard?.items?.length > 0 && (
                                        <ContextMenu.Item
                                            className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                            onSelect={() => handlePaste(null)}
                                        >
                                            <ClipboardPaste size={16} /> Paste here
                                        </ContextMenu.Item>
                                    )}
                                </ContextMenu.Content>
                            </ContextMenu.Portal>
                        </ContextMenu.Root>

                        {/* Nested folders */}
                        {getChildFolders(null).map((folder) =>
                            renderFolderTreeNode(folder, 0)
                        )}

                        {allFolders.length === 0 && (
                            <Text
                                size="small"
                                className="px-2 mt-2 text-ui-fg-muted"
                            >
                                No folders yet
                            </Text>
                        )}
                    </div>

                    {/* ---------- RIGHT CONTENT ---------- */}
                    <div className="flex-1 min-w-0 p-6">
                {/* Buttons open modals for create / upload / paste */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setCreateFolderOpen(true)}
                    >
                        <FolderPlus size={16} className="" /> New Folder
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setUploadOpen(true)}
                    >
                        <Upload size={16} className="" /> Upload Image
                    </Button>
                    <Button
                        variant="secondary"
                        disabled={!clipboard?.items?.length}
                        onClick={() => handlePaste()}
                    >
                        <ClipboardPaste size={16} className="" />
                        Paste
                        {clipboard?.items?.length
                            ? ` (${clipboard.items.length})`
                            : ""}
                    </Button>

                    {selectedItems.length > 0 && (
                        <>
                            <Button
                                variant="secondary"
                                onClick={() => setSelectedItems([])}
                            >
                                Clear selection
                            </Button>
                        </>
                    )}
                </div>

                {(selectedItems.length > 0 || clipboard?.items?.length > 0) && (
                    <Text size="small" className="text-ui-fg-subtle mb-4">
                        {selectedItems.length > 0 && (
                            <span>Selected: {selectedItems.length} item(s). </span>
                        )}
                        {clipboard?.items?.length > 0 && (
                            <span>
                                Clipboard ({clipboard.mode}):{" "}
                                {clipboard.items.length} item(s)
                                {clipboard.items.length === 1
                                    ? ` — ${clipboard.items[0].name}`
                                    : ""}
                            </span>
                        )}
                    </Text>
                )}

                

                {/* ---------- NEW FOLDER MODAL ---------- */}
                <FocusModal
                    open={createFolderOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeCreateFolderModal()
                        }
                    }}
                >
                    <FocusModal.Content
                        onCloseAutoFocus={(e) => {
                            e.preventDefault()
                            unlockPageClicks()
                        }}
                    >
                        <FocusModal.Header>
                            <Heading>New Folder</Heading>
                        </FocusModal.Header>
                        <FocusModal.Body className="flex flex-col gap-y-4 px-6 py-4">
                            <Text size="small" className="text-ui-fg-subtle">
                                Creates inside:{" "}
                                <span className="font-medium text-ui-fg-base">
                                    {folderPath.length === 0
                                        ? "Root"
                                        : folderPath[folderPath.length - 1].name}
                                </span>
                            </Text>
                            <div>
                                <Label>Folder Name</Label>
                                <Input
                                    placeholder="Folder name"
                                    value={folderName}
                                    onChange={(e) => setFolderName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleCreateFolder()
                                        }
                                    }}
                                />
                            </div>
                        </FocusModal.Body>
                        <FocusModal.Footer>
                            <Button
                                variant="secondary"
                                onClick={closeCreateFolderModal}
                            >
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleCreateFolder}>
                                Create Folder
                            </Button>
                        </FocusModal.Footer>
                    </FocusModal.Content>
                </FocusModal>

                {/* ---------- UPLOAD IMAGE MODAL ---------- */}
                <FocusModal
                    open={uploadOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeUploadModal()
                        }
                    }}
                >
                    <FocusModal.Content
                        onCloseAutoFocus={(e) => {
                            e.preventDefault()
                            unlockPageClicks()
                        }}
                    >
                        <FocusModal.Header>
                            <Heading>Upload Images</Heading>
                        </FocusModal.Header>
                        <FocusModal.Body className="flex flex-col gap-y-4 px-6 py-4">
                            <Text size="small" className="text-ui-fg-subtle">
                                Uploads into:{" "}
                                <span className="font-medium text-ui-fg-base">
                                    {folderPath.length === 0
                                        ? "Root"
                                        : folderPath[folderPath.length - 1].name}
                                </span>
                            </Text>
                            <div>
                                <Label>Choose Images (you can select many)</Label>
                                <Input
                                    type="file"
                                    multiple
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={(e) => {
                                        // convert FileList to a normal array
                                        const list = e.target.files
                                            ? Array.from(e.target.files)
                                            : []
                                        setSelectedFiles(list)
                                    }}
                                />
                            </div>
                            {selectedFiles.length > 0 && (
                                <div className="flex flex-col gap-y-1">
                                    <Text size="small" className="font-medium">
                                        Selected ({selectedFiles.length}):
                                    </Text>
                                    {selectedFiles.map((file, index) => (
                                        <Text
                                            key={`${file.name}-${index}`}
                                            size="small"
                                            className="text-ui-fg-subtle"
                                        >
                                            {file.name} ({formatFileSize(file.size)})
                                        </Text>
                                    ))}
                                </div>
                            )}
                        </FocusModal.Body>
                        <FocusModal.Footer>
                            <Button variant="secondary" onClick={closeUploadModal}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleUploadFile}>
                                Upload {selectedFiles.length || ""} Image
                                {selectedFiles.length === 1 ? "" : "s"}
                            </Button>
                        </FocusModal.Footer>
                    </FocusModal.Content>
                </FocusModal>

                {/* ---------- RENAME MODAL ---------- */}
                <FocusModal
                    open={!!renameTarget}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeRenameModal()
                        }
                    }}
                >
                    <FocusModal.Content
                        onCloseAutoFocus={(e) => {
                            // keep focus from locking the page
                            e.preventDefault()
                            unlockPageClicks()
                        }}
                    >
                        <FocusModal.Header>
                            <Heading>
                                Rename{" "}
                                {renameTarget?.type === "folder" ? "Folder" : "File"}
                            </Heading>
                        </FocusModal.Header>
                        <FocusModal.Body className="flex flex-col gap-y-4 px-6 py-4">
                            <Text size="small" className="text-ui-fg-subtle">
                                Current name:{" "}
                                <span className="font-medium text-ui-fg-base">
                                    {renameTarget?.name}
                                </span>
                            </Text>
                            <div>
                                <Label>New Name</Label>
                                <Input
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            handleSaveRename()
                                        }
                                    }}
                                />
                            </div>
                        </FocusModal.Body>
                        <FocusModal.Footer>
                            <Button variant="secondary" onClick={closeRenameModal}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleSaveRename}>
                                Save Name
                            </Button>
                        </FocusModal.Footer>
                    </FocusModal.Content>
                </FocusModal>

                {/* ---------- FOLDER DETAILS MODAL ---------- */}
                <FocusModal
                    open={!!detailsFolder}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeDetailsModal()
                        }
                    }}
                >
                    <FocusModal.Content
                        onCloseAutoFocus={(e) => {
                            e.preventDefault()
                            unlockPageClicks()
                        }}
                    >
                        <FocusModal.Header>
                            <Heading>Folder Details</Heading>
                        </FocusModal.Header>
                        <FocusModal.Body className="flex flex-col gap-y-2 px-6 py-4">
                            <p>
                                <span className="font-medium">Name:</span>{" "}
                                {detailsFolder?.name}
                            </p>
                            <p>
                                <span className="font-medium">ID:</span>{" "}
                                {detailsFolder?.id}
                            </p>
                            <p>
                                <span className="font-medium">Parent:</span>{" "}
                                {detailsFolder?.parent_id
                                    ? detailsFolder.parent_id
                                    : "Root (no parent)"}
                            </p>
                        </FocusModal.Body>
                        <FocusModal.Footer>
                            <Button variant="secondary" onClick={closeDetailsModal}>
                                Close
                            </Button>
                        </FocusModal.Footer>
                    </FocusModal.Content>
                </FocusModal>

                {/* ---------- VIEW IMAGE MODAL ---------- */}
                <FocusModal
                    open={!!viewFile}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeViewModal()
                        }
                    }}
                >
                    <FocusModal.Content
                        onCloseAutoFocus={(e) => {
                            e.preventDefault()
                            unlockPageClicks()
                        }}
                    >
                        <FocusModal.Header>
                            <Heading>View Image</Heading>
                        </FocusModal.Header>
                        <FocusModal.Body className="flex flex-col gap-y-3 px-6 py-4">
                            <p>
                                <span className="font-medium">Name:</span>{" "}
                                {viewFile?.name}
                            </p>
                            <p>
                                <span className="font-medium">URL:</span>{" "}
                                {viewFile?.url}
                            </p>
                            <p>
                                <span className="font-medium">Type:</span>{" "}
                                {viewFile?.mime_type}{" "}
                                <span className="font-medium">| Size:</span>{" "}
                                {formatFileSize(viewFile?.size)}
                            </p>
                            {viewFile?.url && (
                                <img
                                    src={viewFile.url}
                                    alt={viewFile.alt || viewFile.name}
                                    style={{
                                        maxWidth: "100%",
                                        maxHeight: "400px",
                                        objectFit: "contain",
                                        marginTop: "8px",
                                    }}
                                />
                            )}
                        </FocusModal.Body>
                        <FocusModal.Footer>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    if (viewFile?.url) {
                                        navigator.clipboard.writeText(viewFile.url)
                                        showToast("URL copied", "success")
                                    }
                                }}
                            >
                                Copy URL
                            </Button>
                            <Button variant="secondary" onClick={closeViewModal}>
                                Close
                            </Button>
                        </FocusModal.Footer>
                    </FocusModal.Content>
                </FocusModal>

                <hr className="my-4" />

                {/* Breadcrumb — shows nested path: Root / Parent / Child */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="small" onClick={goToRoot}>
                        Root
                    </Button>
                    {folderPath.map((item, index) => (
                        <Button
                            key={item.id}
                            variant="secondary"
                            size="small"
                            onClick={() => goToBreadcrumb(index)}
                        >
                            / {item.name}
                        </Button>
                    ))}
                </div>

                <Heading level="h2" className="mb-2">
                    Files
                </Heading>

                {folders.length === 0 && files.length === 0 && (
                    <Container className="mb-2">
                        <p>No folders or images here</p>
                    </Container>
                )}

                <div className="flex flex-wrap gap-x-2 gap-y-2">
                    {/* ---------- FOLDERS ---------- */}
                    {folders.map((folder) => {
                        const item = {
                            type: "folder",
                            id: folder.id,
                            name: folder.name,
                        }
                        const isSelected = isItemSelected("folder", folder.id)
                        const isCutItem = isItemCut("folder", folder.id)

                        return (
                        <ContextMenu.Root key={folder.id}>
                            <ContextMenu.Trigger
                                className={`hover:bg-ui-bg-subtle rounded-md p-5 cursor-pointer select-none ${
                                    isCutItem ? "opacity-40" : ""
                                } ${
                                    isSelected
                                        ? "ring-2 ring-blue-500 bg-ui-bg-subtle"
                                        : ""
                                }`}
                                onClick={(e) => handleSelectItem(e, item)}
                                onDoubleClick={() => openFolder(folder)}
                            >
                                <Folder size={70} />
                                <p className="text-sm font-medium text-ui-fg-subtle">
                                    {folder.name}
                                    {isCutItem ? " (cut)" : ""}
                                </p>
                            </ContextMenu.Trigger>

                            <ContextMenu.Portal>
                                <ContextMenu.Content
                                    className="bg-white border rounded-md shadow-lg min-w-[180px] z-50"
                                    onCloseAutoFocus={(e) => {
                                        // prevents right-click menu from locking the page
                                        e.preventDefault()
                                    }}
                                >
                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() => openFolder(folder)}
                                    >
                                        <FolderOpen size={16} /> Open
                                    </ContextMenu.Item>

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() => startRenameFolder(folder)}
                                    >
                                        <Pencil size={16} /> Rename
                                    </ContextMenu.Item>

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() => startFolderDetails(folder)}
                                    >
                                        <Info size={16} /> Details
                                    </ContextMenu.Item>

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() =>
                                            handleCopyItems(getItemsForAction(item))
                                        }
                                    >
                                        <Copy size={16} /> Copy
                                        {isSelected && selectedItems.length > 1
                                            ? ` (${selectedItems.length})`
                                            : ""}
                                    </ContextMenu.Item>

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() =>
                                            handleCutItems(getItemsForAction(item))
                                        }
                                    >
                                        <Scissors size={16} /> Cut
                                        {isSelected && selectedItems.length > 1
                                            ? ` (${selectedItems.length})`
                                            : ""}
                                    </ContextMenu.Item>

                                    {clipboard?.items?.length > 0 && (
                                        <ContextMenu.Item
                                            className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                            onSelect={() => handlePaste(folder.id)}
                                        >
                                            <ClipboardPaste size={16} /> Paste inside
                                        </ContextMenu.Item>
                                    )}

                                    <ContextMenu.Separator className="h-px bg-gray-200" />

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 text-red-500 hover:bg-red-50 cursor-pointer flex items-center gap-2"
                                        onSelect={() =>
                                            handleDeleteItems(getItemsForAction(item))
                                        }
                                    >
                                        <Trash2 size={16} /> Delete
                                        {isSelected && selectedItems.length > 1
                                            ? ` (${selectedItems.length})`
                                            : ""}
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Portal>
                        </ContextMenu.Root>
                        )
                    })}

                    {/* ---------- IMAGE FILES ---------- */}
                    {files.map((file) => {
                        const item = {
                            type: "file",
                            id: file.id,
                            name: file.name,
                        }
                        const isSelected = isItemSelected("file", file.id)
                        const isCutItem = isItemCut("file", file.id)

                        return (
                        <ContextMenu.Root key={file.id}>
                            <ContextMenu.Trigger
                                className={`hover:bg-ui-bg-subtle rounded-md p-3 cursor-pointer select-none flex items-end ${
                                    isCutItem ? "opacity-40" : ""
                                } ${
                                    isSelected
                                        ? "ring-2 ring-blue-500 bg-ui-bg-subtle"
                                        : ""
                                }`}
                                onClick={(e) => handleSelectItem(e, item)}
                                onDoubleClick={() => handlePickFile(file)}
                            >
                                <div>
                                    {file.url && (
                                        <img
                                            src={file.url}
                                            alt={file.alt || file.name}
                                            style={{
                                                maxWidth: "150px",
                                                maxHeight: "100px",
                                                objectFit: "contain",
                                            }}
                                        />
                                    )}
                                    <p className="text-sm font-medium text-ui-fg-subtle text-truncate">
                                        {file.name}
                                        {isCutItem ? " (cut)" : ""}
                                    </p>
                                </div>
                            </ContextMenu.Trigger>

                            <ContextMenu.Portal>
                                <ContextMenu.Content
                                    className="bg-white border rounded-md shadow-lg min-w-[180px] z-50"
                                    onCloseAutoFocus={(e) => {
                                        e.preventDefault()
                                    }}
                                >
                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() => startViewFile(file)}
                                    >
                                        <Eye size={16} /> View
                                    </ContextMenu.Item>

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() => handleCopyFileUrl(file)}
                                    >
                                        <Link size={16} /> Copy URL
                                    </ContextMenu.Item>

                                    {isPicker && (
                                        <ContextMenu.Item
                                            className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2 font-medium"
                                            onSelect={() => handlePickFile(file)}
                                        >
                                            <Check size={16} /> Use this image
                                        </ContextMenu.Item>
                                    )}

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() => startRenameFile(file)}
                                    >
                                        <Pencil size={16} /> Rename
                                    </ContextMenu.Item>

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() =>
                                            handleCopyItems(getItemsForAction(item))
                                        }
                                    >
                                        <Copy size={16} /> Copy
                                        {isSelected && selectedItems.length > 1
                                            ? ` (${selectedItems.length})`
                                            : ""}
                                    </ContextMenu.Item>

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                        onSelect={() =>
                                            handleCutItems(getItemsForAction(item))
                                        }
                                    >
                                        <Scissors size={16} /> Cut
                                        {isSelected && selectedItems.length > 1
                                            ? ` (${selectedItems.length})`
                                            : ""}
                                    </ContextMenu.Item>

                                    {clipboard?.items?.length > 0 && (
                                        <ContextMenu.Item
                                            className="text-sm outline-none px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center gap-2"
                                            onSelect={() => handlePaste()}
                                        >
                                            <ClipboardPaste size={16} /> Paste here
                                        </ContextMenu.Item>
                                    )}

                                    <ContextMenu.Separator className="h-px bg-gray-200" />

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 text-red-500 hover:bg-red-50 cursor-pointer flex items-center gap-2"
                                        onSelect={() =>
                                            handleDeleteItems(getItemsForAction(item))
                                        }
                                    >
                                        <Trash2 size={16} /> Delete
                                        {isSelected && selectedItems.length > 1
                                            ? ` (${selectedItems.length})`
                                            : ""}
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Portal>
                        </ContextMenu.Root>
                        )
                    })}
                </div>
                    </div>
                </div>
            </Container>
        </div>
    )
}
