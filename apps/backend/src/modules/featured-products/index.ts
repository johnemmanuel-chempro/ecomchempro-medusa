import { Module } from "@medusajs/framework/utils"
import FeaturedProductsModuleService from "./service"

export const FEATURED_PRODUCTS_MODULE = "featuredProducts"

export default Module(FEATURED_PRODUCTS_MODULE, {
  service: FeaturedProductsModuleService,
})
