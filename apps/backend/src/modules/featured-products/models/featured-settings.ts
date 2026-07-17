import { model } from "@medusajs/framework/utils"

const FeaturedSettings = model.define("featured_settings", {
  id: model.id().primaryKey(),
  enabled: model.boolean().default(false),
  title: model.text().default("Featured Products"),
  subtitle: model.text().nullable(),
  max_items: model.number().default(8),
})

export default FeaturedSettings
