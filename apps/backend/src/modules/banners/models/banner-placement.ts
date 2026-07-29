// banner-placement.ts
import { model } from "@medusajs/framework/utils"
import Banner from "./banner"

const BannerPlacement = model.define("banner_placement", {
  id: model.id().primaryKey(),
  banner_id: model.text(),
  placement: model.text(),
  page_key: model.text(),
  is_active: model.boolean().default(true),
})

export default BannerPlacement