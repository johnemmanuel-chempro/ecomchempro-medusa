

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

// ---------- BANNER PLACEMENT ----------

export type CreateBannerPlacementInput = {
    banner_id: string;
    // storefront path/url (e.g. "/", "/home", "/products")
    page_key: string;
    // kept for DB compatibility; defaults to "page" when omitted
    placement?: string;
    is_active?: boolean;
}

export type UpdateBannerPlacementInput = {
    banner_id?: string;
    placement?: string;
    page_key?: string;
    is_active?: boolean;
}

export type BannerPlacementDTO = {
    id: string;
    banner_id: string;
    placement: string;
    page_key: string;
    is_active: boolean;
}
