import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { createUsersWorkflow } from "@medusajs/medusa/core-flows"

type CreateTeamUserBody = {
  email?: string
  password?: string
  first_name?: string | null
  last_name?: string | null
  role_ids?: string[]
}

/**
 * Create an admin user directly (email + password), without invite.
 * Optionally assign RBAC roles on create.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as CreateTeamUserBody

  const email = typeof body.email === "string" ? body.email.trim() : ""
  const password = typeof body.password === "string" ? body.password : ""
  const firstName =
    typeof body.first_name === "string" ? body.first_name.trim() : null
  const lastName =
    typeof body.last_name === "string" ? body.last_name.trim() : null
  const roleIds = Array.isArray(body.role_ids)
    ? body.role_ids.filter((id) => typeof id === "string" && id.trim())
    : []

  if (!email) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "email is required")
  }

  if (!password || password.length < 8) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "password must be at least 8 characters"
    )
  }

  const authService = req.scope.resolve(Modules.AUTH)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { result: users } = await createUsersWorkflow(req.scope).run({
    input: {
      users: [
        {
          email,
          first_name: firstName || undefined,
          last_name: lastName || undefined,
          roles: roleIds,
        },
      ],
    },
  })

  const user = users[0]

  const { authIdentity, error } = await authService.register("emailpass", {
    body: {
      email,
      password,
    },
  })

  if (error || !authIdentity) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      typeof error === "string"
        ? error
        : "Failed to create login credentials for this user"
    )
  }

  await authService.updateAuthIdentities({
    id: authIdentity.id,
    app_metadata: {
      user_id: user.id,
    },
  })

  const { data: links } = await query.graph({
    entity: "user_rbac_role",
    fields: ["rbac_role.*"],
    filters: { user_id: user.id },
  })

  const roles = (links ?? [])
    .map((link: { rbac_role?: unknown }) => link.rbac_role)
    .filter(Boolean)

  res.status(201).json({
    user,
    roles,
  })
}
