import type { ImportExportEntity } from "./types"

const PRODUCT_TEMPLATE = `Product Id,Product Handle,Product Title,Product Subtitle,Product Description,Product Status,Product Thumbnail,Variant Id,Variant Title,Variant SKU,Variant Barcode,Variant Allow Backorder,Variant Manage Inventory,Variant Price AUD,Variant Option 1 Name,Variant Option 1 Value,Variant Option 2 Name,Variant Option 2 Value,Variant Option 3 Name,Variant Option 3 Value
,chempro-sample,ChemPro Sample Product,,Sample product with Size and Color options.,published,,,S / Black,CP-SAMPLE-S-BLACK,,FALSE,TRUE,19.99,Size,S,Color,Black,,
,chempro-sample,ChemPro Sample Product,,Sample product with Size and Color options.,published,,,S / White,CP-SAMPLE-S-WHITE,,FALSE,TRUE,19.99,Size,S,Color,White,,`

const CATEGORY_TEMPLATE = `Category Id,Category Handle,Category Name,Category Description,Parent Handle,Is Active,Is Internal,Rank
,chemicals,Chemicals,Top-level chemicals category,,TRUE,FALSE,0
,lab-supplies,Lab Supplies,Lab supply products,chemicals,TRUE,FALSE,1`

const TEMPLATES: Record<ImportExportEntity, { filename: string; content: string }> =
  {
    products: {
      filename: "chempro-products-template.csv",
      content: PRODUCT_TEMPLATE,
    },
    categories: {
      filename: "chempro-categories-template.csv",
      content: CATEGORY_TEMPLATE,
    },
  }

export function isImportExportEntity(value: string): value is ImportExportEntity {
  return value === "products" || value === "categories"
}

export function getTemplate(entity: ImportExportEntity) {
  return TEMPLATES[entity]
}
