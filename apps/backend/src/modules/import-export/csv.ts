import { parse } from "csv-parse/sync"

export function cellToString(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }
  return String(value).trim()
}

export function pickRowValue(
  row: Record<string, string>,
  ...keys: string[]
): string {
  for (const key of keys) {
    const value = row[key]
    if (value !== undefined && value !== "") {
      return cellToString(value)
    }
  }

  const lowered = new Map(
    Object.entries(row).map(([column, value]) => [
      column.toLowerCase().trim(),
      value,
    ])
  )

  for (const key of keys) {
    const value = lowered.get(key.toLowerCase().trim())
    if (value !== undefined && value !== "") {
      return cellToString(value)
    }
  }

  return ""
}

export function parseCsv(content: string): Record<string, string>[] {
  const trimmed = content.replace(/^\uFEFF/, "").trim()

  if (!trimmed) {
    return []
  }

  const records = parse(trimmed, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, unknown>[]

  return records.map((row) =>
    Object.fromEntries(
      Object.entries(row).map(([key, value]) => [key, cellToString(value)])
    )
  )
}

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }

  return value
}

export function stringifyCsv(
  headers: string[],
  rows: Record<string, string | number | boolean | null | undefined>[]
): string {
  const lines = [headers.join(",")]

  for (const row of rows) {
    lines.push(
      headers
        .map((header) => {
          const value = row[header]
          if (value === null || value === undefined) {
            return ""
          }
          return escapeCsvValue(String(value))
        })
        .join(",")
    )
  }

  return lines.join("\n")
}

export function parseBoolean(value?: string): boolean | undefined {
  if (value === undefined || value === "") {
    return undefined
  }

  const normalized = value.trim().toLowerCase()

  if (["true", "1", "yes", "y"].includes(normalized)) {
    return true
  }

  if (["false", "0", "no", "n"].includes(normalized)) {
    return false
  }

  return undefined
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
