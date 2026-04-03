import * as i18nNationality from 'i18n-nationality/entry-node'

export type DropdownOption = {
  value: string
  label: string
}

let cachedNationalityOptions: DropdownOption[] | null = null

export const getNationalityOptions = (): DropdownOption[] => {
  if (cachedNationalityOptions) return cachedNationalityOptions

  try {
    const nationalityMap = i18nNationality.getNames('en') || {}
    const uniqueNationalities = Array.from(
      new Set(
        Object.values(nationalityMap)
          .map(value => String(value || '').trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))

    cachedNationalityOptions = [
      { value: '', label: 'Select nationality' },
      ...uniqueNationalities.map(name => ({ value: name, label: name }))
    ]

    return cachedNationalityOptions
  } catch {
    cachedNationalityOptions = [{ value: '', label: 'Select nationality' }]
    return cachedNationalityOptions
  }
}
