import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Button, Input, Label, FocusModal } from "@medusajs/ui"
import { adminFetch } from "../../lib/sdk"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { Folder, Trash2, Pencil, FolderOpen, Eye, Info } from "lucide-react"
import * as ContextMenu from "@radix-ui/react-context-menu"

export default function FileManagerPage() {
    // current folder we are looking at (null = root)
    const [currentFolderId, setCurrentFolderId] = useState(null)
    const [folderPath, setFolderPath] = useState([]) // breadcrumb [{ id, name }]

    const [folders, setFolders] = useState([])
    const [files, setFiles] = useState([])

    // create folder form
    const [createFolderOpen, setCreateFolderOpen] = useState(false)
    const [folderName, setFolderName] = useState("")

    // upload form
    const [uploadOpen, setUploadOpen] = useState(false)
    const [selectedFile, setSelectedFile] = useState(null)
    const [uploadName, setUploadName] = useState("")

    // rename panel: { type: "folder" | "file", id, name }
    const [renameTarget, setRenameTarget] = useState(null)
    const [renameValue, setRenameValue] = useState("")

    // details / view panels
    const [detailsFolder, setDetailsFolder] = useState(null)
    const [viewFile, setViewFile] = useState(null)

    const showToast = (message, type) => {
        toast[type](message, {
            position: "top-right",
        })
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

            setFolders(foldersResponse)
            setFiles(filesResponse)
        } catch (error) {
            showToast(error.message || "Failed to load file manager", "error")
        }
    }

    useEffect(() => {
        fetchContents()
    }, [currentFolderId])

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
        if (!selectedFile) {
            showToast("Please choose an image file", "error")
            return
        }

        try {
            // FormData for file upload (do not use adminFetch JSON body)
            const formData = new FormData()
            formData.append("file", selectedFile)
            formData.append("name", uploadName || selectedFile.name)
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

            showToast("File uploaded successfully", "success")
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
        setSelectedFile(null)
        setUploadName("")
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
        const ok = window.confirm(
            "Delete this folder? It must be empty (no files or subfolders)."
        )
        if (!ok) {
            return
        }

        try {
            const response = await adminFetch(`/admin/media/folders/${id}`, {
                method: "DELETE",
            })
            showToast(response.message, "success")
            fetchContents()
        } catch (error) {
            showToast(error.message, "error")
        }
    }

    const handleDeleteFile = async (id) => {
        const ok = window.confirm("Delete this image?")
        if (!ok) {
            return
        }

        try {
            const response = await adminFetch(`/admin/media/files/${id}`, {
                method: "DELETE",
            })
            showToast(response.message, "success")
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

    return (
        <div className="flex flex-col gap-y-4">
            <Container className="p-0">
                <div className="px-6 py-4">
                    <Heading level="h1">File Manager</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                        Upload and organize images in folders. Right-click a folder or file for actions.
                    </Text>
                </div>
            </Container>

            <Container className="p-6">
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

                {/* Buttons open modals for create / upload */}
                <div className="mb-4 flex flex-wrap gap-2">
                    <Button
                        variant="secondary"
                        onClick={() => setCreateFolderOpen(true)}
                    >
                        New Folder
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setUploadOpen(true)}
                    >
                        Upload Image
                    </Button>
                </div>

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
                            <Heading>Upload Image</Heading>
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
                                <Label>Choose Image</Label>
                                <Input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0] || null
                                        setSelectedFile(file)
                                        if (file) {
                                            setUploadName(file.name)
                                        }
                                    }}
                                />
                            </div>
                            <div>
                                <Label>File Name</Label>
                                <Input
                                    placeholder="Optional display name"
                                    value={uploadName}
                                    onChange={(e) => setUploadName(e.target.value)}
                                />
                            </div>
                            {selectedFile && (
                                <Text size="small" className="text-ui-fg-subtle">
                                    Selected: {selectedFile.name} ({selectedFile.size}{" "}
                                    bytes)
                                </Text>
                            )}
                        </FocusModal.Body>
                        <FocusModal.Footer>
                            <Button variant="secondary" onClick={closeUploadModal}>
                                Cancel
                            </Button>
                            <Button variant="primary" onClick={handleUploadFile}>
                                Upload Image
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
                                {viewFile?.size} bytes
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
                    {folders.map((folder) => (
                        <ContextMenu.Root key={folder.id}>
                            <ContextMenu.Trigger
                                className="hover:bg-ui-bg-subtle rounded-md p-5 cursor-pointer"
                                onDoubleClick={() => openFolder(folder)}
                            >
                                <Folder size={70} />
                                <p className="text-sm font-medium text-ui-fg-subtle mx-2">
                                    {folder.name}
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

                                    <ContextMenu.Separator className="h-px bg-gray-200" />

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 text-red-500 hover:bg-red-50 cursor-pointer flex items-center gap-2"
                                        onSelect={() => handleDeleteFolder(folder.id)}
                                    >
                                        <Trash2 size={16} /> Delete
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Portal>
                        </ContextMenu.Root>
                    ))}

                    {/* ---------- IMAGE FILES ---------- */}
                    {files.map((file) => (
                        <ContextMenu.Root key={file.id}>
                            <ContextMenu.Trigger
                                className="hover:bg-ui-bg-subtle rounded-md p-3 cursor-pointer"
                                onDoubleClick={() => startViewFile(file)}
                            >
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
                                </p>
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
                                        onSelect={() => startRenameFile(file)}
                                    >
                                        <Pencil size={16} /> Rename
                                    </ContextMenu.Item>

                                    <ContextMenu.Separator className="h-px bg-gray-200" />

                                    <ContextMenu.Item
                                        className="text-sm outline-none px-4 py-2 text-red-500 hover:bg-red-50 cursor-pointer flex items-center gap-2"
                                        onSelect={() => handleDeleteFile(file.id)}
                                    >
                                        <Trash2 size={16} /> Delete
                                    </ContextMenu.Item>
                                </ContextMenu.Content>
                            </ContextMenu.Portal>
                        </ContextMenu.Root>
                    ))}
                </div>
            </Container>
        </div>
    )
}

export const config = defineRouteConfig({
    label: "File Manager",
})
