import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEDIA_MODULE } from "../../../../../modules/media"
import MediaModuleService from "../../../../../modules/media/service"
import { UpdateFolderInput } from "../../../../../modules/media/types"

export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): MediaModuleService {
    return req.scope.resolve(MEDIA_MODULE)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const folder = await service.getFolder(req.params.id)
    res.json(folder)
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const id = req.params.id

    if (!id) {
        return res.status(400).json({ message: "Folder ID is required" })
    }

    const existing = await service.getFolder(id)
    if (!existing) {
        return res.status(400).json({ message: "Folder not found: " + id })
    }

    const body = (req.body ?? {}) as UpdateFolderInput

    try {
        // rename: check duplicate name in same parent
        if (body.name && body.name.trim().length > 0) {
            const duplicate = await service.getFolderByName(
                body.name.trim(),
                existing.parent_id
            )
            if (duplicate && duplicate.id !== id) {
                return res.status(400).json({ message: "Folder with this name already exists here" })
            }
            body.name = body.name.trim()
        }

        const folder = await service.updateFolder(id, body)
        return res.json(folder)
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to update folder" })
    }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const id = req.params.id

    if (!id) {
        return res.status(400).json({ message: "Folder ID is required" })
    }

    if (!(await service.getFolder(id))) {
        return res.status(400).json({ message: "Folder not found: " + id })
    }

    // block delete if folder still has children or files
    const childFolders = await service.getListFolders(id)
    const childFiles = await service.getListFiles(id)

    if (childFolders.length > 0 || childFiles.length > 0) {
        return res.status(400).json({
            message: "Folder is not empty. Delete files and subfolders first.",
        })
    }

    await service.deleteFolder(id)
    return res.json({ message: "Folder deleted successfully" })
}
