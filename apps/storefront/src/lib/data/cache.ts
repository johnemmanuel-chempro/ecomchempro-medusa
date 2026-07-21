export const bypassStorefrontCache = () =>
  process.env.MEDUSA_STOREFRONT_NO_CACHE === "true"
