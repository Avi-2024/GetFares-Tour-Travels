import React, { useState } from 'react';
import { 
//   FaPlaneUp, 
//   FaClipboardQuestion, 
  FaMoneyBillWave, 
  FaSearch, 
  FaPlus, 
  FaArrowUp,
  FaExclamationCircle,
  FaFilter,
  FaSave,
  FaCalendarAlt,
  FaUser,
  FaDownload,
  FaList,
  FaSort,
//   FaLocationDot,
  FaAdjust,
  FaCheckCircle,
  FaTimesCircle,
  FaUndo,
  FaEye,
  FaFileInvoiceDollar,
  FaEllipsisV,
  FaCreditCard,
//   FaTicket,
  FaPaperPlane,
  FaChevronLeft,
  FaChevronRight,
  FaRegBell
} from 'react-icons/fa';
import { MdOutlineGridOn } from 'react-icons/md';

interface Booking {
  id: string;
  bookingId: string;
  time: string;
  customer: {
    initials?: string;
    name: string;
    avatar?: string;
    destination: string;
    destinationIcon?: string;
  };
  dates: {
    start: string;
    end: string;
    nights: number;
    adults: number;
  };
  status: 'confirmed' | 'pending' | 'cancelled';
  payment: {
    status: 'partial' | 'unpaid' | 'paid' | 'refunded';
    paid: number;
    total: number;
  };
  documents: {
    ready: number;
    total: number;
  };
}

const BookingsPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const bookings: Booking[] = [
    {
      id: '1',
      bookingId: 'BK-2034',
      time: 'Today, 10:23 AM',
      customer: {
        initials: 'SJ',
        name: 'Sarah Jenkins',
        destination: 'Maldives Retreat'
      },
      dates: {
        start: 'Dec 15',
        end: 'Dec 20',
        nights: 5,
        adults: 2
      },
      status: 'confirmed',
      payment: {
        status: 'partial',
        paid: 1200,
        total: 4250
      },
      documents: {
        ready: 2,
        total: 4
      }
    },
    {
      id: '2',
      bookingId: 'BK-2033',
      time: 'Yesterday',
      customer: {
        initials: 'MR',
        name: 'Michael Ross',
        destination: 'Dubai Luxury'
      },
      dates: {
        start: 'Jan 10',
        end: 'Jan 15',
        nights: 5,
        adults: 1
      },
      status: 'pending',
      payment: {
        status: 'unpaid',
        paid: 0,
        total: 2800
      },
      documents: {
        ready: 0,
        total: 3
      }
    },
    {
      id: '3',
      bookingId: 'BK-2030',
      time: 'Oct 20, 2023',
      customer: {
        name: 'Emma Wilson',
        avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/88924b8e13-8b1f1dc079bd6ab468b1.png',
        destination: 'Paris & London'
      },
      dates: {
        start: 'Nov 05',
        end: 'Nov 12',
        nights: 7,
        adults: 2
      },
      status: 'confirmed',
      payment: {
        status: 'paid',
        paid: 5400,
        total: 5400
      },
      documents: {
        ready: 5,
        total: 5
      }
    },
    {
      id: '4',
      bookingId: 'BK-2028',
      time: 'Oct 18, 2023',
      customer: {
        initials: 'JL',
        name: 'James Lee',
        destination: 'Tokyo Adventure'
      },
      dates: {
        start: 'Dec 01',
        end: 'Dec 10',
        nights: 9,
        adults: 4
      },
      status: 'cancelled',
      payment: {
        status: 'refunded',
        paid: 0,
        total: 8200
      },
      documents: {
        ready: 1,
        total: 3
      }
    },
    {
      id: '5',
      bookingId: 'BK-2025',
      time: 'Oct 15, 2023',
      customer: {
        name: 'Robert Chen',
        avatar: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/avatars/avatar-4.jpg',
        destination: 'Bali Honeymoon'
      },
      dates: {
        start: 'Feb 14',
        end: 'Feb 21',
        nights: 7,
        adults: 2
      },
      status: 'confirmed',
      payment: {
        status: 'paid',
        paid: 3800,
        total: 3800
      },
      documents: {
        ready: 3,
        total: 4
      }
    }
  ];

  const getStatusBadge = (status: Booking['status']) => {
    const statusConfig = {
      confirmed: 'bg-green-100 text-green-800 border-green-200',
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      cancelled: 'bg-red-100 text-red-800 border-red-200'
    };
    return statusConfig[status];
  };

  const getPaymentBadge = (payment: Booking['payment']) => {
    const config = {
      partial: {
        bg: 'bg-yellow-50 text-yellow-700 border-yellow-200',
        icon: FaAdjust,
        text: 'Partial'
      },
      unpaid: {
        bg: 'bg-red-50 text-red-700 border-red-200',
        icon: FaTimesCircle,
        text: 'Unpaid'
      },
      paid: {
        bg: 'bg-green-50 text-green-700 border-green-200',
        icon: FaCheckCircle,
        text: 'Paid'
      },
      refunded: {
        bg: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: FaUndo,
        text: 'Refunded'
      }
    };
    return config[payment.status];
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="bg-gray-100 min-h-screen text-gray-800 font-sans antialiased overflow-hidden flex flex-col">
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

        .shadow-soft {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }
      `}</style>
      
      <div className="flex ">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-gray-100 relative">
          {/* Top Bar */}
         

          {/* Content Area (Scrollable) */}
          <main className="flex-1  ">
            {/* KPI Mini-cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {/* Card 1 */}
              <div className="bg-white rounded-xl shadow-soft p-4 flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <FaExclamationCircle className="text-xl" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Upcoming Trips</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-bold text-gray-900">24</h3>
                      <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded flex items-center">
                        <FaArrowUp className="text-[10px] mr-1" /> 12%
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Next 7 days</span>
                </div>
              </div>

              {/* Card 2 */}
              <div className="bg-white rounded-xl shadow-soft p-4 flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-50 rounded-lg flex items-center justify-center text-orange-600">
                    <FaExclamationCircle className="text-xl" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Unconfirmed</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-bold text-gray-900">8</h3>
                      <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded flex items-center">
                        <FaExclamationCircle className="text-[10px] mr-1" /> Action Req
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Needs review</span>
                </div>
              </div>

              {/* Card 3 */}
              <div className="bg-white rounded-xl shadow-soft p-4 flex items-center justify-between border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-teal-50 rounded-lg flex items-center justify-center text-teal-600">
                    <FaMoneyBillWave className="text-xl" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Pending Payments</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-2xl font-bold text-gray-900">$12.5k</h3>
                      <span className="text-xs font-medium text-gray-500 bg-gray-50 px-1.5 py-0.5 rounded">
                        5 invoices
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400">Overdue &gt; 3 days</span>
                </div>
              </div>
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
                    <FaSave /> Save View
                  </button>
                </div>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Booking Status</label>
                  <select className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50">
                    <option>All Statuses</option>
                    <option>Confirmed</option>
                    <option>Pending</option>
                    <option>Cancelled</option>
                    <option>Draft</option>
                  </select>
                </div>
                {/* Date Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Travel Dates</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      className="block w-full pl-9 pr-3 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50" 
                      placeholder="Select dates"
                    />
                    <FaCalendarAlt className="absolute left-3 top-2.5 text-gray-400 text-sm" />
                  </div>
                </div>
                {/* Destination Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Destination</label>
                  <select className="block w-full pl-3 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50">
                    <option>All Destinations</option>
                    <option>Maldives</option>
                    <option>Dubai</option>
                    <option>Europe</option>
                    <option>Bali</option>
                  </select>
                </div>
                {/* Consultant Filter */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Consultant</label>
                  <div className="relative">
                    <select className="block w-full pl-9 pr-10 py-2 text-sm border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 rounded-lg bg-gray-50">
                      <option>All Consultants</option>
                      <option>Alex Morgan</option>
                      <option>Sarah Jenkins</option>
                      <option>Mike Ross</option>
                    </select>
                    <FaUser className="absolute left-3 top-2.5 text-gray-400 text-xs" />
                  </div>
                </div>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">All Bookings</h2>
                  <span className="bg-gray-100 text-gray-600 py-0.5 px-2.5 rounded-full text-xs font-medium">142</span>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button className="flex-1 sm:flex-none inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50">
                    <FaDownload className="mr-2 text-gray-400" /> Export
                  </button>
                  <div className="flex bg-gray-100 p-0.5 rounded-lg">
                    <button className="p-1.5 bg-white rounded shadow-sm text-gray-800">
                      <FaList />
                    </button>
                    <button className="p-1.5 text-gray-500 hover:text-gray-700">
                      <MdOutlineGridOn />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto relative">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-10">
                        <input type="checkbox" className="custom-checkbox" />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
                        Booking ID <FaSort className="ml-1 text-gray-300 inline" />
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
                        Customer / Destination
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700">
                        Dates & Duration
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Payment
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Docs
                      </th>
                      <th scope="col" className="sticky right-0 bg-gray-50 px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {bookings.map((booking) => {
                      const paymentConfig = getPaymentBadge(booking.payment);
                      const PaymentIcon = paymentConfig.icon;
                      
                      return (
                        <tr key={booking.id} className="table-row-hover group transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input type="checkbox" className="custom-checkbox" />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-blue-600 hover:underline cursor-pointer">#{booking.bookingId}</span>
                            <div className="text-xs text-gray-400 mt-0.5">{booking.time}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className={`flex-shrink-0 h-8 w-8 rounded-full ${booking.customer.avatar ? 'overflow-hidden' : ''} ${booking.customer.initials ? 'bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold' : ''} mr-3 border border-gray-200`}>
                                {booking.customer.avatar ? (
                                  <img className="w-full h-full object-cover" src={booking.customer.avatar} alt={booking.customer.name} />
                                ) : (
                                  booking.customer.initials
                                )}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">{booking.customer.name}</div>
                                <div className="text-xs text-gray-500 flex items-center gap-1">
                                  <FaExclamationCircle className="text-gray-400 text-[10px]" /> {booking.customer.destination}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{booking.dates.start} - {booking.dates.end}</div>
                            <div className="text-xs text-gray-500">{booking.dates.nights} Nights • {booking.dates.adults} {booking.dates.adults === 1 ? 'Adult' : 'Adults'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusBadge(booking.status)}`}>
                              {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${paymentConfig.bg}`}>
                              <PaymentIcon className="text-[8px] mr-1.5" /> {paymentConfig.text}
                            </span>
                            <div className="text-[10px] text-gray-400 mt-1">
                              ${booking.payment.paid.toLocaleString()} / ${booking.payment.total.toLocaleString()}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1" title={`${booking.documents.ready}/${booking.documents.total} Documents Ready`}>
                              {Array.from({ length: booking.documents.total }).map((_, index) => (
                                <div 
                                  key={index} 
                                  className={`w-1.5 h-6 rounded-full ${index < booking.documents.ready ? 'bg-green-500' : 'bg-gray-200'}`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="sticky right-0 bg-white group-hover:bg-gray-50 px-6 py-4 whitespace-nowrap text-right text-sm font-medium shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.1)]">
                            <div className="flex items-center justify-end gap-2">
                              <button className="text-gray-400 hover:text-blue-600 p-1" title="View Details">
                                <FaEye />
                              </button>
                              {booking.payment.status === 'unpaid' && (
                                <button className="text-gray-400 hover:text-blue-600 p-1" title="Add Payment">
                                  <FaCreditCard />
                                </button>
                              )}
                              {booking.payment.status === 'partial' && (
                                <button className="text-gray-400 hover:text-blue-600 p-1" title="Send Invoice">
                                  <FaFileInvoiceDollar />
                                </button>
                              )}
                              {booking.payment.status === 'paid' && booking.status === 'confirmed' && (
                                <button className="text-gray-400 hover:text-blue-600 p-1" title="Send Voucher">
                                  <FaExclamationCircle />
                                </button>
                              )}
                              {booking.documents.ready < booking.documents.total && booking.status !== 'cancelled' && (
                                <button className="text-gray-400 hover:text-blue-600 p-1" title="Send Docs">
                                  <FaPaperPlane />
                                </button>
                              )}
                              <button className="text-gray-400 hover:text-gray-600 p-1">
                                <FaEllipsisV />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
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
                      <a href="#" aria-current="page" className="z-10 bg-blue-50 border-blue-500 text-blue-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium">1</a>
                      <a href="#" className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 relative inline-flex items-center px-4 py-2 border text-sm font-medium">2</a>
                      <a href="#" className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hidden md:inline-flex relative items-center px-4 py-2 border text-sm font-medium">3</a>
                      <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>
                      <a href="#" className="bg-white border-gray-300 text-gray-500 hover:bg-gray-50 hidden md:inline-flex relative items-center px-4 py-2 border text-sm font-medium">15</a>
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
      </div>

      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div 
          id="sidebar-backdrop" 
          className="fixed inset-0 bg-gray-900 bg-opacity-50 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default BookingsPage;