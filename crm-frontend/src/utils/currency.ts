import { Country } from 'country-state-city'

export type CurrencyOption = {
  value: string
  label: string
}

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
