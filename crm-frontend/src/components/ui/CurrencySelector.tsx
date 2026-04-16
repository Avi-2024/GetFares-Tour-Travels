import React, { useState, useEffect } from 'react';
import { useCurrency } from '../../hooks/useCurrency';

interface CurrencySelectorProps {
  amount: number;
  baseCurrency?: string;
  onConvert?: (convertedAmount: number, targetCurrency: string) => void;
}

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  amount,
  baseCurrency = 'AED',
  onConvert
}) => {
  const { rates, loading, convert } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState(baseCurrency);
  const [convertedAmount, setConvertedAmount] = useState(amount);

  const popularCurrencies = ['AED', 'USD', 'EUR', 'GBP', 'INR', 'SAR'];

  useEffect(() => {
    if (selectedCurrency !== baseCurrency && amount > 0) {
      convert(amount, baseCurrency, selectedCurrency).then(result => {
        setConvertedAmount(result);
        onConvert?.(result, selectedCurrency);
      });
    } else {
      setConvertedAmount(amount);
    }
  }, [amount, selectedCurrency, baseCurrency]);

  const availableCurrencies = rates 
    ? Object.keys(rates.rates).filter(code => popularCurrencies.includes(code))
    : popularCurrencies;

  return (
    <div className="flex items-center gap-2">
      <select
        value={selectedCurrency}
        onChange={(e) => setSelectedCurrency(e.target.value)}
        disabled={loading}
        className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {availableCurrencies.map(code => (
          <option key={code} value={code}>{code}</option>
        ))}
      </select>
      <span className="text-lg font-semibold">
        {convertedAmount.toLocaleString('en-US', { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}
      </span>
    </div>
  );
};
