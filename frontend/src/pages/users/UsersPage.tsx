import React from "react";

const UsersPage: React.FC = () => {
  return (
    <main className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Users & Roles</p>
            <h1 className="text-2xl font-bold text-gray-900">User management</h1>
          </div>
          <button className="btn-primary">Invite User</button>
        </header>

        <section className="bg-white rounded-xl shadow p-4 space-y-4">
          <div className="grid md:grid-cols-3 gap-4">
            <input className="field-input" placeholder="Search name/email" />
            <select className="field-input">
              <option value="">Role</option>
              <option>Admin</option>
              <option>Manager</option>
              <option>Sales</option>
            </select>
            <button className="btn-secondary">Filter</button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Name", "Email", "Role", "Status", "Actions"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm text-gray-900">Admin User</td>
                  <td className="px-4 py-3 text-sm text-gray-700">admin@example.com</td>
                  <td className="px-4 py-3 text-sm text-gray-700">Admin</td>
                  <td className="px-4 py-3 text-sm text-green-700">Active</td>
                  <td className="px-4 py-3 text-sm">
                    <button className="text-blue-600 hover:underline">Assign Role</button>
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

export default UsersPage;
