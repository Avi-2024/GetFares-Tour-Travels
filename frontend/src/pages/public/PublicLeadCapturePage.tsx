import React, { useState } from "react";

const PublicLeadCapturePage: React.FC = () => {
  const [status, setStatus] = useState<"idle" | "success" | "duplicate">("idle");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // fake success for now
    setStatus("success");
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl p-8 space-y-6">
        <header className="space-y-1 text-center">
          <p className="text-sm text-gray-500">Public Lead Capture</p>
          <h1 className="text-2xl font-bold text-gray-900">Tell us about your trip</h1>
          <p className="text-sm text-gray-600">Meta / Website / WhatsApp payload → webhook schema</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <input className="field-input" placeholder="Full Name" name="fullName" />
            <input className="field-input" placeholder="Email" name="email" type="email" />
            <input className="field-input" placeholder="Phone" name="phone" />
            <input className="field-input" placeholder="Destination" name="destination" />
          </div>
          <textarea className="field-input" placeholder="Tell us what you need" name="notes" />
          <button type="submit" className="btn-primary w-full">Submit</button>
        </form>

        {status === "success" && (
          <div className="p-3 rounded-lg bg-green-50 text-green-700 text-sm text-center">
            Captured successfully (or duplicate acknowledged).
          </div>
        )}
        {status === "duplicate" && (
          <div className="p-3 rounded-lg bg-amber-50 text-amber-700 text-sm text-center">
            Duplicate lead detected; we will follow up on the existing record.
          </div>
        )}
      </div>
    </main>
  );
};

export default PublicLeadCapturePage;
