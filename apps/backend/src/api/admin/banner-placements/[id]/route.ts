import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BANNERS_MODULE } from "../../../../modules/banners"
import BannersModuleService from "../../../../modules/banners/service"
import { UpdateBannerPlacementInput } from "../../../../modules/banners/types"

export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): BannersModuleService {
    return req.scope.resolve(BANNERS_MODULE)
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const placement = await service.getBannerPlacement(req.params.id)
    res.json(placement)
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const id = req.params.id

    if (!id) {
        return res.status(400).json({ message: "Placement ID is required" })
    }

    if (!(await service.getBannerPlacement(id))) {
        return res.status(400).json({ message: "Banner placement not found: " + id })
    }

    const body = (req.body ?? {}) as UpdateBannerPlacementInput

    try {
        if (body.banner_id && !(await service.getBanner(body.banner_id))) {
            return res.status(400).json({ message: "Banner not found" })
        }

        const placement = await service.updateBannerPlacement(id, body)
        return res.json(placement)
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to update banner placement" })
    }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const id = req.params.id

    if (!id) {
        return res.status(400).json({ message: "Placement ID is required" })
    }

    if (!(await service.getBannerPlacement(id))) {
        return res.status(400).json({ message: "Banner placement not found: " + id })
    }

    await service.deleteBannerPlacement(id)
    return res.json({ message: "Banner placement deleted successfully" })
}
