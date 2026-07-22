type MedusaErrorLike = {
  response?: {
    data: { message?: string } | string
    status: number
    headers: unknown
  }
  request?: unknown
  message?: string
  statusText?: string
  config?: { url: string; baseURL: string }
}

export function getMedusaErrorMessage(error: unknown): string {
  const err = error as MedusaErrorLike

  if (err?.response?.data) {
    const data = err.response.data
    const message =
      typeof data === "object" && data !== null
        ? data.message || JSON.stringify(data)
        : String(data)
    return message.charAt(0).toUpperCase() + message.slice(1)
  }

  if (typeof err?.message === "string" && err.message.trim()) {
    // Medusa JS SDK often puts the API body message here
    return err.message
  }

  if (err?.request) {
    return "No response received from the server"
  }

  return "Something went wrong while updating your cart"
}

export default function medusaError(error: unknown): never {
  const err = error as MedusaErrorLike
  if (err.response) {
    const u = new URL(err.config?.url ?? "", err.config?.baseURL ?? "")
    console.error("Resource:", u.toString())
    console.error("Response data:", err.response.data)
    console.error("Status code:", err.response.status)
    console.error("Headers:", err.response.headers)
  } else {
    console.error("Cart/API error:", error)
  }

  throw new Error(getMedusaErrorMessage(error))
}
