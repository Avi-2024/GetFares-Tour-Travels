import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaChevronDown,
  FaPlus,
  FaMagnifyingGlass,
} from 'react-icons/fa6'
import Select from 'react-select'
import { Country } from 'country-state-city'
import {
  PhoneInput,
  type CountryIso2,
  type PhoneInputRefType
} from 'react-international-phone'
import 'react-international-phone/style.css'
import { getApiErrorMessage } from '../../api/apiClient'
import {
  settingsApi,
  type IntegrationSettingsPayload,
  type SystemSettingsPayload,
} from "../../api/settings";
import { countriesApi, type CountryRecord } from "../../api/countries";
import { useAuth } from "../../context/AuthContext";
import { useDateTimePreferences } from "../../context/DateTimePreferencesContext";
import { useAuthService } from "../../hooks/useAuthService";
import { useUsersService } from "../../hooks/useUsersService";
import SurfaceCard from "../ui/SurfaceCard";
import SearchableDropdown from "../ui/SearchableDropdown";
import DestinationPricingManager from "../settings/DestinationPricingManager";
import CountryManagementPanel from "../settings/CountryManagementPanel";
import CurrencyRatesPanel from "../settings/CurrencyRatesPanel";
import { buildAdminCountryOptions, type CountryOption } from "../../utils/countries";

import UsersPage from "../../pages/users/UsersPage";

function isSuperAdminRole(role?: string) {
  const normalized = String(role ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
  return normalized === "super_admin" || normalized === "superadmin";
}

type Tab =
  | 'user-management'
  | 'roles-permissions'
  | 'system-settings'
  | 'currency-rates'
  | 'country-management'
  | 'destinations-pricing'
  | 'pdf-templates'
  | 'integrations'

type UserRecord = {
  id: string
  fullName: string
  email: string
  role?: string
  roleId?: string
  country?: string
  agentCountry?: string
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
  country?: string
  agentCountry?: string
  agent_country?: string
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
  country?: string | null
  isActive?: boolean
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

type CountryCode = string

const DEFAULT_COUNTRY_OPTIONS: CountryOption[] = [
  { value: 'All', label: 'All Countries' },
  { value: 'India', label: 'India' },
  { value: 'UAE', label: 'UAE' }
]

type UserCountryOption = {
  value: string
  label: string
  iso2: CountryIso2
}

const tabs: Array<{ id: Tab; label: string }> = [
  { id: 'user-management', label: 'User Management' },
  { id: 'roles-permissions', label: 'Roles & Permissions' },
  // { id: 'country-management', label: 'Country Management' },
  { id: 'system-settings', label: 'System Settings' },
  { id: 'currency-rates', label: 'Currency Rates' },
  // { id: 'destinations-pricing', label: 'Destinations & Pricing' },
  // { id: 'pdf-templates', label: 'PDF Templates' }
  // { id: "integrations", label: "Integrations" },
]

const DEFAULT_SYSTEM: SystemSettingsForm = {
  companyName: "Get2Vacations",
  supportEmail: "support@Get2Vacations.com",
  supportPhone: "",
  timezone: "Asia/Kolkata",
  locale: "en-IN",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  websiteUrl: "",
};

const SYSTEM_LOCALE_OPTIONS = [
  { value: "en-IN", label: "India (en-IN)" },
  { value: "en-US", label: "United States (en-US)" },
  { value: "en-GB", label: "United Kingdom (en-GB)" },
  { value: "ar-AE", label: "UAE (ar-AE)" },
  { value: "fr-FR", label: "France (fr-FR)" },
  { value: "de-DE", label: "Germany (de-DE)" },
  { value: "es-ES", label: "Spain (es-ES)" },
  { value: "ja-JP", label: "Japan (ja-JP)" },
];

const SYSTEM_DATE_FORMAT_OPTIONS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
  { value: "DD-MM-YYYY", label: "DD-MM-YYYY" },
];

const SYSTEM_TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST)" },
  { value: "Europe/Paris", label: "Europe/Paris (CET)" },
  { value: "America/New_York", label: "America/New_York (ET)" },
  { value: "America/Chicago", label: "America/Chicago (CT)" },
  { value: "America/Denver", label: "America/Denver (MT)" },
  { value: "America/Los_Angeles", label: "America/Los_Angeles (PT)" },
  { value: "Asia/Singapore", label: "Asia/Singapore (SGT)" },
  { value: "Australia/Sydney", label: "Australia/Sydney (AEST/AEDT)" },
];

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

type ErrorEnvelope = {
  error?: {
    code?: string
    details?: {
      existingRoleId?: string
      existingRoleName?: string
      existingCountry?: string | null
      requestedCountry?: string | null
    } | null
  }
}

const extractErrorEnvelope = (error: unknown): ErrorEnvelope | null => {
  if (!error || typeof error !== 'object') return null
  const details = (error as { details?: unknown }).details
  if (!details || typeof details !== 'object') return null
  const envelope = details as ErrorEnvelope
  if (!envelope.error || typeof envelope.error !== 'object') return null
  return envelope
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
      country:
        row.country || row.agentCountry || row.agent_country || undefined,
      agentCountry: row.agentCountry || row.agent_country || undefined,
      lastActive: parseDate(
        row.lastLogin || row.last_login || row.createdAt || row.created_at
      )
    }))

type PermissionRow = {
  key: string
  label: string
  description?: string | null
  isWildcard?: boolean
  raw?: PermissionOption
}

type PermissionGroup = {
  id: string
  label: string
  permissions: PermissionRow[]
}

const ROLE_COLOR_PALETTE = [
  '#f04747',
  '#faa61a',
  '#57f287',
  '#5865f2',
  '#eb459e',
  '#00b0f4',
  '#f1c40f',
  '#a970ff'
]

const toTitleCase = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')

const humanizeToken = (value: string) =>
  toTitleCase(
    value
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/[-_]+/g, ' ')
      .toLowerCase()
  )

const getRoleColor = (name: string) => {
  const input = name || 'role'
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % ROLE_COLOR_PALETTE.length
  return ROLE_COLOR_PALETTE[index]
}

const getCountryHue = (value: string) => {
  const input = value || 'country'
  let hash = 0
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Create',
  read: 'Read',
  update: 'Update',
  delete: 'Delete',
  view: 'View',
  manage: 'Manage',
  export: 'Export',
  approve: 'Approve',
  assign: 'Assign'
}

const buildPermissionGroups = (
  permissions: PermissionOption[]
): PermissionGroup[] => {
  const groups = new Map<string, PermissionGroup>()
  permissions.forEach(permission => {
    const key = permission.key
    if (!key) return

    let groupId = 'general'
    let groupLabel = 'General'
    let label = permission.key
    let description = permission.description ?? null
    let isWildcard = false

    if (key === '*') {
      groupId = 'administrator'
      groupLabel = 'Administrator'
      label = 'Administrator'
      description =
        description ?? 'Full access to all CRM data and administration.'
      isWildcard = true
    } else if (key.includes(':')) {
      const [moduleToken, actionTokenRaw] = key.split(':')
      const moduleLabel = humanizeToken(moduleToken || 'General')
      const actionToken = (actionTokenRaw || '').trim().toLowerCase()
      groupId = moduleToken || 'general'
      groupLabel = moduleLabel

      if (!actionToken || actionToken === '*') {
        label = `All ${moduleLabel}`
        description =
          description ?? `Full access to all ${moduleLabel} actions.`
        isWildcard = true
      } else {
        const actionLabel =
          ACTION_LABELS[actionToken] ?? humanizeToken(actionToken)
        label = `${actionLabel} ${moduleLabel}`
        description =
          description ??
          `Allows ${actionLabel.toLowerCase()} for ${moduleLabel}.`
      }
    } else {
      const tokenLabel = humanizeToken(key)
      label = tokenLabel
      groupId = tokenLabel.toLowerCase()
      groupLabel = tokenLabel
      description = description ?? `Permission: ${tokenLabel}.`
    }

    const row: PermissionRow = {
      key,
      label,
      description,
      isWildcard,
      raw: permission
    }

    if (!groups.has(groupId)) {
      groups.set(groupId, {
        id: groupId,
        label: groupLabel,
        permissions: [row]
      })
    } else {
      groups.get(groupId)!.permissions.push(row)
    }
  })

  return Array.from(groups.values())
    .map(group => ({
      ...group,
      permissions: group.permissions.sort((a, b) =>
        a.label.localeCompare(b.label)
      )
    }))
    .sort((a, b) => {
      if (a.id === 'administrator') return -1
      if (b.id === 'administrator') return 1
      return a.label.localeCompare(b.label)
    })
}

const PermissionToggleRow: React.FC<{
  permission: PermissionRow
  checked: boolean
  disabled?: boolean
  onToggle: () => void
}> = ({ permission, checked, disabled = false, onToggle }) => (
  <div
    className={`flex items-center justify-between gap-4 rounded-xl border px-4 py-3 transition ${
      disabled
        ? 'border-gray-100 bg-gray-50 opacity-70 dark:border-gray-800 dark:bg-gray-900/60'
        : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600'
    }`}
  >
    <div>
      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
        {permission.label}
      </p>
      <p className='text-xs text-gray-500 dark:text-gray-400'>
        {permission.description}
      </p>
    </div>
    <button
      type='button'
      onClick={() => {
        if (!disabled) onToggle()
      }}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
      aria-pressed={checked}
      aria-disabled={disabled}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
)

const PermissionCategorySection: React.FC<{
  group: PermissionGroup
  isOpen: boolean
  onToggle: () => void
  renderRow: (permission: PermissionRow) => React.ReactNode
}> = ({ group, isOpen, onToggle, renderRow }) => (
  <div className='rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'>
    <button
      type='button'
      onClick={onToggle}
      className='flex w-full items-center justify-between px-4 py-3 text-left'
    >
      <div>
        <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
          {group.label}
        </p>
        <p className='text-xs text-gray-500 dark:text-gray-400'>
          {group.permissions.length} permissions
        </p>
      </div>
      <FaChevronDown
        className={`text-sm text-gray-500 dark:text-gray-400 transition ${
          isOpen ? 'rotate-180' : ''
        }`}
      />
    </button>
    {isOpen ? (
      <div className='flex flex-col gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700'>
        {group.permissions.map(permission => (
          <div key={permission.key}>{renderRow(permission)}</div>
        ))}
      </div>
    ) : null}
  </div>
)

const RoleListItem: React.FC<{
  role: { id: string; name: string; users: number; permissions: number }
  selected: boolean
  countryLabel?: string
  onSelect: () => void
}> = ({ role, selected, countryLabel, onSelect }) => (
  <button
    type='button'
    onClick={onSelect}
    className={`flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left transition ${
      selected
        ? 'border-blue-200 bg-blue-50 dark:border-blue-700/50 dark:bg-blue-950/40'
        : 'border-transparent hover:bg-gray-50 dark:hover:bg-gray-800/50'
    } ${countryLabel ? 'border-l-4' : ''}`}
    style={
      countryLabel
        ? { borderLeftColor: `hsl(${getCountryHue(countryLabel)} 70% 45%)` }
        : undefined
    }
  >
    <div className='flex items-center justify-between'>
      <div className='flex items-center gap-2'>
        <span
          className='h-2.5 w-2.5 rounded-full'
          style={{ backgroundColor: getRoleColor(role.name) }}
        />
        <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
          {role.name}
        </p>
      </div>
      {countryLabel ? (
        <span
          className='rounded-full border px-2 py-0.5 text-[11px] font-semibold'
          style={{
            borderColor: `hsl(${getCountryHue(countryLabel)} 70% 45%)`,
            color: `hsl(${getCountryHue(countryLabel)} 70% 40%)`,
            backgroundColor: `hsla(${getCountryHue(
              countryLabel
            )}, 70%, 45%, 0.12)`
          }}
        >
          {countryLabel}
        </span>
      ) : null}
    </div>
    <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
      <span>{role.users} members</span>
      <span>{role.permissions} perms</span>
    </div>
  </button>
)

const Settings: React.FC = () => {
  const { hasPermission, user } = useAuth();
  const isSuperAdmin = isSuperAdminRole(user?.role);
  const { updatePreferences } = useDateTimePreferences();
  const usersService = useUsersService();
  const authService = useAuthService();
  const [activeTab, setActiveTab] = useState<Tab>("user-management");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
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
  const [roleSearch, setRoleSearch] = useState('')
  const [roleCountryFilter, setRoleCountryFilter] = useState<CountryCode>('All')
  const [memberSearch, setMemberSearch] = useState('')
  const [permissionSearch, setPermissionSearch] = useState('')
  const [roleTab, setRoleTab] = useState<
    'members' | 'permissions' | 'configuration'
  >('permissions')
  const [permissionCategoryState, setPermissionCategoryState] = useState<
    Record<string, boolean>
  >({})
  const [roleConfigName, setRoleConfigName] = useState('')
  const [roleConfigDescription, setRoleConfigDescription] = useState('')
  const [roleConfigCountry, setRoleConfigCountry] =
    useState<CountryCode>('India')
  const [roleConfigActive, setRoleConfigActive] = useState(true)
  const [roleConfigSaving, setRoleConfigSaving] = useState(false)
  const [rolePermissionCounts, setRolePermissionCounts] = useState<
    Record<string, number>
  >({})
  const [roleCountryOverrides, setRoleCountryOverrides] = useState<
    Record<string, CountryCode>
  >({})
  const [adminCountryFilter, setAdminCountryFilter] =
    useState<CountryCode>('All')
  const [loadingRolePermissions, setLoadingRolePermissions] = useState(false)
  const [savingRolePermissions, setSavingRolePermissions] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const noticeTimerRef = useRef<number | null>(null)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    fullName: '',
    email: '',
    password: '',
    roleId: '',
    country: '',
    phone: ''
  })
  const [inviteCountryIso2, setInviteCountryIso2] = useState<CountryIso2>('in')
  const invitePhoneInputRef = useRef<PhoneInputRefType>(null)

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
  const [countries, setCountries] = useState<CountryRecord[]>([])
  const [, setLoadingCountries] = useState(false)
  const canReadUsers = hasPermission('users:read')
  const canCreateUsers = hasPermission('users:create')
  const canUpdateUsers = hasPermission('users:update')
  const canManageRbac = hasPermission('rbac:manage')
  const canReadSettings = hasPermission('settings:read')
  const canUpdateSettings = hasPermission('settings:update')

  const countryOptions = useMemo<CountryOption[]>(() => {
    if (!countries.length) return DEFAULT_COUNTRY_OPTIONS
    return buildAdminCountryOptions(countries)
  }, [countries])

  const roleCountryOptions = useMemo<CountryOption[]>(() => {
    return countryOptions.filter(option => option.value !== 'All')
  }, [countryOptions])

  const userCountryOptions = useMemo<UserCountryOption[]>(() => {
    return Country.getAllCountries()
      .map(country => ({
        value: country.name,
        label: country.name,
        iso2: String(country.isoCode || '').toLowerCase() as CountryIso2
      }))
      .filter(option => option.value && option.iso2)
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [])

  const userCountryByIso2 = useMemo(() => {
    return new Map<CountryIso2, UserCountryOption>(
      userCountryOptions.map(option => [option.iso2, option])
    )
  }, [userCountryOptions])

  const selectedInviteCountryOption = useMemo(() => {
    if (!inviteForm.country) return null
    return (
      userCountryOptions.find(option => option.value === inviteForm.country) ??
      null
    )
  }, [inviteForm.country, userCountryOptions])

  const inviteCountrySelectStyles = useMemo(
    () => ({
      control: (base: any, state: any) => ({
        ...base,
        minHeight: 46,
        borderRadius: 12,
        borderColor: state.isFocused ? '#2563eb' : '#d1d5db',
        boxShadow: state.isFocused
          ? '0 0 0 2px rgba(37, 99, 235, 0.12)'
          : 'none',
        '&:hover': {
          borderColor: state.isFocused ? '#2563eb' : '#9ca3af'
        }
      }),
      valueContainer: (base: any) => ({
        ...base,
        padding: '0 12px'
      }),
      indicatorsContainer: (base: any) => ({
        ...base,
        paddingRight: 6
      }),
      menu: (base: any) => ({
        ...base,
        borderRadius: 12,
        overflow: 'hidden',
        zIndex: 70
      }),
      option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isFocused ? '#eff6ff' : '#ffffff',
        color: '#111827'
      })
    }),
    []
  )

  const resetInviteForm = useCallback(() => {
    setInviteForm({
      fullName: '',
      email: '',
      password: '',
      roleId: '',
      country: '',
      phone: ''
    })
    setInviteCountryIso2('in')
  }, [])

  const closeInviteModal = useCallback(() => {
    setInviteOpen(false)
    resetInviteForm()
  }, [resetInviteForm])

  const handleInviteCountryChange = useCallback(
    (option: UserCountryOption | null) => {
      const iso2 = option?.iso2 ?? 'in'
      setInviteCountryIso2(iso2)
      setInviteForm(prev => ({
        ...prev,
        country: option?.value ?? ''
      }))
    },
    []
  )

  const handleInvitePhoneChange = useCallback(
    (phone: string, meta: { country: { iso2: CountryIso2 } }) => {
      const iso2 = meta?.country?.iso2 ?? 'in'
      const countryOption = userCountryByIso2.get(iso2)
      setInviteCountryIso2(iso2)
      setInviteForm(prev => ({
        ...prev,
        phone,
        country: countryOption?.value ?? prev.country
      }))
    },
    [userCountryByIso2]
  )

  useEffect(() => {
    invitePhoneInputRef.current?.setCountry(inviteCountryIso2, {
      focusOnInput: false
    })
  }, [inviteCountryIso2])
  const visibleTabs = useMemo(
    () =>
      tabs.filter(tab => {
        if (tab.id === 'user-management') return canReadUsers
        if (tab.id === 'roles-permissions') return canManageRbac
        return canReadSettings
      }),
    [canManageRbac, canReadSettings, canReadUsers, isSuperAdmin]
  )

  const loadUsers = useCallback(async () => {
    if (!canReadUsers) {
      setUsers([])
      return
    }
    try {
      const response = await usersService.list()
      setUsers(normalizeUsers(extractRows<RawUser>(response)))
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to load users'))
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
          description: row.description ?? null,
          country: row.country ?? null
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
    const loadCountries = async () => {
      setLoadingCountries(true)
      try {
        const response = await countriesApi.list({ includeInactive: false })
        const data = response?.data || []
        setCountries(Array.isArray(data) ? data : [])
      } catch (e) {
        console.error('Failed to load countries:', e)
        setCountries([])
      } finally {
        setLoadingCountries(false)
      }
    }
    void loadCountries()
  }, [])

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
        const response = await settingsApi.getAll();
        const data = extractObject<SettingsResponse>(response);
        if (data?.system) {
          setSystemSettings((s) => ({
            ...s,
            ...data.system,
          
          }));
          updatePreferences({
            timezone: data.system.timezone,
            locale: data.system.locale,
            dateFormat: data.system.dateFormat,
          });
        }
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
    };
    void loadSettings();
  }, [updatePreferences]);

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
        roles.filter(r => r.country).map(r => [r.id, r.country as CountryCode])
      ),
    [roles]
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

  const filteredRoleStats = useMemo(() => {
    const query = roleSearch.trim().toLowerCase()
    const countryFilter = roleCountryFilter?.toLowerCase?.() ?? 'all'
    return roleStats.filter(role => {
      const nameMatched = !query || role.name.toLowerCase().includes(query)
      if (!nameMatched) return false
      if (!countryFilter || countryFilter === 'all') return true
      const roleCountry = getRoleCountry(role.id)
      return roleCountry.toLowerCase() === countryFilter
    })
  }, [roleSearch, roleStats, roleCountryFilter, getRoleCountry])

  const selectedRoleMembers = useMemo(() => {
    if (!selectedRolePermissionsRoleId) return []
    const base = users.filter(
      user => user.roleId === selectedRolePermissionsRoleId
    )
    const query = memberSearch.trim().toLowerCase()
    if (!query) return base
    return base.filter(
      user =>
        user.fullName.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
    )
  }, [users, selectedRolePermissionsRoleId, memberSearch])

  const permissionGroups = useMemo(
    () => buildPermissionGroups(permissionsCatalog),
    [permissionsCatalog]
  )

  const filteredPermissionGroups = useMemo(() => {
    const query = permissionSearch.trim().toLowerCase()
    if (!query) return permissionGroups
    return permissionGroups
      .map(group => ({
        ...group,
        permissions: group.permissions.filter(permission => {
          const label = permission.label.toLowerCase()
          const key = permission.key.toLowerCase()
          return label.includes(query) || key.includes(query)
        })
      }))
      .filter(group => group.permissions.length > 0)
  }, [permissionGroups, permissionSearch])

  useEffect(() => {
    setPermissionCategoryState(prev => {
      const next = { ...prev }
      permissionGroups.forEach(group => {
        if (next[group.id] === undefined) {
          next[group.id] = true
        }
      })
      return next
    })
  }, [permissionGroups])

  const selectedRole = useMemo(
    () => roles.find(role => role.id === selectedRolePermissionsRoleId) ?? null,
    [roles, selectedRolePermissionsRoleId]
  )

  useEffect(() => {
    if (!selectedRole) {
      setRoleConfigName('')
      setRoleConfigDescription('')
      setRoleConfigCountry('India')
      setRoleConfigActive(true)
      return
    }
    setRoleConfigName(selectedRole.name ?? '')
    setRoleConfigDescription(selectedRole.description ?? '')
    setRoleConfigCountry(getRoleCountry(selectedRole.id))
    setRoleConfigActive(selectedRole.isActive !== false)
  }, [selectedRole, getRoleCountry])

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

  const closeCreateRoleModal = useCallback(() => {
    setCreateRoleOpen(false)
    setCreateRoleName('')
    setCreateRoleCountry('India')
    setCreateRolePermissions([])
  }, [])

  const handleCreateRole = async () => {
    if (!canManageRbac) {
      setError('You do not have permission to create roles.')
      return
    }

    const roleName = createRoleName.trim()
    const permissionKeys = [
      ...new Set(
        createRolePermissions
          .map(permission => permission.trim())
          .filter(Boolean)
      )
    ]
    const roleCountry = createRoleCountry === 'All' ? null : createRoleCountry

    if (!roleName) {
      setError('Role name is required.')
      return
    }

    if (!permissionKeys.length) {
      setError('Pick at least one permission.')
      return
    }

    setCreateRoleLoading(true)
    setError('')
    setMessage('')

    let createdRoleId = ''

    try {
      const created = await authService.createRole({
        name: roleName,
        country: roleCountry
      })

      createdRoleId = created?.id ?? ''
      if (!createdRoleId) {
        throw new Error('Role created without an id')
      }

      await authService.updateRolePermissions(createdRoleId, {
        replace: true,
        permissions: permissionKeys.map(key => ({
          key,
          enabled: true
        }))
      })

      try {
        await loadRoles()
      } catch (_error) {
        // Keep the create flow successful even if the follow-up refresh fails.
      }

      setRolePermissionCounts(previous => ({
        ...previous,
        [createdRoleId]: permissionKeys.length
      }))
      if (roleCountry) {
        setRoleCountryOverrides(previous => ({
          ...previous,
          [createdRoleId]: roleCountry
        }))
      }
      setSelectedRolePermissionsRoleId(createdRoleId)
      setSelectedRolePermissions(permissionKeys)
      closeCreateRoleModal()
      setMessage('Role created successfully.')
    } catch (e) {
      if (createdRoleId) {
        try {
          await loadRoles()
        } catch (_error) {
          // Keep the partially completed role visible even if reload fails.
        }

        if (roleCountry) {
          setRoleCountryOverrides(previous => ({
            ...previous,
            [createdRoleId]: roleCountry
          }))
        }
        setSelectedRolePermissionsRoleId(createdRoleId)
        setSelectedRolePermissions([])
        closeCreateRoleModal()
        setError(
          `Role created, but permissions could not be assigned. ${getApiErrorMessage(
            e,
            'Open the role and save permissions again.'
          )}`
        )
      } else {
        const envelope = extractErrorEnvelope(e)
        const errorCode = envelope?.error?.code
        const existingRoleId = envelope?.error?.details?.existingRoleId

        if (errorCode === 'ROLE_ALREADY_EXISTS' && existingRoleId) {
          try {
            await loadRoles()
          } catch (_error) {
            // Keep flow usable even if refresh fails.
          }
          setSelectedRolePermissionsRoleId(existingRoleId)
          closeCreateRoleModal()
          setError(
            `${getApiErrorMessage(
              e,
              'Role already exists'
            )}. Existing role selected for editing permissions.`
          )
          return
        }

        setError(getApiErrorMessage(e, 'Unable to create role'))
      }
    } finally {
      setCreateRoleLoading(false)
    }
  }

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
    if (!inviteForm.country.trim()) {
      setError('Country is required.')
      return
    }
    const phoneDigits = inviteForm.phone.replace(/\D/g, '')
    const isValidPhone =
      inviteForm.phone.trim().startsWith('+') &&
      phoneDigits.length >= 8 &&
      phoneDigits.length <= 15
    if (!isValidPhone) {
      setError('Enter a valid international phone number.')
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
          phone: inviteForm.phone.trim(),
          country: inviteForm.country.trim(),
          agentCountry: inviteForm.country.trim(),
          isActive: true
        })
      )
      void created
      closeInviteModal()
      setMessage('User invited successfully.')
      await loadUsers()
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to invite user'))
    } finally {
      setInviteLoading(false)
    }
  }

  const onCreateAndAssignRole = async (roleName: string) => {
    const trimmedName = roleName.trim()
    let roleId = ''
    let created: { id?: string; name?: string } | null = null

    try {
      created = await authService.createRole({
        name: trimmedName
      })
      roleId = created?.id ?? ''
    } catch (error) {
      const envelope = extractErrorEnvelope(error)
      const existingRoleId = envelope?.error?.details?.existingRoleId
      const isDuplicate = envelope?.error?.code === 'ROLE_ALREADY_EXISTS'
      if (!isDuplicate || !existingRoleId) {
        throw error
      }
      roleId = existingRoleId
      created = {
        id: existingRoleId,
        name: trimmedName
      }
    }

    if (!roleId) {
      throw new Error('Role creation did not return an id.')
    }

    if (assignUserId) {
      await usersService.update(assignUserId, { roleId })
    }

    return created
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

  const togglePermissionCategory = (categoryId: string) => {
    setPermissionCategoryState(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId]
    }))
  }

  const onRemoveRoleMember = async (userId: string) => {
    if (!canUpdateUsers) {
      setError('You do not have permission to update users.')
      return
    }
    setError('')
    setMessage('')
    try {
      await usersService.update(userId, { roleId: null })
      setMessage('Member removed from role.')
      await loadUsers()
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to remove member'))
    }
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

  const saveRoleConfiguration = async () => {
    if (!canManageRbac) {
      setError('You do not have permission to update roles.')
      return
    }
    if (!selectedRolePermissionsRoleId) {
      setError('Please select a role first.')
      return
    }
    const trimmedName = roleConfigName.trim()
    if (!trimmedName) {
      setError('Role name is required.')
      return
    }
    setRoleConfigSaving(true)
    setError('')
    setMessage('')
    try {
      await authService.updateRole(selectedRolePermissionsRoleId, {
        name: trimmedName,
        description: roleConfigDescription.trim() || null,
        country: roleConfigCountry,
        isActive: roleConfigActive
      })
      setRoles(prev =>
        prev.map(role =>
          role.id === selectedRolePermissionsRoleId
            ? {
                ...role,
                name: trimmedName,
                description: roleConfigDescription.trim() || null,
                country: roleConfigCountry,
                isActive: roleConfigActive
              }
            : role
        )
      )
      setRoleCountryOverrides(prev => ({
        ...prev,
        [selectedRolePermissionsRoleId]: roleConfigCountry
      }))
      setMessage('Role configuration updated.')
    } catch (e) {
      setError(getApiErrorMessage(e, 'Unable to update role configuration'))
    } finally {
      setRoleConfigSaving(false)
    }
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
        locale: toTrimmedOrUndefined(systemSettings.locale),
        currency: toTrimmedOrUndefined(systemSettings.currency),
        dateFormat: toTrimmedOrUndefined(systemSettings.dateFormat),
        websiteUrl: toTrimmedOrUndefined(systemSettings.websiteUrl)
     
      }) as SystemSettingsPayload
      if (Object.keys(payload).length === 0) {
        setError('Enter at least one system setting.')
        return
      }

      const data = extractObject<Partial<SystemSettingsForm>>(
        await settingsApi.updateSystem(payload),
      );
      if (data) 
        setSystemSettings((s) => ({
          ...s,
          ...data,
        
        }));
      
      updatePreferences({
        timezone: data?.timezone ?? payload.timezone,
        locale: data?.locale ?? payload.locale,
        dateFormat: data?.dateFormat ?? payload.dateFormat,
      });
      setMessage("System settings saved.");
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
              options={countryOptions}
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
                  ? 'bg-pink-50 text-pink-600 shadow-sm ring-1 ring-pink-100 dark:bg-pink-900/20 dark:text-pink-300 dark:ring-pink-900/40'
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

        {activeTab === 'user-management' ? <UsersPage embedded /> : null}

        {activeTab === 'roles-permissions' ? (
          <SurfaceCard>
            <div>
              <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                Roles & Permissions
              </h2>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                Only permissions can be edited.
              </p>
            </div>
            {!canManageRbac ? (
              <p className='mt-4 text-sm text-gray-500 dark:text-gray-400'>
                You do not have permission to manage roles and permissions.
              </p>
            ) : (
              <div className='mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]'>
                <div className='flex flex-col gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/40'>
                  <div className='relative'>
                    <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
                    <input
                      className='field-input !py-2 !pl-9'
                      placeholder='Search roles'
                      value={roleSearch}
                      onChange={e => setRoleSearch(e.target.value)}
                    />
                  </div>
                  <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
                    <span>{filteredRoleStats.length} roles</span>
                    <div className='w-36'>
                      <SearchableDropdown
                        value={roleCountryFilter}
                        options={countryOptions}
                        onChange={value =>
                          setRoleCountryFilter(value as CountryCode)
                        }
                        className='w-full'
                        searchPlaceholder='Filter country...'
                      />
                    </div>
                  </div>
                  <div className='flex-1 space-y-2 overflow-y-auto pr-1 max-h-[520px] scrollbar-thin-muted'>
                    {filteredRoleStats.length ? (
                      filteredRoleStats.map(role => (
                        <RoleListItem
                          key={role.id}
                          role={role}
                          selected={selectedRolePermissionsRoleId === role.id}
                          countryLabel={getRoleCountry(role.id)}
                          onSelect={() =>
                            setSelectedRolePermissionsRoleId(role.id)
                          }
                        />
                      ))
                    ) : (
                      <div className='rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'>
                        No roles found. Try a different search.
                      </div>
                    )}
                  </div>
                </div>

                <div className='rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900'>
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    {/* <div className='flex items-start gap-3'>
                      {selectedRole ? (
                        <span
                          className='mt-1 h-3 w-3 rounded-full'
                          style={{
                            backgroundColor: getRoleColor(selectedRole.name)
                          }}
                        />
                      ) : (
                        <span className='mt-1 h-3 w-3 rounded-full bg-gray-300' />
                      )}
                      <div>
                        <p className='text-xs uppercase tracking-wide text-gray-400'>
                          Edit Role
                        </p>
                        <h3 className='text-lg font-semibold text-gray-900'>
                          {selectedRole
                            ? `Edit Role — ${selectedRole.name}`
                            : 'Select a role to begin'}
                        </h3>
                        <p className='text-sm text-gray-500'>
                          {selectedRole
                            ? `${selectedRoleMembers.length} members · ${selectedRolePermissions.length} permissions`
                            : 'Choose a role from the list to configure members and permissions.'}
                        </p>
                      </div>
                    </div> */}
                    <div className='w-full lg:hidden'>
                      <SearchableDropdown
                        value={selectedRolePermissionsRoleId}
                        onChange={setSelectedRolePermissionsRoleId}
                        options={[
                          { value: '', label: 'Select role' },
                          ...roles.map(role => ({
                            value: role.id,
                            label: `${role.name} - ${getRoleCountry(role.id)}`
                          }))
                        ]}
                        placeholder='Select role'
                        className='w-full'
                      />
                    </div>
                  </div>

                  <div className='mt-5 flex items-center gap-6 border-b border-gray-200 text-sm dark:border-gray-700'>
                    <button
                      className={`pb-3 font-medium transition ${
                        roleTab === 'members'
                          ? 'border-b-2 border-blue-600 text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                      }`}
                      onClick={() => setRoleTab('members')}
                    >
                      Members
                    </button>
                    <button
                      className={`pb-3 font-medium transition ${
                        roleTab === 'permissions'
                          ? 'border-b-2 border-blue-600 text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                      }`}
                      onClick={() => setRoleTab('permissions')}
                    >
                      Permissions
                    </button>
                    <button
                      className={`pb-3 font-medium transition ${
                        roleTab === 'configuration'
                          ? 'border-b-2 border-blue-600 text-gray-900 dark:text-gray-100'
                          : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                      }`}
                      onClick={() => setRoleTab('configuration')}
                    >
                      Configuration
                    </button>
                  </div>

                  {roleTab === 'members' ? (
                    <div className='mt-4 space-y-4'>
                      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='relative flex-1'>
                          <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
                          <input
                            className='field-input !py-2 !pl-9'
                            placeholder='Search members'
                            value={memberSearch}
                            onChange={e => setMemberSearch(e.target.value)}
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (!selectedRolePermissionsRoleId) return
                            setAssignRoleId(selectedRolePermissionsRoleId)
                            setAssignRoleSearch(selectedRole?.name ?? '')
                            setAssignCreateRoleName('')
                            setAssignRoleDropdownOpen(false)
                            setAssignOpen(true)
                          }}
                          disabled={!selectedRolePermissionsRoleId}
                          className='inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50'
                        >
                          <FaPlus />
                          Add Members
                        </button>
                      </div>

                      {!selectedRolePermissionsRoleId ? (
                        <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400'>
                          Select a role to view its members.
                        </div>
                      ) : selectedRoleMembers.length ? (
                        <div className='space-y-2'>
                          {selectedRoleMembers.map(member => {
                            const initials = member.fullName
                              .split(' ')
                              .filter(Boolean)
                              .map(part => part[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()
                            return (
                              <div
                                key={member.id}
                                className='flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900'
                              >
                                <div className='flex items-center gap-3'>
                                  <div className='flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600 dark:bg-blue-900/40 dark:text-blue-200'>
                                    {initials || 'U'}
                                  </div>
                                  <div>
                                    <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                                      {member.fullName}
                                    </p>
                                    <p className='text-xs text-gray-500 dark:text-gray-400'>
                                      {member.email}
                                    </p>
                                  </div>
                                </div>
                                <button
                                  type='button'
                                  onClick={() =>
                                    void onRemoveRoleMember(member.id)
                                  }
                                  className='text-xs font-semibold text-red-500 hover:text-red-600'
                                >
                                  Remove
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400'>
                          No members assigned to this role yet.
                        </div>
                      )}
                    </div>
                  ) : null}

                  {roleTab === 'permissions' ? (
                    <div className='mt-4 space-y-4'>
                      <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                        <div className='relative flex-1'>
                          <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
                          <input
                            className='field-input !py-2 !pl-9'
                            placeholder='Search permissions'
                            value={permissionSearch}
                            onChange={e => setPermissionSearch(e.target.value)}
                          />
                        </div>
                        <div className='text-xs text-gray-500 dark:text-gray-400'>
                          {selectedRolePermissions.length} selected
                        </div>
                      </div>
                      {selectedRolePermissions.includes('*') ? (
                        <div className='rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-200'>
                          Administrator is enabled. All other permissions are
                          locked while this is active.
                        </div>
                      ) : null}

                      {!selectedRolePermissionsRoleId ? (
                        <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400'>
                          Select a role to manage permissions.
                        </div>
                      ) : permissionsLoading || loadingRolePermissions ? (
                        <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400'>
                          Loading permissions...
                        </div>
                      ) : permissionsError ? (
                        <div className='rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200'>
                          {permissionsError}
                        </div>
                      ) : filteredPermissionGroups.length === 0 ? (
                        <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400'>
                          No permissions found for this search.
                        </div>
                      ) : (
                        <div className='space-y-3 max-h-[520px] overflow-y-auto pr-2 scrollbar-thin-muted'>
                          {filteredPermissionGroups.map(group => (
                            <PermissionCategorySection
                              key={group.id}
                              group={group}
                              isOpen={permissionCategoryState[group.id] ?? true}
                              onToggle={() =>
                                togglePermissionCategory(group.id)
                              }
                              renderRow={permission => (
                                <PermissionToggleRow
                                  permission={permission}
                                  checked={selectedRolePermissions.includes(
                                    permission.key
                                  )}
                                  disabled={
                                    selectedRolePermissions.includes('*') &&
                                    permission.key !== '*'
                                  }
                                  onToggle={() =>
                                    toggleRolePermission(permission.key)
                                  }
                                />
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {roleTab === 'configuration' ? (
                    <div className='mt-4 space-y-4'>
                      {!selectedRole ? (
                        <div className='rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-400'>
                          Select a role to edit its configuration.
                        </div>
                      ) : (
                        <>
                          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                            <div>
                              <label className='field-label'>Role Name</label>
                              <input
                                className='field-input'
                                value={roleConfigName}
                                onChange={e =>
                                  setRoleConfigName(e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <label className='field-label'>Country</label>
                              <SearchableDropdown
                                value={roleConfigCountry}
                                options={roleCountryOptions}
                                onChange={value =>
                                  setRoleConfigCountry(value as CountryCode)
                                }
                                className='w-full'
                                searchPlaceholder='Search country...'
                              />
                            </div>
                          </div>
                          <div>
                            <label className='field-label'>Description</label>
                            <textarea
                              className='field-input min-h-[110px]'
                              value={roleConfigDescription}
                              onChange={e =>
                                setRoleConfigDescription(e.target.value)
                              }
                            />
                          </div>
                          <div className='flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-900/40'>
                            <div>
                              <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                                Active Role
                              </p>
                              <p className='text-xs text-gray-500 dark:text-gray-400'>
                                Disable a role to prevent it from being
                                assigned.
                              </p>
                            </div>
                            <button
                              type='button'
                              onClick={() => setRoleConfigActive(prev => !prev)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                                roleConfigActive
                                  ? 'bg-blue-600'
                                  : 'bg-gray-300 dark:bg-gray-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                                  roleConfigActive
                                    ? 'translate-x-6'
                                    : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                          <div className='flex items-center justify-end gap-2'>
                            <button
                              onClick={() => void saveRoleConfiguration()}
                              disabled={
                                roleConfigSaving ||
                                !selectedRolePermissionsRoleId
                              }
                              className='rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50'
                            >
                              {roleConfigSaving ? 'Saving...' : 'Save Role'}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}

                  {roleTab === 'permissions' ? (
                    <>
                      <div className='mt-4 flex items-center justify-between gap-2'>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
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
                    </>
                  ) : null}
                </div>
              </div>
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
                <label className="field-label">Timezone</label>
                <select
                  className="field-input"
                  value={systemSettings.timezone}
                  onChange={(e) =>
                    setSystemSettings((s) => ({
                      ...s,
                      timezone: e.target.value,
                    }))
                  }
                >
                  {SYSTEM_TIMEZONE_OPTIONS.some(
                    (option) => option.value === systemSettings.timezone,
                  ) ?
                    null
                  : <option value={systemSettings.timezone}>{systemSettings.timezone}</option>}
                  {SYSTEM_TIMEZONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Locale</label>
                <select
                  className="field-input"
                  value={systemSettings.locale}
                  onChange={(e) =>
                    setSystemSettings((s) => ({
                      ...s,
                      locale: e.target.value,
                    }))
                  }
                >
                  {SYSTEM_LOCALE_OPTIONS.some(
                    (option) => option.value === systemSettings.locale,
                  ) ?
                    null
                  : <option value={systemSettings.locale}>{systemSettings.locale}</option>}
                  {SYSTEM_LOCALE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className='field-label'>Currency</label>
                <input
                  className='field-input'
                  value={systemSettings.currency}
                  onChange={e =>
                    setSystemSettings(s => ({
                      ...s,
                      currency: e.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className="field-label">Date Format</label>
                <select
                  className="field-input"
                  value={systemSettings.dateFormat}
                  onChange={e =>
                    setSystemSettings(s => ({
                      ...s,
                      dateFormat: e.target.value
                    }))
                  }
                >
                  {SYSTEM_DATE_FORMAT_OPTIONS.some(
                    (option) => option.value === systemSettings.dateFormat,
                  ) ?
                    null
                  : <option value={systemSettings.dateFormat}>{systemSettings.dateFormat}</option>}
                  {SYSTEM_DATE_FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
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

        {activeTab === 'currency-rates' ? (
          <SurfaceCard>
            <CurrencyRatesPanel canManage={isSuperAdmin} />
          </SurfaceCard>
        ) : null}

        {activeTab === 'country-management' ? (
          <CountryManagementPanel
            canReadSettings={canReadSettings}
            canUpdateSettings={canUpdateSettings}
          />
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
            onClick={closeInviteModal}
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
              <div>
                <label className='field-label'>Country</label>
                <Select
                  className='mt-1'
                  classNamePrefix='invite-country'
                  options={userCountryOptions}
                  value={selectedInviteCountryOption}
                  onChange={option =>
                    handleInviteCountryChange(
                      option as UserCountryOption | null
                    )
                  }
                  placeholder='Search country...'
                  isClearable
                  styles={inviteCountrySelectStyles}
                />
              </div>
              <div>
                <label className='field-label'>Phone</label>
                <PhoneInput
                  ref={invitePhoneInputRef}
                  value={inviteForm.phone}
                  defaultCountry={inviteCountryIso2}
                  onChange={handleInvitePhoneChange}
                  inputClassName='field-input !w-full'
                  countrySelectorStyleProps={{
                    buttonClassName:
                      'h-[46px] rounded-l-xl border border-gray-200'
                  }}
                  inputProps={{
                    name: 'invite-phone',
                    required: true,
                    autoComplete: 'tel',
                    placeholder: 'International phone number'
                  }}
                />
              </div>
              <SearchableDropdown
                value={inviteForm.roleId}
                onChange={value =>
                  setInviteForm(f => ({ ...f, roleId: value }))
                }
                options={[
                  { value: '', label: 'Select Role (optional)' },
                  ...roles.map(r => ({
                    value: r.id,
                    label: r.country ? `${r.name} - ${r.country}` : r.name
                  }))
                ]}
                placeholder='Select Role (optional)'
                className='w-full'
              />
            </div>
            <div className='mt-5 flex justify-end gap-2'>
              <button
                onClick={closeInviteModal}
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
                  options={roleCountryOptions}
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
                      const filtered = roles.filter(
                        r =>
                          r.name.toLowerCase().includes(query) ||
                          String(r.country || '')
                            .toLowerCase()
                            .includes(query)
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
                              {role.country
                                ? `${role.name} - ${role.country}`
                                : role.name}
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
