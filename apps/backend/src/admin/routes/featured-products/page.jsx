import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Switch,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"
import { adminFetch, searchProducts } from "../../lib/sdk"

const FeaturedProductsPage = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingSettings, setIsSavingSettings] = useState(false)
  const [isAddingProduct, setIsAddingProduct] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [settings, setSettings] = useState({
    enabled: false,
    title: "Featured Products",
    subtitle: "",
    max_items: 8,
  })
  const [featuredProducts, setFeaturedProducts] = useState([])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await adminFetch("admin/featured-products")
      setSettings(response.settings)
      setFeaturedProducts(response.featured_products ?? [])
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load featured products"
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveSettings = async () => {
    setIsSavingSettings(true)
    try {
      const response = await adminFetch("admin/featured-products/settings", {
        method: "PUT",
        body: {
          enabled: settings.enabled,
          title: settings.title,
          subtitle: settings.subtitle || null,
          max_items: Number(settings.max_items),
        },
      })
      setSettings(response.settings)
      toast.success("Settings saved")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save settings"
      )
    } finally {
      setIsSavingSettings(false)
    }
  }

  const handleSearchProducts = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const products = await searchProducts(searchQuery.trim())
      setSearchResults(products)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to search products"
      )
    } finally {
      setIsSearching(false)
    }
  }

  const featuredProductIds = useMemo(
    () => new Set(featuredProducts.map((item) => item.product_id)),
    [featuredProducts]
  )

  const handleAddProduct = async (productId) => {
    setIsAddingProduct(true)
    try {
      const response = await adminFetch("admin/featured-products", {
        method: "POST",
        body: { product_id: productId },
      })
      setFeaturedProducts((current) => [...current, response.featured_product])
      setSearchResults((current) => current.filter((product) => product.id !== productId))
      toast.success("Product added to featured list")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add featured product"
      )
    } finally {
      setIsAddingProduct(false)
    }
  }

  const handleToggleActive = async (item) => {
    try {
      const response = await adminFetch(`admin/featured-products/${item.id}`, {
        method: "PATCH",
        body: { is_active: !item.is_active },
      })
      setFeaturedProducts((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, ...response.featured_product } : entry
        )
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update featured product"
      )
    }
  }

  const handleRemove = async (item) => {
    try {
      await adminFetch(`admin/featured-products/${item.id}`, {
        method: "DELETE",
      })
      setFeaturedProducts((current) =>
        current.filter((entry) => entry.id !== item.id)
      )
      toast.success("Featured product removed")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove featured product"
      )
    }
  }

  const moveItem = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= featuredProducts.length) {
      return
    }

    const reordered = [...featuredProducts]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)

    setFeaturedProducts(reordered)

    try {
      const response = await adminFetch("admin/featured-products/reorder", {
        method: "PUT",
        body: { ids: reordered.map((item) => item.id) },
      })
      setFeaturedProducts(response.featured_products)
    } catch (error) {
      await loadData()
      toast.error(
        error instanceof Error ? error.message : "Failed to reorder featured products"
      )
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Featured Products</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Manage curated products and homepage settings for the storefront.
          </Text>
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4 flex flex-col gap-y-4">
          <div>
            <Heading level="h2">Homepage settings</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Control whether the featured section appears on the homepage.
            </Text>
          </div>

          <div className="flex items-center justify-between gap-x-4 rounded-lg border border-ui-border-base px-4 py-3">
            <div>
              <Text weight="plus">Enabled</Text>
              <Text size="small" className="text-ui-fg-subtle">
                Show the featured products section on the homepage.
              </Text>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) =>
                setSettings((current) => ({ ...current, enabled: checked }))
              }
            />
          </div>

          <div className="grid gap-4 small:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="featured-title">Title</Label>
              <Input
                id="featured-title"
                value={settings.title}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>

            <div className="flex flex-col gap-y-2">
              <Label htmlFor="featured-max-items">Max items</Label>
              <Input
                id="featured-max-items"
                type="number"
                min={1}
                value={settings.max_items}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    max_items: Number(event.target.value),
                  }))
                }
              />
            </div>
          </div>

          <div className="flex flex-col gap-y-2">
            <Label htmlFor="featured-subtitle">Subtitle</Label>
            <Input
              id="featured-subtitle"
              value={settings.subtitle ?? ""}
              onChange={(event) =>
                setSettings((current) => ({
                  ...current,
                  subtitle: event.target.value,
                }))
              }
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleSaveSettings}
              isLoading={isSavingSettings}
              disabled={isLoading}
            >
              Save settings
            </Button>
          </div>
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4 flex flex-col gap-y-4">
          <div>
            <Heading level="h2">Featured products</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Add existing products and control their display order.
            </Text>
          </div>

          <div className="flex flex-col gap-y-2 rounded-lg border border-ui-border-base p-4">
            <Label htmlFor="product-search">Search products</Label>
            <div className="flex gap-2">
              <Input
                id="product-search"
                placeholder="Search by title, handle, or SKU"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleSearchProducts()
                  }
                }}
              />
              <Button
                variant="secondary"
                onClick={handleSearchProducts}
                isLoading={isSearching}
              >
                Search
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="mt-2 flex flex-col gap-y-2">
                {searchResults.map((product) => {
                  const alreadyFeatured = featuredProductIds.has(product.id)

                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between gap-x-3 rounded-md border border-ui-border-base px-3 py-2"
                    >
                      <div>
                        <Text weight="plus">{product.title}</Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          {product.handle}
                        </Text>
                      </div>
                      <Button
                        size="small"
                        variant="secondary"
                        disabled={alreadyFeatured || isAddingProduct}
                        onClick={() => handleAddProduct(product.id)}
                      >
                        {alreadyFeatured ? "Added" : "Add"}
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {isLoading ? (
            <Text className="text-ui-fg-subtle">Loading featured products...</Text>
          ) : featuredProducts.length === 0 ? (
            <Text className="text-ui-fg-subtle">
              No featured products yet. Search and add products above.
            </Text>
          ) : (
            <div className="flex flex-col gap-y-2">
              {featuredProducts.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-x-3 rounded-md border border-ui-border-base px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-y-1">
                    <div className="flex items-center gap-x-2">
                      <Text weight="plus">
                        {item.product?.title ?? item.product_id}
                      </Text>
                      <Badge color={item.is_active ? "green" : "grey"}>
                        {item.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <Text size="small" className="text-ui-fg-subtle">
                      {item.product?.handle ?? "Unknown product"} · Rank {index + 1}
                    </Text>
                  </div>

                  <div className="flex items-center gap-x-2">
                    <Button
                      size="small"
                      variant="secondary"
                      disabled={index === 0}
                      onClick={() => moveItem(index, -1)}
                    >
                      Up
                    </Button>
                    <Button
                      size="small"
                      variant="secondary"
                      disabled={index === featuredProducts.length - 1}
                      onClick={() => moveItem(index, 1)}
                    >
                      Down
                    </Button>
                    <Switch
                      checked={item.is_active}
                      onCheckedChange={() => handleToggleActive(item)}
                    />
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() => handleRemove(item)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Featured Products",
})

export default FeaturedProductsPage
