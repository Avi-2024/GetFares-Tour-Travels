import React, { useState, useEffect } from 'react'
import { FaPlus, FaEdit, FaTrash, FaUserShield, FaSearch } from 'react-icons/fa'
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
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: '',
    isActive: true
  })

  useEffect(() => {
    loadUsers()
    loadRoles()
  }, [])

  const loadUsers = async () => {
    try {
      // Mock API call - replace with actual API when backend is available
      // const response = await usersApi.list()
      // setUsers(response.data || [])
      console.log('Loading users from dummy data')
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadRoles = async () => {
    try {
      // Mock roles - replace with actual API call when available
      setRoles([
        { id: '1', name: 'Admin', description: 'Full system access' },
        { id: '2', name: 'Manager', description: 'Management access' },
        { id: '3', name: 'Sales', description: 'Sales operations' },
        { id: '4', name: 'Marketing', description: 'Marketing operations' },
        { id: '5', name: 'Operations', description: 'Operations access' },
        { id: '6', name: 'Visa Executive', description: 'Visa processing' }
      ])
    } catch (error) {
      console.error('Failed to load roles:', error)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Mock API call - replace with actual API when backend is available
      // await usersApi.create(formData)
      const newUser: User = {
        id: Date.now().toString(),
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        isActive: formData.isActive,
        createdAt: new Date().toISOString().split('T')[0]
      }
      setUsers(prev => [...prev, newUser])
      setShowCreateModal(false)
      resetForm()
    } catch (error) {
      console.error('Failed to create user:', error)
    }
  }

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      // Mock API call - replace with actual API when backend is available
      // await usersApi.update(selectedUser.id, formData)
      setUsers(prev => prev.map(user => 
        user.id === selectedUser.id 
          ? { ...user, ...formData }
          : user
      ))
      setShowEditModal(false)
      resetForm()
    } catch (error) {
      console.error('Failed to update user:', error)
    }
  }

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return
    try {
      await rbacApi.assignRole({ userId: selectedUser.id, role: formData.role })
      await loadUsers()
      setShowRoleModal(false)
      resetForm()
    } catch (error) {
      console.error('Failed to assign role:', error)
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.fullName}?`)) {
      try {
        // Implement delete API call when available
        console.log('Delete user:', user.id)
        await loadUsers()
      } catch (error) {
        console.error('Failed to delete user:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      role: '',
      isActive: true
    })
    setSelectedUser(null)
  }

  const openEditModal = (user: User) => {
    setSelectedUser(user)
    setFormData({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      role: user.role || '',
      isActive: user.isActive
    })
    setShowEditModal(true)
  }

  const openRoleModal = (user: User) => {
    setSelectedUser(user)
    setFormData({ ...formData, role: user.role || '' })
    setShowRoleModal(true)
  }

  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    (user.role && user.role.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-gray-500">Loading users...</div>
      </div>
    )
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
              User Management
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Manage users and assign roles
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors w-full sm:w-auto"
          >
            <FaPlus className="mr-2" /> New User
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 text-sm" />
            <input
              type="text"
              placeholder="Search users by name, email, or role..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="overflow-x-auto">
            <table className="md:min-w-[800px] w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="hidden sm:table-cell px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors">
                    <td className="px-3 sm:px-6 py-4">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.fullName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {user.id}
                      </p>
                      <div className="sm:hidden mt-1">
                        <p className="text-xs text-gray-700 dark:text-gray-300">
                          {user.email}
                        </p>
                        {user.phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {user.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-3 sm:px-6 py-4">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {user.email}
                      </p>
                      {user.phone && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {user.phone}
                        </p>
                      )}
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <span className="inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900">
                        {user.role || 'No Role'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <span className={`inline-flex items-center px-2 sm:px-2.5 py-1 rounded-full text-xs font-medium border ${
                        user.isActive
                          ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-900'
                          : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-900'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex justify-end gap-1 sm:gap-2">
                        <button
                          onClick={() => openRoleModal(user)}
                          className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                          title="Assign Role"
                        >
                          <FaUserShield className="text-xs sm:text-sm" />
                        </button>
                        <button
                          onClick={() => openEditModal(user)}
                          className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FaEdit className="text-xs sm:text-sm" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-1.5 sm:p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FaTrash className="text-xs sm:text-sm" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Create New User</h2>
              <form onSubmit={handleCreateUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Edit User</h2>
              <form onSubmit={handleUpdateUser}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                    />
                  </div>
                  <div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="mr-2"
                      />
                      Active
                    </label>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); resetForm(); }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Assign Role Modal */}
        {showRoleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <h2 className="text-lg font-semibold mb-4">Assign Role</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Assign role to: <strong>{selectedUser?.fullName}</strong>
              </p>
              <form onSubmit={handleAssignRole}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Role</label>
                    <select
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg dark:bg-gray-800"
                    >
                      <option value="">Select Role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.name}>
                          {role.name} {role.description && `- ${role.description}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => { setShowRoleModal(false); resetForm(); }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                  >
                    Assign Role
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}

export default UsersPage
