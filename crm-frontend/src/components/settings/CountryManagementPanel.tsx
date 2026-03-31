import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FaPlus, FaRotate } from "react-icons/fa6";
import { countriesApi, type CountryRecord } from "../../api/countries";
import { getApiErrorMessage } from "../../api/apiClient";
import SurfaceCard from "../ui/SurfaceCard";

type Props = {
  canReadSettings: boolean;
  canUpdateSettings: boolean;
};

type FormState = {
  code: string;
  name: string;
  isActive: boolean;
};

const INITIAL_FORM: FormState = {
  code: "",
  name: "",
  isActive: true,
};

function extractRows(response: unknown): CountryRecord[] {
  const payload = response as { data?: CountryRecord[] | { data?: CountryRecord[] } };
  if (Array.isArray(payload?.data)) return payload.data;
  const nested = payload?.data as { data?: CountryRecord[] } | undefined;
  if (Array.isArray(nested?.data)) return nested.data;
  return Array.isArray(response) ? (response as CountryRecord[]) : [];
}

const CountryManagementPanel: React.FC<Props> = ({
  canReadSettings,
  canUpdateSettings,
}) => {
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [editId, setEditId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const loadCountries = useCallback(async () => {
    if (!canReadSettings) {
      setCountries([]);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await countriesApi.list({ includeInactive: true });
      setCountries(extractRows(response));
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to load countries"));
    } finally {
      setLoading(false);
    }
  }, [canReadSettings]);

  useEffect(() => {
    void loadCountries();
  }, [loadCountries]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return countries;
    return countries.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.code.toLowerCase().includes(term),
    );
  }, [countries, search]);

  async function onSave() {
    if (!canUpdateSettings) return;
    if (!form.code.trim() || !form.name.trim()) {
      setError("Country code and name are required.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editId) {
        await countriesApi.update(editId, {
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          isActive: form.isActive,
        });
        setNotice("Country updated.");
      } else {
        await countriesApi.create({
          code: form.code.trim().toUpperCase(),
          name: form.name.trim(),
          isActive: form.isActive,
        });
        setNotice("Country created.");
      }
      setForm(INITIAL_FORM);
      setEditId("");
      await loadCountries();
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to save country"));
    } finally {
      setSaving(false);
    }
  }

  function onEdit(country: CountryRecord) {
    setEditId(country.id);
    setForm({
      code: country.code || "",
      name: country.name || "",
      isActive: country.isActive !== false,
    });
    setError("");
    setNotice("");
  }

  async function onToggle(country: CountryRecord) {
    if (!canUpdateSettings) return;
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await countriesApi.update(country.id, { isActive: !country.isActive });
      setNotice("Country status updated.");
      await loadCountries();
    } catch (e) {
      setError(getApiErrorMessage(e, "Unable to update country status"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <SurfaceCard>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Country Management</h2>
        <button
          onClick={() => void loadCountries()}
          className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700"
          disabled={loading}
        >
          <FaRotate />
          Refresh
        </button>
      </div>

      {!canReadSettings ? (
        <p className="text-sm text-gray-500">
          You do not have permission to view country settings.
        </p>
      ) : (
        <>
          {notice ? (
            <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {notice}
            </div>
          ) : null}
          {error ? (
            <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-xl border border-gray-200 p-4">
              <h3 className="mb-3 text-base font-semibold">
                {editId ? "Edit Country" : "Add Country"}
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="field-label">Country Code</label>
                  <input
                    className="field-input"
                    value={form.code}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, code: event.target.value }))
                    }
                    placeholder="IN"
                    maxLength={10}
                  />
                </div>
                <div>
                  <label className="field-label">Country Name</label>
                  <input
                    className="field-input"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="India"
                    maxLength={120}
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                    }
                    className="rounded border-gray-300 text-blue-600"
                  />
                  Active
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => void onSave()}
                    disabled={!canUpdateSettings || saving}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                  >
                    <FaPlus />
                    {editId ? "Save Changes" : "Create Country"}
                  </button>
                  {editId ? (
                    <button
                      onClick={() => {
                        setEditId("");
                        setForm(INITIAL_FORM);
                      }}
                      className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700"
                    >
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-base font-semibold">Country List</h3>
                <input
                  className="field-input max-w-xs"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search countries..."
                />
              </div>
              <div className="max-h-[420px] overflow-auto rounded-lg border border-gray-100">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Code</th>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Name</th>
                      <th className="px-3 py-2 text-left text-xs text-gray-500">Status</th>
                      <th className="px-3 py-2 text-right text-xs text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-sm text-gray-500">
                          Loading countries...
                        </td>
                      </tr>
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-4 text-sm text-gray-500">
                          No countries found.
                        </td>
                      </tr>
                    ) : (
                      filtered.map((country) => (
                        <tr key={country.id}>
                          <td className="px-3 py-3 font-medium">{country.code}</td>
                          <td className="px-3 py-3">{country.name}</td>
                          <td className="px-3 py-3">
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                country.isActive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {country.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right">
                            <div className="inline-flex items-center gap-2">
                              <button
                                onClick={() => onEdit(country)}
                                className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => void onToggle(country)}
                                disabled={!canUpdateSettings || saving}
                                className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 disabled:opacity-50"
                              >
                                {country.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </SurfaceCard>
  );
};

export default CountryManagementPanel;

