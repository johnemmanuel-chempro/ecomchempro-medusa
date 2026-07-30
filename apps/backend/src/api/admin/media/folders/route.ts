import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEDIA_MODULE } from "../../../../modules/media"
import MediaModuleService from "../../../../modules/media/service"
import { CreateFolderInput } from "../../../../modules/media/types"

export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): MediaModuleService {
    return req.scope.resolve(MEDIA_MODULE)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const body = (req.body ?? {}) as CreateFolderInput

    try {
        if (!body.name || body.name.trim().length === 0) {
            return res.status(400).json({ message: "Folder name is required" })
        }

        const parent_id = body.parent_id ?? null

        if (await service.getFolderByName(body.name.trim(), parent_id)) {
            return res.status(400).json({ message: "Folder with this name already exists here" })
        }

        if (parent_id && !(await service.getFolder(parent_id))) {
            return res.status(400).json({ message: "Parent folder not found" })
        }

        const folder = await service.createFolder({
            name: body.name.trim(),
            parent_id,
            sort_order: body.sort_order ?? 0,
        })

        return res.json(folder)
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to create folder" })
    }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)

    try {
        // ?all=true → every folder (used by sidebar tree)
        const all = req.query.all
        if (all === "true" || all === "1") {
            const folders = await service.getAllFolders()
            return res.json(folders)
        }

        const parent_id = (req.query.parent_id as string | undefined) ?? null
        const folders = await service.getListFolders(parent_id)
        return res.json(folders)
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to get folders" })
    }
}
