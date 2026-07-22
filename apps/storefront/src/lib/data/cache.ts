/**
 * Staging / free-tier deploys should not SSG the full catalog at build time.
 * Cold Medusa backends cause Next.js "took more than 60 seconds" export failures.
 *
 * Opt into build-time prerender with MEDUSA_STOREFRONT_PRERENDER=true
 * (requires a warm, reachable Medusa API during `next build`).
 */
export const bypassStorefrontCache = () =>
  process.env.MEDUSA_STOREFRONT_NO_CACHE === "true"

export const shouldGenerateStaticParams = () => {
  if (process.env.MEDUSA_STOREFRONT_PRERENDER === "true") {
    return true
  }

  if (bypassStorefrontCache()) {
    return false
  }

  // Render injects RENDER=true on build + runtime
  if (process.env.RENDER) {
    return false
  }

  return true
}
