import { Country } from 'country-state-city'

export type CurrencyOption = {
  value: string
  label: string
}

export type CurrencyDisplayMode = 'symbol' | 'code'

const fallbackCurrencies = ['INR', 'USD', 'EUR', 'GBP', 'AED']

const currenciesFromCountries = Country.getAllCountries()
  .map(country => String(country.currency || '').trim().toUpperCase())
  .filter(code => /^[A-Z]{3}$/.test(code))

const uniqueCurrencyCodes = Array.from(
  new Set([...fallbackCurrencies, ...currenciesFromCountries])
).sort((a, b) => a.localeCompare(b))

const currencyLocaleMap = new Map<string, string>()
Country.getAllCountries().forEach(country => {
  const code = String(country.currency || '').trim().toUpperCase()
  const iso2 = String(country.isoCode || '').trim().toUpperCase()
  if (!/^[A-Z]{3}$/.test(code) || !/^[A-Z]{2}$/.test(iso2)) return
  if (!currencyLocaleMap.has(code)) {
    currencyLocaleMap.set(code, `en-${iso2}`)
  }
})

currencyLocaleMap.set('INR', 'hi-IN')
currencyLocaleMap.set('USD', 'en-US')
currencyLocaleMap.set('EUR', 'de-DE')
currencyLocaleMap.set('GBP', 'en-GB')
currencyLocaleMap.set('AED', 'en-AE')

const currencySymbolMap = new Map<string, string>([
  ['INR', '₹'],
  ['USD', '$'],
  ['EUR', '€'],
  ['GBP', '£'],
  ['AED', 'د.إ'],
  ['SAR', 'ر.س'],
  ['QAR', 'ر.ق'],
  ['OMR', 'ر.ع.'],
  ['KWD', 'د.ك'],
  ['BHD', 'د.ب'],
  ['JPY', '¥'],
  ['CNY', '¥'],
  ['AUD', 'A$'],
  ['CAD', 'C$'],
  ['CHF', 'Fr'],
  ['SGD', 'S$'],
  ['THB', '฿'],
  ['MYR', 'RM'],
])

export const getCurrencyCodes = () => uniqueCurrencyCodes

export const getCurrencyOptions = (
  includeSelectOption = false,
  placeholder = 'Select currency'
): CurrencyOption[] => {
  const options = uniqueCurrencyCodes.map(code => ({ value: code, label: code }))
  if (!includeSelectOption) return options
  return [{ value: '', label: placeholder }, ...options]
}

export const getCurrencyLocaleByCode = () => currencyLocaleMap

export const getCurrencySymbol = (currencyCode: string): string => {
  if (!currencyCode) return '₹'
  const code = currencyCode.toUpperCase()
  if (currencySymbolMap.has(code)) {
    return currencySymbolMap.get(code)!
  }
  return code
}

export const formatCurrency = (
  amount: number | string,
  currencyCode: string,
  display: CurrencyDisplayMode = 'code'
): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  const normalizedCode = String(currencyCode || 'INR')
    .trim()
    .toUpperCase()
    .slice(0, 3)

  if (Number.isNaN(numAmount)) return `${normalizedCode} 0`

  const locale = currencyLocaleMap.get(normalizedCode) || 'en-IN'
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: normalizedCode,
      currencyDisplay: display,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(numAmount)
  } catch (_err) {
    const formatted = numAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })
    return `${normalizedCode} ${formatted}`
  }
}
