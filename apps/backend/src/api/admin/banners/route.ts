import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BANNERS_MODULE } from "../../../modules/banners";
import BannersModuleService from "../../../modules/banners/service";
import { CreateBannerInput, UpdateBannerInput } from "../../../modules/banners/types";
export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): BannersModuleService {
    return req.scope.resolve(BANNERS_MODULE);
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req);
    const body = (req.body ?? {}) as CreateBannerInput

    try {
        if(body.title?.length === 0) {
            return res.status(400).json({ message: "Title is required" });
        }
        
        if(await service.getBannerByTitle(body.title)) {
            return res.status(400).json({ message: "Banner with this title already exists" });
        }
        
        const banner = await service.createBanner(body);
        return res.json(banner);
    } catch (error) {
        console.log(error);
        return res.status(400).json({
            message: "Failed to create banner",
        });
    }
}

export async function PUT(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req);
    const id = req.params.id;
    const body = (req.body ?? {}) as UpdateBannerInput

    try {
        const banner = await service.updateBanner(id, body);
        return res.json(banner);
    } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "Failed to update banner" });
    }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req);

    try {
        const banners = await service.getListBanners();
        return res.json(banners);
    } catch (error) {
        console.log(error);
        return res.status(400).json({ message: "Failed to get banners" });
    }
}