import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BANNERS_MODULE } from "../../../../modules/banners";
import BannersModuleService from "../../../../modules/banners/service";
import { UpdateBannerInput } from "../../../../modules/banners/types";
export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): BannersModuleService {
    return req.scope.resolve(BANNERS_MODULE);
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req);
    const banner = await service.getBanner(req.params.id);
    res.json(banner);
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req);
    const id = req.params.id;

    if(!id) {
        return res.status(400).json({ message: "Banner ID is required" });
    }

    if(!await service.getBanner(id)) {
        return res.status(400).json({ message: "Banner not found: "+id });
    }

    const body = (req.body ?? {}) as UpdateBannerInput

    try {
        const banner = await service.updateBanner(id, body);
        return res.json(banner);
    } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "Failed to update banner" });
    }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req);
    const id = req.params.id;
    if(!id) {
        return res.status(400).json({ message: "Banner ID is required" });
    }

    await service.deleteBanner(id);
    return res.json({ message: "Banner deleted successfully" });
}
