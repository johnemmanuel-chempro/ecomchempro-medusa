import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { MEDIA_MODULE } from "../../../../../modules/media"
import MediaModuleService from "../../../../../modules/media/service"

export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): MediaModuleService {
    return req.scope.resolve(MEDIA_MODULE)
}

// Move (cut + paste) a folder into a parent folder
// body: { source_id: string, parent_id?: string | null }
export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const body = (req.body ?? {}) as {
        source_id?: string
        parent_id?: string | null
    }

    try {
        if (!body.source_id) {
            return res.status(400).json({ message: "source_id is required" })
        }

        const parent_id = body.parent_id ?? null
        const moved = await service.moveFolderToParent(body.source_id, parent_id)
        return res.json(moved)
    } catch (error) {
        console.log(error)
        return res.status(400).json({
            message: (error as Error).message || "Failed to move folder",
        })
    }
}
