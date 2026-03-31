export type CountryOption = {
  value: string
  label: string
}

export const CRM_COUNTRY_OPTIONS: CountryOption[] = [
  { value: '', label: 'Select country' },
  { value: 'India', label: 'India' },
  { value: 'UAE', label: 'UAE' }
]

export const CRM_ADMIN_COUNTRY_OPTIONS: CountryOption[] = [
  { value: 'All', label: 'All Countries' },
  ...CRM_COUNTRY_OPTIONS.filter(option => option.value !== '')
]
