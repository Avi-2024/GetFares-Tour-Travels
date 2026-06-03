import React, { useEffect, useMemo, useState } from "react";
import { getApiErrorMessage } from "../../api/apiClient";
import {
  SUPPORTED_CURRENCIES,
  currencyService,
  type CurrencyRatesResponse,
} from "../../services/currencyService";

type Props = {
  canManage: boolean;
};

type RateForm = Record<string, string>;

const toRateForm = (payload: CurrencyRatesResponse | null): RateForm =>
  SUPPORTED_CURRENCIES.reduce<RateForm>((accumulator, code) => {
    accumulator[code] = String(payload?.rates?.[code]?.value ?? (code === payload?.baseCurrency ? 1 : ""));
    return accumulator;
  }, {});

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

const CurrencyRatesPanel: React.FC<Props> = ({ canManage }) => {
  const [rates, setRates] = useState<CurrencyRatesResponse | null>(null);
  const [form, setForm] = useState<RateForm>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const baseCurrency = rates?.baseCurrency || "AED";

  const validationError = useMemo(() => {
    for (const code of SUPPORTED_CURRENCIES) {
      const value = Number(form[code]);
      if (!Number.isFinite(value) || value <= 0) {
        return `${code} rate must be greater than 0.`;
      }
    }
    if (Number(form[baseCurrency]) !== 1) {
      return `${baseCurrency} base rate must be 1.`;
    }
    return "";
  }, [baseCurrency, form]);

  const loadRates = async (forceRefresh = false) => {
    setLoading(true);
    setError("");
    try {
      const payload = await currencyService.getRates(forceRefresh);
      setRates(payload);
      setForm(toRateForm(payload));
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load currency rates"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRates(false);
  }, []);

  const saveRates = async () => {
    if (!canManage || validationError) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const payload = await currencyService.updateRates(
        SUPPORTED_CURRENCIES.reduce<Record<string, { code: string; value: number }>>(
          (accumulator, code) => {
            accumulator[code] = { code, value: Number(form[code]) };
            return accumulator;
          },
          {},
        ),
      );
      setRates(payload);
      setForm(toRateForm(payload));
      setMessage("Currency rates saved.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to save currency rates"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Currency Rates
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage CRM conversion rates from database settings.
          </p>
        </div>
        <div className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-300">
          <div>Base: {baseCurrency}</div>
          <div>Updated: {formatDateTime(rates?.updatedAt)}</div>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">Loading currency rates...</p>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}
      {message ? (
        <div className="mt-4 rounded-xl border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">
          {message}
        </div>
      ) : null}
      {!canManage ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Only super admin can update currency rates.
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {SUPPORTED_CURRENCIES.map((code) => (
          <div key={code}>
            <label className="field-label">
              {code} rate
              {code === baseCurrency ? " (base)" : ""}
            </label>
            <input
              className="field-input"
              type="number"
              min="0.000001"
              step="0.000001"
              disabled={!canManage || code === baseCurrency}
              value={form[code] ?? ""}
              onChange={(event) =>
                setForm((current) => ({ ...current, [code]: event.target.value }))
              }
            />
          </div>
        ))}
      </div>

      {validationError ? (
        <p className="mt-3 text-sm text-red-600">{validationError}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void saveRates()}
          disabled={!canManage || saving || Boolean(validationError)}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Rates"}
        </button>
        <button
          type="button"
          onClick={() => void loadRates(true)}
          disabled={loading}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200"
        >
          Reload
        </button>
      </div>
    </div>
  );
};

export default CurrencyRatesPanel;
