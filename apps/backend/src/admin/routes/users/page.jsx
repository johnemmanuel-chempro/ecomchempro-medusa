import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useCallback, useEffect, useMemo, useState } from "react"
import { adminFetch } from "../../lib/sdk"

const Skeleton = ({ className = "" }) => (
  <div
    className={`animate-pulse rounded-md bg-ui-bg-component-hover ${className}`}
  />
)

const UserListSkeleton = () => (
  <div className="flex flex-col gap-y-2">
    {Array.from({ length: 4 }).map((_, index) => (
      <div
        key={index}
        className="flex items-center justify-between gap-x-3 rounded-md border border-ui-border-base px-4 py-3"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-7 w-16" />
      </div>
    ))}
  </div>
)

const DetailSkeleton = () => (
  <div className="flex flex-col gap-y-3">
    <Skeleton className="h-5 w-32" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-10 w-full" />
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

const emptyCreateForm = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  role_id: "",
}

const UsersPage = () => {
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isAddingRole, setIsAddingRole] = useState(false)

  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [selectedUserId, setSelectedUserId] = useState(null)
  const [userRoles, setUserRoles] = useState([])

  const [createForm, setCreateForm] = useState(emptyCreateForm)
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
  })
  const [roleToAdd, setRoleToAdd] = useState("")

  const selectedUser = useMemo(
    () => users.find((user) => user.id === selectedUserId) || null,
    [users, selectedUserId]
  )

  const assignedRoleIds = useMemo(
    () => new Set(userRoles.filter(Boolean).map((role) => role.id)),
    [userRoles]
  )

  const availableRoles = useMemo(
    () => roles.filter((role) => !assignedRoleIds.has(role.id)),
    [roles, assignedRoleIds]
  )

  const loadUsersAndRoles = useCallback(async () => {
    setIsLoading(true)
    try {
      const [usersResponse, rolesResponse] = await Promise.all([
        adminFetch("admin/users?limit=100"),
        adminFetch("admin/rbac/roles?limit=100"),
      ])

      const nextUsers = usersResponse.users ?? []
      setUsers(nextUsers)
      setRoles(rolesResponse.roles ?? [])

      setSelectedUserId((current) => {
        if (current && nextUsers.some((user) => user.id === current)) {
          return current
        }
        return nextUsers[0]?.id ?? null
      })
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load users"
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadUserRoles = useCallback(async (userId) => {
    if (!userId) {
      setUserRoles([])
      return
    }

    setIsLoadingDetails(true)
    try {
      const response = await adminFetch(`admin/users/${userId}/roles?limit=50`)
      setUserRoles((response.roles ?? []).filter(Boolean))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load user roles"
      )
    } finally {
      setIsLoadingDetails(false)
    }
  }, [])

  useEffect(() => {
    loadUsersAndRoles()
  }, [loadUsersAndRoles])

  useEffect(() => {
    if (selectedUser) {
      setEditForm({
        first_name: selectedUser.first_name || "",
        last_name: selectedUser.last_name || "",
      })
      setRoleToAdd("")
      loadUserRoles(selectedUser.id)
    } else {
      setEditForm({ first_name: "", last_name: "" })
      setUserRoles([])
    }
  }, [selectedUser, loadUserRoles])

  const handleCreateUser = async () => {
    const email = createForm.email.trim()
    const password = createForm.password

    if (!email) {
      toast.error("Email is required")
      return
    }

    if (!password || password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }

    setIsCreating(true)
    try {
      const response = await adminFetch("admin/team-users", {
        method: "POST",
        body: {
          email,
          password,
          first_name: createForm.first_name.trim() || null,
          last_name: createForm.last_name.trim() || null,
          role_ids: createForm.role_id ? [createForm.role_id] : [],
        },
      })

      const user = response.user
      setUsers((current) => [...current, user])
      setSelectedUserId(user.id)
      setCreateForm(emptyCreateForm)
      toast.success("User created — they can log in with this email and password")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create user"
      )
    } finally {
      setIsCreating(false)
    }
  }

  const handleSaveUser = async () => {
    if (!selectedUser) {
      return
    }

    setIsSaving(true)
    try {
      const response = await adminFetch(`admin/users/${selectedUser.id}`, {
        method: "POST",
        body: {
          first_name: editForm.first_name.trim() || null,
          last_name: editForm.last_name.trim() || null,
        },
      })

      setUsers((current) =>
        current.map((user) =>
          user.id === selectedUser.id ? { ...user, ...response.user } : user
        )
      )
      toast.success("User updated")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update user"
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async (user) => {
    const confirmed = window.confirm(
      `Delete user "${user.email}"? They will lose admin access.`
    )
    if (!confirmed) {
      return
    }

    try {
      await adminFetch(`admin/users/${user.id}`, {
        method: "DELETE",
      })
      setUsers((current) => current.filter((entry) => entry.id !== user.id))
      if (selectedUserId === user.id) {
        setSelectedUserId(null)
      }
      toast.success("User deleted")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete user"
      )
    }
  }

  const handleAddRole = async () => {
    if (!selectedUser || !roleToAdd) {
      return
    }

    setIsAddingRole(true)
    try {
      const response = await adminFetch(`admin/users/${selectedUser.id}/roles`, {
        method: "POST",
        body: { roles: [roleToAdd] },
      })
      setUserRoles((response.roles ?? []).filter(Boolean))
      setRoleToAdd("")
      toast.success("Role assigned")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to assign role"
      )
    } finally {
      setIsAddingRole(false)
    }
  }

  const handleRemoveRole = async (roleId) => {
    if (!selectedUser) {
      return
    }

    try {
      await adminFetch(`admin/users/${selectedUser.id}/roles/${roleId}`, {
        method: "DELETE",
      })
      setUserRoles((current) => current.filter((role) => role?.id !== roleId))
      toast.success("Role removed")
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to remove role"
      )
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="p-0">
        <div className="px-6 py-4">
          <Heading level="h1">Users</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Create admin users with email and password (no invite). Manage
            details and roles here. Invite flow still lives in Settings → Users
            if you need it.
          </Text>
        </div>
      </Container>

      <Container className="p-0">
        <div className="px-6 py-4 flex flex-col gap-y-4">
          <div>
            <Heading level="h2">Create user</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              They can sign in to the admin right away with this password.
            </Text>
          </div>

          <div className="grid gap-3 small:grid-cols-2">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="create-email">Email</Label>
              <Input
                id="create-email"
                type="email"
                placeholder="admin@example.com"
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    email: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="create-password">Password</Label>
              <Input
                id="create-password"
                type="password"
                placeholder="At least 8 characters"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="create-first-name">First name</Label>
              <Input
                id="create-first-name"
                value={createForm.first_name}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    first_name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="create-last-name">Last name</Label>
              <Input
                id="create-last-name"
                value={createForm.last_name}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    last_name: event.target.value,
                  }))
                }
              />
            </div>
            <div className="flex flex-col gap-y-2 small:col-span-2">
              <Label htmlFor="create-role">Starting role (optional)</Label>
              <select
                id="create-role"
                className="bg-ui-bg-field border-ui-border-base text-ui-fg-base h-10 rounded-md border px-3 text-sm"
                value={createForm.role_id}
                onChange={(event) =>
                  setCreateForm((current) => ({
                    ...current,
                    role_id: event.target.value,
                  }))
                }
              >
                <option value="">No role yet</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCreateUser}
              isLoading={isCreating}
              disabled={!createForm.email.trim() || createForm.password.length < 8}
            >
              Create user
            </Button>
          </div>
        </div>
      </Container>

      <div className="grid gap-4 large:grid-cols-2">
        <Container className="p-0">
          <div className="px-6 py-4 flex flex-col gap-y-4">
            <div>
              <Heading level="h2">All users</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                Select a user to edit details and roles.
              </Text>
            </div>

            {isLoading ? (
              <UserListSkeleton />
            ) : users.length === 0 ? (
              <Text size="small" className="text-ui-fg-subtle">
                No users yet. Create one above.
              </Text>
            ) : (
              <div className="flex flex-col gap-y-2">
                {users.map((user) => {
                  const isSelected = user.id === selectedUserId

                  return (
                    <div
                      key={user.id}
                      className={`flex items-center justify-between gap-x-3 rounded-md border px-4 py-3 ${
                        isSelected
                          ? "border-ui-border-interactive bg-ui-bg-base-hover"
                          : "border-ui-border-base"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 flex-col items-start text-left"
                        onClick={() => setSelectedUserId(user.id)}
                      >
                        <Text weight="plus">{formatUserLabel(user)}</Text>
                        <Text size="small" className="text-ui-fg-subtle">
                          {user.id}
                        </Text>
                      </button>
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => handleDeleteUser(user)}
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
              <Heading level="h2">User details</Heading>
              <Text size="small" className="text-ui-fg-subtle">
                {selectedUser
                  ? `Editing “${selectedUser.email}”`
                  : "Select a user from the list"}
              </Text>
            </div>

            {!selectedUser ? (
              <Text size="small" className="text-ui-fg-subtle">
                Choose a user to edit name and roles.
              </Text>
            ) : isLoadingDetails ? (
              <DetailSkeleton />
            ) : (
              <>
                <div className="grid gap-3 small:grid-cols-2">
                  <div className="flex flex-col gap-y-2 small:col-span-2">
                    <Label>Email</Label>
                    <Input value={selectedUser.email || ""} disabled />
                    <Text size="small" className="text-ui-fg-subtle">
                      Email cannot be changed here.
                    </Text>
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="edit-first-name">First name</Label>
                    <Input
                      id="edit-first-name"
                      value={editForm.first_name}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          first_name: event.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="flex flex-col gap-y-2">
                    <Label htmlFor="edit-last-name">Last name</Label>
                    <Input
                      id="edit-last-name"
                      value={editForm.last_name}
                      onChange={(event) =>
                        setEditForm((current) => ({
                          ...current,
                          last_name: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveUser}
                    isLoading={isSaving}
                    variant="secondary"
                  >
                    Save details
                  </Button>
                </div>

                <div className="flex flex-col gap-y-3 border-t border-ui-border-base pt-4">
                  <div>
                    <Text weight="plus">Roles</Text>
                    <Text size="small" className="text-ui-fg-subtle">
                      Assign roles created on the Roles page.
                    </Text>
                  </div>

                  <div className="flex flex-col gap-y-2 small:flex-row small:items-end small:gap-x-3">
                    <div className="flex min-w-0 flex-1 flex-col gap-y-2">
                      <Label htmlFor="add-role">Add role</Label>
                      <select
                        id="add-role"
                        className="bg-ui-bg-field border-ui-border-base text-ui-fg-base h-10 rounded-md border px-3 text-sm"
                        value={roleToAdd}
                        onChange={(event) => setRoleToAdd(event.target.value)}
                      >
                        <option value="">Select a role…</option>
                        {availableRoles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      onClick={handleAddRole}
                      isLoading={isAddingRole}
                      disabled={!roleToAdd}
                    >
                      Add
                    </Button>
                  </div>

                  {userRoles.length === 0 ? (
                    <Text size="small" className="text-ui-fg-subtle">
                      No roles assigned yet.
                    </Text>
                  ) : (
                    <div className="flex flex-col gap-y-2">
                      {userRoles.map((role) => (
                        <div
                          key={role.id}
                          className="flex items-center justify-between gap-x-3 rounded-md border border-ui-border-base px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-x-2">
                            <Text weight="plus">{role.name}</Text>
                            {role.id === "role_super_admin" ? (
                              <Badge size="2xsmall" color="blue">
                                System
                              </Badge>
                            ) : null}
                          </div>
                          <Button
                            size="small"
                            variant="secondary"
                            onClick={() => handleRemoveRole(role.id)}
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
  label: "Users",
})

export default UsersPage
