import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"
import { adminFetch } from "../../lib/sdk"

const SUPER_ADMIN_ROLE_ID = "role_super_admin"

const Skeleton = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-md bg-ui-bg-component-hover ${className}`}
  />
)

const RoleListSkeleton = () => (
  <div className="flex flex-col gap-y-2">
    {Array.from({ length: 3 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between gap-x-3 rounded-md border border-ui-border-base px-4 py-3"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-7 w-16" />
      </div>
    ))}
  </div>
)

const DetailSkeleton = () => (
  <div className="flex flex-col gap-y-3">
    <Skeleton className="h-5 w-32" />
    <Skeleton className="h-24 w-full" />
    <Skeleton className="h-24 w-full" />
  </div>
)

const formatUserLabel = (user) => {
  if (!user) {
    return "Unknown user"
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(" ")
  if (name && user.email) {
    return `${name} (${user.email})`
  }

  return name || user.email || user.id
}

const RolesPage = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isSavingPolicies, setIsSavingPolicies] = useState(false)
  const [isAddingUser, setIsAddingUser] = useState(false)

  const [roles, setRoles] = useState([])
  const [policies, setPolicies] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [rolePolicies, setRolePolicies] = useState([])
  const [roleUsers, setRoleUsers] = useState([])

  const [newRoleName, setNewRoleName] = useState("")
  const [editName, setEditName] = useState("")
  const [selectedPolicyIds, setSelectedPolicyIds] = useState(new Set())
  const [userToAdd, setUserToAdd] = useState("")

  const selectedRole = useMemo(
    () => roles.find((role) => role.id === selectedRoleId) || null,
    [roles, selectedRoleId]
  )

  const isSuperAdmin = selectedRole?.id === SUPER_ADMIN_ROLE_ID

  const policiesByResource = useMemo(() => {
    const groups = {}

    for (const policy of policies) {
      const resource = policy.resource || "other"
      if (!groups[resource]) {
        groups[resource] = []
      }
      groups[resource].push(policy)
    }

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b))
  }, [policies])

  const assignedUserIds = useMemo(
    () => new Set(roleUsers.filter(Boolean).map((user) => user.id)),
    [roleUsers]
  )

  const availableUsers = useMemo(
    () => allUsers.filter((user) => !assignedUserIds.has(user.id)),
    [allUsers, assignedUserIds]
  )

  const loadRolesAndCatalog = useCallback(async () => {
    setIsLoading(true)
    try {
      const [rolesResponse, policiesResponse, usersResponse] = await Promise.all([
        adminFetch("admin/rbac/roles?limit=100"),
        adminFetch("admin/rbac/policies?limit=500"),
        adminFetch("admin/users?limit=100"),
      ])

      const nextRoles = rolesResponse.roles ?? []
      setRoles(nextRoles)
      setPolicies(policiesResponse.policies ?? [])
      setAllUsers(usersResponse.users ?? [])

      setSelectedRoleId((current) => {
        if (current && nextRoles.some((role) => role.id === current)) {
          return current
        }
        return nextRoles[0]?.id ?? null
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load roles"
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadRoleDetails = useCallback(async (roleId) => {
    if (!roleId) {
      setRolePolicies([])
      setRoleUsers([])
      setSelectedPolicyIds(new Set())
      setEditName("")
      return
    }

    setIsLoadingDetails(true)
    try {
      const [policiesResponse, usersResponse] = await Promise.all([
        adminFetch(`admin/rbac/roles/${roleId}/policies`),
        adminFetch(`admin/rbac/roles/${roleId}/users?limit=100`),
      ])

      const nextRolePolicies = policiesResponse.policies ?? []
      const nextRoleUsers = (usersResponse.users ?? []).filter(Boolean)

      setRolePolicies(nextRolePolicies)
      setRoleUsers(nextRoleUsers)
      setSelectedPolicyIds(
        new Set(
          nextRolePolicies
            .map((entry) => entry.policy_id || entry.policy?.id)
            .filter(Boolean)
        )
      )
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load role details"
      )
    } finally {
      setIsLoadingDetails(false)
    }
  }, [])

  useEffect(() => {
    loadRolesAndCatalog()
  }, [loadRolesAndCatalog])

  useEffect(() => {
    if (selectedRole) {
      setEditName(selectedRole.name || "")
      loadRoleDetails(selectedRole.id)
    } else {
      setEditName("")
      setRolePolicies([])
      setRoleUsers([])
      setSelectedPolicyIds(new Set())
    }
  }, [selectedRole, loadRoleDetails])

  const handleCreateRole = async () => {
    const name = newRoleName.trim()
    if (!name) {
      toast.error("Enter a role name")
      return
    }

    setIsCreating(true)
    try {
      const response = await adminFetch("admin/rbac/roles", {
        method: "POST",
        body: { name },
      })
      const role = response.role
      setRoles((current) => [...current, role])
      setSelectedRoleId(role.id)
      setNewRoleName("")
      toast.success("Role created")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create role"
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveName = async () => {
    if (!selectedRole || isSuperAdmin) {
      return
    }

    const name = editName.trim()
    if (!name) {
      toast.error("Role name cannot be empty")
      return
    }

    setIsSavingName(true)
    try {
      const response = await adminFetch(`admin/rbac/roles/${selectedRole.id}`, {
        method: "POST",
        body: { name },
      })
      setRoles((current) =>
        current.map((role) =>
          role.id === selectedRole.id ? { ...role, ...response.role } : role
        )
      )
      toast.success("Role name updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update role"
      )
    } finally {
      setIsSavingName(false)
    }
  }

  const handleDeleteRole = async (role) => {
    if (role.id === SUPER_ADMIN_ROLE_ID) {
      toast.error("Super Admin cannot be deleted")
      return
    }

    const confirmed = window.confirm(
      `Delete role "${role.name}"? Users will keep their accounts, but lose this role.`
    )
    if (!confirmed) {
      return
    }

    try {
      await adminFetch(`admin/rbac/roles/${role.id}`, {
        method: "DELETE",
      })
      setRoles((current) => current.filter((entry) => entry.id !== role.id))
      if (selectedRoleId === role.id) {
        setSelectedRoleId(null)
      }
      toast.success("Role deleted")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete role"
      )
    }
  }

  const togglePolicy = (policyId) => {
    if (isSuperAdmin) {
      return
    }

    setSelectedPolicyIds((current) => {
      const next = new Set(current)
      if (next.has(policyId)) {
        next.delete(policyId)
      } else {
        next.add(policyId)
      }
      return next
    })
  }

  const handleSavePolicies = async () => {
    if (!selectedRole || isSuperAdmin) {
      return
    }

    const currentIds = new Set(
      rolePolicies
        .map((entry) => entry.policy_id || entry.policy?.id)
        .filter(Boolean)
    )
    const nextIds = selectedPolicyIds

    const toAdd = [...nextIds].filter((id) => !currentIds.has(id))
    const toRemove = [...currentIds].filter((id) => !nextIds.has(id))

    if (!toAdd.length && !toRemove.length) {
      toast.success("No permission changes")
      return
    }

    setIsSavingPolicies(true)
    try {
      if (toAdd.length) {
        await adminFetch(`admin/rbac/roles/${selectedRole.id}/policies`, {
          method: "POST",
          body: { policies: toAdd },
        })
      }

      for (const policyId of toRemove) {
        await adminFetch(
          `admin/rbac/roles/${selectedRole.id}/policies/${policyId}`,
          { method: "DELETE" }
        )
      }

      await loadRoleDetails(selectedRole.id)
      toast.success("Permissions saved")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save permissions"
      )
    } finally {
      setIsSavingPolicies(false)
    }
  }

  const handleAddUser = async () => {
    if (!selectedRole || !userToAdd) {
      return
    }

    setIsAddingUser(true)
    try {
      const response = await adminFetch(
        `admin/rbac/roles/${selectedRole.id}/users`,
        {
          method: "POST",
          body: { users: [userToAdd] },
        }
      )
      setRoleUsers((response.users ?? []).filter(Boolean))
      setUserToAdd("")
      toast.success("User added to role")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add user to role"
      )
    } finally {
      setIsAddingUser(false)
    }
  }

  const handleRemoveUser = async (userId) => {
    if (!selectedRole) {
      return
    }

    try {
      await adminFetch(`admin/rbac/roles/${selectedRole.id}/users`, {
        method: "DELETE",
        body: { users: [userId] },
      })
      setRoleUsers((current) => current.filter((user) => user?.id !== userId))
      toast.success("User removed from role")
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to remove user from role"
      )
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Roles</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Create roles, pick permissions, and assign users. Invite or remove
            users in Settings → Users.
          </Text>
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4 flex flex-col gap-y-4">
          <div>
            <Heading level="h2">Create role</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Add a named role, then choose permissions and users below.
            </Text>
          </div>

          <div className="flex flex-col gap-y-2 small:flex-row small:items-end small:gap-x-3">
            <div className="flex min-w-0 flex-1 flex-col gap-y-2">
              <Label htmlFor="new-role-name">Name</Label>
              <Input
                id="new-role-name"
                placeholder="Product Editor"
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleCreateRole()
                  }
                }}
              />
            </div>
            <Button
              onClick={handleCreateRole}
              isLoading={isCreating}
              disabled={!newRoleName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      </Container>

      <div className="grid gap-4 large:grid-cols-2">
        <Container className="p-0">
          <div className="px-6 py-4 flex flex-col gap-y-4">
            <div>
              <Heading level="h2">All roles</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Select a role to edit permissions and members.
              </Text>
            </div>

            {isLoading ? (
              <RoleListSkeleton />
            ) : roles.length === 0 ? (
              <Text size="small" className="text-ui-fg-subtle">
                No roles yet. Create one above.
              </Text>
            ) : (
              <div className="flex flex-col gap-y-2">
                {roles.map((role) => {
                  const isSelected = role.id === selectedRoleId
                  const isProtected = role.id === SUPER_ADMIN_ROLE_ID

                  return (
                    <div
                      key={role.id}
                      className={`flex items-center justify-between gap-x-3 rounded-md border px-4 py-3 ${
                        isSelected
                          ? "border-ui-border-interactive bg-ui-bg-base-hover"
                          : "border-ui-border-base"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 flex-col items-start text-left"
                        onClick={() => setSelectedRoleId(role.id)}
                      >
                        <div className="flex items-center gap-x-2">
                          <Text weight="plus">{role.name}</Text>
                          {isProtected ? (
                            <Badge size="2xsmall" color="blue">
                              System
                            </Badge>
                          ) : null}
                        </div>
                        <Text size="small" className="text-ui-fg-subtle">
                          {role.id}
                        </Text>
                      </button>
                      <Button
                        size="small"
                        variant="danger"
                        disabled={isProtected}
                        onClick={() => handleDeleteRole(role)}
                      >
                        Delete
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Container>

        <Container className="p-0">
          <div className="px-6 py-4 flex flex-col gap-y-4">
            <div>
              <Heading level="h2">Role details</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {selectedRole
                  ? `Editing “${selectedRole.name}”`
                  : "Select a role from the list"}
              </Text>
            </div>

            {!selectedRole ? (
              <Text size="small" className="text-ui-fg-subtle">
                Choose a role to manage permissions and users.
              </Text>
            ) : isLoadingDetails ? (
              <DetailSkeleton />
            ) : (
              <>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="edit-role-name">Name</Label>
                  <div className="flex flex-col gap-y-2 small:flex-row small:items-center small:gap-x-3">
                    <Input
                      id="edit-role-name"
                      value={editName}
                      disabled={isSuperAdmin}
                      onChange={(event) => setEditName(event.target.value)}
                    />
                    <Button
                      size="small"
                      variant="secondary"
                      onClick={handleSaveName}
                      isLoading={isSavingName}
                      disabled={isSuperAdmin || !editName.trim()}
                    >
                      Save name
                    </Button>
                  </div>
                  {isSuperAdmin ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      Super Admin is a system role with full access (`*:*`).
                      Permissions cannot be edited here.
                    </Text>
                  ) : null}
                </div>

                <div className="flex flex-col gap-y-3 border-t border-ui-border-base pt-4">
                  <div className="flex items-center justify-between gap-x-3">
                    <div>
                      <Text weight="plus">Permissions</Text>
                      <Text size="small" className="text-ui-fg-subtle">
                        Built-in Medusa policies grouped by resource.
                      </Text>
                    </div>
                    <Button
                      size="small"
                      onClick={handleSavePolicies}
                      isLoading={isSavingPolicies}
                      disabled={isSuperAdmin}
                    >
                      Save permissions
                    </Button>
                  </div>

                  {isSuperAdmin ? (
                    <div className="rounded-md border border-ui-border-base px-4 py-3">
                      <Badge color="green">*:*</Badge>
                      <Text size="small" className="mt-2 text-ui-fg-subtle">
                        Full access to every admin resource.
                      </Text>
                    </div>
                  ) : policies.length === 0 ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      No policies found yet. Restart the backend so Medusa can
                      sync the policy catalog, then refresh this page.
                    </Text>
                  ) : (
                    <div className="flex max-h-[28rem] flex-col gap-y-4 overflow-y-auto pr-1">
                      {policiesByResource.map(([resource, resourcePolicies]) => (
                        <div key={resource} className="flex flex-col gap-y-2">
                          <Text weight="plus" size="small">
                            {resource}
                          </Text>
                          <div className="flex flex-col gap-y-2 rounded-md border border-ui-border-base px-3 py-2">
                            {resourcePolicies.map((policy) => {
                              const checked = selectedPolicyIds.has(policy.id)
                              return (
                                <label
                                  key={policy.id}
                                  className="flex cursor-pointer items-start gap-x-2"
                                >
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={() =>
                                      togglePolicy(policy.id)
                                    }
                                  />
                                  <span className="min-w-0">
                                    <Text size="small">
                                      {policy.name || policy.key}
                                    </Text>
                                    <Text
                                      size="xsmall"
                                      className="text-ui-fg-subtle"
                                    >
                                      {policy.key}
                                    </Text>
                                  </span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-y-3 border-t border-ui-border-base pt-4">
                  <div>
                    <Text weight="plus">Users in this role</Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      Assign existing admin users. Invite new ones in Settings →
                      Users.
                    </Text>
                  </div>

                  <div className="flex flex-col gap-y-2 small:flex-row small:items-end small:gap-x-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-y-2">
                      <Label htmlFor="add-user">Add user</Label>
                      <select
                        id="add-user"
                        className="bg-ui-bg-field border-ui-border-base text-ui-fg-base h-10 rounded-md border px-3 text-sm"
                        value={userToAdd}
                        onChange={(event) => setUserToAdd(event.target.value)}
                      >
                        <option value="">Select a user…</option>
                        {availableUsers.map((user) => (
                          <option key={user.id} value={user.id}>
                            {formatUserLabel(user)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      onClick={handleAddUser}
                      isLoading={isAddingUser}
                      disabled={!userToAdd}
                    >
                      Add
                    </Button>
                  </div>

                  {roleUsers.length === 0 ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      No users assigned to this role yet.
                    </Text>
                  ) : (
                    <div className="flex flex-col gap-y-2">
                      {roleUsers.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center justify-between gap-x-3 rounded-md border border-ui-border-base px-4 py-3"
                        >
                          <div className="min-w-0">
                            <Text weight="plus">{formatUserLabel(user)}</Text>
                            <Text size="small" className="text-ui-fg-subtle">
                              {user.id}
                            </Text>
                          </div>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => handleRemoveUser(user.id)}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Container>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Roles",
})

export default RolesPage
