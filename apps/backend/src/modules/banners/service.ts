import { MedusaService } from "@medusajs/framework/utils";
import Banner from "./models/banner";
import BannerPlacement from "./models/banner-placement";
import {
    BannerDTO,
    CreateBannerInput,
    UpdateBannerInput,
    CreateBannerPlacementInput,
    UpdateBannerPlacementInput,
    BannerPlacementDTO,
} from "./types";

class BannersModuleService extends MedusaService({
    Banner,
    BannerPlacement,
}) {
    async createBanner(input: CreateBannerInput): Promise< CreateBannerInput > {
        const banner = await this.createBanners(input);
        return banner as CreateBannerInput;
    }

    async updateBanner(id: string, input: UpdateBannerInput ): Promise<UpdateBannerInput> {
        const banner = await this.updateBanners({ id, ...input });
        return banner as UpdateBannerInput;
    }

    async getBanner(id: string): Promise<BannerDTO | null> {
        const [banner] = await this.listBanners({ id }, { take: 1 })
        return (banner as BannerDTO) ?? null
    }

    async getListBanners(): Promise<BannerDTO[]> {
        const banners = await this.listBanners({});
        return banners as BannerDTO[];
    }

    async getBannerByTitle(title: string): Promise<BannerDTO | null> {
        const [banner] = await this.listBanners({ title }, { take: 1 })
        return (banner as BannerDTO) ?? null
    }

    async deleteBanner(id: string): Promise<void> {
        await this.deleteBanners(id);
    }

    // ---------- BANNER PLACEMENT ----------

    async createBannerPlacement(
        input: CreateBannerPlacementInput
    ): Promise<CreateBannerPlacementInput> {
        const placement = await this.createBannerPlacements(input);
        return placement as CreateBannerPlacementInput;
    }

    async updateBannerPlacement(
        id: string,
        input: UpdateBannerPlacementInput
    ): Promise<UpdateBannerPlacementInput> {
        const placement = await this.updateBannerPlacements({ id, ...input });
        return placement as UpdateBannerPlacementInput;
    }

    async getBannerPlacement(id: string): Promise<BannerPlacementDTO | null> {
        const [placement] = await this.listBannerPlacements({ id }, { take: 1 });
        return (placement as BannerPlacementDTO) ?? null;
    }

    async getListBannerPlacements(): Promise<BannerPlacementDTO[]> {
        const placements = await this.listBannerPlacements({});
        return placements as BannerPlacementDTO[];
    }

    async deleteBannerPlacement(id: string): Promise<void> {
        await this.deleteBannerPlacements(id);
    }
}

export default BannersModuleService;
