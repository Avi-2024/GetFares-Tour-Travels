import React, { useState } from 'react';
import {
  FaPlaneDeparture,
  FaChevronRight,
  FaRegClock,
  FaRegFilePdf,
  FaRegEnvelope,
  FaCheck,
  FaPlusCircle,
  FaPencilAlt,
  FaTrashAlt,
  FaCheckCircle,
  FaTimes,
  FaDesktop,
  FaMobileAlt,
  FaSyncAlt,
  FaHome,
  FaRegCalendarAlt,
  FaDollarSign,
  FaEuroSign
} from 'react-icons/fa';
import { MdOutlineGridOn } from 'react-icons/md';

interface ItineraryItem {
  id: string;
  day: string;
  title: string;
  description?: string;
  image?: string;
  accommodation?: {
    options: string[];
    selected: string;
    roomType: string;
    board: string;
  };
}

interface PricingItem {
  id: string;
  name: string;
  cost: number;
  markup: number;
  price: number;
}

const QuotationBuilderPage: React.FC = () => {
  const [previewVisible, setPreviewVisible] = useState(true);
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('desktop');
  const [currency, setCurrency] = useState('USD');
  const [formData, setFormData] = useState({
    quoteNumber: 'QT-2023-089',
    version: 'v1.2 Draft',
    lastSaved: '2m ago',
    customer: {
      initials: 'SJ',
      name: 'Sarah Jenkins',
      email: 'sarah.j@example.com',
      phone: '+1 (555) 987-6543'
    },
    destination: 'Maldives Retreat',
    dates: {
      start: '2023-12-15',
      nights: 5,
      adults: 2
    },
    validUntil: '2023-11-15',
    requiresDeposit: false,
    inclusions: `- 5 Nights accommodation
- Daily breakfast & dinner
- Roundtrip speedboat transfers
- Welcome drink on arrival`,
    exclusions: `- International flights
- Travel insurance
- Personal expenses
- Tips and gratuities`,
    notes: '',
    company: {
      name: 'TravelCRM',
      address: '123 Travel Lane, Suite 100',
      city: 'New York, NY 10001',
      phone: '+1 (555) 123-4567',
      website: 'www.travelcrm.com',
      email: 'support@travelcrm.com'
    }
  });

  const [itineraryItems, setItineraryItems] = useState<ItineraryItem[]>([
    {
      id: '1',
      day: 'Day 1',
      title: 'Arrival & Transfer',
      description: 'Private speedboat transfer from Velana International Airport to resort.',
      image: 'https://storage.googleapis.com/uxpilot-auth.appspot.com/565f3e17e9-5816e299d3f1d161227a.png'
    },
    {
      id: '2',
      day: 'Day 1-5',
      title: 'Accommodation',
      accommodation: {
        options: [
          'Anantara Veli Maldives Resort - Overwater Bungalow',
          'Sheraton Full Moon Resort'
        ],
        selected: 'Anantara Veli Maldives Resort - Overwater Bungalow',
        roomType: 'Overwater Bungalow',
        board: 'All Inclusive'
      }
    }
  ]);

  const [pricingItems, setPricingItems] = useState<PricingItem[]>([
    { id: '1', name: 'Accommodation', cost: 3200.00, markup: 15, price: 3680.00 },
    { id: '2', name: 'Transfers', cost: 400.00, markup: 10, price: 440.00 },
    { id: '3', name: 'Activities', cost: 120.00, markup: 8.3, price: 130.00 }
  ]);

  const subtotal = pricingItems.reduce((sum, item) => sum + item.price, 0);
  const taxes = subtotal * 0.1; // 10% tax
  const grandTotal = subtotal;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const calculateEndDate = () => {
    const start = new Date(formData.dates.start);
    const end = new Date(start);
    end.setDate(end.getDate() + formData.dates.nights);
    return end;
  };

  const togglePreview = () => {
    setPreviewVisible(!previewVisible);
  };

  return (
    <div className="bg-gray-100 h-screen text-gray-800 font-sans antialiased overflow-hidden">
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
        
        .transition-all {
          transition-property: all;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
          transition-duration: 200ms;
        }
        
        .a4-ratio {
          aspect-ratio: 210/297;
        }

        .shadow-soft {
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
        }

        .shadow-preview {
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
      `}</style>

      {/* Main Content Area */}
      <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
        {/* Top Bar */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 z-10">
          {/* Breadcrumbs & Title */}
          <div className="flex items-center flex-1 gap-4">
            <nav className="hidden md:flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <a href="#" className="text-gray-400 hover:text-gray-500">
                    <FaHome className="text-sm" />
                  </a>
                </li>
                <li>
                  <div className="flex items-center">
                    <FaChevronRight className="text-gray-300 text-xs mx-2" />
                    <a href="#" className="text-gray-400 hover:text-gray-500 text-sm font-medium">Quotations</a>
                  </div>
                </li>
                <li>
                  <div className="flex items-center">
                    <FaChevronRight className="text-gray-300 text-xs mx-2" />
                    <span className="text-sm font-medium text-gray-900">Builder: {formData.quoteNumber}</span>
                  </div>
                </li>
              </ol>
            </nav>
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
              {formData.version}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <FaRegClock /> Saved {formData.lastSaved}
            </span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3 ml-auto">
            <button className="hidden sm:inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <FaRegFilePdf className="mr-2 text-red-500" /> Download
            </button>
            <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <FaRegEnvelope className="mr-2" /> Send
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              <FaCheck className="mr-2" /> Save Quote
            </button>
          </div>
        </header>

        {/* Split Pane Content */}
        <main className="flex-1 flex overflow-hidden">
          {/* Left Pane: Builder (Scrollable) */}
          <div className={`${previewVisible ? 'w-full lg:w-1/2 xl:w-5/12' : 'w-full'} overflow-y-auto p-4 md:p-6 bg-gray-50 border-r border-gray-200 custom-scrollbar`}>
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Client & Trip Info Card */}
              <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Trip Details</h3>
                  <button className="text-blue-600 text-xs font-medium hover:text-blue-800">Edit Lead</button>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Customer</label>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-xs">
                        {formData.customer.initials}
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formData.customer.name}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Destination</label>
                    <span className="text-sm font-medium text-gray-900">{formData.destination}</span>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Dates</label>
                    <input 
                      type="date" 
                      className="form-input block w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                      value={formData.dates.start}
                      onChange={(e) => setFormData({
                        ...formData, 
                        dates: {...formData.dates, start: e.target.value}
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Duration</label>
                    <div className="flex items-center">
                      <input 
                        type="number" 
                        className="form-input block w-16 px-2 py-1.5 text-sm border border-gray-300 rounded-l-md shadow-sm focus:ring-blue-500 focus:border-blue-500" 
                        value={formData.dates.nights}
                        onChange={(e) => setFormData({
                          ...formData, 
                          dates: {...formData.dates, nights: parseInt(e.target.value) || 0}
                        })}
                      />
                      <span className="inline-flex items-center px-3 py-1.5 rounded-r-md border border-l-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">Nights</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itinerary Builder Card */}
              <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Itinerary Items</h3>
                  <button className="text-blue-600 text-xs font-medium hover:text-blue-800 flex items-center gap-1">
                    <FaPlusCircle /> Add Item
                  </button>
                </div>
                <div className="p-4 space-y-4">
                  {itineraryItems.map((item) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-3 hover:border-blue-300 transition-colors group bg-white">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded">{item.day}</span>
                          <h4 className="text-sm font-medium text-gray-900">{item.title}</h4>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-gray-400 hover:text-blue-600"><FaPencilAlt className="text-xs" /></button>
                          <button className="text-gray-400 hover:text-red-600"><FaTrashAlt className="text-xs" /></button>
                        </div>
                      </div>
                      
                      {item.description && (
                        <p className="text-xs text-gray-500 mb-2">{item.description}</p>
                      )}
                      
                      {item.image && (
                        <div className="flex gap-2">
                          <div className="w-16 h-12 bg-gray-200 rounded overflow-hidden">
                            <img className="w-full h-full object-cover" src={item.image} alt={item.title} />
                          </div>
                        </div>
                      )}
                      
                      {item.accommodation && (
                        <div className="grid grid-cols-1 gap-2">
                          <select className="form-input block w-full pl-3 pr-10 py-1.5 text-xs border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md">
                            {item.accommodation.options.map((option, idx) => (
                              <option key={idx} selected={option === item.accommodation?.selected}>
                                {option}
                              </option>
                            ))}
                          </select>
                          <div className="flex gap-2 mt-1">
                            <input 
                              type="text" 
                              placeholder="Room Type" 
                              className="form-input block w-1/2 text-xs border-gray-300 rounded-md" 
                              value={item.accommodation.roomType}
                              onChange={(e) => {
                                // Handle room type change
                              }}
                            />
                            <select className="form-input block w-1/2 text-xs border-gray-300 rounded-md">
                              <option>All Inclusive</option>
                              <option>Half Board</option>
                              <option>Bed & Breakfast</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pricing Breakdown Card */}
              <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="text-sm font-semibold text-gray-900">Pricing Breakdown</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Currency:</span>
                    <select 
                      className="form-input py-0 pl-2 pr-6 border-transparent bg-transparent text-xs font-medium text-gray-700 focus:ring-0"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                    >
                      <option>USD ($)</option>
                      <option>EUR (€)</option>
                    </select>
                  </div>
                </div>
                <div className="p-4">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 mb-4">
                      <thead>
                        <tr>
                          <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 whitespace-nowrap">Item</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 whitespace-nowrap">Cost</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 whitespace-nowrap">Markup</th>
                          <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider pb-2 whitespace-nowrap">Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pricingItems.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 text-sm text-gray-900">{item.name}</td>
                            <td className="py-2 text-right text-sm text-gray-500">{formatCurrency(item.cost)}</td>
                            <td className="py-2 text-right text-sm text-green-600">{item.markup}%</td>
                            <td className="py-2 text-right text-sm font-medium text-gray-900">{formatCurrency(item.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Taxes & Fees (Included)</span>
                      <span>{formatCurrency(taxes)}</span>
                    </div>
                    <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                      <span className="text-sm font-bold text-gray-900">Grand Total</span>
                      <span className="text-lg font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Inclusions & Exclusions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100 bg-green-50 flex items-center gap-2">
                    <FaCheck className="text-green-600 text-xs" />
                    <h3 className="text-sm font-semibold text-gray-900">Inclusions</h3>
                  </div>
                  <div className="p-3">
                    <textarea 
                      className="form-input w-full text-xs border-gray-300 rounded-md h-24 resize-none" 
                      placeholder="List what's included..."
                      value={formData.inclusions}
                      onChange={(e) => setFormData({...formData, inclusions: e.target.value})}
                    />
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
                  <div className="px-4 py-2 border-b border-gray-100 bg-red-50 flex items-center gap-2">
                    <FaTimes className="text-red-500 text-xs" />
                    <h3 className="text-sm font-semibold text-gray-900">Exclusions</h3>
                  </div>
                  <div className="p-3">
                    <textarea 
                      className="form-input w-full text-xs border-gray-300 rounded-md h-24 resize-none" 
                      placeholder="List what's not included..."
                      value={formData.exclusions}
                      onChange={(e) => setFormData({...formData, exclusions: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Notes & Validity */}
              <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden">
                <div className="p-4 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Terms & Notes</label>
                    <textarea 
                      className="form-input w-full text-xs border-gray-300 rounded-md h-20" 
                      placeholder="Add any special terms or notes for the customer..."
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-gray-700 mb-1">Quote Validity</label>
                      <input 
                        type="date" 
                        className="form-input w-full text-xs border-gray-300 rounded-md" 
                        value={formData.validUntil}
                        onChange={(e) => setFormData({...formData, validUntil: e.target.value})}
                      />
                    </div>
                    <div className="flex items-center mt-5">
                      <input 
                        id="deposit-req" 
                        type="checkbox" 
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        checked={formData.requiresDeposit}
                        onChange={(e) => setFormData({...formData, requiresDeposit: e.target.checked})}
                      />
                      <label htmlFor="deposit-req" className="ml-2 block text-xs text-gray-900">Require Deposit</label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Bottom spacing for scroll */}
            <div className="h-12"></div>
          </div>

          {/* Right Pane: Live Preview */}
          {previewVisible && (
            <div className="hidden lg:flex lg:w-1/2 xl:w-7/12 bg-gray-200 p-4 md:p-8 items-start justify-center overflow-y-auto custom-scrollbar relative">
              
              {/* Preview Toolbar (Floating) */}
              <div className="sticky top-0 lg:absolute lg:top-4 left-1/2 transform lg:-translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg z-10 flex items-center gap-4 text-xs opacity-90 hover:opacity-100 transition-opacity mb-4 lg:mb-0">
                <button 
                  className={`hover:text-blue-300 hidden sm:inline-block ${previewMode === 'desktop' ? 'text-blue-300' : ''}`}
                  onClick={() => setPreviewMode('desktop')}
                >
                  <FaDesktop className="mr-1 inline" /> Desktop
                </button>
                <button 
                  className={`text-gray-400 hover:text-blue-300 hidden sm:inline-block ${previewMode === 'mobile' ? 'text-blue-300' : ''}`}
                  onClick={() => setPreviewMode('mobile')}
                >
                  <FaMobileAlt className="mr-1 inline" /> Mobile
                </button>
                <button className="lg:hidden text-white font-bold" onClick={togglePreview}>Close Preview</button>
                <div className="w-px h-4 bg-gray-600 hidden sm:block"></div>
                <button className="hover:text-blue-300"><FaSyncAlt className="mr-1 inline" /> Refresh</button>
              </div>

              {/* The PDF / Quote Document */}
              <div className={`bg-white w-full max-w-[210mm] min-h-[297mm] shadow-preview rounded-sm p-4 md:p-8 relative mx-auto transform scale-95 origin-top ${previewMode === 'mobile' ? 'max-w-[100mm]' : ''}`}>
                
                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm">
                        <FaPlaneDeparture />
                      </div>
                      <span className="text-xl font-bold text-gray-900">{formData.company.name}</span>
                    </div>
                    <p className="text-xs text-gray-500">{formData.company.address}<br />{formData.company.city}<br />{formData.company.phone}</p>
                  </div>
                  <div className="text-right">
                    <h1 className="text-2xl font-bold text-blue-600 mb-1">QUOTATION</h1>
                    <p className="text-sm text-gray-500 font-medium">#{formData.quoteNumber}</p>
                    <p className="text-xs text-gray-400 mt-1">Date: {formatDate(formData.dates.start)}</p>
                    <p className="text-xs text-gray-400">Valid Until: {formatDate(formData.validUntil)}</p>
                  </div>
                </div>

                {/* Client Info */}
                <div className="flex justify-between mb-8">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Prepared For</h3>
                    <p className="text-sm font-bold text-gray-900">{formData.customer.name}</p>
                    <p className="text-xs text-gray-600">{formData.customer.email}</p>
                    <p className="text-xs text-gray-600">{formData.customer.phone}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Trip Summary</h3>
                    <p className="text-sm font-medium text-gray-900">{formData.destination}</p>
                    <p className="text-xs text-gray-600">{formData.dates.nights} Nights • {formData.dates.adults} Adults</p>
                    <p className="text-xs text-gray-600">
                      {formatDate(formData.dates.start)} - {formatDate(calculateEndDate().toISOString().split('T')[0])}
                    </p>
                  </div>
                </div>

                {/* Hero Image */}
                <div className="w-full h-32 md:h-48 bg-gray-100 rounded-lg mb-8 overflow-hidden relative">
                  <img className="w-full h-full object-cover" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/0e4a495924-c31cf40a60f48d48c538.png" alt="luxury Maldives overwater villas" />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                    <h2 className="text-white font-bold text-sm md:text-lg">Your Dream Vacation to {formData.destination}</h2>
                  </div>
                </div>

                {/* Itinerary */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 border-b-2 border-blue-600 inline-block pb-1 mb-4">Itinerary</h3>
                  
                  <div className="relative border-l-2 border-gray-200 ml-3 space-y-6 pb-2">
                    {itineraryItems.map((item, index) => (
                      <div key={item.id} className="ml-6 relative">
                        <div className={`absolute -left-[31px] top-0 w-4 h-4 rounded-full ${index === 0 ? 'bg-blue-600' : 'bg-blue-400'} border-2 border-white shadow-sm`}></div>
                        <h4 className="text-sm font-bold text-gray-900">{item.day}: {item.title}</h4>
                        {item.description && (
                          <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                        )}
                        {item.accommodation && (
                          <>
                            <p className="text-xs text-gray-600 mt-1">Enjoy {formData.dates.nights} nights in a luxurious {item.accommodation.roomType} with direct lagoon access. {item.accommodation.board} package includes meals and select beverages.</p>
                            <div className="mt-2 flex gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">Wifi Included</span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-800">Spa Credit</span>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Pricing Table */}
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 border-b-2 border-blue-600 inline-block pb-1 mb-4">Pricing Details</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse min-w-[400px]">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200">
                          <th className="text-left py-2 px-3 text-xs font-semibold text-gray-600">Description</th>
                          <th className="text-right py-2 px-3 text-xs font-semibold text-gray-600">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricingItems.map((item) => (
                          <tr key={item.id} className="border-b border-gray-100">
                            <td className="py-2 px-3 text-xs text-gray-800">
                              {item.name} {item.name === 'Accommodation' ? `(${formData.dates.nights} Nights)` : ''}
                            </td>
                            <td className="text-right py-2 px-3 text-xs text-gray-800">{formatCurrency(item.price)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr>
                          <td className="pt-3 px-3 text-right text-sm font-bold text-gray-900">Total Price</td>
                          <td className="pt-3 px-3 text-right text-xl font-bold text-blue-600">{formatCurrency(grandTotal)}</td>
                        </tr>
                        <tr>
                          <td colSpan={2} className="px-3 text-right text-[10px] text-gray-400 italic">Includes all applicable taxes and fees</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-8 border-t border-gray-200 text-center">
                  <p className="text-xs text-gray-500 mb-2">Thank you for choosing {formData.company.name}. We look forward to creating memories with you.</p>
                  <div className="flex justify-center gap-4 text-[10px] text-gray-400">
                    <span>{formData.company.website}</span>
                    <span>•</span>
                    <span>{formData.company.email}</span>
                  </div>
                </div>

                {/* Validation Badge (Overlay) */}
                <div className="absolute top-0 right-0 m-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200 shadow-sm transform rotate-3">
                    <FaCheckCircle className="mr-1.5" /> Validated
                  </span>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default QuotationBuilderPage;