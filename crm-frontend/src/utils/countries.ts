export type CountryOption = {
  value: string
  label: string
}

// Default fallback options (will be replaced by API data)
export const CRM_COUNTRY_OPTIONS: CountryOption[] = [
  { value: '', label: 'Select country' },
  { value: 'India', label: 'India' },
  { value: 'UAE', label: 'UAE' }
]

export const CRM_ADMIN_COUNTRY_OPTIONS: CountryOption[] = [
  { value: 'All', label: 'All Countries' },
  ...CRM_COUNTRY_OPTIONS.filter(option => option.value !== '')
]

// Helper to build country options from API data
export const buildCountryOptions = (countries: Array<{ name: string; isActive?: boolean }>): CountryOption[] => {
  return [
    { value: '', label: 'Select country' },
    ...countries
      .filter(c => c.isActive !== false)
      .map(c => ({ value: c.name, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ]
}

export const buildAdminCountryOptions = (countries: Array<{ name: string; isActive?: boolean }>): CountryOption[] => {
  return [
    { value: 'All', label: 'All Countries' },
    ...countries
      .filter(c => c.isActive !== false)
      .map(c => ({ value: c.name, label: c.name }))
      .sort((a, b) => a.label.localeCompare(b.label))
  ]
}
