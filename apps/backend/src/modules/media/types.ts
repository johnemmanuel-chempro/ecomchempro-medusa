export const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
]

export type CreateFolderInput = {
    name: string
    parent_id?: string | null
    sort_order?: number
}

export type UpdateFolderInput = {
    name?: string
    parent_id?: string | null
    sort_order?: number
}

export type FolderDTO = {
    id: string
    name: string
    parent_id: string | null
    sort_order: number
}

export type CreateFileInput = {
    name: string
    folder_id?: string | null
    file_id: string
    url: string
    mime_type: string
    size: number
    alt?: string | null
}

export type UpdateFileInput = {
    name?: string
    folder_id?: string | null
    alt?: string | null
}

export type FileDTO = {
    id: string
    name: string
    folder_id: string | null
    file_id: string
    url: string
    mime_type: string
    size: number
    alt: string | null
}
