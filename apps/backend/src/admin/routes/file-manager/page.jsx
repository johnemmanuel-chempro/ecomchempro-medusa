import { defineRouteConfig } from "@medusajs/admin-sdk"
import FileManager from "../../components/file-manager/FileManager"

export default function FileManagerPage() {
    return <FileManager mode="page" />
}

export const config = defineRouteConfig({
    label: "File Manager",
})
