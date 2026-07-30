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
}

export default MediaModuleService
