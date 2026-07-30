import { model } from "@medusajs/framework/utils"

const MediaFile = model.define("media_file", {
    id: model.id().primaryKey(),
    name: model.text(),
    folder_id: model.text().nullable(),
    file_id: model.text(),
    url: model.text(),
    mime_type: model.text(),
    size: model.number(),
    alt: model.text().nullable(),
})

export default MediaFile
