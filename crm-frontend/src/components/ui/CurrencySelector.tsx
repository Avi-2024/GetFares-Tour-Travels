import React, { useEffect, useMemo, useState } from "react";
import { SUPPORTED_CURRENCIES } from "../../services/currencyService";
import { useCurrency } from "../../hooks/useCurrency";

interface CurrencySelectorProps {
  value: string;
  onChange: (currency: string) => void;
  amount?: number;
  baseCurrency?: string;
  showPreview?: boolean;
  className?: string;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  value,
  onChange,
  amount = 0,
  baseCurrency = "AED",
  showPreview = false,
  className = "",
}) => {
  const { convert, loading, formatAmount } = useCurrency();
  const [previewAmount, setPreviewAmount] = useState<number>(amount);

  const normalizedBaseCurrency = String(baseCurrency || "AED").toUpperCase();
  const normalizedSelectedCurrency = String(value || normalizedBaseCurrency).toUpperCase();
  const options = useMemo(() => SUPPORTED_CURRENCIES, []);

  useEffect(() => {
    let mounted = true;
    const updatePreview = async () => {
      if (!showPreview) {
        setPreviewAmount(amount);
        return;
      }
      if (normalizedSelectedCurrency === normalizedBaseCurrency) {
        setPreviewAmount(amount);
        return;
      }
      try {
        const converted = await convert(
          amount,
          normalizedBaseCurrency,
          normalizedSelectedCurrency,
        );
        if (mounted) {
          setPreviewAmount(converted);
        }
      } catch {
        if (mounted) {
          setPreviewAmount(amount);
        }
      }
    };

    void updatePreview();
    return () => {
      mounted = false;
    };
  }, [
    amount,
    convert,
    normalizedBaseCurrency,
    normalizedSelectedCurrency,
    showPreview,
  ]);

  return (
    <div className={`flex items-center gap-2 ${className}`.trim()}>
      <select
        value={normalizedSelectedCurrency}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
        className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
      >
        {options.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>

      {showPreview ? (
        <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatAmount(previewAmount, normalizedSelectedCurrency)}
        </span>
      ) : null}
    </div>
  );
};

export default CurrencySelector;
