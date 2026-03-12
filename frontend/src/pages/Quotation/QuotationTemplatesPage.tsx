import React from "react";

const rows = [
  { code: "STD", name: "Standard", type: "STANDARD", active: true },
  { code: "VIP", name: "VIP Luxury", type: "PREMIUM", active: false },
];

const QuotationTemplatesPage: React.FC = () => {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Quotation Templates</p>
            <h1 className="text-2xl font-bold text-gray-900">Manage templates</h1>
          </div>
          <button className="btn-primary">New Template</button>
        </header>

        <section className="bg-white rounded-xl shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Code", "Name", "Type", "Min Margin %", "Active", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row) => (
                  <tr key={row.code}>
                    <td className="px-4 py-3 text-sm text-gray-900">{row.code}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{row.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">—</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${row.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                        {row.active ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button className="text-blue-600 hover:underline">Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default QuotationTemplatesPage;
