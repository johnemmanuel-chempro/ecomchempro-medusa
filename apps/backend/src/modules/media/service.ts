import { MedusaService } from "@medusajs/framework/utils"
import MediaFolder from "./models/media-folder"
import MediaFile from "./models/media-file"
import {
    CreateFolderInput,
    UpdateFolderInput,
    FolderDTO,
    CreateFileInput,
    UpdateFileInput,
    FileDTO,
} from "./types"

class MediaModuleService extends MedusaService({
    MediaFolder,
    MediaFile,
}) {
    // ---------- FOLDERS ----------

    async createFolder(input: CreateFolderInput): Promise<CreateFolderInput> {
        const folder = await this.createMediaFolders(input)
        return folder as CreateFolderInput
    }

    async updateFolder(id: string, input: UpdateFolderInput): Promise<UpdateFolderInput> {
        const folder = await this.updateMediaFolders({ id, ...input })
        return folder as UpdateFolderInput
    }

    async getFolder(id: string): Promise<FolderDTO | null> {
        const [folder] = await this.listMediaFolders({ id }, { take: 1 })
        return (folder as FolderDTO) ?? null
    }

    async getListFolders(parent_id?: string | null): Promise<FolderDTO[]> {
        // null / undefined = root folders (no parent)
        const filters =
            parent_id === undefined || parent_id === null || parent_id === ""
                ? { parent_id: null }
                : { parent_id }

        const folders = await this.listMediaFolders(filters)
        return folders as FolderDTO[]
    }

    async getFolderByName(
        name: string,
        parent_id?: string | null
    ): Promise<FolderDTO | null> {
        const filters: Record<string, unknown> = { name }

        if (parent_id === undefined || parent_id === null || parent_id === "") {
            filters.parent_id = null
        } else {
            filters.parent_id = parent_id
        }

        const [folder] = await this.listMediaFolders(filters, { take: 1 })
        return (folder as FolderDTO) ?? null
    }

    async deleteFolder(id: string): Promise<void> {
        await this.deleteMediaFolders(id)
    }

    // ---------- FILES ----------

    async createFile(input: CreateFileInput): Promise<CreateFileInput> {
        const file = await this.createMediaFiles(input)
        return file as CreateFileInput
    }

    async updateFile(id: string, input: UpdateFileInput): Promise<UpdateFileInput> {
        const file = await this.updateMediaFiles({ id, ...input })
        return file as UpdateFileInput
    }

    async getFile(id: string): Promise<FileDTO | null> {
        const [file] = await this.listMediaFiles({ id }, { take: 1 })
        return (file as FileDTO) ?? null
    }

    async getListFiles(folder_id?: string | null): Promise<FileDTO[]> {
        // null / undefined = files in root (no folder)
        const filters =
            folder_id === undefined || folder_id === null || folder_id === ""
                ? { folder_id: null }
                : { folder_id }

        const files = await this.listMediaFiles(filters)
        return files as FileDTO[]
    }

    async getFileByName(
        name: string,
        folder_id?: string | null
    ): Promise<FileDTO | null> {
        const filters: Record<string, unknown> = { name }

        if (folder_id === undefined || folder_id === null || folder_id === "") {
            filters.folder_id = null
        } else {
            filters.folder_id = folder_id
        }

        const [file] = await this.listMediaFiles(filters, { take: 1 })
        return (file as FileDTO) ?? null
    }

    async deleteFile(id: string): Promise<void> {
        await this.deleteMediaFiles(id)
    }

    // how many media_file rows share the same storage file_id?
    async countFilesByFileId(file_id: string): Promise<number> {
        const files = await this.listMediaFiles({ file_id })
        return (files as FileDTO[]).length
    }

    // ---------- COPY / PASTE HELPERS ----------

    // "photo.png" -> "photo (copy).png"
    // "My Folder" -> "My Folder (copy)"
    makeCopyName(name: string): string {
        const lastDot = name.lastIndexOf(".")
        const hasExtension = lastDot > 0

        if (hasExtension) {
            const base = name.slice(0, lastDot)
            const ext = name.slice(lastDot)
            return `${base} (copy)${ext}`
        }

        return `${name} (copy)`
    }

    // keep trying until name is free in this folder
    async getUniqueFolderName(
        name: string,
        parent_id?: string | null
    ): Promise<string> {
        let candidate = name
        let n = 2

        while (await this.getFolderByName(candidate, parent_id)) {
            if (n === 2) {
                candidate = `${name} (copy)`
            } else {
                candidate = `${name} (copy ${n})`
            }
            n += 1

            if (n > 100) {
                candidate = `${name} (copy ${Date.now()})`
                break
            }
        }

        return candidate
    }

    async getUniqueFileName(
        name: string,
        folder_id?: string | null
    ): Promise<string> {
        let candidate = name
        let n = 2

        while (await this.getFileByName(candidate, folder_id)) {
            const lastDot = name.lastIndexOf(".")
            const hasExtension = lastDot > 0
            const base = hasExtension ? name.slice(0, lastDot) : name
            const ext = hasExtension ? name.slice(lastDot) : ""

            if (n === 2) {
                candidate = `${base} (copy)${ext}`
            } else {
                candidate = `${base} (copy ${n})${ext}`
            }
            n += 1

            if (n > 100) {
                candidate = `${base} (copy ${Date.now()})${ext}`
                break
            }
        }

        return candidate
    }

    // copy one file into a target folder (shares same storage url/file_id)
    async copyFileToFolder(
        sourceId: string,
        targetFolderId: string | null
    ): Promise<FileDTO> {
        const source = await this.getFile(sourceId)
        if (!source) {
            throw new Error("Source file not found")
        }

        if (targetFolderId && !(await this.getFolder(targetFolderId))) {
            throw new Error("Target folder not found")
        }

        // same name already exists in destination → error (do not auto-rename)
        if (await this.getFileByName(source.name, targetFolderId)) {
            throw new Error(
                `A file named "${source.name}" already exists here`
            )
        }

        const created = await this.createFile({
            name: source.name,
            folder_id: targetFolderId,
            file_id: source.file_id,
            url: source.url,
            mime_type: source.mime_type,
            size: source.size,
            alt: source.alt,
        })

        return created as FileDTO
    }

    // copy folder + all nested folders/files into target parent
    async copyFolderToParent(
        sourceId: string,
        targetParentId: string | null
    ): Promise<FolderDTO> {
        const source = await this.getFolder(sourceId)
        if (!source) {
            throw new Error("Source folder not found")
        }

        if (targetParentId && !(await this.getFolder(targetParentId))) {
            throw new Error("Target parent folder not found")
        }

        // cannot copy a folder into itself or into its own subfolders
        // (that creates endless Root / 123 / 123 / 123 nesting)
        await this.assertFolderPasteTargetIsSafe(sourceId, targetParentId)

        // same name already exists in destination → error (do not auto-rename)
        if (await this.getFolderByName(source.name, targetParentId)) {
            throw new Error(
                `A folder named "${source.name}" already exists here`
            )
        }

        const created = (await this.createFolder({
            name: source.name,
            parent_id: targetParentId,
            sort_order: source.sort_order ?? 0,
        })) as FolderDTO

        // copy files inside this folder
        const files = await this.getListFiles(source.id)
        for (const file of files) {
            await this.copyFileToFolder(file.id, created.id)
        }

        // copy child folders (nested)
        const children = await this.getListFolders(source.id)
        for (const child of children) {
            await this.copyFolderToParent(child.id, created.id)
        }

        return created
    }

    // ---------- CUT / MOVE HELPERS ----------

    // block paste/move of a folder into itself or into a descendant
    async assertFolderPasteTargetIsSafe(
        sourceFolderId: string,
        targetParentId: string | null
    ): Promise<void> {
        if (!targetParentId) {
            return
        }

        if (targetParentId === sourceFolderId) {
            throw new Error("Cannot paste a folder inside itself")
        }

        if (await this.isFolderInside(targetParentId, sourceFolderId)) {
            throw new Error(
                "Cannot paste a folder inside one of its own subfolders"
            )
        }
    }

    // is possibleDescendantId inside ancestorId? (walk parents upward)
    async isFolderInside(
        possibleDescendantId: string,
        ancestorId: string
    ): Promise<boolean> {
        let currentId: string | null = possibleDescendantId

        while (currentId) {
            if (currentId === ancestorId) {
                return true
            }

            const folder = await this.getFolder(currentId)
            if (!folder) {
                return false
            }

            currentId = folder.parent_id
        }

        return false
    }

    // move one file into a target folder (same row, new folder_id)
    async moveFileToFolder(
        sourceId: string,
        targetFolderId: string | null
    ): Promise<FileDTO> {
        const source = await this.getFile(sourceId)
        if (!source) {
            throw new Error("Source file not found")
        }

        if (targetFolderId && !(await this.getFolder(targetFolderId))) {
            throw new Error("Target folder not found")
        }

        // already in this folder — nothing to do
        const sameFolder =
            (source.folder_id ?? null) === (targetFolderId ?? null)
        if (sameFolder) {
            return source
        }

        // same name already exists in destination → error (do not auto-rename)
        const duplicate = await this.getFileByName(source.name, targetFolderId)
        if (duplicate && duplicate.id !== source.id) {
            throw new Error(
                `A file named "${source.name}" already exists here`
            )
        }

        const updated = await this.updateFile(source.id, {
            folder_id: targetFolderId,
        })

        return updated as FileDTO
    }

    // move folder into a target parent (same row, new parent_id)
    async moveFolderToParent(
        sourceId: string,
        targetParentId: string | null
    ): Promise<FolderDTO> {
        const source = await this.getFolder(sourceId)
        if (!source) {
            throw new Error("Source folder not found")
        }

        if (targetParentId && !(await this.getFolder(targetParentId))) {
            throw new Error("Target parent folder not found")
        }

        // cannot move a folder into itself or into its own subfolders
        await this.assertFolderPasteTargetIsSafe(sourceId, targetParentId)

        // already in this parent — nothing to do
        const sameParent =
            (source.parent_id ?? null) === (targetParentId ?? null)
        if (sameParent) {
            return source
        }

        // same name already exists in destination → error (do not auto-rename)
        const duplicate = await this.getFolderByName(source.name, targetParentId)
        if (duplicate && duplicate.id !== source.id) {
            throw new Error(
                `A folder named "${source.name}" already exists here`
            )
        }

        const updated = await this.updateFolder(source.id, {
            parent_id: targetParentId,
        })

        return updated as FolderDTO
    }
}

export default MediaModuleService
