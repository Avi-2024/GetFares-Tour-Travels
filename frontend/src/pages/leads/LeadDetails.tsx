import React from 'react';

const LeadDetails: React.FC = () => {
  return (
    <main className="flex-1 overflow-y-auto  bg-gray-100">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-lg font-bold border border-blue-200">
              SC
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Sarah Connor</h1>
                <span className="px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                  New Lead
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                <span className="flex items-center gap-1"><i className="fa-regular fa-id-card"></i> #LD-2023-001</span>
                <span className="flex items-center gap-1"><i className="fa-solid fa-globe"></i> Website</span>
                <span className="flex items-center gap-1"><i className="fa-regular fa-clock"></i> Created 2h ago</span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
              <i className="fa-solid fa-user-plus text-gray-400"></i> Assign
            </button>
            <button className="w-full sm:w-auto bg-white hover:bg-gray-50 text-red-600 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
              <i className="fa-solid fa-ban"></i> Mark Lost
            </button>
            <button className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
              <i className="fa-solid fa-file-invoice-dollar text-gray-400"></i> Create Quote
            </button>
            <button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors flex items-center justify-center gap-2">
              <i className="fa-solid fa-check"></i> Convert to Booking
            </button>
          </div>
        </div>

        {/* Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Lead Profile */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Contact Info Card */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Contact Details</h3>
                <button className="text-blue-600 hover:text-blue-700 text-xs font-medium">Edit</button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
                    <i className="fa-regular fa-envelope"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Email Address</p>
                    <a href="mailto:sarah.c@gmail.com" className="text-sm font-medium text-blue-600 hover:underline">sarah.c@gmail.com</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-500 shrink-0">
                    <i className="fa-solid fa-phone"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Phone Number</p>
                    <a href="tel:+15551234567" className="text-sm font-medium text-gray-900 hover:text-blue-600">+1 (555) 123-4567</a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-500 shrink-0">
                    <i className="fa-solid fa-location-dot"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="text-sm font-medium text-gray-900">San Francisco, CA, USA</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="mt-1 w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
                    <i className="fa-regular fa-building"></i>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500">Company</p>
                    <p className="text-sm font-medium text-gray-900">Tech Solutions Inc.</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Trip Intent Card */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Trip Intent</h3>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Destination</p>
                    <div className="flex items-center gap-2">
                      <img src="https://flagcdn.com/w20/mv.png" className="rounded-sm w-5" alt="Maldives" />
                      <span className="text-sm font-medium text-gray-900">Maldives</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Trip Type</p>
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-900">
                      <i className="fa-solid fa-umbrella-beach text-blue-400"></i> Leisure
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Travelers</p>
                    <p className="text-sm font-medium text-gray-900">2 Adults</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Budget</p>
                    <p className="text-sm font-medium text-gray-900">$5,000 - $7,000</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">Preferred Dates</p>
                  <div className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <i className="fa-regular fa-calendar text-gray-400"></i>
                    <span>Dec 15, 2023</span>
                    <i className="fa-solid fa-arrow-right text-gray-300 text-xs"></i>
                    <span>Dec 22, 2023</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Requirements</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">Overwater Villa</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">All Inclusive</span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">Seaplane Transfer</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Priority & Tags */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Status & Tags</h3>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-2">Priority Level</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 w-3/4 rounded-full"></div>
                    </div>
                    <span className="text-xs font-bold text-red-600">High</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Source</p>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                    <i className="fa-brands fa-facebook"></i> Facebook Ad
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded text-xs border border-purple-100">#Honeymoon</span>
                    <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs border border-yellow-100">#Luxury</span>
                    <button className="text-xs text-gray-400 hover:text-blue-600 border border-dashed border-gray-300 rounded px-2 py-1 hover:border-blue-300 transition-colors">
                      <i className="fa-solid fa-plus"></i> Add
                    </button>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Tabs & Content */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Tabs Navigation */}
            <div className="bg-white rounded-xl shadow-soft border border-gray-100">
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="-mb-px flex min-w-max sm:min-w-0" aria-label="Tabs">
                  <a href="#" className="border-blue-500 text-blue-600 flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 whitespace-nowrap">
                    <i className="fa-solid fa-table-columns"></i> Overview
                  </a>
                  <a href="#" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 group whitespace-nowrap">
                    <i className="fa-solid fa-list-check group-hover:text-gray-600"></i> Follow-ups
                    <span className="bg-red-100 text-red-600 py-0.5 px-2 rounded-full text-xs ml-1">2</span>
                  </a>
                  <a href="#" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 group whitespace-nowrap">
                    <i className="fa-solid fa-file-invoice-dollar group-hover:text-gray-600"></i> Quotations
                  </a>
                  <a href="#" className="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 flex-1 py-4 px-4 text-center border-b-2 font-medium text-sm flex items-center justify-center gap-2 group whitespace-nowrap">
                    <i className="fa-solid fa-folder-open group-hover:text-gray-600"></i> Documents
                  </a>
                </nav>
              </div>

              {/* Follow-up Scheduler */}
              <div className="p-5 border-b border-gray-100 bg-blue-50/50">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Schedule Next Action</h4>
                <div className="flex flex-col md:flex-row gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fa-solid fa-calendar text-gray-400"></i>
                    </div>
                    <input type="date" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white" defaultValue="2023-11-15" />
                  </div>
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <i className="fa-regular fa-clock text-gray-400"></i>
                    </div>
                    <input type="time" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white" defaultValue="10:00" />
                  </div>
                  <div className="flex-1">
                    <select className="block w-full py-2 px-3 border border-gray-300 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 bg-white">
                      <option>Call</option>
                      <option>Email</option>
                      <option>Meeting</option>
                      <option>WhatsApp</option>
                    </select>
                  </div>
                  <button className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium shadow-sm transition-colors whitespace-nowrap">
                    Schedule
                  </button>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="p-5">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-base font-semibold text-gray-900">Activity Timeline</h3>
                  <div className="flex gap-2">
                    <button className="text-xs font-medium text-gray-500 hover:text-blue-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">All</button>
                    <button className="text-xs font-medium text-gray-500 hover:text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-transparent hover:bg-gray-50">Notes</button>
                    <button className="text-xs font-medium text-gray-500 hover:text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-transparent hover:bg-gray-50">Calls</button>
                    <button className="text-xs font-medium text-gray-500 hover:text-blue-600 bg-white px-3 py-1.5 rounded-lg border border-transparent hover:bg-gray-50">Emails</button>
                  </div>
                </div>

                <div className="relative pl-4 space-y-8">
                  
                  {/* Timeline Item 1 */}
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-blue-100 border-2 border-white shadow-sm flex items-center justify-center z-10">
                      <i className="fa-solid fa-phone text-blue-600 text-xs"></i>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">Outbound Call</span>
                          <span className="text-xs text-gray-500">• Alex Morgan</span>
                        </div>
                        <span className="text-xs text-gray-400">Today, 10:30 AM</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Spoke with Sarah regarding her Maldives trip. She is interested in the overwater villa options at Constance Moofushi. Budget is flexible if the value is right.
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 text-green-700 text-xs border border-green-100">
                          <i className="fa-solid fa-check"></i> Connected
                        </span>
                        <span className="text-xs text-gray-500">Duration: 12m 45s</span>
                        <button className="text-blue-600 hover:text-blue-800 text-xs font-medium ml-auto flex items-center gap-1">
                          <i className="fa-solid fa-play"></i> Play Recording
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Item 2 */}
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-purple-100 border-2 border-white shadow-sm flex items-center justify-center z-10">
                      <i className="fa-regular fa-envelope text-purple-600 text-xs"></i>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">Email Sent</span>
                          <span className="text-xs text-gray-500">• System Automation</span>
                        </div>
                        <span className="text-xs text-gray-400">Yesterday, 4:15 PM</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Sent "Welcome to TravelCRM - Maldives Packages" brochure.
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                          <i className="fa-regular fa-file-pdf text-red-500 text-sm"></i>
                          <span className="text-xs text-gray-700">Maldives_Brochure_2023.pdf</span>
                        </div>
                        <span className="text-xs text-blue-600 ml-2 font-medium">Opened 2 times</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline Item 3 */}
                  <div className="relative pl-8">
                    <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-yellow-100 border-2 border-white shadow-sm flex items-center justify-center z-10">
                      <i className="fa-regular fa-sticky-note text-yellow-600 text-xs"></i>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900 text-sm">Note Added</span>
                          <span className="text-xs text-gray-500">• Alex Morgan</span>
                        </div>
                        <span className="text-xs text-gray-400">Yesterday, 2:00 PM</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Lead assigned from Facebook Campaign "Summer 2024". High intent signal based on quiz responses.
                      </p>
                    </div>
                  </div>

                </div>
                
                <div className="pl-12 mt-4">
                  <button className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg border border-dashed border-gray-300 transition-colors">
                    View older activity
                  </button>
                </div>
              </div>
              
              {/* Add Note Area */}
              <div className="p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden hidden sm:block">
                    <img className="w-full h-full object-cover" src="https://storage.googleapis.com/uxpilot-auth.appspot.com/013bd61f6c-7cfc8ff786c8a45d91bf.png" alt="User" />
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <textarea rows={2} className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border" placeholder="Add a note, log a call, or send an email..."></textarea>
                      <div className="absolute bottom-2 right-2 flex gap-2">
                        <button className="text-gray-400 hover:text-gray-600"><i className="fa-solid fa-paperclip"></i></button>
                        <button className="text-gray-400 hover:text-gray-600"><i className="fa-regular fa-face-smile"></i></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex gap-2">
                        <button className="text-xs font-medium px-2 py-1 rounded bg-yellow-100 text-yellow-700 hover:bg-yellow-200">Note</button>
                        <button className="text-xs font-medium px-2 py-1 rounded bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">Email</button>
                        <button className="text-xs font-medium px-2 py-1 rounded bg-white text-gray-600 border border-gray-200 hover:bg-gray-50">SMS</button>
                      </div>
                      <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-xs font-medium shadow-sm transition-colors">
                        Save Note
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Related Items Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Recent Quotations */}
              <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Quotations</h3>
                  <button className="text-blue-600 hover:text-blue-700 text-xs font-medium"><i className="fa-solid fa-plus"></i> New</button>
                </div>
                
                {/* Quote List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold">
                        Q1
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">Maldives 5N/6D</p>
                        <p className="text-xs text-gray-500">$5,400 • Sent</p>
                      </div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-gray-300 group-hover:text-gray-500 text-xs"></i>
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Documents</h3>
                  <button className="text-blue-600 hover:text-blue-700 text-xs font-medium"><i className="fa-solid fa-upload"></i> Upload</button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-red-50 flex items-center justify-center text-red-500">
                        <i className="fa-regular fa-file-pdf"></i>
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate">Passport_Front.pdf</p>
                        <p className="text-xs text-gray-500">2.4 MB • Oct 24</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <i className="fa-solid fa-download"></i>
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-blue-50 flex items-center justify-center text-blue-500">
                        <i className="fa-regular fa-image"></i>
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium text-gray-900 truncate">Visa_Photo.jpg</p>
                        <p className="text-xs text-gray-500">1.1 MB • Oct 24</p>
                      </div>
                    </div>
                    <button className="text-gray-400 hover:text-gray-600">
                      <i className="fa-solid fa-download"></i>
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </main>
  );
};

export default LeadDetails;
