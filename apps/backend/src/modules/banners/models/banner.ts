import { model } from "@medusajs/framework/utils"

const Banner = model.define("banner", {
    id: model.id().primaryKey(),
    title: model.text(),
    description: model.text().nullable(),
    image_url: model.text().nullable(),
    image_alt: model.text().nullable(),
    parent_id: model.text().nullable(),
    sort_order: model.number().default(0),
    is_active: model.boolean().default(true),
    
});

export default Banner;