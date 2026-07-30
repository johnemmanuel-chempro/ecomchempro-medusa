import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BANNERS_MODULE } from "../../../modules/banners"
import BannersModuleService from "../../../modules/banners/service"
import { CreateBannerPlacementInput } from "../../../modules/banners/types"

export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): BannersModuleService {
    return req.scope.resolve(BANNERS_MODULE)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const body = (req.body ?? {}) as CreateBannerPlacementInput

    try {
        if (!body.banner_id) {
            return res.status(400).json({ message: "Banner is required" })
        }

        if (!body.page_key || body.page_key.trim().length === 0) {
            return res.status(400).json({ message: "Page URL is required" })
        }

        // make sure the banner exists
        if (!(await service.getBanner(body.banner_id))) {
            return res.status(400).json({ message: "Banner not found" })
        }

        const placement = await service.createBannerPlacement({
            banner_id: body.banner_id,
            page_key: body.page_key.trim(),
            placement: body.placement?.trim() || "page",
            is_active: body.is_active ?? true,
        })

        return res.json(placement)
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to create banner placement" })
    }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)

    try {
        const placements = await service.getListBannerPlacements()
        return res.json(placements)
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to get banner placements" })
    }
}
