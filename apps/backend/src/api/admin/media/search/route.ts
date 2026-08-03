import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEDIA_MODULE } from "../../../../modules/media"
import MediaModuleService from "../../../../modules/media/service"

export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): MediaModuleService {
    return req.scope.resolve(MEDIA_MODULE)
}

/**
 * Search files and folders in the current folder + nested subfolders.
 * GET /admin/media/search?q=banner&folder_id=optional
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const q = (req.query.q as string | undefined) ?? ""
    const folder_id = (req.query.folder_id as string | undefined) ?? null

    try {
        if (!q.trim()) {
            return res.json({ folders: [], files: [], q: "" })
        }

        if (folder_id && !(await service.getFolder(folder_id))) {
            return res.status(400).json({ message: "Folder not found" })
        }

        const result = await service.searchInFolder(q, folder_id)
        return res.json({
            folders: result.folders,
            files: result.files,
            q: q.trim(),
        })
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to search media" })
    }
}
