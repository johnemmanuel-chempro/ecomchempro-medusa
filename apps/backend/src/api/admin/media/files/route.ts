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

    // multer.array("files") puts files on req.files
    const files = (req.files as Express.Multer.File[] | undefined) || []

    try {
        if (!files.length) {
            return res.status(400).json({ message: "At least one image file is required" })
        }

        const folder_id = (req.body?.folder_id as string | undefined) || null

        if (folder_id && !(await service.getFolder(folder_id))) {
            return res.status(400).json({ message: "Folder not found" })
        }

        // check every file is an allowed image type
        for (const file of files) {
            if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
                return res.status(400).json({
                    message: `Only image files are allowed (jpeg, png, webp, gif). Bad file: ${file.originalname}`,
                })
            }
        }

        // 1) upload all binaries to Medusa File Module
        const { result } = await uploadFilesWorkflow(req.scope).run({
            input: {
                files: files.map((file) => ({
                    filename: file.originalname,
                    mimeType: file.mimetype,
                    content: file.buffer.toString("base64"),
                    access: "public" as const,
                })),
            },
        })

        if (!result?.length) {
            return res.status(400).json({ message: "Failed to upload files to storage" })
        }

        // 2) save one media_file row per uploaded file
        const createdFiles = []

        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            const uploaded = result[i]

            if (!uploaded?.url || !uploaded?.id) {
                continue
            }

            // if name already exists here, auto-rename: photo (copy).png
            const name = await service.getUniqueFileName(
                file.originalname,
                folder_id
            )

            const mediaFile = await service.createFile({
                name,
                folder_id,
                file_id: uploaded.id,
                url: uploaded.url,
                mime_type: file.mimetype,
                size: file.size,
                alt: null,
            })

            createdFiles.push(mediaFile)
        }

        if (!createdFiles.length) {
            return res.status(400).json({ message: "Failed to save uploaded files" })
        }

        // return array (UI can handle 1 or many)
        return res.json({
            files: createdFiles,
            count: createdFiles.length,
            message: `Uploaded ${createdFiles.length} file(s)`,
        })
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
