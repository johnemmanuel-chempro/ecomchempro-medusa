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
  admin: {
    // Vite blocks non-localhost hosts in dev (e.g. zrok tunnels).
    // Leading "." allows any subdomain of shares.zrok.io.
    vite: () => ({
      server: {
        allowedHosts: [".shares.zrok.io"],
      },
    }),
  },
  modules: [
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
