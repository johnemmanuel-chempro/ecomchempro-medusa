import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    }
  },
  // Turns on Medusa's built-in role-based access control.
  featureFlags: {
    rbac: true,
  },
  admin: {
    // Vite blocks non-localhost hosts in dev (e.g. zrok tunnels).
    // Leading "." allows any subdomain of shares.zrok.io.
    // Disable HMR on zrok — the websocket often fails through the tunnel
    // and Vite then full-reloads the page in a loop ("context canceled").
    vite: () => {
      const backendUrl = process.env.MEDUSA_BACKEND_URL
      const usingZrok =
        typeof backendUrl === "string" && backendUrl.includes("shares.zrok.io")

      return {
        server: {
          allowedHosts: [".shares.zrok.io"],
          ...(usingZrok
            ? {
                origin: backendUrl,
                hmr: false,
              }
            : {}),
        },
      }
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/rbac",
    },
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-local",
            id: "local",
            options: {
              upload_dir: "static",
              backend_url: process.env.MEDUSA_BACKEND_URL
                ? `${process.env.MEDUSA_BACKEND_URL}/static`
                : "http://localhost:9000/static",
            },
          },
        ],
      },
    },
    {
      resolve: "./src/modules/import-export",
    },
    {
      resolve: "./src/modules/featured-products",
    },
    {
      resolve: "./src/modules/banners",
    },
    {
      resolve: "./src/modules/media",
    },
  ],
})
