import React from "react";

const CampaignsPage: React.FC = () => {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Campaigns</p>
            <h1 className="text-2xl font-bold text-gray-900">Marketing campaigns</h1>
          </div>
          <button className="btn-primary">New Campaign</button>
        </header>

        <section className="bg-white rounded-xl shadow p-4 space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <input className="field-input" placeholder="Name" />
            <input className="field-input" placeholder="Source" />
            <input className="field-input" placeholder="Start Date" type="date" />
            <input className="field-input" placeholder="End Date" type="date" />
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Source", "Budget", "Leads", "Revenue", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Meta Ads</td>
                  <td className="px-4 py-3 text-sm text-gray-700">META</td>
                  <td className="px-4 py-3 text-sm text-gray-700">$1,000</td>
                  <td className="px-4 py-3 text-sm text-gray-700">45</td>
                  <td className="px-4 py-3 text-sm text-gray-700">$8,200</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Active</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CampaignsPage;
