import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Tabs, Button, FocusModal, Input, Label, Switch } from "@medusajs/ui"
import { adminFetch } from "../../lib/sdk"
import { useState, useEffect } from "react"
import { toast } from "sonner"


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

    const handleCreateBanner = async () => {
        try {
            const response = await adminFetch("/admin/banners", {
                method: "POST",
                body: bannerPostData
            })
            console.log(response)
            if (response.id){
                showToast("Banner created successfully", "success")
                fetchBanners()
            } else {
                showToast(response.message, "error")
            }
        } catch (error) {
            showToast(error.message, "error")
        }
    }

    const showToast = (message, type) => {
        toast[type](message, {
            position: "top-right"
        })

        if (type === "success") {
            setBannerPostData(prev => ({ ...prev, title: "", description: "", image_url: "", image_alt: "", is_active: true }))
        } else {
            setBannerPostData(prev => ({ ...prev, error: message }))
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

            <div className="flex gap-x-4 mb-2 items-end">
                <div className="min-w-0 flex-1">
                    <Label>Banner Image URL</Label>
                    <Input
                        placeholder="Banner image URL"
                        value={bannerPostData.image_url}
                        onChange={(e) => setBannerPostData({ ...bannerPostData, image_url: e.target.value })}
                    />
                </div>

                <div className="min-w-0 flex-1">
                    <Label>Banner Image Alt</Label>
                    <Input
                        placeholder="Banner image alt"
                        value={bannerPostData.image_alt}
                        onChange={(e) => setBannerPostData({ ...bannerPostData, image_alt: e.target.value })}
                    />
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

            <div className="mt-3">
                <Button variant="primary" onClick={handleCreateBanner}>Create Banner</Button>
            </div>

            <hr className="my-4" />

            {
                banners.length === 0 && (
                    <Container className="mb-2">
                        <p>No banners found</p>
                    </Container>
                )
            }

            {
                banners.map((banner) => (
                    <Container className="mb-2" key={banner.id}>
                        <div className="flex flex-col gap-y-2">
                            <p>Title: {banner.title}</p>
                            <p>Description: {banner.description}</p>
                            <p>Image URL: {banner.image_url}</p>
                            <p>Image Alt: {banner.image_alt}</p>
                            <p>Status: {banner.is_active ? "Active" : "Inactive"}</p>
                            <Button variant="danger" onClick={() => handleDeleteBanner(banner.id)}>Delete Banner</Button>
                        </div>
                    </Container>
                ))
            }
            
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
