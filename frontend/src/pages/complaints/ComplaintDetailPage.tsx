import React from "react";
import { useParams } from "react-router-dom";

const ComplaintDetailPage: React.FC = () => {
  const { id } = useParams();

  return (
    <main className="flex-1 overflow-y-auto bg-gray-100">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Complaint</p>
            <h1 className="text-2xl font-bold text-gray-900">#{id}</h1>
          </div>
          <button className="btn-primary">Update</button>
        </header>

        <section className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="text-lg font-semibold">Details</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <input className="field-input" placeholder="Booking Id" />
            <input className="field-input" placeholder="Assigned To" />
            <input className="field-input" placeholder="Issue Type" required />
            <select className="field-input">
              <option value="">Status</option>
              <option>OPEN</option>
              <option>IN_PROGRESS</option>
              <option>RESOLVED</option>
            </select>
            <textarea className="field-input md:col-span-2" placeholder="Description" required />
          </div>
        </section>

        <section className="bg-white rounded-xl shadow p-4 space-y-3">
          <h2 className="text-lg font-semibold">Activity Timeline</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <div className="p-3 border rounded-lg">New complaint created.</div>
            <div className="p-3 border rounded-lg">Assigned to agent.</div>
          </div>
          <div className="mt-3">
            <textarea className="field-input" placeholder="Add note" />
            <button className="btn-primary mt-2">Add Activity</button>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ComplaintDetailPage;
