

export type CreateBannerInput = {
    title: string;
    description?: string;
    image_url?: string;
    image_alt?: string;
    parent_id?: string;
    sort_order?: number | 0;
    is_active?: boolean | true;
}
 
export type UpdateBannerInput = {
    title?: string;
    description?: string;
    image_url?: string;
    image_alt?: string;
    parent_id?: string;
    sort_order?: number;
    is_active?: boolean;
}

export type BannerDTO = {
    id: string;
    title: string;
    description: string;
    image_url: string;
    image_alt: string;
    parent_id: string;
    sort_order: number;
    is_active: boolean;
}