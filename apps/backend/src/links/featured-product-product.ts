import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import FeaturedProductsModule from "../modules/featured-products"

export default defineLink(
  ProductModule.linkable.product,
  FeaturedProductsModule.linkable.featuredProduct
)
