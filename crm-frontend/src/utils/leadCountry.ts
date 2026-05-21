import { Country } from 'country-state-city'

const ALIAS_TO_COUNTRY_NAME: Record<string, string> = {
  uae: 'United Arab Emirates',
  'u.a.e': 'United Arab Emirates',
  'u.a.e.': 'United Arab Emirates',
  'united arab emirates': 'United Arab Emirates',
  india: 'India',
  ind: 'India',
  us: 'United States',
  usa: 'United States',
  'united states': 'United States',
  uk: 'United Kingdom',
  'united kingdom': 'United Kingdom'
}

/** Map DB/API aliases (e.g. UAE) to dropdown country names. */
export function toLeadCountryFormValue (raw: unknown): string {
  const value = String(raw ?? '').trim()
  if (!value) return ''

  const alias = ALIAS_TO_COUNTRY_NAME[value.toLowerCase()]
  if (alias) return alias

  const countries = Country.getAllCountries()
  const byName = countries.find(
    country => country.name.toLowerCase() === value.toLowerCase()
  )
  if (byName) return byName.name

  const byIso = countries.find(
    country => country.isoCode.toLowerCase() === value.toLowerCase()
  )
  if (byIso) return byIso.name

  return value
}
