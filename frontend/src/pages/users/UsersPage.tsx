import React, { useCallback, useEffect, useState } from 'react'
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUserShield,
  FaSearch,
  FaCheck,
  FaInfo,
  FaExclamationTriangle,
  FaCheckCircle,
  FaDownload
} from 'react-icons/fa'
import { FaXmark, FaFilter } from 'react-icons/fa6'
import { getApiErrorMessage } from '../../api/apiClient'
import { usersApi } from '../../api/users'
import { useAuth } from '../../context/AuthContext'
import SearchableDropdown from '../../components/ui/SearchableDropdown'

interface User {
  id: string
  fullName: string
  email: string
  phone?: string
  country?: string
  role?: string
  roleId?: string
  permissions?: string[]
  isActive: boolean
  createdAt: string
}

interface Role {
  id: string
  name: string
  description?: string
}

const COUNTRY_OPTIONS = [
  { value: '', label: 'Select country' },
  { value: 'India', label: 'India' },
  { value: 'Dubai', label: 'Dubai' }
]

const getRoleLabel = (
  roleName?: string,
  roleId?: string,
  roleMap?: Map<string, string>
) => roleName ?? roleMap?.get(roleId ?? '') ?? 'No Role'

// Toast Component
const Toast = ({
  message,
  type,
  onClose
}: {
  message: string
  type: 'success' | 'error' | 'info'
  onClose: () => void
}) => (
  <div
    className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn'
    onClick={onClose}
  >
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
        type === 'success'
          ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'
          : type === 'error'
          ? 'bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800'
          : 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800'
      }`}
    >
      {type === 'success' ? (
        <FaCheckCircle className='text-green-600 dark:text-green-400' />
      ) : type === 'error' ? (
        <FaExclamationTriangle className='text-red-600 dark:text-red-400' />
      ) : (
        <FaInfo className='text-blue-600 dark:text-blue-400' />
      )}
      <p
        className={`text-sm font-medium ${
          type === 'success'
            ? 'text-green-800 dark:text-green-300'
            : type === 'error'
            ? 'text-red-800 dark:text-red-300'
            : 'text-blue-800 dark:text-blue-300'
        }`}
      >
        {message}
      </p>
    </div>
  </div>
)

// Confirm Delete Modal
const ConfirmDeleteModal = ({
  isOpen,
  user,
  roleLabelMap,
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  user: User | null
  roleLabelMap: Map<string, string>
  onConfirm: () => void
  onCancel: () => void
}) => {
  if (!isOpen || !user) return null

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6 animate-fadeIn'>
        <div className='flex items-center gap-3 mb-4'>
          <div className='w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center'>
            <FaExclamationTriangle className='text-red-600 dark:text-red-400 text-xl' />
          </div>
          <div>
            <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Deactivate User
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              This action cannot be undone
            </p>
          </div>
        </div>

        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          Are you sure you want to deactivate{' '}
          <span className='font-semibold'>{user.fullName}</span>? The user will
          no longer be able to sign in.
        </p>

        <div className='bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg mb-4'>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            User details:
          </p>
          <p className='text-sm text-gray-700 dark:text-gray-300 mt-1'>
            Email: {user.email}
          </p>
          {user.role && (
            <p className='text-sm text-gray-700 dark:text-gray-300'>
              Role: {getRoleLabel(user.role, user.roleId, roleLabelMap)}
            </p>
          )}
        </div>

        <div className='flex justify-end gap-3'>
          <button
            onClick={onCancel}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2'
          >
            <FaTrash /> Deactivate User
          </button>
        </div>
      </div>
    </div>
  )
}

// Create/Edit User Modal
const UserFormModal = ({
  isOpen,
  mode,
  user,
  roles,
  onClose,
  onSave
}: {
  isOpen: boolean
  mode: 'create' | 'edit'
  user: User | null
  roles: Role[]
  onClose: () => void
  onSave: (formData: any) => void
}) => {
  const initialFormData =
    user && mode === 'edit'
      ? {
          fullName: user.fullName,
          email: user.email,
          phone: user.phone || '',
          country: user.country || '',
          role: user.roleId || '',
          password: '',
          isActive: user.isActive
        }
      : {
          fullName: '',
          email: '',
          phone: '',
          country: '',
          role: '',
          password: '',
          isActive: true
        }

  const [formData, setFormData] = useState(initialFormData)
  const [roleSearch, setRoleSearch] = useState(() => {
    const selected = roles.find(role => role.id === initialFormData.role)
    return selected?.name ?? ''
  })
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [createRoleName, setCreateRoleName] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    const inferredRoleName =
      !formData.role && roleSearch.trim() ? roleSearch.trim() : undefined
    onSave({
      ...formData,
      roleName: createRoleName || inferredRoleName || undefined
    })
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto'>
        <div className='sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {mode === 'create' ? 'Create New User' : 'Edit User'}
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Full Name <span className='text-red-500'>*</span>
            </label>
            <input
              type='text'
              required
              value={formData.fullName}
              onChange={e =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
              placeholder='John Doe'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Email <span className='text-red-500'>*</span>
            </label>
            <input
              type='email'
              required
              value={formData.email}
              onChange={e =>
                setFormData({ ...formData, email: e.target.value })
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
              placeholder='john@example.com'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Phone
            </label>
            <input
              type='text'
              value={formData.phone}
              onChange={e =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
              placeholder='+1 234 567 8900'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Country <span className='text-red-500'>*</span>
            </label>
            <SearchableDropdown
              value={formData.country}
              onChange={value => setFormData({ ...formData, country: value })}
              options={COUNTRY_OPTIONS}
              placeholder='Select country'
              className='w-full'
            />
          </div>
          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Role
            </label>
            <div className='relative'>
              <input
                value={roleSearch}
                onChange={e => {
                  const next = e.target.value
                  setRoleSearch(next)
                  setRoleDropdownOpen(true)
                  setCreateRoleName('')
                  setFormData({ ...formData, role: '' })
                }}
                onFocus={() => setRoleDropdownOpen(true)}
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                placeholder='Select or type role'
              />
              {roleDropdownOpen ? (
                <div className='absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto'>
                  {(() => {
                    const query = roleSearch.trim().toLowerCase()
                    const filtered = roles.filter(role =>
                      role.name.toLowerCase().includes(query)
                    )
                    const exactMatch = roles.some(
                      role => role.name.toLowerCase() === query
                    )
                    return (
                      <>
                        {filtered.map(role => (
                          <button
                            key={role.id}
                            type='button'
                            className='w-full text-left px-3 py-2 text-sm hover:bg-gray-50'
                            onClick={() => {
                              setFormData({ ...formData, role: role.id })
                              setRoleSearch(role.name)
                              setCreateRoleName('')
                              setRoleDropdownOpen(false)
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
                              setFormData({ ...formData, role: '' })
                              setCreateRoleName(roleSearch.trim())
                              setRoleDropdownOpen(false)
                            }}
                          >
                            Create new role: "{roleSearch.trim()}"
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

          {mode === 'create' && (
            <div>
              <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Temporary Password <span className='text-red-500'>*</span>
              </label>
              <input
                type='password'
                required
                value={formData.password}
                onChange={e =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
                placeholder='Minimum 8 characters'
              />
            </div>
          )}

          {mode === 'edit' && (
            <div className='flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg'>
              <input
                type='checkbox'
                id='isActive'
                checked={formData.isActive}
                onChange={e =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
              />
              <label
                htmlFor='isActive'
                className='text-sm text-gray-700 dark:text-gray-300'
              >
                Active Account
              </label>
            </div>
          )}
        </form>

        <div className='sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4 flex justify-end gap-3'>
          <button
            type='button'
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2'
          >
            <FaCheck /> {mode === 'create' ? 'Create User' : 'Update User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Assign Role Modal
const AssignRoleModal = ({
  isOpen,
  user,
  roles,
  onClose,
  onAssign
}: {
  isOpen: boolean
  user: User | null
  roles: Role[]
  onClose: () => void
  onAssign: (userId: string, roleId: string | null, roleName?: string) => void
}) => {
  const [selectedRole, setSelectedRole] = useState(user?.roleId || '')
  const [roleSearch, setRoleSearch] = useState(() => {
    const selected = roles.find(role => role.id === (user?.roleId || ''))
    return selected?.name ?? ''
  })
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false)
  const [createRoleName, setCreateRoleName] = useState('')
  const [error, setError] = useState('')

  if (!isOpen || !user) return null

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!selectedRole && !createRoleName) {
      setError('Please select a role')
      return
    }
    const inferredRoleName =
      !selectedRole && roleSearch.trim() ? roleSearch.trim() : undefined
    onAssign(
      user.id,
      selectedRole || null,
      createRoleName || inferredRoleName || undefined
    )
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-2xl w-full'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Assign Access
          </h3>
          <button
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='p-6 space-y-4'>
          <div className='bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              {user.fullName}
            </p>
            <p className='text-xs text-gray-600 dark:text-gray-400 mt-1'>
              {user.email}
            </p>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
              Select Role <span className='text-red-500'>*</span>
            </label>
            <div className='relative'>
              <input
                value={roleSearch}
                onChange={e => {
                  const next = e.target.value
                  setRoleSearch(next)
                  setRoleDropdownOpen(true)
                  setSelectedRole('')
                  setCreateRoleName('')
                  setError('')
                }}
                onFocus={() => setRoleDropdownOpen(true)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100 ${
                  error
                    ? 'border-red-500'
                    : 'border-gray-300 dark:border-gray-700'
                }`}
                placeholder='Select or type role'
              />
              {roleDropdownOpen ? (
                <div className='absolute z-10 mt-2 w-full rounded-lg border border-gray-200 bg-white shadow-lg max-h-52 overflow-y-auto'>
                  {(() => {
                    const query = roleSearch.trim().toLowerCase()
                    const filtered = roles.filter(role =>
                      role.name.toLowerCase().includes(query)
                    )
                    const exactMatch = roles.some(
                      role => role.name.toLowerCase() === query
                    )
                    return (
                      <>
                        {filtered.map(role => (
                          <button
                            key={role.id}
                            type='button'
                            className='w-full text-left px-3 py-2 text-sm hover:bg-gray-50'
                            onClick={() => {
                              setSelectedRole(role.id)
                              setRoleSearch(role.name)
                              setCreateRoleName('')
                              setRoleDropdownOpen(false)
                            }}
                          >
                            {role.name}{' '}
                            {role.description && `- ${role.description}`}
                          </button>
                        ))}
                        {!exactMatch && query ? (
                          <button
                            type='button'
                            className='w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50'
                            onClick={() => {
                              setSelectedRole('')
                              setCreateRoleName(roleSearch.trim())
                              setRoleDropdownOpen(false)
                            }}
                          >
                            Create new role: "{roleSearch.trim()}"
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
            {error && <p className='text-xs text-red-500 mt-1'>{error}</p>}
          </div>

          <div>
            <p className='text-xs text-gray-500 dark:text-gray-400'>
              Permissions are inherited from the selected role. To edit role
              permissions, use{' '}
              <strong>Settings &gt; Roles &amp; Permissions</strong>.
            </p>
          </div>
        </form>

        <div className='p-4 border-t border-gray-200 dark:border-gray-800 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 transition-colors'
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className='px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2'
          >
            <FaCheck /> Save Access
          </button>
        </div>
      </div>
    </div>
  )
}

const UsersPage: React.FC = () => {
  const { hasPermission } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingError, setLoadingError] = useState('')
  const [search, setSearch] = useState('')
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [mobileRoleFilter, setMobileRoleFilter] = useState('all')
  const [mobileStatusFilter, setMobileStatusFilter] = useState('all')
  const [toast, setToast] = useState<{
    show: boolean
    message: string
    type: 'success' | 'error' | 'info'
  }>({
    show: false,
    message: '',
    type: 'success'
  })

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const roleLabelMap = React.useMemo(
    () => new Map(roles.map(role => [role.id, role.name])),
    [roles]
  )
  const canCreateUsers = hasPermission('users:create')
  const canUpdateUsers = hasPermission('users:update')
  const canManageRbac = hasPermission('rbac:manage')

  const normalizeUsers = (response: unknown): User[] => {
    const payload = (response as { data?: unknown })?.data ?? response ?? []
    const data =
      (payload as { data?: unknown })?.data ??
      (payload as { items?: unknown })?.items ??
      payload
    return Array.isArray(data) ? (data as User[]) : []
  }

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setLoadingError('')
    try {
      const response = await usersApi.list()
      setUsers(normalizeUsers(response))
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to load users')
      setLoadingError(message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRoles = useCallback(async () => {
    if (!canManageRbac) {
      setRoles([])
      return
    }
    try {
      const response = await usersApi.listRoles()
      const rows = (response as { data?: Role[] })?.data ?? response ?? []
      const list = Array.isArray(rows) ? rows : []
      const mapped = list.map(role => ({
        id: role.id,
        name: role.name,
        description: role.description || undefined
      }))
      setRoles(mapped)
    } catch {
      setRoles([])
    }
  }, [canManageRbac])

  useEffect(() => {
    void loadUsers()
    void loadRoles()
  }, [loadRoles, loadUsers])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    )
  }

  const isValidPhone = (phone?: string) => {
    if (!phone) return true
    const normalized = phone.replace(/[\s\-\(\)]/g, '')
    return normalized.length >= 6 && normalized.length <= 20
  }

  const normalizePhone = (phone?: string) => {
    if (!phone) return undefined
    const digits = phone.replace(/\D/g, '')
    return digits ? digits : undefined
  }

  const isValidEmail = (email?: string) => {
    if (!email) return false
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleCreateUser = async (formData: any) => {
    if (!canCreateUsers) {
      showToast('You do not have permission to create users.', 'error')
      return
    }
    if (!formData.fullName?.trim() || formData.fullName.trim().length < 2) {
      showToast('Full name must be at least 2 characters.', 'error')
      return
    }
    if (!formData.email?.trim() || !isValidEmail(formData.email)) {
      showToast('Please enter a valid email address.', 'error')
      return
    }
    if (!formData.password || formData.password.length < 8) {
      showToast('Password must be at least 8 characters.', 'error')
      return
    }
    if (!formData.country?.trim()) {
      showToast('Please select a country.', 'error')
      return
    }
    if (!isValidPhone(formData.phone)) {
      showToast('Phone number must be 6-20 digits.', 'error')
      return
    }

    try {
      const roleName = formData.roleName?.trim() || undefined
      const roleId = roleName ? undefined : formData.role || undefined
      const response = await usersApi.create({
        fullName: formData.fullName,
        email: formData.email,
        phone: normalizePhone(formData.phone),
        country: formData.country,
        password: formData.password,
        roleId: roleId || undefined,
        roleName: roleName || undefined,
        isActive: true
      })
      void response
      setShowCreateModal(false)
      showToast('User created successfully', 'success')
      await loadUsers()
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to create user')
      showToast(message, 'error')
    }
  }

  const handleUpdateUser = async (formData: any) => {
    if (!canUpdateUsers) {
      showToast('You do not have permission to update users.', 'error')
      return
    }
    if (!selectedUser) return
    if (!formData.fullName?.trim() || formData.fullName.trim().length < 2) {
      showToast('Full name must be at least 2 characters.', 'error')
      return
    }
    if (!formData.email?.trim() || !isValidEmail(formData.email)) {
      showToast('Please enter a valid email address.', 'error')
      return
    }
    if (!isValidPhone(formData.phone)) {
      showToast('Phone number must be 6-20 digits.', 'error')
      return
    }

    try {
      const roleName = formData.roleName?.trim() || undefined
      const roleId = roleName ? undefined : formData.role || null
      await usersApi.update(selectedUser.id, {
        fullName: formData.fullName,
        email: formData.email,
        phone: normalizePhone(formData.phone),
        country: formData.country,
        roleId: roleId ?? null,
        roleName: roleName || undefined,
        isActive: formData.isActive
      })

      setShowEditModal(false)
      setSelectedUser(null)
      showToast('User updated successfully', 'success')
      await loadUsers()
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to update user')
      showToast(message, 'error')
    }
  }

  const handleAssignRole = async (
    userId: string,
    roleId: string | null,
    roleName?: string
  ) => {
    if (!canManageRbac) {
      showToast('You do not have permission to manage RBAC.', 'error')
      return
    }
    try {
      const resolvedRoleName = roleName?.trim() || undefined
      const resolvedRoleId = resolvedRoleName ? undefined : roleId || null
      if (!resolvedRoleId && !resolvedRoleName) {
        showToast('Please select a role.', 'error')
        return
      }
      await usersApi.update(userId, {
        roleId: resolvedRoleId,
        roleName: resolvedRoleName
      })
      setShowRoleModal(false)
      setSelectedUser(null)
      showToast('Role assigned successfully', 'success')
      await loadUsers()
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to assign role')
      showToast(message, 'error')
    }
  }

  const handleDeleteUser = async () => {
    if (!canUpdateUsers) {
      showToast('You do not have permission to update users.', 'error')
      return
    }
    if (!selectedUser) return

    try {
      await usersApi.update(selectedUser.id, { isActive: false })
      setShowDeleteModal(false)
      setSelectedUser(null)
      showToast('User deactivated successfully', 'success')
      await loadUsers()
    } catch (err) {
      const message = getApiErrorMessage(err, 'Unable to deactivate user')
      showToast(message, 'error')
    }
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setShowEditModal(true)
  }

  const openRoleModal = (user: User) => {
    setSelectedUser(user)
    setShowRoleModal(true)
  }

  const openDeleteModal = (user: User) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }


  const filteredUsers = users.filter(user => {
    const query = search.trim().toLowerCase()
    const roleLabel = getRoleLabel(
      user.role,
      user.roleId,
      roleLabelMap
    ).toLowerCase()
    const statusLabel = user.isActive ? 'active' : 'inactive'
    const fullName = user.fullName?.toLowerCase() || ''
    const email = user.email?.toLowerCase() || ''
    const phone = user.phone?.toLowerCase() || ''
    const id = user.id?.toLowerCase() || ''

    const isStatusQuery = query === 'active' || query === 'inactive'
    const matchesStatusQuery =
      !query ||
      (query === 'active' && user.isActive) ||
      (query === 'inactive' && !user.isActive)

    const matchesSearch = !query
      ? true
      : isStatusQuery
      ? matchesStatusQuery
      : fullName.includes(query) ||
        email.includes(query) ||
        phone.includes(query) ||
        roleLabel.includes(query) ||
        statusLabel.includes(query) ||
        id.includes(query)

    const matchesRole =
      mobileRoleFilter === 'all' ||
      user.roleId === mobileRoleFilter ||
      user.role === mobileRoleFilter
    const matchesStatus =
      mobileStatusFilter === 'all' ||
      (mobileStatusFilter === 'active' && user.isActive) ||
      (mobileStatusFilter === 'inactive' && !user.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  const exportCurrentTable = () => {
    if (!filteredUsers.length) return

    const headers = [
      'Full Name',
      'Email',
      'Phone',
      'Country',
      'Role',
      'Status',
      'Created At'
    ]

    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

    const dataRows = filteredUsers.map(user => [
      user.fullName ?? '',
      user.email ?? '',
      user.phone ?? '',
      user.country ?? '',
      getRoleLabel(user.role, user.roleId, roleLabelMap),
      user.isActive ? 'Active' : 'Inactive',
      user.createdAt ?? ''
    ])

    const csv = [headers, ...dataRows]
      .map(row => row.map(cell => escapeCsv(String(cell))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `users-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className='flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4'></div>
          <p className='text-gray-600 dark:text-gray-400'>Loading users...</p>
        </div>
      </div>
    )
  }

  if (loadingError) {
    return (
      <div className='flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950'>
        <div className='text-center max-w-md'>
          <p className='text-sm text-red-600 mb-4'>{loadingError}</p>
          <button
            onClick={() => void loadUsers()}
            className='px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700'
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <main className='flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100'>
      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() =>
            setToast({ show: false, message: '', type: 'success' })
          }
        />
      )}

      {/* Modals */}
      {canCreateUsers ? (
        <UserFormModal
          key={`create-${showCreateModal ? 'open' : 'closed'}`}
          isOpen={showCreateModal}
          mode='create'
          user={null}
          roles={roles}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateUser}
        />
      ) : null}

      {canUpdateUsers ? (
        <UserFormModal
          key={`edit-${selectedUser?.id ?? 'none'}-${
            showEditModal ? 'open' : 'closed'
          }`}
          isOpen={showEditModal}
          mode='edit'
          user={selectedUser}
          roles={roles}
          onClose={() => {
            setShowEditModal(false)
            setSelectedUser(null)
          }}
          onSave={handleUpdateUser}
        />
      ) : null}

      {canManageRbac ? (
        <AssignRoleModal
          key={`assign-${selectedUser?.id ?? 'none'}-${
            showRoleModal ? 'open' : 'closed'
          }`}
          isOpen={showRoleModal}
          user={selectedUser}
          roles={roles}
          onClose={() => {
            setShowRoleModal(false)
            setSelectedUser(null)
          }}
          onAssign={handleAssignRole}
        />
      ) : null}

      {canUpdateUsers ? (
        <ConfirmDeleteModal
          isOpen={showDeleteModal}
          user={selectedUser}
          roleLabelMap={roleLabelMap}
          onConfirm={handleDeleteUser}
          onCancel={() => {
            setShowDeleteModal(false)
            setSelectedUser(null)
          }}
        />
      ) : null}

      <div className='max-w-8xl mx-auto px-0 sm:px-6 lg:px-0 py-4 sm:py-6 lg:py-8'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 -mt-2 sm:-mt-4 lg:-mt-8'>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
              User Management
            </h1>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Manage users and assign roles • {users.length} total users
            </p>
          </div>
          <div className='flex flex-col sm:flex-row gap-2 w-full sm:w-auto'>
            <button
              onClick={exportCurrentTable}
              disabled={!filteredUsers.length}
              className='inline-flex items-center justify-center px-4 py-2 rounded-lg border border-green-500 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:text-gray-200 dark:hover:bg-gray-800'
            >
              <FaDownload className='mr-2' /> Export
            </button>
            {canCreateUsers ? (
              <button
                onClick={() => setShowCreateModal(true)}
                className='inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors w-full sm:w-auto'
              >
                <FaPlus className='mr-2' /> New User
              </button>
            ) : null}
          </div>
        </div>

        {/* Search and Filter - Mobile */}
        <div className='flex flex-col gap-3 sm:hidden mb-4'>
          <div className='flex items-center gap-2'>
<div className='flex-1 relative'>
              <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm' />
              <input
                type='text'
                placeholder='Search users...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500'
              />
            </div>
            <button
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              className={`p-2.5 rounded-xl border transition-colors ${
                showMobileFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <FaFilter />
            </button>
          </div>
          {/* Mobile Filter Panel */}
          {showMobileFilters && (
            <div className='bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  Filter Options
                </h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className='text-gray-400 hover:text-gray-600'
                >
                  <FaXmark />
                </button>
              </div>
              <div className='space-y-3'>
                <SearchableDropdown
                  value={mobileRoleFilter}
                  onChange={setMobileRoleFilter}
                  options={[
                    { value: 'all', label: 'All Roles' },
                    ...roles.map(role => ({
                      value: role.id,
                      label: role.name
                    }))
                  ]}
                  placeholder='All Roles'
                  className='w-full'
                />
                <SearchableDropdown
                  value={mobileStatusFilter}
                  onChange={setMobileStatusFilter}
                  options={[
                    { value: 'all', label: 'All Status' },
                    { value: 'active', label: 'Active' },
                    { value: 'inactive', label: 'Inactive' }
                  ]}
                  placeholder='All Status'
                  className='w-full'
                />
              </div>
            </div>
          )}
        </div>

        {/* Search - Desktop */}
        <div className='hidden sm:block mb-6'>
          <div className='flex items-center gap-3 max-w-2xl'>
            <div className='relative flex-1'>
              <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm' />
              <input
                type='text'
                placeholder='Search users...'
                value={search}
                onChange={e => setSearch(e.target.value)}
                className='w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500'
              />
            </div>
          </div>
        </div>
        {/* Users Table - Desktop */}
        <div className='hidden sm:block bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
          <div className='overflow-x-auto'>
            <table className='min-w-[800px] w-full'>
              <thead className='bg-gray-50 dark:bg-gray-800/50'>
                <tr>
                  <th className='px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    User
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Contact
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Role
                  </th>
                  <th className='px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Status
                  </th>
                  <th className='px-6 py-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider'>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                {filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    className='hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors'
                  >
                    <td className='px-6 py-4'>
                      <div>
                        <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {user.fullName}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          ID: {user.id}
                        </p>
                      </div>
                    </td>
                    <td className='px-6 py-4'>
                      <p className='text-sm text-gray-700 dark:text-gray-300'>
                        {user.email}
                      </p>
                      {user.phone && (
                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                          {user.phone}
                        </p>
                      )}
                    </td>
                    <td className='px-6 py-4'>
                      <span className='inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'>
                        {getRoleLabel(user.role, user.roleId, roleLabelMap)}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                          user.isActive
                            ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
                            : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
                        }`}
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className='px-6 py-4'>
                      <div className='flex justify-end gap-2'>
                        {canManageRbac ? (
                          <button
                            onClick={() => openRoleModal(user)}
                            className='p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors'
                            title='Assign Role'
                          >
                            <FaUserShield />
                          </button>
                        ) : null}
                        {canUpdateUsers ? (
                          <button
                            onClick={() => openEditModal(user)}
                            className='p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors'
                            title='Edit'
                          >
                            <FaEdit />
                          </button>
                        ) : null}
                        {canUpdateUsers ? (
                          <button
                            onClick={() => openDeleteModal(user)}
                            className='p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                            title='Delete'
                          >
                            <FaTrash />
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Cards - Mobile */}
        <div className='sm:hidden space-y-3'>
          {filteredUsers.map(user => (
            <div
              key={user.id}
              className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-4 space-y-3'
            >
              {/* Header */}
              <div className='flex items-start justify-between'>
                <div>
                  <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                    {user.fullName}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    ID: {user.id}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${
                    user.isActive
                      ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
                      : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
                  }`}
                >
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Contact */}
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400'>
                  Email
                </p>
                <p className='text-sm text-gray-700 dark:text-gray-300 break-all'>
                  {user.email}
                </p>
                {user.phone && (
                  <>
                    <p className='text-xs text-gray-500 dark:text-gray-400 mt-2'>
                      Phone
                    </p>
                    <p className='text-sm text-gray-700 dark:text-gray-300'>
                      {user.phone}
                    </p>
                  </>
                )}
              </div>

              {/* Role */}
              <div>
                <p className='text-xs text-gray-500 dark:text-gray-400'>Role</p>
                <span className='inline-flex items-center px-2.5 py-1 mt-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900'>
                  {getRoleLabel(user.role, user.roleId, roleLabelMap)}
                </span>
              </div>

              {/* Actions */}
              <div className='flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800'>
                {canManageRbac ? (
                  <button
                    onClick={() => openRoleModal(user)}
                    className='p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors'
                    title='Assign Role'
                  >
                    <FaUserShield className='text-sm' />
                  </button>
                ) : null}
                {canUpdateUsers ? (
                  <button
                    onClick={() => openEditModal(user)}
                    className='p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors'
                    title='Edit'
                  >
                    <FaEdit className='text-sm' />
                  </button>
                ) : null}
                {canUpdateUsers ? (
                  <button
                    onClick={() => openDeleteModal(user)}
                    className='p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                    title='Delete'
                  >
                    <FaTrash className='text-sm' />
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </main>
  )
}

export default UsersPage
