import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Tabs, Button, FocusModal, Input, Label, Switch, Badge } from "@medusajs/ui"
import { adminFetch } from "../../lib/sdk"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import FileManager from "../../components/file-manager/FileManager"
import { Trash2 } from "lucide-react"
const EntityPanel = ({ entity, title, description }) => {
    const [bannerPostData, setBannerPostData] = useState({
        title: "",
        description: "",
        image_url: "",
        image_alt: "",
        sort_order: 0,
        is_active: true
    })
    const [banners, setBanners] = useState([])

    // how to set the image: "url" = type it, "file_manager" = pick from media
    const [imageSource, setImageSource] = useState("url")

    // show the real File Manager inside a modal
    const [pickerOpen, setPickerOpen] = useState(false)

    const showToast = (message, type) => {
        toast[type](message, {
            position: "top-right"
        })
    }

    const resetBannerForm = () => {
        setBannerPostData({
            title: "",
            description: "",
            image_url: "",
            image_alt: "",
            sort_order: 0,
            is_active: true,
        })
        setImageSource("url")
    }

    const handleCreateBanner = async () => {
        try {
            const response = await adminFetch("/admin/banners", {
                method: "POST",
                body: bannerPostData
            })
            console.log(response)
            if (response.id){
                showToast("Banner created successfully", "success")
                resetBannerForm()
                fetchBanners()
            } else {
                showToast(response.message, "error")
            }
        } catch (error) {
            showToast(error.message, "error")
        }
    }

    const fetchBanners = async () => {
        try {
            const response = await adminFetch("/admin/banners", {
                method: "GET"
            })
            setBanners(response)
        } catch (error) {
            showToast("Failed to fetch banners", "error")
        }
    }

    const handleDeleteBanner = async (id) => {
        try {
            const response = await adminFetch("/admin/banners/"+id, {
                method : "DELETE",
            })
            showToast(response.message, "success")
            fetchBanners()
        } catch (error) {
            showToast(error.message, "error")
        }
    }

    const openFileManagerPicker = () => {
        setPickerOpen(true)
    }

    const closeFileManagerPicker = () => {
        setPickerOpen(false)
    }

    // File Manager picked an image → fill banner image_url
    const handleSelectFileFromManager = (file) => {
        setBannerPostData((prev) => ({
            ...prev,
            image_url: file.url,
            image_alt: prev.image_alt || file.name || "",
        }))
        setImageSource("file_manager")
        closeFileManagerPicker()
        showToast("Image selected from File Manager", "success")
    }

    useEffect(() => {
        fetchBanners()
    }, [])

    const bannersContent = () => {
        return (
        <Container className="p-6  ">
            <div className="flex gap-x-4 mb-2">
                <div className="">
                    <Label>Banner Title</Label>
                    <Input
                        placeholder="Banner title"
                        value={bannerPostData.title}
                        onChange={(e) => setBannerPostData({ ...bannerPostData, title: e.target.value })}
                    />
                </div>
                <div className="flex-1">
                    <Label>Banner Description</Label>
                    <Input
                        placeholder="Banner description"
                        value={bannerPostData.description}
                        onChange={(e) => setBannerPostData({ ...bannerPostData, description: e.target.value })}
                    />
                </div>
            </div>

            {/* choose: type URL or pick from File Manager */}
            <div className="mb-2">
                <Label>Image source</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                    <Button
                        size="small"
                        variant={imageSource === "url" ? "primary" : "secondary"}
                        onClick={() => setImageSource("url")}
                    >
                        Enter URL
                    </Button>
                    <Button
                        size="small"
                        variant={imageSource === "file_manager" ? "primary" : "secondary"}
                        onClick={() => {
                            setImageSource("file_manager")
                            openFileManagerPicker()
                        }}
                    >
                        Select from File Manager
                    </Button>
                </div>
            </div>

            <div className="flex gap-x-4 mb-2 items-end">
                <div className="min-w-0 flex-1">
                    <Label>Banner Image URL</Label>
                    <Input
                        placeholder="Banner image URL"
                        value={bannerPostData.image_url}
                        onChange={(e) => {
                            setImageSource("url")
                            setBannerPostData({ ...bannerPostData, image_url: e.target.value })
                        }}
                    />
                    <Text size="small" className="text-ui-fg-subtle mt-1">
                        You can type a URL, or pick an image from File Manager.
                    </Text>
                </div>

                <div className="min-w-0 flex-1">
                    <Label>Banner Image Alt</Label>
                    <Input
                        placeholder="Banner image alt"
                        value={bannerPostData.image_alt}
                        onChange={(e) => setBannerPostData({ ...bannerPostData, image_alt: e.target.value })}
                    />
                    <Text size="small" className="text-ui-fg-subtle mt-1">
                        This is the alt text for the image. 
                    </Text>
                </div>

                <div className="shrink-0 pb-1">
                    <Label>Status</Label>
                    <div className="flex h-8 items-center">
                        <Switch
                            checked={bannerPostData.is_active}
                            onCheckedChange={(checked) =>
                                setBannerPostData((prev) => ({ ...prev, is_active: checked }))
                            }
                        />
                    </div>
                </div>
            </div>

            {/* small preview when we have an image url */}
            {bannerPostData.image_url && (
                <div className="mb-3">
                    <Label>Preview</Label>
                    <img
                        src={bannerPostData.image_url}
                        alt={bannerPostData.image_alt || "Banner preview"}
                        style={{
                            maxWidth: "280px",
                            maxHeight: "120px",
                            objectFit: "contain",
                            marginTop: "8px",
                        }}
                    />
                </div>
            )}

            <div className="mt-3">
                <Button variant="primary" onClick={handleCreateBanner}>Create Banner</Button>
            </div>

            {/* ---------- REAL FILE MANAGER AS SELECTOR ---------- */}
            <FocusModal
                open={pickerOpen}
                onOpenChange={(open) => {
                    if (!open) {
                        closeFileManagerPicker()
                    }
                }}
            >
                <FocusModal.Content>
                    <FocusModal.Header>
                        <Heading>Select image from File Manager</Heading>
                    </FocusModal.Header>
                    <FocusModal.Body className="px-4 py-4 overflow-auto">
                        <FileManager
                            mode="picker"
                            onSelectFile={handleSelectFileFromManager}
                        />
                    </FocusModal.Body>
                    <FocusModal.Footer>
                        <Button variant="secondary" onClick={closeFileManagerPicker}>
                            Cancel
                        </Button>
                    </FocusModal.Footer>
                </FocusModal.Content>
            </FocusModal>

            <hr className="my-4" />

            <div className="mb-3 flex items-center justify-between">
                <Heading level="h2">Existing banners</Heading>
                <Text size="small" className="text-ui-fg-subtle">
                    {banners.length} banner{banners.length === 1 ? "" : "s"}
                </Text>
            </div>

            {banners.length === 0 && (
                <div className="rounded-md border border-dashed border-ui-border-base px-4 py-8 text-center">
                    <Text className="text-ui-fg-subtle">
                        No banners yet. Create one using the form above.
                    </Text>
                </div>
            )}

            <div className="flex flex-col gap-y-3">
                {banners.map((banner) => (
                    <div
                        key={banner.id}
                        className="flex flex-col gap-4 rounded-md border border-ui-border-base p-4 sm:flex-row sm:items-center"
                    >
                        {/* thumbnail */}
                        <div className="flex h-24 w-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-ui-bg-subtle sm:h-20 sm:w-36">
                            {banner.image_url ? (
                                <img
                                    src={banner.image_url}
                                    alt={banner.image_alt || banner.title}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Text size="small" className="text-ui-fg-muted">
                                    No image
                                </Text>
                            )}
                        </div>

                        {/* details */}
                        <div className="min-w-0 flex-1 flex flex-col gap-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <Text weight="plus">{banner.title}</Text>
                                <Badge color={banner.is_active ? "green" : "grey"}>
                                    {banner.is_active ? "Active" : "Inactive"}
                                </Badge>
                            </div>

                            {banner.description ? (
                                <Text size="small" className="text-ui-fg-subtle line-clamp-2">
                                    {banner.description}
                                </Text>
                            ) : (
                                <Text size="small" className="text-ui-fg-muted">
                                    No description
                                </Text>
                            )}

                            {banner.image_alt && (
                                <Text size="small" className="text-ui-fg-subtle">
                                    Alt: {banner.image_alt}
                                </Text>
                            )}

                            {banner.image_url && (
                                <Text
                                    size="small"
                                    className="truncate text-ui-fg-muted"
                                    title={banner.image_url}
                                >
                                    {banner.image_url}
                                </Text>
                            )}
                        </div>

                        {/* actions */}
                        <div className="flex shrink-0 items-center gap-2">
                            {banner.image_url && (
                                <Button
                                    size="small"
                                    variant="secondary"
                                    onClick={() => {
                                        navigator.clipboard.writeText(banner.image_url)
                                        showToast("Image URL copied", "success")
                                    }}
                                >
                                    Copy URL
                                </Button>
                            )}
                            <Button
                                size="small"
                                variant="danger"
                                onClick={() => handleDeleteBanner(banner.id)}
                            >
                                <Trash2 size={16} className="mr-1" /> Delete
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
            
        </Container>)
    }

    return (
        <Container className=" p-0 divide-y">
            <div className="flex flex-col gap-y-2 px-6 py-4">
                <Heading level="h2">{title}</Heading>
                <Text size="small" className="text-ui-fg-subtle">{description}</Text>
            </div>
            <div className="flex flex-col gap-y-6 px-6 py-4">
                <div className="flex flex-wrap items-center gap-2"> 
                    {
                        entity == 'banners' && bannersContent()
                    }
                </div>
            </div>
        </Container>
    )
}

export default function BannersPage() {
    return (
        <div className="flex flex-col gap-y-4">
            <Container className="p-0">
                <div className="px-6 py-4">
                    <Heading level="h1">Banners Management</Heading>
                    <Text size="small" className="text-ui-fg-subtle">
                        Manage banners for the storefront.
                    </Text>
                </div>
            </Container>
            
            <Tabs defaultValue="banners">
                <Tabs.List>
                    <Tabs.Trigger value="banners">Banners</Tabs.Trigger>
                    <Tabs.Trigger value="banner-placement">Banners Placement</Tabs.Trigger>
                </Tabs.List>

                <Tabs.Content value="banners" className="mt-4">
                    <EntityPanel
                        entity="banners"
                        title="Banners"
                        description="Manage banners for the storefront."
                    />
                </Tabs.Content>

                <Tabs.Content value="banner-placement" className="mt-4">
                    <EntityPanel
                        entity="banner-placement"
                        title="Banner Placement"
                        description="Manage banner placement for the storefront."
                    />
                </Tabs.Content>
            </Tabs>
        </div>
    )
}

export const config = defineRouteConfig({
    label: "Banners",
})
