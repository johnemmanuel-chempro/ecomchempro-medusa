import { model } from "@medusajs/framework/utils"

const FeaturedProduct = model.define("featured_product", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  rank: model.number().default(0),
  is_active: model.boolean().default(true),
})

export default FeaturedProduct
