import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { uploadFilesWorkflow } from "@medusajs/medusa/core-flows"
import { MEDIA_MODULE } from "../../../../modules/media"
import MediaModuleService from "../../../../modules/media/service"
import { ALLOWED_IMAGE_TYPES } from "../../../../modules/media/types"

export const AUTHENTICATE = false // temporarily disable authentication

function getService(req: MedusaRequest): MediaModuleService {
    return req.scope.resolve(MEDIA_MODULE)
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const file = req.file

    try {
        if (!file) {
            return res.status(400).json({ message: "Image file is required" })
        }

        if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
            return res.status(400).json({
                message: "Only image files are allowed (jpeg, png, webp, gif)",
            })
        }

        const folder_id = (req.body?.folder_id as string | undefined) || null
        const name = (
            (req.body?.name as string | undefined) ||
            file.originalname
        ).trim()

        if (!name) {
            return res.status(400).json({ message: "File name is required" })
        }

        if (folder_id && !(await service.getFolder(folder_id))) {
            return res.status(400).json({ message: "Folder not found" })
        }

        if (await service.getFileByName(name, folder_id)) {
            return res.status(400).json({ message: "File with this name already exists here" })
        }

        // 1) upload binary to Medusa File Module (saves under /static)
        const { result } = await uploadFilesWorkflow(req.scope).run({
            input: {
                files: [
                    {
                        filename: file.originalname,
                        mimeType: file.mimetype,
                        content: file.buffer.toString("base64"),
                        access: "public",
                    },
                ],
            },
        })

        const uploaded = result?.[0]
        if (!uploaded?.url || !uploaded?.id) {
            return res.status(400).json({ message: "Failed to upload file to storage" })
        }

        // 2) save metadata row in our media_file table
        const mediaFile = await service.createFile({
            name,
            folder_id,
            file_id: uploaded.id,
            url: uploaded.url,
            mime_type: file.mimetype,
            size: file.size,
            alt: (req.body?.alt as string | undefined) || null,
        })

        return res.json(mediaFile)
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to create file" })
    }
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
    const service = getService(req)
    const folder_id = (req.query.folder_id as string | undefined) ?? null

    try {
        const files = await service.getListFiles(folder_id)
        return res.json(files)
    } catch (error) {
        console.log(error)
        return res.status(400).json({ message: "Failed to get files" })
    }
}
