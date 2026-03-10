import React, { useState } from 'react';
import { 
  FaUser, 
//   FaSearch, 
  FaEnvelope, 
  FaPhone, 
  FaPlane, 
  FaDollarSign, 
  FaBullhorn, 
  FaRegClipboard, 
  FaCircleInfo, 
  FaRegFloppyDisk,
  FaArrowRight,
  FaRegClock,
  FaAsterisk
} from 'react-icons/fa6';


const CreateLead: React.FC = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    location: '',
    destination: '',
    startDate: '',
    duration: '',
    adults: '2',
    children: '0',
    tripType: 'Leisure',
    budgetRange: '',
    budgetFlexible: false,
    leadSource: 'Website',
    consultant: 'Alex Morgan',
    requirements: {
      fiveStar: false,
      allInclusive: true,
      flightIncluded: false,
      airportTransfer: false
    },
    internalNotes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { id, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleRequirementChange = (req: string) => {
    setFormData(prev => ({
      ...prev,
      requirements: {
        ...prev.requirements,
        [req]: !prev.requirements[req as keyof typeof prev.requirements]
      }
    }));
  };

  return (
    <>
     

      <style jsx global>{`
        body {
          font-family: 'Inter', sans-serif;
          background-color: #f3f4f6;
        }
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
        .sticky-footer-wrapper {
          position: sticky;
          bottom: 0;
          z-index: 20;
        }
        .has-\\[:checked\\]:bg-blue-50:has(:checked) {
          background-color: #eff6ff;
        }
        .has-\\[:checked\\]:border-blue-200:has(:checked) {
          border-color: #bfdbfe;
        }
        .has-\\[:checked\\]:text-blue-700:has(:checked) {
          color: #1d4ed8;
        }
      `}</style>

      <div className="flex  bg-gray-100">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col bg-gray-100 relative">
          {/* Scrollable Form Content */}
          <main className="flex-1  pb-24">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Main Form Column */}
                <div className="flex-1 space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">Create New Lead</h1>
                      <p className="text-sm text-gray-500 mt-1">Fill in the details below to create a new potential opportunity.</p>
                    </div>
                  </div>

                  {/* Section 1: Customer Information */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden" id="customer-info">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                          <FaUser />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">Customer Information</h3>
                      </div>
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                        <FaPhone className="mr-1 inline" /> Existing Customer?
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* First Name */}
                        <div>
                          <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                            First Name <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            id="firstName" 
                            value={formData.firstName}
                            onChange={handleInputChange}
                            className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 px-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                            placeholder="e.g. Sarah"
                          />
                        </div>
                        {/* Last Name */}
                        <div>
                          <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                            Last Name <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            id="lastName" 
                            value={formData.lastName}
                            onChange={handleInputChange}
                            className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 px-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                            placeholder="e.g. Connor"
                          />
                        </div>
                        {/* Email */}
                        <div>
                          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                            Email Address <span className="text-red-500">*</span>
                          </label>
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaEnvelope className="text-gray-400 text-sm" />
                            </div>
                            <input 
                              type="email" 
                              id="email" 
                              value={formData.email}
                              onChange={handleInputChange}
                              className="form-input block w-full pl-10 rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                              placeholder="sarah@example.com"
                            />
                          </div>
                        </div>
                        {/* Phone */}
                        <div>
                          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="relative rounded-md shadow-sm">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <FaPhone className="text-gray-400 text-sm" />
                            </div>
                            <input 
                              type="tel" 
                              id="phone" 
                              value={formData.phone}
                              onChange={handleInputChange}
                              className="form-input block w-full pl-10 rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                              placeholder="+1 (555) 000-0000"
                            />
                          </div>
                        </div>
                        {/* Location */}
                        <div className="md:col-span-2">
                          <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location / Address</label>
                          <input 
                            type="text" 
                            id="location" 
                            value={formData.location}
                            onChange={handleInputChange}
                            className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 px-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                            placeholder="City, State, Country"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 2: Trip Details */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden" id="trip-details">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                        <FaPlane />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Trip Details</h3>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Destination */}
                        <div className="md:col-span-2">
                          <label htmlFor="destination" className="block text-sm font-medium text-gray-700 mb-1">
                            Destination(s) <span className="text-red-500">*</span>
                          </label>
                          <input 
                            type="text" 
                            id="destination" 
                            value={formData.destination}
                            onChange={handleInputChange}
                            className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 px-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                            placeholder="e.g. Maldives, Paris, Tokyo"
                          />
                          <p className="mt-1 text-xs text-gray-500">Separate multiple destinations with commas.</p>
                        </div>
                        {/* Start Date */}
                        <div>
                          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Preferred Start Date</label>
                          <input 
                            type="date" 
                            id="startDate" 
                            value={formData.startDate}
                            onChange={handleInputChange}
                            className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 px-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                        {/* Duration */}
                        <div>
                          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">Duration (Days)</label>
                          <select 
                            id="duration" 
                            value={formData.duration}
                            onChange={handleInputChange}
                            className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 px-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select duration...</option>
                            <option value="1-3">1-3 Days</option>
                            <option value="4-7">4-7 Days</option>
                            <option value="8-14">8-14 Days</option>
                            <option value="15+">15+ Days</option>
                          </select>
                        </div>
                        {/* Travelers */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Travelers</label>
                          <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                              <label htmlFor="adults" className="sr-only">Adults</label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xs pointer-events-none">Adults</span>
                                <input 
                                  type="number" 
                                  id="adults" 
                                  min="1" 
                                  value={formData.adults}
                                  onChange={handleInputChange}
                                  className="form-input block w-full pl-14 rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <div className="flex-1">
                              <label htmlFor="children" className="sr-only">Children</label>
                              <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 text-xs pointer-events-none">Kids</span>
                                <input 
                                  type="number" 
                                  id="children" 
                                  min="0" 
                                  value={formData.children}
                                  onChange={handleInputChange}
                                  className="form-input block w-full pl-12 rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* Trip Type */}
                        <div>
                          <label htmlFor="tripType" className="block text-sm font-medium text-gray-700 mb-1">Trip Type</label>
                          <select 
                            id="tripType" 
                            value={formData.tripType}
                            onChange={handleInputChange}
                            className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 px-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="Leisure">Leisure / Vacation</option>
                            <option value="Business">Business</option>
                            <option value="Honeymoon">Honeymoon</option>
                            <option value="Family">Family Reunion</option>
                            <option value="Adventure">Adventure</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 3: Budget & Preferences */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Budget */}
                    <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden" id="budget-section">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                          <FaDollarSign />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">Budget</h3>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label htmlFor="budgetRange" className="block text-sm font-medium text-gray-700 mb-1">Budget Range (USD)</label>
                          <select 
                            id="budgetRange" 
                            value={formData.budgetRange}
                            onChange={handleInputChange}
                            className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 px-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="">Select budget range...</option>
                            <option value="under-1000">Under $1,000</option>
                            <option value="1000-3000">$1,000 - $3,000</option>
                            <option value="3000-5000">$3,000 - $5,000</option>
                            <option value="5000-10000">$5,000 - $10,000</option>
                            <option value="10000+">$10,000+</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <input 
                            type="checkbox" 
                            id="budgetFlexible" 
                            checked={formData.budgetFlexible}
                            onChange={handleInputChange}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <label htmlFor="budgetFlexible" className="text-sm text-gray-700">Client is flexible with budget</label>
                        </div>
                      </div>
                    </div>

                    {/* Source */}
                    <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden" id="source-section">
                      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                          <FaBullhorn />
                        </div>
                        <h3 className="text-base font-semibold text-gray-900">Source & Assignee</h3>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                          <label htmlFor="leadSource" className="block text-sm font-medium text-gray-700 mb-1">Lead Source</label>
                          <select 
                            id="leadSource" 
                            value={formData.leadSource}
                            onChange={handleInputChange}
                            className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm py-2.5 px-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                          >
                            <option value="Website">Website Form</option>
                            <option value="Phone">Phone Inquiry</option>
                            <option value="Referral">Referral</option>
                            <option value="Social">Social Media</option>
                            <option value="WalkIn">Walk-in</option>
                          </select>
                        </div>
                        <div>
                          <label htmlFor="consultant" className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                          <div className="flex items-center gap-2 p-2 border border-gray-300 rounded-lg bg-white">
                            <img 
                              className="w-6 h-6 rounded-full object-cover" 
                              src="https://storage.googleapis.com/uxpilot-auth.appspot.com/d50af26010-b1657b63bd21c5ed7ccc.png" 
                              alt="professional avatar of a male travel consultant, minimalist" 
                            />
                            <span className="text-sm text-gray-700 flex-1">{formData.consultant} (Me)</span>
                            <button className="text-xs text-blue-600 font-medium hover:underline">Change</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section 4: Notes & Requirements */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden" id="notes-section">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-600">
                        <FaRegClipboard />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900">Requirements & Notes</h3>
                    </div>
                    <div className="p-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Specific Requirements</label>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <label className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                            formData.requirements.fiveStar
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="sr-only"
                              checked={formData.requirements.fiveStar}
                              onChange={() => handleRequirementChange('fiveStar')}
                            />
                            <span>5-Star Hotel</span>
                          </label>
                          <label className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                            formData.requirements.allInclusive
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="sr-only"
                              checked={formData.requirements.allInclusive}
                              onChange={() => handleRequirementChange('allInclusive')}
                            />
                            <span>All Inclusive</span>
                          </label>
                          <label className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                            formData.requirements.flightIncluded
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="sr-only"
                              checked={formData.requirements.flightIncluded}
                              onChange={() => handleRequirementChange('flightIncluded')}
                            />
                            <span>Flight Included</span>
                          </label>
                          <label className={`inline-flex items-center px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                            formData.requirements.airportTransfer
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                          }`}>
                            <input 
                              type="checkbox" 
                              className="sr-only"
                              checked={formData.requirements.airportTransfer}
                              onChange={() => handleRequirementChange('airportTransfer')}
                            />
                            <span>Airport Transfer</span>
                          </label>
                        </div>
                      </div>
                      <div>
                        <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                        <textarea 
                          id="internalNotes" 
                          rows={4} 
                          value={formData.internalNotes}
                          onChange={handleInputChange}
                          className="form-input block w-full rounded-lg border-gray-300 shadow-input sm:text-sm p-3 border transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500" 
                          placeholder="Add any specific details from the initial conversation..."
                        ></textarea>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Summary Column (Sticky on Desktop) */}
                <div className="lg:w-80 space-y-6">
                  {/* Summary Card */}
                  <div className="bg-white rounded-xl shadow-soft border border-gray-200 overflow-hidden sticky top-6">
                    <div className="p-5 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Lead Summary</h3>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Status</span>
                        <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                          New
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">Created</span>
                        <span className="text-sm font-medium text-gray-900">Just now</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500">SLA Timer</span>
                        <span className="text-sm font-medium text-orange-600 flex items-center gap-1">
                          <FaRegClock /> Starts on save
                        </span>
                      </div>
                      
                      <div className="border-t border-gray-100 pt-4 mt-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-3">Completeness</h4>
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: '45%' }}></div>
                        </div>
                        <p className="text-xs text-gray-500 text-right">45% Completed</p>
                      </div>

                      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700 flex gap-2 items-start mt-2">
                        <FaCircleInfo className="mt-0.5" />
                        <p>Remember to capture email address for automated welcome sequence.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* Sticky Footer Actions */}
          <div className="sticky-footer-wrapper bg-white border-t border-gray-200 px-4 py-4 md:px-8 shadow-sticky-footer">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-sm text-gray-500 hidden sm:block">
                <FaAsterisk className="text-red-500 text-xs inline mr-1" /> Required fields must be filled
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <button className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-700 font-medium text-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 transition-colors shadow-sm">
                  Cancel
                </button>
                <button className="w-full sm:w-auto px-5 py-2.5 rounded-lg border border-teal-600 bg-white text-teal-700 font-medium text-sm hover:bg-teal-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors shadow-sm flex items-center justify-center gap-2">
                  <FaRegFloppyDisk /> Save as Draft
                </button>
                <button className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-blue-600 text-white font-medium text-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-md flex items-center justify-center gap-2">
                  Create Lead <FaArrowRight />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CreateLead;