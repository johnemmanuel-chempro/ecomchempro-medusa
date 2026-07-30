import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { deleteFilesWorkflow } from "@medusajs/medusa/core-flows"
import { MEDIA_MODULE } from "../../../../../modules/media"
import MediaModuleService from "../../../../../modules/media/service"
import { UpdateFileInput } from "../../../../../modules/media/types"

export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): MediaModuleService {
    return req.scope.resolve(MEDIA_MODULE)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const file = await service.getFile(req.params.id)
    res.json(file)
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const id = req.params.id

    if (!id) {
        return res.status(400).json({ message: "File ID is required" })
    }

    const existing = await service.getFile(id)
    if (!existing) {
        return res.status(400).json({ message: "File not found: " + id })
    }

    const body = (req.body ?? {}) as UpdateFileInput

    try {
        // rename: check duplicate name in same folder
        if (body.name && body.name.trim().length > 0) {
            const duplicate = await service.getFileByName(
                body.name.trim(),
                existing.folder_id
            )
            if (duplicate && duplicate.id !== id) {
                return res.status(400).json({ message: "File with this name already exists here" })
            }
            body.name = body.name.trim()
        }

        const file = await service.updateFile(id, body)
        return res.json(file)
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to update file" })
    }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const id = req.params.id

    if (!id) {
        return res.status(400).json({ message: "File ID is required" })
    }

    const existing = await service.getFile(id)
    if (!existing) {
        return res.status(400).json({ message: "File not found: " + id })
    }

    try {
        // only delete binary from storage if no other media_file uses it
        // (copy/paste can share the same file_id)
        const sharedCount = await service.countFilesByFileId(existing.file_id)

        if (sharedCount <= 1) {
            await deleteFilesWorkflow(req.scope).run({
                input: {
                    ids: [existing.file_id],
                },
            })
        }
    } catch (error) {
        console.log(error)
        // still delete DB row even if storage delete fails
    }

    // delete metadata row
    await service.deleteFile(id)
    return res.json({ message: "File deleted successfully" })
}
