import React, { useState } from 'react';
import { 
  FaPlus,
  FaSearch,
  FaChevronDown,
  FaCalendarAlt,

  FaTimes,
  FaEye,
  FaWhatsapp,
  FaEllipsisV,
  FaCopy,
  FaTrashAlt,
  FaChevronLeft,
  FaChevronRight
} from 'react-icons/fa';
import { MdOutlineGridOn } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

interface Quotation {
  id: string;
  quoteNumber: string;
  quoteDisplay?: string;
  customer: {
    initials: string;
    name: string;
    email: string;
    bgColor?: string;
    textColor?: string;
  };
  destination: {
    name: string;
    details: string;
  };
  total: number;
  margin: number;
  status: 'pending' | 'accepted' | 'expired' | 'rejected' | 'draft';
  lastSent: {
    date: string;
    method: string;
  } | null;
  actions?: {
    showConvert?: boolean;
    showEdit?: boolean;
    showDelete?: boolean;
  };
}

const QuotationsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const quotations: Quotation[] = [
    {
      id: '1',
      quoteNumber: 'QT-2023-089',
      customer: {
        initials: 'SJ',
        name: 'Sarah Jenkins',
        email: 'sarah.j@example.com',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-600'
      },
      destination: {
        name: 'Maldives Retreat',
        details: '5 Nights • All Inclusive'
      },
      total: 4250.00,
      margin: 12,
      status: 'pending',
      lastSent: {
        date: 'Oct 24, 2023',
        method: 'via Email'
      }
    },
    {
      id: '2',
      quoteNumber: 'QT-2023-088',
      customer: {
        initials: 'MR',
        name: 'Michael Ross',
        email: 'm.ross@company.com',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-600'
      },
      destination: {
        name: 'Tokyo Business Trip',
        details: '7 Nights • Hotel Only'
      },
      total: 2800.00,
      margin: 15,
      status: 'accepted',
      lastSent: {
        date: 'Oct 23, 2023',
        method: 'via WhatsApp'
      },
      actions: {
        showConvert: true
      }
    },
    {
      id: '3',
      quoteNumber: 'QT-2023-085',
      customer: {
        initials: 'EL',
        name: 'Emma Lewis',
        email: 'emma.l@gmail.com',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-600'
      },
      destination: {
        name: 'Paris Family Vacation',
        details: '10 Nights • Package'
      },
      total: 8450.00,
      margin: 10,
      status: 'expired',
      lastSent: {
        date: 'Oct 15, 2023',
        method: 'via Email'
      }
    },
    {
      id: '4',
      quoteNumber: '',
      quoteDisplay: 'Draft',
      customer: {
        initials: 'DK',
        name: 'David Kim',
        email: 'New Lead',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-500'
      },
      destination: {
        name: 'Bali Honeymoon',
        details: '14 Nights'
      },
      total: 5100.00,
      margin: 0,
      status: 'draft',
      lastSent: null,
      actions: {
        showEdit: true,
        showDelete: true
      }
    },
    {
      id: '5',
      quoteNumber: 'QT-2023-082',
      customer: {
        initials: 'RP',
        name: 'Rachel Paulson',
        email: 'rachel.p@outlook.com',
        bgColor: 'bg-pink-100',
        textColor: 'text-pink-600'
      },
      destination: {
        name: 'Dubai Stopover',
        details: '3 Nights'
      },
      total: 1200.00,
      margin: 8,
      status: 'rejected',
      lastSent: {
        date: 'Oct 10, 2023',
        method: 'via Email'
      }
    }
  ];

  const getStatusBadge = (status: Quotation['status']) => {
    const statusConfig = {
      pending: {
        bg: 'bg-orange-50 text-orange-700 border-orange-200',
        text: 'Pending'
      },
      accepted: {
        bg: 'bg-green-50 text-green-700 border-green-200',
        text: 'Accepted'
      },
      expired: {
        bg: 'bg-red-50 text-red-700 border-red-200',
        text: 'Expired'
      },
      rejected: {
        bg: 'bg-red-50 text-red-700 border-red-200',
        text: 'Rejected'
      },
      draft: {
        bg: 'bg-gray-100 text-gray-600 border-gray-200',
        text: 'Draft'
      }
    };
    return statusConfig[status];
  };

  return (
    <div className="bg-gray-100  text-gray-800 font-sans antialiased">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
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
        
        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .table-row-hover:hover td {
          background-color: #f9fafb;
        }

        .shadow-soft {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
      `}</style>

      {/* Main Content Area */}
      <div className="flex flex-col bg-gray-100">
      

        {/* Scrollable Content */}
        <main className="flex-1 ">
          <div className=" mx-auto space-y-6">
            
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-gray-900">Quotations</h1>
                <p className="text-xs md:text-sm text-gray-500 mt-1">Manage and track all your travel quotations in one place.</p>
              </div>
              <button onClick={() => navigate('/quotations/builder')} className="w-full sm:w-auto inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all">
                <FaPlus className="mr-2" /> Create Quotation
              </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Active</h3>
                  <span className="text-green-600 bg-green-50 px-2 py-0.5 rounded-full text-xs font-medium">+12%</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">142</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Pending Approval</h3>
                  <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full text-xs font-medium">Attention</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">28</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Converted</h3>
                  <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full text-xs font-medium">This Month</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">45</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-soft border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</h3>
                  <span className="text-gray-400 text-xs">USD</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">$342,800</p>
              </div>
            </div>

            {/* Filters & Search Section */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-4">
              <div className="flex flex-col lg:flex-row gap-4 justify-between items-start lg:items-center">
                
                {/* Search */}
                <div className="w-full lg:w-72 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FaSearch className="text-gray-400 text-sm" />
                  </div>
                  <input 
                    type="text" 
                    className="form-input block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition duration-150 ease-in-out" 
                    placeholder="Search quote #, client name..."
                  />
                </div>

                {/* Filters Group */}
                <div className="flex flex-col sm:flex-row flex-wrap items-center gap-3 w-full lg:w-auto">
                  
                  {/* Status Filter */}
                  <div className="relative group w-full sm:w-auto">
                    <select className="form-input w-full appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700 cursor-pointer transition-colors">
                      <option value="">All Statuses</option>
                      <option value="accepted">Accepted</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                      <option value="rejected">Rejected</option>
                      <option value="draft">Draft</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <FaChevronDown className="text-xs" />
                    </div>
                  </div>

                  {/* Consultant Filter */}
                  <div className="relative group w-full sm:w-auto">
                    <select className="form-input w-full appearance-none pl-3 pr-8 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700 cursor-pointer transition-colors">
                      <option value="">All Consultants</option>
                      <option value="alex">Alex Morgan</option>
                      <option value="sarah">Sarah Jenkins</option>
                      <option value="mike">Mike Ross</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                      <FaChevronDown className="text-xs" />
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="relative w-full sm:w-auto">
                    <button className="w-full flex items-center justify-between sm:justify-start gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <span className="flex items-center gap-2"><FaCalendarAlt className="text-gray-500" /> Date Range</span>
                      <FaChevronDown className="text-xs text-gray-500 ml-1" />
                    </button>
                  </div>

                  {/* More Filters & Reset */}
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <button className="flex-1 sm:flex-none p-2 border border-gray-300 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors focus:outline-none" title="More filters">
                      
                    </button>
                    <button className="flex-1 sm:flex-none text-sm text-blue-600 hover:text-blue-800 font-medium px-2">
                      Clear
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Active Filters Tags */}
              <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  Status: Pending <button className="ml-1.5 text-blue-500 hover:text-blue-700 focus:outline-none"><FaTimes /></button>
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                  Dest: Maldives <button className="ml-1.5 text-blue-500 hover:text-blue-700 focus:outline-none"><FaTimes /></button>
                </span>
              </div>
            </div>

            {/* Quotations Table */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden flex flex-col">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Quote #
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Lead / Customer
                      </th>
                      <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Destination
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th scope="col" className="hidden sm:table-cell px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="hidden lg:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Sent
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {quotations.map((quote) => {
                      const statusBadge = getStatusBadge(quote.status);
                      
                      return (
                        <tr key={quote.id} className="table-row-hover transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {quote.quoteNumber ? (
                              <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-800">{quote.quoteNumber}</a>
                            ) : (
                              <span className="text-sm font-medium text-gray-500">{quote.quoteDisplay}</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-8 w-8 rounded-full ${quote.customer.bgColor} flex items-center justify-center ${quote.customer.textColor} font-bold text-xs`}>
                                {quote.customer.initials}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">{quote.customer.name}</div>
                                <div className="text-xs text-gray-500">{quote.customer.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-gray-700">{quote.destination.name}</span>
                            <div className="text-xs text-gray-500">{quote.destination.details}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <div className="text-sm font-medium text-gray-900">${quote.total.toFixed(2)}</div>
                            {quote.margin > 0 ? (
                              <div className="text-xs text-green-600 font-medium">Margin: {quote.margin}%</div>
                            ) : (
                              <div className="text-xs text-gray-400">Est. Margin: --</div>
                            )}
                          </td>
                          <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-center">
                            <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full border ${statusBadge.bg}`}>
                              {statusBadge.text}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                            {quote.lastSent ? (
                              <>
                                <div className="text-sm text-gray-900">{quote.lastSent.date}</div>
                                <div className="text-xs text-gray-500">{quote.lastSent.method}</div>
                              </>
                            ) : (
                              <div className="text-sm text-gray-400 italic">Never Sent</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              {quote.actions?.showConvert ? (
                                <button className="text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-2 py-1 rounded text-xs font-semibold border border-blue-100">
                                  Convert to Booking
                                </button>
                              ) : quote.actions?.showEdit ? (
                                <>
                                  <button className="text-blue-600 hover:text-blue-800 transition-colors p-1 font-medium text-xs">
                                    Edit
                                  </button>
                                  <button className="text-gray-400 hover:text-red-600 transition-colors p-1">
                                    <FaTrashAlt />
                                  </button>
                                </>
                              ) : quote.status === 'expired' ? (
                                <>
                                  <button className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Duplicate">
                                    <FaCopy />
                                  </button>
                                  <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                    <FaEllipsisV />
                                  </button>
                                </>
                              ) : quote.status === 'rejected' ? (
                                <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                  <FaEllipsisV />
                                </button>
                              ) : (
                                <>
                                  <button className="text-gray-400 hover:text-blue-600 transition-colors p-1" title="Preview">
                                    <FaEye />
                                  </button>
                                  <button className="text-gray-400 hover:text-green-600 transition-colors p-1" title="Send via WhatsApp">
                                    <FaWhatsapp />
                                  </button>
                                  <button className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                    <FaEllipsisV />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="bg-white px-4 py-3 border-t border-gray-200 flex items-center justify-between sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Showing <span className="font-medium">1</span> to <span className="font-medium">5</span> of <span className="font-medium">142</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        <span className="sr-only">Previous</span>
                        <FaChevronLeft className="text-xs" />
                      </a>
                      <a href="#" aria-current="page" className="z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                        1
                      </a>
                      <a href="#" className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium">
                        2
                      </a>
                      <a href="#" className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hidden md:inline-flex relative items-center px-4 py-2 border text-sm font-medium">
                        3
                      </a>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                        ...
                      </span>
                      <a href="#" className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hidden md:inline-flex relative items-center px-4 py-2 border text-sm font-medium">
                        8
                      </a>
                      <a href="#" className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50">
                        <span className="sr-only">Next</span>
                        <FaChevronRight className="text-xs" />
                      </a>
                    </nav>
                  </div>
                </div>
                {/* Mobile Pagination View */}
                <div className="flex items-center justify-between w-full sm:hidden">
                  <a href="#" className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Previous
                  </a>
                  <a href="#" className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                    Next
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default QuotationsPage;