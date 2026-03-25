import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaChevronDown,
  FaChevronRight,
  FaDownload,
  FaFilter,
  FaPlus,
  FaMagnifyingGlass,
  FaEarthAmericas,
  FaShield,
  FaTrash,
  FaUserPlus,
  FaUsers
} from 'react-icons/fa6'
import { getApiErrorMessage } from '../../api/apiClient'
import {
  settingsApi,
  type IntegrationSettingsPayload,
  type SystemSettingsPayload
} from '../../api/settings'
import { useAuth } from '../../context/AuthContext'
import { useAuthService } from '../../hooks/useAuthService'
import { useUsersService } from '../../hooks/useUsersService'
import SurfaceCard from '../ui/SurfaceCard'
import SearchableDropdown from '../ui/SearchableDropdown'
import DestinationPricingManager from '../settings/DestinationPricingManager'

type Tab =
  | 'user-management'
  | 'roles-permissions'
  | 'system-settings'
  | 'destinations-pricing'
  | 'pdf-templates'
  | 'integrations'

type UserStatusFilter = 'all' | 'active' | 'inactive'

type UserRecord = {
  id: string
  fullName: string
  email: string
  role?: string
  roleId?: string
  isActive: boolean
  lastActive: string
}

type RawUser = {
  id?: string
  fullName?: string
  full_name?: string
  name?: string
  email?: string
  role?: string
  roleId?: string
  role_id?: string
  isActive?: boolean
  is_active?: boolean
  lastLogin?: string
  last_login?: string
  createdAt?: string
  created_at?: string
}

type RoleOption = {
  id: string
  name: string
  description?: string | null
}

type PermissionOption = {
  id: string
  key: string
  description?: string | null
  isActive?: boolean
}

type SystemSettingsForm = Required<SystemSettingsPayload>
type IntegrationSettingsForm = Required<
  Omit<IntegrationSettingsPayload, 'smtpPort'>
> & { smtpPort: number }

type SettingsResponse = {
  system?: Partial<SystemSettingsForm>
  integrations?: Partial<IntegrationSettingsForm>
}

type CountryCode = 'India' | 'UAE'

const COUNTRY_OPTIONS: Array<{ value: CountryCode; label: string }> = [
  { value: 'India', label: 'India' },
  { value: 'UAE', label: 'UAE' }
]

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'user-management', label: 'User Management' },
  { id: 'roles-permissions', label: 'Roles & Permissions' },
  { id: 'system-settings', label: 'System Settings' },
  { id: 'destinations-pricing', label: 'Destinations & Pricing' },
  { id: 'pdf-templates', label: 'PDF Templates' }
  // { id: "integrations", label: "Integrations" },
]

const DEFAULT_SYSTEM: SystemSettingsForm = {
  companyName: 'Get2Vacation Travel CRM',
  supportEmail: 'support@Get2Vacation.com',
  supportPhone: '',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  dateFormat: 'DD/MM/YYYY',
  websiteUrl: ''
}

const DEFAULT_INTEGRATIONS: IntegrationSettingsForm = {
  metaAppId: '',
  metaAccessToken: '',
  whatsappApiToken: '',
  smtpHost: '',
  smtpPort: 587,
  smtpUser: '',
  smtpPassword: '',
  smtpFromEmail: '',
  webhookUrl: ''
}

const toTrimmedOrUndefined = (value: string | number | undefined) => {
  if (typeof value === 'number') return value
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed ? trimmed : undefined
}

const compactObject = <T extends Record<string, unknown>>(payload: T) =>
  Object.fromEntries(
    Object.entries(payload).filter(([, value]) => value !== undefined)
  ) as Partial<T>

const parseDate = (value?: string) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}

const getRoleLabel = (
  roleName: string | undefined,
  roleId: string | undefined,
  roleMap: Map<string, string>
) => roleName ?? roleMap.get(roleId ?? '') ?? '-'

function extractRows<T> (response: unknown): T[] {
  const payload = response as { data?: T[] | { data?: T[]; items?: T[] } }
  if (Array.isArray(payload?.data)) return payload.data
  const nested = payload?.data as { data?: T[]; items?: T[] } | undefined
  if (Array.isArray(nested?.data)) return nested.data
  if (Array.isArray(nested?.items)) return nested.items
  return Array.isArray(response) ? (response as T[]) : []
}

function extractObject<T extends object> (response: unknown): T | null {
  if (!response || typeof response !== 'object') return null
  const payload = response as { data?: unknown }
  if (payload.data && typeof payload.data === 'object') return payload.data as T
  return response as T
}

const normalizeUsers = (rows: RawUser[]): UserRecord[] =>
  rows
    .filter(row => row.id && row.email)
    .map(row => ({
      id: row.id as string,
      fullName:
        row.fullName ||
        row.full_name ||
        row.name ||
        row.email?.split('@')[0] ||
        'User',
      email: row.email as string,
      role: row.role,
      roleId: row.roleId || row.role_id,
      isActive:
        typeof row.isActive === 'boolean'
          ? row.isActive
          : row.is_active !== false,
      lastActive: parseDate(
        row.lastLogin || row.last_login || row.createdAt || row.created_at
      )
    }))

const Settings: React.FC = () => {
  const { hasPermission } = useAuth()
  const usersService = useUsersService()
  const authService = useAuthService()
  const [activeTab, setActiveTab] = useState<Tab>('user-management')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<UserStatusFilter>('all')
  const [users, setUsers] = useState<UserRecord[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [permissionsCatalog, setPermissionsCatalog] = useState<
    PermissionOption[]
  >([])
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissionsError, setPermissionsError] = useState('')
  const [selectedRolePermissionsRoleId, setSelectedRolePermissionsRoleId] =
    useState('')
  const [selectedRolePermissions, setSelectedRolePermissions] = useState<
    string[]
  >([])
  const [rolePermissionCounts, setRolePermissionCounts] = useState<
    Record<string, number>
  >({})
  const [roleCountryOverrides, setRoleCountryOverrides] = useState<
    Record<string, CountryCode>
  >({})
  const [selectedRoleCountry, setSelectedRoleCountry] =
    useState<CountryCode>('India')
  const [adminCountryFilter, setAdminCountryFilter] =
    useState<CountryCode>('India')
  const [loadingRolePermissions, setLoadingRolePermissions] = useState(false)
  const [savingRolePermissions, setSavingRolePermissions] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const noticeTimerRef = useRef<number | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: ''
  })

  const [assignOpen, setAssignOpen] = useState(false)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignRoleId, setAssignRoleId] = useState('')
  const [assignLoading, setAssignLoading] = useState(false)
  const [assignRoleSearch, setAssignRoleSearch] = useState('')
  const [assignRoleDropdownOpen, setAssignRoleDropdownOpen] = useState(false)
  const [assignCreateRoleName, setAssignCreateRoleName] = useState('')
  const [createRoleOpen, setCreateRoleOpen] = useState(false)
  const [createRoleLoading, setCreateRoleLoading] = useState(false)
  const [createRoleName, setCreateRoleName] = useState('')
  const [createRoleCountry, setCreateRoleCountry] =
    useState<CountryCode>('India')
  const [createRolePermissions, setCreateRolePermissions] = useState<string[]>(
    []
  )

  const [systemSettings, setSystemSettings] =
    useState<SystemSettingsForm>(DEFAULT_SYSTEM)
  const [integrationSettings, setIntegrationSettings] =
    useState<IntegrationSettingsForm>(DEFAULT_INTEGRATIONS)
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [savingSystem, setSavingSystem] = useState(false)
  const [savingIntegrations, setSavingIntegrations] = useState(false)
  const roleLabelMap = useMemo(
    () => new Map(roles.map(role => [role.id, role.name])),
    [roles]
  )
  const canReadUsers = hasPermission('users:read')
  const canCreateUsers = hasPermission('users:create')
  const canUpdateUsers = hasPermission('users:update')
  const canManageRbac = hasPermission('rbac:manage')
  const canReadSettings = hasPermission('settings:read')
  const canUpdateSettings = hasPermission('settings:update')
  const visibleTabs = useMemo(
    () =>
      tabs.filter(tab => {
        if (tab.id === 'user-management') return canReadUsers
        if (tab.id === 'roles-permissions') return canManageRbac
        return canReadSettings
      }),
    [canManageRbac, canReadSettings, canReadUsers]
  )

  const loadUsers = useCallback(async () => {
    if (!canReadUsers) {
      setUsers([])
      return
    }
    setLoadingUsers(true)
    try {
      const response = await usersService.list()
      setUsers(normalizeUsers(extractRows<RawUser>(response)))
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to load users'))
    } finally {
      setLoadingUsers(false)
    }
  }, [canReadUsers, usersService])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const loadRoles = useCallback(async () => {
    if (!canManageRbac) {
      setRoles([])
      return
    }
    try {
      const rows = await authService.listRoles()
      setRoles(
        rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description ?? null
        }))
      )
    } catch (e) {
      setRoles([])
      setError(getApiErrorMessage(e, 'Unable to load roles'))
    }
  }, [authService, canManageRbac])

  useEffect(() => {
    void loadRoles()
  }, [loadRoles])

  useEffect(() => {
    if (!message) return
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    setError('')
    noticeTimerRef.current = window.setTimeout(() => {
      setMessage('')
      noticeTimerRef.current = null
    }, 1000)
  }, [message])

  useEffect(() => {
    if (!error) return
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current)
    setMessage('')
    noticeTimerRef.current = window.setTimeout(() => {
      setError('')
      noticeTimerRef.current = null
    }, 1000)
  }, [error])

  const loadPermissions = useCallback(async () => {
    if (!canManageRbac) {
      setPermissionsCatalog([])
      setPermissionsError('')
      return
    }

    setPermissionsLoading(true)
    setPermissionsError('')
    try {
      const rows = await authService.listPermissions()
      const activePermissions = rows.filter(
        permission => permission.isActive !== false
      )
      setPermissionsCatalog(activePermissions)
    } catch (e) {
      setPermissionsCatalog([])
      setPermissionsError(getApiErrorMessage(e, 'Unable to load permissions'))
    } finally {
      setPermissionsLoading(false)
    }
  }, [authService, canManageRbac])

  useEffect(() => {
    void loadPermissions()
  }, [loadPermissions])

  useEffect(() => {
    if (!roles.length) {
      setSelectedRolePermissionsRoleId('')
      return
    }

    const exists = roles.some(role => role.id === selectedRolePermissionsRoleId)
    if (!exists) {
      setSelectedRolePermissionsRoleId(roles[0].id)
    }
  }, [roles, selectedRolePermissionsRoleId])

  const loadRolePermissions = useCallback(async () => {
    if (!canManageRbac || !selectedRolePermissionsRoleId) {
      setSelectedRolePermissions([])
      return
    }

    setLoadingRolePermissions(true)
    try {
      const rows = await authService.getRolePermissionsById(
        selectedRolePermissionsRoleId
      )
      setSelectedRolePermissions(Array.isArray(rows) ? rows : [])
    } catch (e) {
      setSelectedRolePermissions([])
      setPermissionsError(
        getApiErrorMessage(e, 'Unable to load role permissions')
      )
    } finally {
      setLoadingRolePermissions(false)
    }
  }, [authService, canManageRbac, selectedRolePermissionsRoleId])

  useEffect(() => {
    void loadRolePermissions()
  }, [loadRolePermissions])

  useEffect(() => {
    if (!visibleTabs.length) return
    const stillVisible = visibleTabs.some(tab => tab.id === activeTab)
    if (!stillVisible) {
      setActiveTab(visibleTabs[0].id)
    }
  }, [activeTab, visibleTabs])

  useEffect(() => {
    const loadSettings = async () => {
      setLoadingSettings(true)
      try {
        const response = await settingsApi.getAll()
        const data = extractObject<SettingsResponse>(response)
        if (data?.system) setSystemSettings(s => ({ ...s, ...data.system }))
        if (data?.integrations) {
          const nextPort = Number(data.integrations.smtpPort)
          setIntegrationSettings(s => ({
            ...s,
            ...data.integrations,
            smtpPort:
              Number.isFinite(nextPort) && nextPort > 0 ? nextPort : s.smtpPort
          }))
        }
      } catch (e) {
        setError(getApiErrorMessage(e, 'Unable to load settings'))
      }
    }
    void loadSettings()
  }, [])

  const filteredUsers = useMemo(
    () =>
      users.filter(user => {
        const matched =
          user.fullName.toLowerCase().includes(search.toLowerCase()) ||
          user.email.toLowerCase().includes(search.toLowerCase()) ||
          getRoleLabel(user.role, user.roleId, roleLabelMap)
            .toLowerCase()
            .includes(search.toLowerCase())
        const statusMatched =
          statusFilter === 'all' ||
          (statusFilter === 'active' && user.isActive) ||
          (statusFilter === 'inactive' && !user.isActive)
        return matched && statusMatched
      }),
    [users, search, statusFilter, roleLabelMap]
  )

  const roleStats = useMemo(() => {
    const usersByRoleId = new Map<string, number>()
    users.forEach(user => {
      const key = user.roleId || ''
      if (!key) return
      usersByRoleId.set(key, (usersByRoleId.get(key) ?? 0) + 1)
    })

    return roles.map(role => ({
      ...role,
      users: usersByRoleId.get(role.id) ?? 0,
      permissions: rolePermissionCounts[role.id] ?? 0
    }))
  }, [users, roles, rolePermissionCounts])

  const roleCountryMap = useMemo(
    () =>
      new Map<string, CountryCode>(
        roleStats.map((role, index) => [
          role.id,
          (index % 2 === 0 ? 'India' : 'UAE') as CountryCode
        ])
      ),
    [roleStats]
  )

  const getRoleCountry = useCallback(
    (roleId?: string): CountryCode => {
      if (!roleId) return 'India'
      return (
        roleCountryOverrides[roleId] || roleCountryMap.get(roleId) || 'India'
      )
    },
    [roleCountryOverrides, roleCountryMap]
  )

  const selectedRole = useMemo(
    () => roles.find(role => role.id === selectedRolePermissionsRoleId) ?? null,
    [roles, selectedRolePermissionsRoleId]
  )

  useEffect(() => {
    if (!selectedRolePermissionsRoleId) return
    setSelectedRoleCountry(getRoleCountry(selectedRolePermissionsRoleId))
  }, [selectedRolePermissionsRoleId, getRoleCountry])

  const loadRolePermissionCounts = useCallback(async () => {
    if (!canManageRbac || roles.length === 0) {
      setRolePermissionCounts({})
      return
    }

    try {
      const entries = await Promise.all(
        roles.map(async role => {
          const rolePermissions = await authService.getRolePermissionsById(
            role.id
          )
          return [
            role.id,
            Array.isArray(rolePermissions) ? rolePermissions.length : 0
          ] as const
        })
      )
      setRolePermissionCounts(Object.fromEntries(entries))
    } catch (e) {
      setRolePermissionCounts({})
      setPermissionsError(
        getApiErrorMessage(e, 'Unable to load role permission summary')
      )
    }
  }, [authService, canManageRbac, roles])

  useEffect(() => {
    void loadRolePermissionCounts()
  }, [loadRolePermissionCounts])

  const onInvite = async () => {
    if (!canCreateUsers) {
      setError('You do not have permission to create users.')
      return
    }
    setError('')
    setMessage('')
    if (!inviteForm.fullName.trim() || !inviteForm.email.trim()) {
      setError('Full name and email are required.')
      return
    }
    if (inviteForm.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setInviteLoading(true)
    try {
      const created = extractObject<{ id?: string }>(
        await usersService.create({
          fullName: inviteForm.fullName.trim(),
          email: inviteForm.email.trim(),
          password: inviteForm.password,
          roleId: inviteForm.roleId || undefined,
          isActive: true
        })
      )
      void created
      setInviteOpen(false)
      setInviteForm({ fullName: '', email: '', password: '', roleId: '' })
      setMessage('User invited successfully.')
      await loadUsers()
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to invite user'))
    } finally {
      setInviteLoading(false)
    }
  }

  const onDeactivate = async (id: string) => {
    if (!canUpdateUsers) {
      setError('You do not have permission to update users.')
      return
    }
    setError('')
    setMessage('')
    try {
      await usersService.update(id, { isActive: false })
      setMessage('User deactivated.')
      await loadUsers()
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to deactivate user'))
    }
  }

  const onCreateAndAssignRole = async (roleName: string) => {
    await usersService.update(assignUserId, { roleName: roleName.trim() })
    return { id: '' }
  }

  const resetCreateRoleForm = () => {
    setCreateRoleName('')
    setCreateRoleCountry('India')
    setCreateRolePermissions([])
  }

  const closeCreateRoleModal = () => {
    setCreateRoleOpen(false)
    resetCreateRoleForm()
  }

  const handleCreateRole = async () => {
    if (!canManageRbac) {
      setError('You do not have permission to manage roles.')
      return
    }

    const trimmedName = createRoleName.trim()
    if (!trimmedName) {
      setError('Role name is required.')
      return
    }
    if (!createRolePermissions.length) {
      setError('Select at least one permission for the role.')
      return
    }

    setCreateRoleLoading(true)
    setError('')
    setMessage('')
    try {
      const createdRole = await authService.createRole({ name: trimmedName })
      if (!createdRole?.id) {
        throw new Error('Role response missing identifier')
      }

      if (createRolePermissions.length) {
        await authService.updateRolePermissions(createdRole.id, {
          replace: true,
          permissions: createRolePermissions.map(key => ({
            key,
            enabled: true
          }))
        })
      }

      setRoleCountryOverrides(prev => ({
        ...prev,
        [createdRole.id]: createRoleCountry
      }))

      await loadRoles()
      setSelectedRolePermissionsRoleId(createdRole.id)
      setSelectedRolePermissions([...createRolePermissions])
      setSelectedRoleCountry(createRoleCountry)
      setMessage('Role created successfully.')
      closeCreateRoleModal()
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to create role'))
    } finally {
      setCreateRoleLoading(false)
    }
  }

  const toggleRolePermission = (permissionKey: string) => {
    setSelectedRolePermissions(prev => {
      if (prev.includes(permissionKey)) {
        return prev.filter(item => item !== permissionKey)
      }
      return [...prev, permissionKey].sort((left, right) =>
        left.localeCompare(right)
      )
    })
  }

  const saveRolePermissions = async () => {
    if (!canManageRbac) {
      setError('You do not have permission to update role permissions.')
      return
    }
    if (!selectedRolePermissionsRoleId) {
      setError('Please select a role first.')
      return
    }

    setSavingRolePermissions(true)
    setError('')
    setMessage('')
    try {
      await authService.updateRolePermissions(selectedRolePermissionsRoleId, {
        replace: true,
        permissions: selectedRolePermissions.map(key => ({
          key,
          enabled: true
        }))
      })
      setRolePermissionCounts(previous => ({
        ...previous,
        [selectedRolePermissionsRoleId]: selectedRolePermissions.length
      }))
      setMessage('Role permissions updated.')
      await loadPermissions()
      await loadUsers()
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to update role permissions'))
    } finally {
      setSavingRolePermissions(false)
    }
  }

  const onExport = () => {
    const lines = [
      ['Name', 'Email', 'Role', 'Status', 'Last Active'].join(','),
      ...filteredUsers.map(u =>
        [
          u.fullName,
          u.email,
          getRoleLabel(u.role, u.roleId, roleLabelMap),
          u.isActive ? 'Active' : 'Inactive',
          u.lastActive
        ]
          .map(v => `\"${String(v).replace(/\"/g, '""')}\"`)
          .join(',')
      )
    ]
    const blob = new Blob([lines.join('\n')], {
      type: 'text/csv;charset=utf-8'
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'settings-users.csv'
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const saveSystem = async () => {
    if (!canUpdateSettings) {
      setError('You do not have permission to update settings.')
      return
    }
    setSavingSystem(true)
    setError('')
    try {
      const payload = compactObject({
        companyName: toTrimmedOrUndefined(systemSettings.companyName),
        supportEmail: toTrimmedOrUndefined(systemSettings.supportEmail),
        supportPhone: toTrimmedOrUndefined(systemSettings.supportPhone),
        timezone: toTrimmedOrUndefined(systemSettings.timezone),
        currency: toTrimmedOrUndefined(systemSettings.currency),
        dateFormat: toTrimmedOrUndefined(systemSettings.dateFormat),
        websiteUrl: toTrimmedOrUndefined(systemSettings.websiteUrl)
      }) as SystemSettingsPayload
      if (Object.keys(payload).length === 0) {
        setError('Enter at least one system setting.')
        return
      }

      const data = extractObject<Partial<SystemSettingsForm>>(
        await settingsApi.updateSystem(payload)
      )
      if (data) setSystemSettings(s => ({ ...s, ...data }))
      setMessage('System settings saved.')
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to save system settings'))
    } finally {
      setSavingSystem(false)
    }
  }

  const saveIntegrations = async () => {
    if (!canUpdateSettings) {
      setError('You do not have permission to update settings.')
      return
    }
    setSavingIntegrations(true)
    setError('')
    try {
      const payload = compactObject({
        metaAppId: toTrimmedOrUndefined(integrationSettings.metaAppId),
        metaAccessToken: toTrimmedOrUndefined(
          integrationSettings.metaAccessToken
        ),
        whatsappApiToken: toTrimmedOrUndefined(
          integrationSettings.whatsappApiToken
        ),
        smtpHost: toTrimmedOrUndefined(integrationSettings.smtpHost),
        smtpPort:
          Number.isInteger(integrationSettings.smtpPort) &&
          integrationSettings.smtpPort > 0
            ? integrationSettings.smtpPort
            : undefined,
        smtpUser: toTrimmedOrUndefined(integrationSettings.smtpUser),
        smtpPassword: toTrimmedOrUndefined(integrationSettings.smtpPassword),
        smtpFromEmail: toTrimmedOrUndefined(integrationSettings.smtpFromEmail),
        webhookUrl: toTrimmedOrUndefined(integrationSettings.webhookUrl)
      }) as IntegrationSettingsPayload
      if (Object.keys(payload).length === 0) {
        setError('Enter at least one integration setting.')
        return
      }

      const data = extractObject<Partial<IntegrationSettingsForm>>(
        await settingsApi.updateIntegrations(payload)
      )
      if (data) setIntegrationSettings(s => ({ ...s, ...data }))
      setMessage('Integration settings saved.')
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to save integration settings'))
    } finally {
      setSavingIntegrations(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between'>
        <div>
          <p className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
            Administration
          </p>
          <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Settings
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
            Manage users, roles, permissions, system, and integrations.
          </p>
        </div>
        {activeTab === 'roles-permissions' ? (
          <div className='w-full sm:w-60'>
            <label className='text-xs font-semibold uppercase tracking-wider text-gray-500'>
              Country Filter
            </label>
            <SearchableDropdown
              value={adminCountryFilter}
              options={COUNTRY_OPTIONS}
              onChange={value => setAdminCountryFilter(value as CountryCode)}
              className='mt-2 w-full'
              searchPlaceholder='Search country...'
            />
          </div>
        ) : null}
      </div>

      <SurfaceCard className='p-4'>
        <div className='flex flex-wrap gap-2'>
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-xl px-3 py-2 text-left text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SurfaceCard>

      <div className='space-y-6'>
        {error ? (
          <div className='rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700'>
            {error}
          </div>
        ) : null}
        {message ? (
          <div className='rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700'>
            {message}
          </div>
        ) : null}

        {activeTab === 'user-management' ? (
          <SurfaceCard className='p-0 overflow-hidden'>
            <div className='flex items-center justify-between border-b border-gray-100 p-4'>
              <div className='relative w-full max-w-sm'>
                <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-3 text-xs text-gray-400' />
                <input
                  className='field-input pl-9'
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder='Search users'
                />
              </div>
              <div className='ml-3 flex gap-2'>
                <button
                  onClick={() =>
                    setStatusFilter(
                      statusFilter === 'all'
                        ? 'active'
                        : statusFilter === 'active'
                        ? 'inactive'
                        : 'all'
                    )
                  }
                  className='rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100'
                >
                  <FaFilter />
                </button>
                <button
                  onClick={onExport}
                  className='rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-100'
                >
                  <FaDownload />
                </button>
                {canCreateUsers ? (
                  <button
                    onClick={() => setInviteOpen(true)}
                    className='rounded-lg bg-blue-600 px-3 py-2 text-white'
                  >
                    <FaUserPlus />
                  </button>
                ) : null}
              </div>
            </div>
            <div className='grid grid-cols-1 gap-4 px-4 pt-4 sm:grid-cols-3'>
              <StatCard
                title='Total Users'
                value={String(users.length)}
                icon={<FaUsers className='text-blue-600' />}
              />
              <StatCard
                title='Active'
                value={String(users.filter(u => u.isActive).length)}
                icon={<FaShield className='text-green-500' />}
              />
              <StatCard
                title='Inactive'
                value={String(users.filter(u => !u.isActive).length)}
                icon={<FaFilter className='text-amber-500' />}
              />
            </div>
            <div className='overflow-x-auto p-4'>
              <table className='min-w-[780px] w-full divide-y divide-gray-200'>
                <thead>
                  <tr>
                    <th className='px-3 py-2 text-left text-xs text-gray-500'>
                      User
                    </th>
                    <th className='px-3 py-2 text-left text-xs text-gray-500'>
                      Role
                    </th>
                    <th className='px-3 py-2 text-left text-xs text-gray-500'>
                      Status
                    </th>
                    <th className='px-3 py-2 text-left text-xs text-gray-500'>
                      Last Active
                    </th>
                    <th className='px-3 py-2 text-right text-xs text-gray-500'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100'>
                  {loadingUsers ? (
                    <tr>
                      <td
                        colSpan={5}
                        className='px-3 py-4 text-sm text-gray-500'
                      >
                        Loading users...
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(u => (
                      <tr key={u.id}>
                        <td className='px-3 py-3'>
                          <p className='text-sm font-medium'>{u.fullName}</p>
                          <p className='text-xs text-gray-500'>{u.email}</p>
                        </td>
                        <td className='px-3 py-3 text-sm'>
                          {getRoleLabel(u.role, u.roleId, roleLabelMap)}
                        </td>
                        <td className='px-3 py-3 text-sm'>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </td>
                        <td className='px-3 py-3 text-sm text-gray-500'>
                          {u.lastActive}
                        </td>
                        <td className='px-3 py-3 text-right'>
                          {canUpdateUsers ? (
                            <button
                              disabled={!u.isActive}
                              onClick={() => void onDeactivate(u.id)}
                              className='text-red-500 disabled:opacity-30'
                            >
                              <FaTrash />
                            </button>
                          ) : (
                            <span className='text-xs text-gray-400'>
                              No access
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        ) : null}

        {activeTab === 'roles-permissions' ? (
          <SurfaceCard>
            <div className='mb-3 flex flex-wrap items-center justify-between gap-2'>
              <h2 className='text-xl font-semibold'>Roles & Permissions</h2>
              {canManageRbac ? (
                <div className='flex flex-wrap gap-2'>
                  <button
                    onClick={() => setCreateRoleOpen(true)}
                    className='inline-flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-500'
                  >
                    <FaPlus />
                    Create Role
                  </button>
                  <button
                    onClick={() => setAssignOpen(true)}
                    className='inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700'
                  >
                    <FaPlus />
                    Assign Role to User
                  </button>
                </div>
              ) : null}
            </div>
            {!canManageRbac ? (
              <p className='text-sm text-gray-500'>
                You do not have permission to manage roles and permissions.
              </p>
            ) : (
              <>
                <div className='mt-2 grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr]'>
                  <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                    {roleStats.map(r => {
                      const country = getRoleCountry(r.id)
                      const isIndia = country === 'India'
                      const indiaFlag = '\uD83C\uDDEE\uD83C\uDDF3'
                      const uaeFlag = '\uD83C\uDDE6\uD83C\uDDEA'
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            setAssignRoleId(r.id)
                            setSelectedRolePermissionsRoleId(r.id)
                          }}
                          className={`rounded-xl border p-4 text-left transition-colors ${
                            selectedRolePermissionsRoleId === r.id
                              ? 'border-blue-400 bg-blue-50'
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <div className='flex items-center justify-between'>
                            <p className='font-medium'>{r.name}</p>
                            <div className='flex items-center gap-2'>
                              <span
                                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  isIndia
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
                                }`}
                              >
                                {isIndia
                                  ? `${indiaFlag} ${country}`
                                  : `${uaeFlag} ${country}`}
                              </span>
                              <FaChevronRight className='text-gray-400' />
                            </div>
                          </div>
                          <p className='mt-1 text-sm text-gray-500'>
                            {r.users} users assigned
                          </p>
                          <p className='mt-1 text-xs text-gray-500'>
                            {r.permissions} permissions enabled
                          </p>
                        </button>
                      )
                    })}
                  </div>

                  <div className='rounded-xl border border-gray-200 p-4'>
                    <div className='flex flex-col gap-3'>
                      <h3 className='text-base font-semibold text-gray-900'>
                        Edit Permissions
                      </h3>
                      <p className='text-sm text-gray-500'>
                        {selectedRole
                          ? `Role: ${selectedRole.name}`
                          : 'Select a role to start editing permissions.'}
                      </p>
                      <SearchableDropdown
                        value={selectedRolePermissionsRoleId}
                        onChange={setSelectedRolePermissionsRoleId}
                        options={[
                          { value: '', label: 'Select role' },
                          ...roles.map(role => ({
                            value: role.id,
                            label: `${role.name} • ${getRoleCountry(role.id)}`
                          }))
                        ]}
                        placeholder='Select role'
                        className='w-full'
                      />
                    </div>

                    <div className='mt-4 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2'>
                      {permissionsLoading || loadingRolePermissions ? (
                        <p className='text-sm text-gray-500'>
                          Loading permissions...
                        </p>
                      ) : permissionsError ? (
                        <p className='text-sm text-red-600'>
                          {permissionsError}
                        </p>
                      ) : permissionsCatalog.length === 0 ? (
                        <p className='text-sm text-gray-500'>
                          No active permissions found. Seed/create permissions
                          first.
                        </p>
                      ) : (
                        permissionsCatalog.map(permission => (
                          <label
                            key={permission.id}
                            className='flex items-center gap-2 text-sm text-gray-700'
                          >
                            <input
                              type='checkbox'
                              checked={selectedRolePermissions.includes(
                                permission.key
                              )}
                              onChange={() =>
                                toggleRolePermission(permission.key)
                              }
                              className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                            />
                            <span>{permission.key}</span>
                          </label>
                        ))
                      )}
                    </div>

                    <div className='mt-6 border-t border-gray-200 pt-4'>
                      <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                        Country
                      </p>
                      <div className='mt-3 flex flex-col gap-3 sm:flex-row sm:items-center'>
                        <SearchableDropdown
                          value={selectedRoleCountry}
                          options={COUNTRY_OPTIONS}
                          onChange={value =>
                            setSelectedRoleCountry(value as CountryCode)
                          }
                          className='w-full sm:w-48'
                          dropdownPlacement='up'
                          searchPlaceholder='Search country...'
                        />
                        <button
                          onClick={() => {
                            if (!selectedRolePermissionsRoleId) return
                            setRoleCountryOverrides(prev => ({
                              ...prev,
                              [selectedRolePermissionsRoleId]:
                                selectedRoleCountry
                            }))
                          }}
                          disabled={!selectedRolePermissionsRoleId}
                          className='inline-flex w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-orange-50 to-orange-100 px-4 py-2 text-sm font-semibold text-amber-800 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md hover:from-amber-100 hover:via-orange-100 hover:to-orange-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:translate-y-0 disabled:opacity-60 disabled:shadow-none dark:border-amber-500/40 dark:from-amber-500/20 dark:via-orange-500/20 dark:to-orange-500/20 dark:text-amber-100 sm:w-auto'
                        >
                          <FaEarthAmericas className='text-base' />
                          Edit Country
                        </button>
                      </div>
                    </div>

                    <div className='mt-4 flex items-center justify-between gap-2'>
                      <p className='text-xs text-gray-500'>
                        {selectedRolePermissions.length} selected
                      </p>
                      <button
                        onClick={() => void saveRolePermissions()}
                        disabled={
                          savingRolePermissions ||
                          !selectedRolePermissionsRoleId ||
                          permissionsLoading ||
                          loadingRolePermissions
                        }
                        className='rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
                      >
                        {savingRolePermissions
                          ? 'Saving...'
                          : 'Save Permissions'}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </SurfaceCard>
        ) : null}

        {activeTab === 'system-settings' ? (
          <SurfaceCard>
            <h2 className='mb-3 text-xl font-semibold'>System Settings</h2>
            {loadingSettings ? (
              <p className='mb-3 text-sm text-gray-500'>
                Loading system settings...
              </p>
            ) : null}
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <label className='field-label'>Company Name</label>
                <input
                  className='field-input'
                  value={systemSettings.companyName}
                  onChange={e =>
                    setSystemSettings(s => ({
                      ...s,
                      companyName: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Support Email</label>
                <input
                  className='field-input'
                  value={systemSettings.supportEmail}
                  onChange={e =>
                    setSystemSettings(s => ({
                      ...s,
                      supportEmail: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Support Phone</label>
                <input
                  className='field-input'
                  value={systemSettings.supportPhone}
                  onChange={e =>
                    setSystemSettings(s => ({
                      ...s,
                      supportPhone: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Timezone</label>
                <input
                  className='field-input'
                  value={systemSettings.timezone}
                  onChange={e =>
                    setSystemSettings(s => ({ ...s, timezone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Currency</label>
                <input
                  className='field-input'
                  value={systemSettings.currency}
                  onChange={e =>
                    setSystemSettings(s => ({ ...s, currency: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Date Format</label>
                <input
                  className='field-input'
                  value={systemSettings.dateFormat}
                  onChange={e =>
                    setSystemSettings(s => ({
                      ...s,
                      dateFormat: e.target.value
                    }))
                  }
                />
              </div>
              <div className='md:col-span-2'>
                <label className='field-label'>Website URL</label>
                <input
                  className='field-input'
                  value={systemSettings.websiteUrl}
                  onChange={e =>
                    setSystemSettings(s => ({
                      ...s,
                      websiteUrl: e.target.value
                    }))
                  }
                />
              </div>
            </div>
            <button
              onClick={() => void saveSystem()}
              disabled={savingSystem || !canUpdateSettings}
              className='mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
            >
              {savingSystem ? 'Saving...' : 'Save Settings'}
            </button>
          </SurfaceCard>
        ) : null}

        {activeTab === 'destinations-pricing' ? (
          <DestinationPricingManager
            canReadSettings={canReadSettings}
            canUpdateSettings={canUpdateSettings}
          />
        ) : null}

        {activeTab === 'pdf-templates' ? (
          <SurfaceCard>
            <h2 className='text-xl font-semibold'>PDF Templates</h2>
            <p className='mt-1 text-sm text-gray-500'>
              Template editor module ready for integration.
            </p>
          </SurfaceCard>
        ) : null}

        {activeTab === 'integrations' ? (
          <SurfaceCard>
            <h2 className='text-xl font-semibold'>Integrations</h2>
            <p className='mt-1 text-sm text-gray-500'>
              Configure Meta, WhatsApp, SMTP, and webhook settings.
            </p>
            {loadingSettings ? (
              <p className='mt-2 text-sm text-gray-500'>
                Loading integration settings...
              </p>
            ) : null}
            <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <label className='field-label'>Meta App ID</label>
                <input
                  className='field-input'
                  value={integrationSettings.metaAppId}
                  onChange={e =>
                    setIntegrationSettings(s => ({
                      ...s,
                      metaAppId: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Meta Access Token</label>
                <input
                  className='field-input'
                  value={integrationSettings.metaAccessToken}
                  onChange={e =>
                    setIntegrationSettings(s => ({
                      ...s,
                      metaAccessToken: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>WhatsApp API Token</label>
                <input
                  className='field-input'
                  value={integrationSettings.whatsappApiToken}
                  onChange={e =>
                    setIntegrationSettings(s => ({
                      ...s,
                      whatsappApiToken: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>SMTP Host</label>
                <input
                  className='field-input'
                  value={integrationSettings.smtpHost}
                  onChange={e =>
                    setIntegrationSettings(s => ({
                      ...s,
                      smtpHost: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>SMTP Port</label>
                <input
                  type='number'
                  className='field-input'
                  value={integrationSettings.smtpPort}
                  onChange={e =>
                    setIntegrationSettings(s => ({
                      ...s,
                      smtpPort: Number(e.target.value) || 0
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>SMTP User</label>
                <input
                  className='field-input'
                  value={integrationSettings.smtpUser}
                  onChange={e =>
                    setIntegrationSettings(s => ({
                      ...s,
                      smtpUser: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>SMTP Password</label>
                <input
                  type='password'
                  className='field-input'
                  value={integrationSettings.smtpPassword}
                  onChange={e =>
                    setIntegrationSettings(s => ({
                      ...s,
                      smtpPassword: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>SMTP From Email</label>
                <input
                  type='email'
                  className='field-input'
                  value={integrationSettings.smtpFromEmail}
                  onChange={e =>
                    setIntegrationSettings(s => ({
                      ...s,
                      smtpFromEmail: e.target.value
                    }))
                  }
                />
              </div>
              <div className='md:col-span-2'>
                <label className='field-label'>Webhook URL</label>
                <input
                  className='field-input'
                  value={integrationSettings.webhookUrl}
                  onChange={e =>
                    setIntegrationSettings(s => ({
                      ...s,
                      webhookUrl: e.target.value
                    }))
                  }
                />
              </div>
            </div>
            <button
              onClick={() => void saveIntegrations()}
              disabled={savingIntegrations || !canUpdateSettings}
              className='mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
            >
              {savingIntegrations ? 'Saving...' : 'Save Integrations'}
            </button>
          </SurfaceCard>
        ) : null}
      </div>

      {inviteOpen && canCreateUsers ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40'
            onClick={() => setInviteOpen(false)}
          />
          <div className='relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl'>
            <h3 className='text-lg font-semibold'>Invite Team Member</h3>
            <div className='mt-4 space-y-3'>
              <input
                className='field-input'
                placeholder='Full Name'
                value={inviteForm.fullName}
                onChange={e =>
                  setInviteForm(f => ({ ...f, fullName: e.target.value }))
                }
              />
              <input
                className='field-input'
                placeholder='Email'
                value={inviteForm.email}
                onChange={e =>
                  setInviteForm(f => ({ ...f, email: e.target.value }))
                }
              />
              <input
                className='field-input'
                placeholder='Temporary Password'
                type='password'
                value={inviteForm.password}
                onChange={e =>
                  setInviteForm(f => ({ ...f, password: e.target.value }))
                }
              />
              <SearchableDropdown
                value={inviteForm.roleId}
                onChange={value =>
                  setInviteForm(f => ({ ...f, roleId: value }))
                }
                options={[
                  { value: '', label: 'Select Role (optional)' },
                  ...roles.map(r => ({ value: r.id, label: r.name }))
                ]}
                placeholder='Select Role (optional)'
                className='w-full'
              />
            </div>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                onClick={() => setInviteOpen(false)}
                className='rounded-xl border border-gray-200 px-4 py-2 text-sm'
              >
                Cancel
              </button>
              <button
                onClick={() => void onInvite()}
                disabled={inviteLoading}
                className='rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white'
              >
                {inviteLoading ? 'Inviting...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {createRoleOpen && canManageRbac ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40'
            onClick={closeCreateRoleModal}
          />
          <div className='relative w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-xl'>
            <h3 className='text-lg font-semibold'>Create Role</h3>
            <div className='mt-4 space-y-4'>
              <div>
                <label className='field-label'>Role Name</label>
                <input
                  className='field-input'
                  placeholder='e.g. Finance Manager'
                  value={createRoleName}
                  onChange={e => setCreateRoleName(e.target.value)}
                />
              </div>
              <div>
                <label className='field-label'>Country</label>
                <SearchableDropdown
                  value={createRoleCountry}
                  options={COUNTRY_OPTIONS}
                  onChange={value => setCreateRoleCountry(value as CountryCode)}
                  className='mt-1 w-full'
                  searchPlaceholder='Search country...'
                />
              </div>
              <div>
                <label className='field-label'>Permissions</label>
                <PermissionsMultiSelect
                  selected={createRolePermissions}
                  onChange={setCreateRolePermissions}
                  options={permissionsCatalog}
                  className='mt-1'
                  disabled={permissionsLoading}
                  isLoading={permissionsLoading}
                  placeholder='Select permissions'
                />
                {createRolePermissions.length ? (
                  <div className='mt-3 flex flex-wrap gap-2'>
                    {createRolePermissions.map(permissionKey => (
                      <span
                        key={permissionKey}
                        className='inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700'
                      >
                        {permissionKey}
                        <button
                          type='button'
                          className='text-blue-500 hover:text-blue-700'
                          onClick={() =>
                            setCreateRolePermissions(prev =>
                              prev.filter(item => item !== permissionKey)
                            )
                          }
                        >
                          x
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className='mt-2 text-xs text-gray-500'>
                    Pick one or more permissions to pre-fill the role setup.
                  </p>
                )}
              </div>
            </div>
            <div className='mt-6 flex justify-end gap-2'>
              <button
                onClick={closeCreateRoleModal}
                className='rounded-xl border border-gray-200 px-4 py-2 text-sm'
              >
                Cancel
              </button>
              <button
                onClick={() => void handleCreateRole()}
                disabled={
                  createRoleLoading ||
                  !createRoleName.trim() ||
                  !createRolePermissions.length
                }
                className='rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
              >
                {createRoleLoading ? 'Creating...' : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {assignOpen && canManageRbac ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
          <div
            className='absolute inset-0 bg-black/40'
            onClick={() => {
              setAssignOpen(false)
              setAssignRoleSearch('')
              setAssignCreateRoleName('')
              setAssignRoleDropdownOpen(false)
            }}
          />
          <div className='relative w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-xl'>
            <h3 className='text-lg font-semibold'>Assign Role</h3>
            <div className='mt-4 space-y-3'>
              <SearchableDropdown
                value={assignUserId}
                onChange={setAssignUserId}
                options={[
                  { value: '', label: 'Select user' },
                  ...users.map(u => ({
                    value: u.id,
                    label: `${u.fullName} (${u.email})`
                  }))
                ]}
                placeholder='Select user'
                className='w-full'
              />
              <div className='relative'>
                <input
                  className='field-input'
                  placeholder='Select or type role'
                  value={assignRoleSearch}
                  onChange={e => {
                    const next = e.target.value
                    setAssignRoleSearch(next)
                    setAssignRoleDropdownOpen(true)
                    setAssignRoleId('')
                    setAssignCreateRoleName('')
                  }}
                  onFocus={() => setAssignRoleDropdownOpen(true)}
                />
                {assignRoleDropdownOpen ? (
                  <div className='absolute z-10 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto'>
                    {(() => {
                      const query = assignRoleSearch.trim().toLowerCase()
                      const filtered = roles.filter(r =>
                        r.name.toLowerCase().includes(query)
                      )
                      const exactMatch = roles.some(
                        r => r.name.toLowerCase() === query
                      )
                      return (
                        <>
                          {filtered.map(role => (
                            <button
                              key={role.id}
                              type='button'
                              className='w-full text-left px-3 py-2 text-sm hover:bg-gray-50'
                              onClick={() => {
                                setAssignRoleId(role.id)
                                setAssignRoleSearch(role.name)
                                setAssignCreateRoleName('')
                                setAssignRoleDropdownOpen(false)
                              }}
                            >
                              {role.name}
                            </button>
                          ))}
                          {!exactMatch && query ? (
                            <button
                              type='button'
                              className='w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50'
                              onClick={() => {
                                setAssignRoleId('')
                                setAssignCreateRoleName(assignRoleSearch.trim())
                                setAssignRoleDropdownOpen(false)
                              }}
                            >
                              Create new role: "{assignRoleSearch.trim()}"
                            </button>
                          ) : null}
                          {filtered.length === 0 && !query ? (
                            <p className='px-3 py-2 text-sm text-gray-500'>
                              No roles found.
                            </p>
                          ) : null}
                        </>
                      )
                    })()}
                  </div>
                ) : null}
              </div>
            </div>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                onClick={() => {
                  setAssignOpen(false)
                  setAssignRoleSearch('')
                  setAssignCreateRoleName('')
                  setAssignRoleDropdownOpen(false)
                }}
                className='rounded-xl border border-gray-200 px-4 py-2 text-sm'
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (!assignUserId) {
                    setError('Please select a user.')
                    return
                  }
                  setAssignLoading(true)
                  try {
                    if (assignCreateRoleName) {
                      await onCreateAndAssignRole(assignCreateRoleName)
                      setMessage('Role created and assigned successfully.')
                      await loadRoles()
                      await loadUsers()
                    } else {
                      await usersService.update(assignUserId, {
                        roleId: assignRoleId
                      })
                      setMessage('Role assigned successfully.')
                      await loadUsers()
                    }
                    setAssignOpen(false)
                    setAssignUserId('')
                    setAssignRoleId('')
                    setAssignRoleSearch('')
                    setAssignCreateRoleName('')
                    setAssignRoleDropdownOpen(false)
                  } catch (e) {
                    setError(getApiErrorMessage(e, 'Unable to assign role'))
                  } finally {
                    setAssignLoading(false)
                  }
                }}
                disabled={
                  assignLoading ||
                  !assignUserId ||
                  (!assignRoleId && !assignCreateRoleName)
                }
                className='rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
              >
                {assignLoading ? 'Assigning...' : 'Assign Role'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

const StatCard = ({
  title,
  value,
  icon
}: {
  title: string
  value: string
  icon: React.ReactNode
}) => (
  <SurfaceCard hoverable className='flex items-center justify-between p-5'>
    <div>
      <p className='text-xs uppercase tracking-wide text-gray-500'>{title}</p>
      <p className='mt-1 text-2xl font-semibold text-gray-900 dark:text-gray-100'>
        {value}
      </p>
    </div>
    {icon}
  </SurfaceCard>
)

type PermissionsMultiSelectProps = {
  selected: string[]
  options: PermissionOption[]
  onChange: (next: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  isLoading?: boolean
}

const PermissionsMultiSelect: React.FC<PermissionsMultiSelectProps> = ({
  selected,
  options,
  onChange,
  placeholder = 'Select permissions',
  className = '',
  disabled = false,
  isLoading = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement | null>(null)

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        closeDropdown()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [closeDropdown])

  const toggleDropdown = () => {
    if (disabled) return
    setIsOpen(prev => {
      const next = !prev
      if (!next) setQuery('')
      return next
    })
  }

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter(option => {
      const haystack = `${option.key} ${option.description ?? ''}`.toLowerCase()
      return haystack.includes(term)
    })
  }, [options, query])

  const toggleOption = (key: string) => {
    if (selected.includes(key)) {
      onChange(selected.filter(item => item !== key))
      return
    }
    onChange(
      [...selected, key].sort((left, right) => left.localeCompare(right))
    )
  }

  return (
    <div className={`relative ${className}`} ref={rootRef}>
      <button
        type='button'
        disabled={disabled}
        onClick={toggleDropdown}
        className='flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-800 shadow-sm transition hover:border-gray-300 hover:shadow-md focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60'
      >
        <span
          className={`truncate ${
            selected.length ? 'font-medium' : 'text-gray-400'
          }`}
        >
          {selected.length ? `${selected.length} selected` : placeholder}
        </span>
        <FaChevronDown
          className={`ml-2 text-xs text-gray-500 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen ? (
        <div className='absolute z-30 mt-2 w-full rounded-xl border border-gray-200 bg-white shadow-xl'>
          {isLoading ? (
            <p className='px-3 py-4 text-sm text-gray-500'>
              Loading permissions...
            </p>
          ) : options.length === 0 ? (
            <p className='px-3 py-4 text-sm text-gray-500'>
              No permissions available.
            </p>
          ) : (
            <>
              <div className='border-b border-gray-100 p-2'>
                <div className='relative'>
                  <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
                  <input
                    className='field-input !rounded-lg !py-2 !pl-9'
                    placeholder='Search permissions'
                    value={query}
                    onChange={event => setQuery(event.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              <div className='max-h-48 overflow-y-auto p-2'>
                {filteredOptions.length ? (
                  filteredOptions.map(option => (
                    <label
                      key={option.id ?? option.key}
                      className='mb-1 flex items-start gap-2 rounded-lg px-2 py-1.5 text-sm last:mb-0 hover:bg-gray-50'
                    >
                      <input
                        type='checkbox'
                        className='mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                        checked={selected.includes(option.key)}
                        onChange={() => toggleOption(option.key)}
                      />
                      <div>
                        <p className='font-semibold text-gray-800'>
                          {option.key}
                        </p>
                        {option.description ? (
                          <p className='text-xs text-gray-500'>
                            {option.description}
                          </p>
                        ) : null}
                      </div>
                    </label>
                  ))
                ) : (
                  <p className='px-2 py-2 text-sm text-gray-500'>
                    No matching permissions.
                  </p>
                )}
              </div>

              <div className='border-t border-gray-100 bg-gray-50 px-3 py-2 flex items-center justify-between'>
                <button
                  type='button'
                  className='text-xs font-semibold text-blue-600 disabled:opacity-40'
                  onClick={() => onChange([])}
                  disabled={!selected.length}
                >
                  Clear all permissions
                </button>
                <button
                  type='button'
                  className='rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50'
                  onClick={closeDropdown}
                  disabled={!selected.length}
                >
                  Confirm
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  )
}

export default Settings
