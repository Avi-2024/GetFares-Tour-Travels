import React from "react";
import { useNavigate } from "react-router-dom";

const CustomersPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Customers</p>
            <h1 className="text-2xl font-bold text-gray-900">Customer directory</h1>
          </div>
          <button className="btn-primary">New Customer</button>
        </header>

        <section className="bg-white rounded-xl shadow p-4 space-y-4">
          <div className="grid md:grid-cols-4 gap-4">
            <input className="field-input" placeholder="Name" />
            <input className="field-input" placeholder="Phone" />
            <input className="field-input" placeholder="Email" />
            <select className="field-input">
              <option value="">Segment</option>
              <option>VIP</option>
              <option>Regular</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Phone", "Email", "Segment", "LTV", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Sarah Connor</td>
                  <td className="px-4 py-3 text-sm text-gray-700">+1 555 0100</td>
                  <td className="px-4 py-3 text-sm text-gray-700">sarah@example.com</td>
                  <td className="px-4 py-3 text-sm text-gray-700">VIP</td>
                  <td className="px-4 py-3 text-sm text-gray-700">$12,000</td>
                  <td className="px-4 py-3 text-sm">
                    <button className="text-blue-600 hover:underline" onClick={() => navigate("/customers/1")}>
                      View
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
};

export default CustomersPage;
