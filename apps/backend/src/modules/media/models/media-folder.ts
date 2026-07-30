import { model } from "@medusajs/framework/utils"

const MediaFolder = model.define("media_folder", {
    id: model.id().primaryKey(),
    name: model.text(),
    parent_id: model.text().nullable(),
    sort_order: model.number().default(0),
})

export default MediaFolder
