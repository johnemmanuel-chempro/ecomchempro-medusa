import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  deleteProductsWorkflow,
  deleteProductCategoriesWorkflow,
  deleteReservationsWorkflow,
} from "@medusajs/medusa/core-flows"

export default async function wipeCatalog({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // Reservations block product/inventory deletion — clear them first
  const { data: reservations } = await query.graph({
    entity: "reservation",
    fields: ["id"],
  })

  if (reservations.length) {
    await deleteReservationsWorkflow(container).run({
      input: { ids: reservations.map((r) => r.id) },
    })
    logger.info(`Deleted ${reservations.length} reservations`)
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id"],
  })

  if (products.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: products.map((p) => p.id) },
    })
    logger.info(`Deleted ${products.length} products`)
  }

  // Medusa forbids deleting a category that still has children.
  // Delete leaf categories each pass until the tree is empty.
  let totalDeleted = 0
  for (let pass = 0; pass < 50; pass++) {
    const { data: categories } = await query.graph({
      entity: "product_category",
      fields: ["id", "parent_category_id"],
    })

    if (!categories.length) break

    const parentIds = new Set(
      categories
        .map((c) => c.parent_category_id)
        .filter((id): id is string => Boolean(id))
    )
    const leaves = categories.filter((c) => !parentIds.has(c.id))

    if (!leaves.length) {
      throw new Error(
        "No leaf categories found but categories still remain — unexpected tree state"
      )
    }

    await deleteProductCategoriesWorkflow(container).run({
      input: leaves.map((c) => c.id),
    })
    totalDeleted += leaves.length
    logger.info(`Deleted ${leaves.length} leaf categories (pass ${pass + 1})`)
  }

  logger.info(
    totalDeleted
      ? `Deleted ${totalDeleted} categories total`
      : "No categories to delete"
  )
}
