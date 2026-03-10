import React, { useState } from 'react';
import {
  // FaSearch,
  FaBell,
  FaPlus,
  FaWallet,
  FaClockRotateLeft,
  FaCircleExclamation,
  FaRotateLeft,
  FaArrowUp,
  FaFilter,
  // FaSave,
  // FaCalendarAlt,
  FaUser,
  FaDownload,
  FaListUl,
  FaFileInvoice,
  FaChevronLeft,
  FaChevronRight,
  FaFileArrowDown,
  // FaEllipsisV,
  FaBuildingColumns,
  FaMoneyBill,
  FaCreditCard,
  FaCheck,
  FaXmark,
  FaMagnifyingGlass,
  FaCircleCheck,
  FaCheckToSlot,
  FaRotateRight,
  FaCcVisa,
  FaCcMastercard
} from 'react-icons/fa6';
import { FaRegBell, FaRegCalendarAlt, FaUserCircle } from 'react-icons/fa';

interface Transaction {
  id: string;
  referenceId: string;
  date: string;
  time: string;
  customer: {
    initials?: string;
    name: string;
    avatar?: string;
    bookingId: string;
  };
  amount: number;
  isRefund?: boolean;
  mode: {
    type: 'bank' | 'card' | 'cash' | 'refund' | 'cheque';
    details: string;
    icon?: JSX.Element;
  };
  status: 'completed' | 'pending' | 'failed' | 'refunded';
}

interface PaymentFormData {
  bookingSearch: string;
  amount: string;
  paymentMode: 'bank' | 'card' | 'cash' | 'cheque';
  referenceId: string;
  date: string;
  notes: string;
  sendReceipt: boolean;
}

const Payments: React.FC = () => {
  const [activeTab, setActiveTab] = useState('transactions');
  const [isSlideOverOpen, setIsSlideOverOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentForm, setPaymentForm] = useState<PaymentFormData>({
    bookingSearch: '',
    amount: '',
    paymentMode: 'bank',
    referenceId: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    sendReceipt: true
  });

  const transactions: Transaction[] = [
    {
      id: '1',
      referenceId: 'TRX-8902',
      date: 'Oct 24, 2023',
      time: '10:42 AM',
      customer: {
        initials: 'SJ',
        name: 'Sarah Jenkins',
        bookingId: 'BK-2034'
      },
      amount: 1200.00,
      mode: {
        type: 'card',
        details: 'Visa ****4242',
        icon: <FaCcVisa className="text-blue-800 text-lg mr-2" />
      },
      status: 'completed'
    },
    {
      id: '2',
      referenceId: 'TRX-8901',
      date: 'Oct 23, 2023',
      time: '04:15 PM',
      customer: {
        name: 'Emma Wilson',
        avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/e47c22ccb9-02f23c3427fc27ee7549.png',
        bookingId: 'BK-2030'
      },
      amount: 5400.00,
      mode: {
        type: 'bank',
        details: 'Bank Transfer',
        icon: <FaBuildingColumns className="text-gray-500 text-lg mr-2" />
      },
      status: 'completed'
    },
    {
      id: '3',
      referenceId: 'TRX-8895',
      date: 'Oct 22, 2023',
      time: '11:30 AM',
      customer: {
        initials: 'JL',
        name: 'James Lee',
        bookingId: 'BK-2028'
      },
      amount: -8200.00,
      isRefund: true,
      mode: {
        type: 'refund',
        details: 'Refund',
        icon: <FaRotateLeft className="text-gray-500 text-lg mr-2" />
      },
      status: 'refunded'
    },
    {
      id: '4',
      referenceId: 'TRX-8890',
      date: 'Oct 20, 2023',
      time: '09:15 AM',
      customer: {
        name: 'Robert Chen',
        avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/248b77d2c0-f270f4c95014ba03b145.png',
        bookingId: 'BK-2025'
      },
      amount: 3800.00,
      mode: {
        type: 'cash',
        details: 'Cash',
        icon: <FaMoneyBill className="text-green-600 text-lg mr-2" />
      },
      status: 'completed'
    },
    {
      id: '5',
      referenceId: 'TRX-8888',
      date: 'Oct 19, 2023',
      time: '02:20 PM',
      customer: {
        initials: 'MR',
        name: 'Michael Ross',
        bookingId: 'BK-2033'
      },
      amount: 2800.00,
      mode: {
        type: 'card',
        details: 'MasterCard ****8821',
        icon: <FaCcMastercard className="text-red-600 text-lg mr-2" />
      },
      status: 'failed'
    }
  ];

  const stats = [
    {
      label: 'Collected (Month)',
      value: '$48,250',
      change: '+8%',
      icon: FaWallet,
      color: 'blue'
    },
    {
      label: 'Outstanding',
      value: '$12,400',
      subtext: '14 pending bookings',
      icon: FaClockRotateLeft,
      color: 'orange'
    },
    {
      label: 'Overdue',
      value: '$3,200',
      badge: '3 invoices',
      icon: FaCircleExclamation,
      color: 'red'
    },
    {
      label: 'Refunds Processed',
      value: '$1,850',
      subtext: 'This month',
      icon: FaRotateLeft,
      color: 'gray'
    }
  ];

  const tabs = [
    { id: 'transactions', label: 'Transactions', icon: FaListUl },
    { id: 'invoices', label: 'Invoices', icon: FaFileInvoice, badge: '5' },
    { id: 'refunds', label: 'Refunds', icon: FaRotateLeft }
  ];

  const getStatusBadge = (status: Transaction['status']) => {
    const config = {
      completed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      failed: 'bg-red-50 text-red-700 border-red-200',
      refunded: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return config[status];
  };

  const getStatusText = (status: Transaction['status']) => {
    const config = {
      completed: 'Completed',
      pending: 'Pending',
      failed: 'Failed',
      refunded: 'Refunded'
    };
    return config[status];
  };

  const toggleSlideOver = () => {
    setIsSlideOverOpen(!isSlideOverOpen);
  };

  const handlePaymentModeChange = (mode: PaymentFormData['paymentMode']) => {
    setPaymentForm({ ...paymentForm, paymentMode: mode });
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

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
        
        .table-row-hover:hover td {
          background-color: #f9fafb;
        }
        
        .custom-checkbox {
          appearance: none;
          background-color: #fff;
          margin: 0;
          font: inherit;
          color: currentColor;
          width: 1.15em;
          height: 1.15em;
          border: 1px solid #d1d5db;
          border-radius: 0.25em;
          display: grid;
          place-content: center;
        }
        .custom-checkbox::before {
          content: "";
          width: 0.65em;
          height: 0.65em;
          transform: scale(0);
          transition: 120ms transform ease-in-out;
          box-shadow: inset 1em 1em white;
          background-color: white;
          transform-origin: center;
          clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%);
        }
        .custom-checkbox:checked {
          background-color: #3b82f6;
          border-color: #3b82f6;
        }
        .custom-checkbox:checked::before {
          transform: scale(1);
        }

        .slide-over-panel {
          transform: translateX(100%);
          transition: transform 0.3s ease-in-out;
        }
        .slide-over-panel.open {
          transform: translateX(0);
        }
        .backdrop {
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s ease-in-out;
        }
        .backdrop.open {
          opacity: 1;
          pointer-events: auto;
        }

        .shadow-soft {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
      `}</style>

      {/* Main Content Area */}
      <div className="flex flex-col  bg-gray-100">
        {/* Top Bar */}
      

        {/* Content Area (Scrollable) */}
        <main className="flex-1 ">
          
          {/* KPI Mini-cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 md:mb-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              const colorClasses = {
                blue: 'bg-blue-50 text-blue-600',
                orange: 'bg-orange-50 text-orange-600',
                red: 'bg-red-50 text-red-600',
                gray: 'bg-gray-100 text-gray-600'
              };
              
              return (
                <div key={index} className="bg-white rounded-xl shadow-soft p-4 flex flex-col border border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{stat.label}</p>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[stat.color as keyof typeof colorClasses]}`}>
                      <Icon className="text-sm" />
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2 mt-auto">
                    <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                    {stat.change && (
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center">
                        <FaArrowUp className="text-[10px] mr-1" /> {stat.change}
                      </span>
                    )}
                    {stat.badge && (
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center">
                        {stat.badge}
                      </span>
                    )}
                    {stat.subtext && !stat.change && !stat.badge && (
                      <span className="text-xs text-gray-400">{stat.subtext}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tabs Navigation */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`${isActive ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors`}
                  >
                    <Icon className="text-sm" />
                    {tab.label}
                    {tab.badge && (
                      <span className="bg-gray-100 text-gray-600 py-0.5 px-2 rounded-full text-xs">{tab.badge}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Filters Section */}
          <div className="bg-white rounded-xl shadow-soft border border-gray-200 mb-6">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <FaFilter className="text-gray-400 text-sm" /> Filters
              </h2>
              <div className="flex items-center gap-2 text-sm">
                <button className="text-gray-500 hover:text-blue-600 font-medium">Clear All</button>
                <span className="text-gray-300">|</span>
                <button className="text-blue-600 font-medium flex items-center gap-1">
                  <FaUser /> Save View
                </button>
              </div>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {/* Mode Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment Mode</label>
                <select className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50">
                  <option>All Modes</option>
                  <option>Bank Transfer</option>
                  <option>Credit Card</option>
                  <option>Cash</option>
                  <option>Payment Gateway</option>
                </select>
              </div>
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Status</label>
                <select className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50">
                  <option>All Statuses</option>
                  <option>Completed</option>
                  <option>Pending</option>
                  <option>Failed</option>
                  <option>Refunded</option>
                </select>
              </div>
              {/* Date Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Date Range</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="block w-full pl-9 pr-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50" 
                    placeholder="Select dates"
                  />
                  <FaUser className="absolute left-3 top-2.5 text-gray-400 text-sm" />
                </div>
              </div>
              {/* Customer Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Customer</label>
                <div className="relative">
                  <input 
                    type="text" 
                    className="block w-full pl-9 pr-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50" 
                    placeholder="Search customer"
                  />
                  <FaUser className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                </div>
              </div>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
                <span className="bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs font-medium">1,240</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">
                  <FaDownload className="mr-2 text-gray-400" /> Export CSV
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto relative">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                      <input type="checkbox" className="custom-checkbox" />
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reference ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer / Booking
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Mode
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="sticky right-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="table-row-hover group transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input type="checkbox" className="custom-checkbox" />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">#{transaction.referenceId}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{transaction.date}</div>
                        <div className="text-xs text-gray-500">{transaction.time}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`flex-shrink-0 h-8 w-8 rounded-full ${transaction.customer.avatar ? 'overflow-hidden' : ''} ${transaction.customer.initials ? 'bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold' : ''} mr-3 border border-gray-200`}>
                            {transaction.customer.avatar ? (
                              <img className="w-full h-full object-cover" src={transaction.customer.avatar} alt={transaction.customer.name} />
                            ) : transaction.customer.initials ? (
                              transaction.customer.initials
                            ) : (
                              getInitials(transaction.customer.name)
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{transaction.customer.name}</div>
                            <div className="text-xs text-blue-600 hover:underline cursor-pointer">#{transaction.customer.bookingId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`text-sm font-bold ${transaction.isRefund ? 'text-red-600' : 'text-gray-900'}`}>
                          {transaction.isRefund ? '-' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-600">
                          {transaction.mode.icon}
                          {transaction.mode.details}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(transaction.status)}`}>
                          {getStatusText(transaction.status)}
                        </span>
                      </td>
                      <td className="sticky right-0 bg-white group-hover:bg-gray-50 px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center justify-end gap-2">
                          <button className="text-gray-400 hover:text-blue-600 p-1" title="Download Receipt">
                            <FaFileArrowDown />
                          </button>
                          {transaction.status === 'failed' && (
                            <button className="text-gray-400 hover:text-blue-600 p-1" title="Retry">
                              <FaRotateRight />
                            </button>
                          )}
                          <button className="text-gray-400 hover:text-gray-600 p-1">
                            <FaUser />
                          </button>
                        </div>
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
                    Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">1240</span> results
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
                    <a href="#" className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hidden md:inline-flex relative items-center px-4 py-2 border text-sm font-medium">3</a>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>
                    <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                      <span className="sr-only">Next</span>
                      <FaChevronRight className="text-xs" />
                    </a>
                  </nav>
                </div>
              </div>
              {/* Mobile Pagination */}
              <div className="flex items-center justify-between w-full sm:hidden">
                <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Previous</a>
                <a href="#" className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">Next</a>
              </div>
            </div>
          </div>

          {/* Footer spacing */}
          <div className="h-12"></div>
        </main>
      </div>

      {/* Backdrop for Slide-over */}
      <div 
        onClick={toggleSlideOver} 
        className={`backdrop fixed inset-0 bg-gray-900 bg-opacity-50 z-50 transition-opacity duration-300 ease-in-out ${isSlideOverOpen ? 'open' : ''}`}
      ></div>

      {/* Add Payment Slide-over */}
      <div className={`slide-over-panel fixed inset-y-0 right-0 w-full md:w-[480px] bg-white shadow-2xl z-50 flex flex-col h-full transform transition-transform duration-300 ease-in-out ${isSlideOverOpen ? 'open' : ''}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-white">
          <h2 className="text-lg font-bold text-gray-900">Add New Payment</h2>
          <button onClick={toggleSlideOver} className="text-gray-400 hover:text-gray-600 transition-colors">
            <FaXmark className="text-xl" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <form className="space-y-6">
            {/* Booking Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Booking / Customer</label>
              <div className="relative">
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                  placeholder="Search by name or booking ID"
                  value={paymentForm.bookingSearch}
                  onChange={(e) => setPaymentForm({...paymentForm, bookingSearch: e.target.value})}
                />
                <FaMagnifyingGlass className="absolute left-3.5 top-3 text-gray-400" />
              </div>
              <p className="mt-1 text-xs text-gray-500">Search for pending bookings to link this payment</p>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Received</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input 
                  type="number" 
                  className="w-full pl-8 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {(['bank', 'card', 'cash', 'cheque'] as const).map((mode) => {
                  const isSelected = paymentForm.paymentMode === mode;
                  const icons = {
                    bank: FaBuildingColumns,
                    card: FaCreditCard,
                    cash: FaMoneyBill,
                    cheque: FaCheckToSlot
                  };
                  const labels = {
                    bank: 'Bank Transfer',
                    card: 'Card / Online',
                    cash: 'Cash',
                    cheque: 'Cheque'
                  };
                  const Icon = icons[mode];
                  
                  return (
                    <label
                      key={mode}
                      className={`relative flex items-center justify-center p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors ${
                        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                      }`}
                      onClick={() => handlePaymentModeChange(mode)}
                    >
                      <input type="radio" name="payment_mode" className="sr-only" checked={isSelected} readOnly />
                      <div className="flex flex-col items-center">
                        <Icon className={`mb-1 ${isSelected ? 'text-blue-600' : 'text-gray-500'}`} />
                        <span className={`text-xs font-medium ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                          {labels[mode]}
                        </span>
                      </div>
                      {isSelected && (
                        <div className="absolute top-2 right-2 text-blue-600">
                          <FaCircleCheck />
                        </div>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Reference & Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID / No.</label>
                <input 
                  type="text" 
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                  placeholder="e.g. TRX-12345"
                  value={paymentForm.referenceId}
                  onChange={(e) => setPaymentForm({...paymentForm, referenceId: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date Received</label>
                <input 
                  type="date" 
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  value={paymentForm.date}
                  onChange={(e) => setPaymentForm({...paymentForm, date: e.target.value})}
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes <span className="text-gray-400 font-normal">(Optional)</span></label>
              <textarea 
                rows={3} 
                className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" 
                placeholder="Add any details about this transaction..."
                value={paymentForm.notes}
                onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
              />
            </div>

            {/* Send Receipt Checkbox */}
            <div className="flex items-center">
              <input 
                id="send-receipt" 
                type="checkbox" 
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded custom-checkbox"
                checked={paymentForm.sendReceipt}
                onChange={(e) => setPaymentForm({...paymentForm, sendReceipt: e.target.checked})}
              />
              <label htmlFor="send-receipt" className="ml-2 block text-sm text-gray-700">
                Send receipt to customer automatically
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center gap-3">
          <button 
            onClick={toggleSlideOver}
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors flex items-center justify-center gap-2">
            <FaCheck /> Record Payment
          </button>
        </div>
      </div>
    </div>
  );
};

export default Payments;