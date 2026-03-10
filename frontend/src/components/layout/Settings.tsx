import React, { useState } from 'react';
import {
  FaSearch,
  FaBell,
  FaUsers,
  FaSignal,
  FaEnvelopeOpenText,
  FaFilter,
  FaDownload,
  FaTrash,
  FaChevronLeft,
  FaChevronRight,
  FaPlus,
  FaChevronRight as FaChevronRightIcon,
  FaShieldAlt,

  FaFileInvoice,
  FaPlug,
  FaWhatsapp,
  FaStripe,
  FaEnvelope,
  FaUserPlus,
  FaExclamationTriangle
} from 'react-icons/fa';
import { MdOutlineGridOn } from 'react-icons/md';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  roleDescription: string;
  status: 'active' | 'pending';
  lastActive: string;
  avatar?: string;
  initials?: string;
}

interface Role {
  id: string;
  name: string;
  userCount: number;
  isActive?: boolean;
}

interface Permission {
  id: string;
  name: string;
  icon: JSX.Element;
  permissions: {
    id: string;
    label: string;
    enabled: boolean;
  }[];
}

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('user-management');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const users: User[] = [
    {
      id: '1',
      name: 'Jane Cooper',
      email: 'jane.cooper@example.com',
      role: 'Admin',
      roleDescription: 'Full Access',
      status: 'active',
      lastActive: 'Just now',
      avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-1.jpg'
    },
    {
      id: '2',
      name: 'Cody Fisher',
      email: 'cody.fisher@example.com',
      role: 'Manager',
      roleDescription: 'Sales & Reports',
      status: 'active',
      lastActive: '2 hours ago',
      avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-2.jpg'
    },
    {
      id: '3',
      name: 'Esther Howard',
      email: 'esther.howard@example.com',
      role: 'Agent',
      roleDescription: 'Limited Access',
      status: 'pending',
      lastActive: '-',
      initials: 'EW'
    }
  ];

  const roles: Role[] = [
    { id: '1', name: 'Administrator', userCount: 3, isActive: true },
    { id: '2', name: 'Sales Manager', userCount: 5 },
    { id: '3', name: 'Travel Agent', userCount: 12 },
    { id: '4', name: 'Finance', userCount: 2 }
  ];

  const permissions: Permission[] = [
    {
      id: 'customer-management',
      name: 'Customer Management',
      icon: <FaUsers className="w-5 text-gray-400 mr-2" />,
      permissions: [
        { id: 'view-customers', label: 'View Customers', enabled: true },
        { id: 'edit-customers', label: 'Create/Edit Customers', enabled: true },
        { id: 'delete-customers', label: 'Delete Customers', enabled: true },
        { id: 'export-data', label: 'Export Data', enabled: true }
      ]
    },
    {
      id: 'financials',
      name: 'Financials',
      icon: <FaFileInvoice className="w-5 text-gray-400 mr-2" />,
      permissions: [
        { id: 'view-invoices', label: 'View Invoices', enabled: true },
        { id: 'create-invoices', label: 'Create Invoices', enabled: true },
        { id: 'approve-refunds', label: 'Approve Refunds', enabled: true },
        { id: 'access-reports', label: 'Access Reports', enabled: true }
      ]
    },
    {
      id: 'system-settings',
      name: 'System Settings',
      icon: <FaPlug className="w-5 text-gray-400 mr-2" />,
      permissions: [
        { id: 'manage-users', label: 'Manage Users', enabled: true },
        { id: 'general-config', label: 'General Configuration', enabled: true }
      ]
    }
  ];

  const tabs = [
    { id: 'user-management', label: 'User Management', icon: FaUsers },
    { id: 'roles-permissions', label: 'Roles & Permissions', icon: FaShieldAlt },
    { id: 'system-settings', label: 'System Settings', icon: FaPlug },
    { id: 'pdf-templates', label: 'PDF Templates', icon: FaFileInvoice },
    { id: 'integrations', label: 'Integrations', icon: FaPlug }
  ];

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const renderUserManagement = () => (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
          <p className="mt-1 text-sm text-gray-500">Manage user access, invite new team members, and handle account statuses.</p>
        </div>
        <button 
          onClick={toggleModal}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <FaUserPlus className="mr-2" /> Invite User
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">24</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
            <FaUsers />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Active Now</p>
            <p className="text-2xl font-bold text-gray-900">18</p>
          </div>
          <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center text-green-600">
            <FaSignal />
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Pending Invites</p>
            <p className="text-2xl font-bold text-gray-900">3</p>
          </div>
          <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
            <FaEnvelopeOpenText />
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="bg-white shadow-soft rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="relative max-w-xs w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaSearch className="text-gray-400 text-sm" />
            </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition duration-150 ease-in-out" 
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <FaFilter />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
              <FaDownload />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Active</th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {user.avatar ? (
                          <img className="h-10 w-10 rounded-full object-cover" src={user.avatar} alt={user.name} />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold">
                            {user.initials}
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.role}</div>
                    <div className="text-xs text-gray-500">{user.roleDescription}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {user.status === 'active' ? 'Active' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.lastActive}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                    <button className="text-gray-400 hover:text-red-600">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">1</span> to <span className="font-medium">3</span> of <span className="font-medium">24</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Previous</span>
                  <FaChevronLeft className="text-xs" />
                </a>
                <a href="#" aria-current="page" className="z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium">1</a>
                <a href="#" className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium">2</a>
                <a href="#" className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium">3</a>
                <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                  <span className="sr-only">Next</span>
                  <FaChevronRight className="text-xs" />
                </a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRolesPermissions = () => (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Roles & Permissions</h2>
          <p className="mt-1 text-sm text-gray-500">Define roles and customize access levels for your team.</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
          <FaPlus className="mr-2" /> Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Role List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white shadow-soft rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
              <h3 className="text-sm font-semibold text-gray-900">Defined Roles</h3>
            </div>
            <ul className="divide-y divide-gray-100">
              {roles.map((role) => (
                <li key={role.id}>
                  <button className={`w-full text-left px-4 py-3 hover:bg-gray-50 focus:outline-none flex items-center justify-between group ${
                    role.isActive ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}>
                    <div>
                      <p className={`text-sm font-medium ${role.isActive ? 'text-blue-700' : 'text-gray-900'}`}>
                        {role.name}
                      </p>
                      <p className={`text-xs mt-0.5 ${role.isActive ? 'text-blue-500' : 'text-gray-500'}`}>
                        {role.userCount} Users
                      </p>
                    </div>
                    <FaChevronRightIcon className={`text-xs ${role.isActive ? 'text-blue-400' : 'text-gray-300 group-hover:text-gray-400'}`} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Permission Matrix */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow-soft rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Administrator Permissions</h3>
                <p className="text-sm text-gray-500">Full access to all system features.</p>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Save Changes</button>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {permissions.map((section) => (
                  <div key={section.id}>
                    <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                      {section.icon} {section.name}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-7">
                      {section.permissions.map((perm) => (
                        <label key={perm.id} className="flex items-center space-x-3">
                          <input 
                            type="checkbox" 
                            checked={perm.enabled} 
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            readOnly
                          />
                          <span className="text-sm text-gray-700">{perm.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
        <p className="mt-1 text-sm text-gray-500">Configure global application settings and integrations.</p>
      </div>

      {/* Company Details Card */}
      <div className="bg-white shadow-soft rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-medium text-gray-900">Company Details</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <label htmlFor="company-name" className="block text-sm font-medium text-gray-700">Company Name</label>
              <div className="mt-1">
                <input 
                  type="text" 
                  name="company-name" 
                  id="company-name" 
                  defaultValue="TravelCRM Agency Ltd." 
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>
            <div className="sm:col-span-3">
              <label htmlFor="support-email" className="block text-sm font-medium text-gray-700">Support Email</label>
              <div className="mt-1">
                <input 
                  type="email" 
                  name="support-email" 
                  id="support-email" 
                  defaultValue="support@travelcrm.com" 
                  className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md p-2 border"
                />
              </div>
            </div>
            <div className="sm:col-span-6">
              <label className="block text-sm font-medium text-gray-700">Company Logo</label>
              <div className="mt-1 flex items-center space-x-5">
                <span className="inline-block h-12 w-12 rounded-full overflow-hidden bg-gray-100">
                  <div className="h-full w-full bg-blue-600 flex items-center justify-center text-white">
                    
                  </div>
                </span>
                <button type="button" className="bg-white py-2 px-3 border border-gray-300 rounded-md shadow-sm text-sm leading-4 font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  Change
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="px-6 py-3 bg-gray-50 text-right">
          <button type="button" className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            Save
          </button>
        </div>
      </div>

      {/* Integrations Card */}
      <div className="bg-white shadow-soft rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-medium text-gray-900">Integrations</h3>
        </div>
        <ul className="divide-y divide-gray-200">
          <li className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center text-green-600 text-xl">
                <FaWhatsapp />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">WhatsApp Business</h4>
                <p className="text-sm text-gray-500">Send automated booking confirmations.</p>
              </div>
            </div>
            <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
              <input 
                type="checkbox" 
                name="toggle" 
                id="whatsapp-toggle" 
                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer border-gray-300 checked:border-blue-600"
              />
              <label htmlFor="whatsapp-toggle" className="toggle-label block overflow-hidden h-6 rounded-full bg-gray-300 cursor-pointer"></label>
            </div>
          </li>
          <li className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 text-xl">
                <FaStripe />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">Stripe Payments</h4>
                <p className="text-sm text-gray-500">Process credit card payments securely.</p>
              </div>
            </div>
            <div className="flex items-center">
              <span className="mr-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Connected</span>
              <button className="text-sm text-gray-500 hover:text-gray-700">Configure</button>
            </div>
          </li>
          <li className="px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center text-red-600 text-xl">
                <FaEnvelope />
              </div>
              <div className="ml-4">
                <h4 className="text-sm font-medium text-gray-900">SMTP Server</h4>
                <p className="text-sm text-gray-500">Custom email server configuration.</p>
              </div>
            </div>
            <button className="text-sm text-blue-600 hover:text-blue-800 font-medium">Setup</button>
          </li>
        </ul>
      </div>
    </div>
  );

  const renderPdfTemplates = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">PDF Templates</h2>
        <p className="mt-1 text-sm text-gray-500">Customize the appearance of your invoices and quotations.</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
        <p className="text-gray-600 italic">Template editor module loading...</p>
      </div>
    </div>
  );

  const renderIntegrations = () => (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Integrations</h2>
        <p className="mt-1 text-sm text-gray-500">Connect your CRM with third-party services.</p>
      </div>
      <div className="bg-white p-6 rounded-xl shadow-soft border border-gray-200">
        <p className="text-gray-600 italic">Integration marketplace loading...</p>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 min-h-screen text-gray-800 font-sans antialiased">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #d1d5db;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #9ca3af;
        }
        
        .toggle-checkbox:checked {
          right: 0;
          border-color: #3b82f6;
        }
        .toggle-checkbox:checked + .toggle-label {
          background-color: #3b82f6;
        }
        
        
      `}</style>

      {/* Main Content Area */}
      <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
        {/* Top Bar */}
       

        {/* Settings Content Layout */}
        <main className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Inner Sidebar (Sub-navigation) */}
          <div className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0 overflow-y-auto custom-scrollbar md:h-full">
            <div className="p-4">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-2">Administration</h2>
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center px-3 py-2 text-sm font-medium rounded-md w-full text-left transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600 border-r-3 border-blue-600' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <Icon className={`w-6 text-center mr-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Main Settings Panel */}
          <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
            {activeTab === 'user-management' && renderUserManagement()}
            {activeTab === 'roles-permissions' && renderRolesPermissions()}
            {activeTab === 'system-settings' && renderSystemSettings()}
            {activeTab === 'pdf-templates' && renderPdfTemplates()}
            {activeTab === 'integrations' && renderIntegrations()}
            
            <div className="h-12"></div>
          </div>
        </main>
      </div>

      {/* Invite User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
              aria-hidden="true" 
              onClick={toggleModal}
            ></div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FaUserPlus className="text-blue-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">Invite Team Member</h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 mb-4">Send an invitation email to add a new user to your organization.</p>
                      <form className="space-y-4">
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                          <input 
                            type="email" 
                            name="email" 
                            id="email" 
                            className="mt-1 focus:ring-blue-500 focus:border-blue-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md p-2 border" 
                            placeholder="colleague@example.com"
                          />
                        </div>
                        <div>
                          <label htmlFor="role" className="block text-sm font-medium text-gray-700">Role</label>
                          <select 
                            id="role" 
                            name="role" 
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md border"
                          >
                            <option>Administrator</option>
                            <option>Sales Manager</option>
                            <option selected>Travel Agent</option>
                            <option>Finance</option>
                          </select>
                        </div>
                        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <FaExclamationTriangle className="text-yellow-400" />
                            </div>
                            <div className="ml-3">
                              <p className="text-xs text-yellow-700">
                                New users will receive an email to set their password.
                              </p>
                            </div>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button 
                  type="button" 
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={toggleModal}
                >
                  Send Invitation
                </button>
                <button 
                  type="button" 
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  onClick={toggleModal}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;