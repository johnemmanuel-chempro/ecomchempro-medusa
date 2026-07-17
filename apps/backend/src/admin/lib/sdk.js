export async function adminFetch(path, options = {}) {
  const normalizedPath = `/${path.replace(/^\/+/, "")}`
  const { body, headers, ...rest } = options

  const response = await fetch(normalizedPath, {
    credentials: "include",
    headers: {
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    ...rest,
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`

    try {
      const payload = await response.json()
      message = payload.message || payload.error || message
    } catch {}

    throw new Error(message)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export async function searchProducts(query) {
  const params = new URLSearchParams({
    q: query,
    limit: "10",
    fields: "id,title,handle,thumbnail,status",
  })

  const response = await adminFetch(`admin/products?${params.toString()}`)
  return response.products ?? []
}
