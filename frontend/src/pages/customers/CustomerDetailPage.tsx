import React from "react";
import { useParams } from "react-router-dom";

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams();

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Customer</p>
            <h1 className="text-2xl font-bold text-gray-900">Profile #{id}</h1>
          </div>
          <button className="btn-primary">Save</button>
        </header>

        <section className="bg-white rounded-xl shadow p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input className="field-input" placeholder="Full Name" required />
            <input className="field-input" placeholder="Phone" />
            <input className="field-input" placeholder="Email" type="email" />
            <textarea className="field-input" placeholder="Preferences" />
            <input className="field-input" placeholder="Lifetime Value" type="number" />
            <select className="field-input">
              <option value="">Segment</option>
              <option>VIP</option>
              <option>High Value</option>
              <option>Regular</option>
            </select>
            <input className="field-input" placeholder="PAN Number" />
            <textarea className="field-input md:col-span-2" placeholder="Address" />
          </div>
        </section>
      </div>
    </main>
  );
};

export default CustomerDetailPage;
