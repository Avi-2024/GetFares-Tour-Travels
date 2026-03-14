import React, { useState, useEffect } from 'react'
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaUserShield,
  FaSearch,
  FaCheck,
  FaInfo,
  FaExclamationTriangle,
  FaCheckCircle
} from 'react-icons/fa'
import { FaXmark } from 'react-icons/fa6'
import { rbacApi } from '../../api/auth'

interface User {
  id: string
  fullName: string
  email: string
  phone?: string
  role?: string
  isActive: boolean
  createdAt: string
}

interface Role {
  id: string
  name: string
  description?: string
}

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
  <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn'>
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
  onConfirm,
  onCancel
}: {
  isOpen: boolean
  user: User | null
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
              Delete User
            </h3>
            <p className='text-sm text-gray-500 dark:text-gray-400'>
              This action cannot be undone
            </p>
          </div>
        </div>

        <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
          Are you sure you want to delete{' '}
          <span className='font-semibold'>{user.fullName}</span>? All data
          associated with this user will be permanently removed.
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
              Role: {user.role}
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
            <FaTrash /> Delete User
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
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    isActive: true
  })

  useEffect(() => {
    if (user && mode === 'edit') {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || '',
        role: user.role || '',
        isActive: user.isActive
      })
    } else {
      setFormData({
        fullName: '',
        email: '',
        phone: '',
        role: '',
        isActive: true
      })
    }
  }, [user, mode, isOpen])

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
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
              Role
            </label>
            <select
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
              className='w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100'
            >
              <option value=''>Select Role</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>

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
  onAssign: (userId: string, role: string) => void
}) => {
  const [selectedRole, setSelectedRole] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setSelectedRole(user.role || '')
    }
    setError('')
  }, [user, isOpen])

  if (!isOpen || !user) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) {
      setError('Please select a role')
      return
    }
    onAssign(user.id, selectedRole)
  }

  return (
    <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full'>
        <div className='p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Assign Role
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
            <select
              value={selectedRole}
              onChange={e => {
                setSelectedRole(e.target.value)
                setError('')
              }}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-gray-100 ${
                error
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
            >
              <option value=''>Choose a role...</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>
                  {role.name} {role.description && `- ${role.description}`}
                </option>
              ))}
            </select>
            {error && <p className='text-xs text-red-500 mt-1'>{error}</p>}
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
            <FaCheck /> Assign Role
          </button>
        </div>
      </div>
    </div>
  )
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      fullName: 'John Smith',
      email: 'john.smith@getfares.com',
      phone: '+1 555 0101',
      role: 'Admin',
      isActive: true,
      createdAt: '2023-01-15'
    },
    {
      id: '2',
      fullName: 'Sarah Johnson',
      email: 'sarah.johnson@getfares.com',
      phone: '+1 555 0102',
      role: 'Manager',
      isActive: true,
      createdAt: '2023-02-20'
    },
    {
      id: '3',
      fullName: 'Mike Chen',
      email: 'mike.chen@getfares.com',
      phone: '+1 555 0103',
      role: 'Sales',
      isActive: true,
      createdAt: '2023-03-10'
    },
    {
      id: '4',
      fullName: 'Emily Davis',
      email: 'emily.davis@getfares.com',
      phone: '+1 555 0104',
      role: 'Marketing',
      isActive: false,
      createdAt: '2023-04-05'
    },
    {
      id: '5',
      fullName: 'David Wilson',
      email: 'david.wilson@getfares.com',
      phone: '+1 555 0105',
      role: 'Operations',
      isActive: true,
      createdAt: '2023-05-12'
    },
    {
      id: '6',
      fullName: 'Lisa Rodriguez',
      email: 'lisa.rodriguez@getfares.com',
      phone: '+1 555 0106',
      role: 'Visa Executive',
      isActive: true,
      createdAt: '2023-06-18'
    },
    {
      id: '7',
      fullName: 'Tom Anderson',
      email: 'tom.anderson@getfares.com',
      phone: '+1 555 0107',
      role: 'Sales',
      isActive: true,
      createdAt: '2023-07-22'
    },
    {
      id: '8',
      fullName: 'Anna Martinez',
      email: 'anna.martinez@getfares.com',
      phone: '+1 555 0108',
      role: 'Marketing',
      isActive: true,
      createdAt: '2023-08-14'
    }
  ])

  const [roles, setRoles] = useState<Role[]>([
    { id: '1', name: 'Admin', description: 'Full system access' },
    { id: '2', name: 'Manager', description: 'Management access' },
    { id: '3', name: 'Sales', description: 'Sales operations' },
    { id: '4', name: 'Marketing', description: 'Marketing operations' },
    { id: '5', name: 'Operations', description: 'Operations access' },
    { id: '6', name: 'Visa Executive', description: 'Visa processing' }
  ])

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
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

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 500)
  }, [])

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type })
    setTimeout(
      () => setToast({ show: false, message: '', type: 'success' }),
      3000
    )
  }

  const handleCreateUser = (formData: any) => {
    const newUser: User = {
      id: Date.now().toString(),
      fullName: formData.fullName,
      email: formData.email,
      phone: formData.phone,
      role: formData.role,
      isActive: true,
      createdAt: new Date().toISOString().split('T')[0]
    }
    setUsers(prev => [newUser, ...prev])
    setShowCreateModal(false)
    showToast('User created successfully', 'success')
  }

  const handleUpdateUser = (formData: any) => {
    if (!selectedUser) return

    setUsers(prev =>
      prev.map(user =>
        user.id === selectedUser.id ? { ...user, ...formData } : user
      )
    )
    setShowEditModal(false)
    setSelectedUser(null)
    showToast('User updated successfully', 'success')
  }

  const handleAssignRole = (userId: string, role: string) => {
    setUsers(prev =>
      prev.map(user => (user.id === userId ? { ...user, role } : user))
    )
    setShowRoleModal(false)
    setSelectedUser(null)
    showToast('Role assigned successfully', 'success')
  }

  const handleDeleteUser = () => {
    if (!selectedUser) return

    setUsers(prev => prev.filter(user => user.id !== selectedUser.id))
    setShowDeleteModal(false)
    setSelectedUser(null)
    showToast('User deleted successfully', 'success')
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

  const filteredUsers = users.filter(
    user =>
      user.fullName.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase()) ||
      (user.role && user.role.toLowerCase().includes(search.toLowerCase()))
  )

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
      <UserFormModal
        isOpen={showCreateModal}
        mode='create'
        user={null}
        roles={roles}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateUser}
      />

      <UserFormModal
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

      <AssignRoleModal
        isOpen={showRoleModal}
        user={selectedUser}
        roles={roles}
        onClose={() => {
          setShowRoleModal(false)
          setSelectedUser(null)
        }}
        onAssign={handleAssignRole}
      />

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        user={selectedUser}
        onConfirm={handleDeleteUser}
        onCancel={() => {
          setShowDeleteModal(false)
          setSelectedUser(null)
        }}
      />

      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8'>
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
          <div>
            <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
              User Management
            </h1>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Manage users and assign roles • {users.length} total users
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className='inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors w-full sm:w-auto'
          >
            <FaPlus className='mr-2' /> New User
          </button>
        </div>

        {/* Search */}
        <div className='mb-6'>
          <div className='relative'>
            <FaSearch className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm' />
            <input
              type='text'
              placeholder='Search users by name, email, or role...'
              value={search}
              onChange={e => setSearch(e.target.value)}
              className='w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500'
            />
          </div>
        </div>

        {/* Users Table */}
        <div className='bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden'>
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
                        {user.role || 'No Role'}
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
                        <button
                          onClick={() => openRoleModal(user)}
                          className='p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors'
                          title='Assign Role'
                        >
                          <FaUserShield />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className='p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors'
                          title='Edit'
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => openDeleteModal(user)}
                          className='p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors'
                          title='Delete'
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
