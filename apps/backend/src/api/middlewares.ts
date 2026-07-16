import multer from "multer"
import { defineMiddlewares } from "@medusajs/framework/http"

const upload = multer({ storage: multer.memoryStorage() })

export default defineMiddlewares({
  routes: [
    {
      method: ["POST"],
      matcher: "/admin/import-export/:entity",
      middlewares: [upload.single("file")],
    },
  ],
})
