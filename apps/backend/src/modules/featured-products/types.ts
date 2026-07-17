export type FeaturedSettingsDTO = {
  id: string
  enabled: boolean
  title: string
  subtitle: string | null
  max_items: number
}

export type FeaturedProductDTO = {
  id: string
  product_id: string
  rank: number
  is_active: boolean
}

export type UpdateFeaturedSettingsInput = {
  enabled?: boolean
  title?: string
  subtitle?: string | null
  max_items?: number
}

export type UpdateFeaturedProductInput = {
  rank?: number
  is_active?: boolean
}

export const DEFAULT_SETTINGS_ID = "default"

export const DEFAULT_SETTINGS: Omit<FeaturedSettingsDTO, "id"> = {
  enabled: false,
  title: "Featured Products",
  subtitle: "Hand-picked products for the homepage.",
  max_items: 8,
}
