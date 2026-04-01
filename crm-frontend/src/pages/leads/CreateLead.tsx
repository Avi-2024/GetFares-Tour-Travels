import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa'
import {
  PhoneInput,
  type CountryIso2,
  type PhoneInputRefType
} from 'react-international-phone'
import 'react-international-phone/style.css'
import CurrencyInput, { formatValue } from 'react-currency-input-field'
import SurfaceCard from '../../components/ui/SurfaceCard'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { getApiErrorMessage } from '../../api/apiClient'
import { useLeadsService } from '../../hooks/useLeadsService'
import { useCampaignsService } from '../../hooks/useCampaignsService'
import { Country } from 'country-state-city'
import {
  getCurrencyLocaleByCode
} from '../../utils/currency'

type LeadType = 'HOLIDAY' | 'VISA' | null

type FormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  leadCountry: string
  clientCurrency: string
  location: string
  destinationName: string
  travelDate: string
  adultsCount: string
  childrenCount: string
  budget: string
  visaRequired: 'YES' | 'NO' | ''
  preferredHotelCategory: '3_STAR' | '4_STAR' | '5_STAR' | 'ANY' | ''
  travelPurpose: string
  leadSource: string
  campaignId: string
  notes: string
}

const HIDDEN_FIELDS_BY_TYPE: Record<NonNullable<LeadType>, string[]> = {
  VISA: ['leadSource', 'preferredHotelCategory', 'campaignId', 'visaRequired', 'travelPurpose'],
  HOLIDAY: []
}

const initialForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  leadCountry: '',
  clientCurrency: 'INR',
  location: '',
  destinationName: '',
  travelDate: '',
  adultsCount: '2',
  childrenCount: '0',
  budget: '',
  visaRequired: '',
  preferredHotelCategory: '',
  travelPurpose: '',
  leadSource: 'Website',
  campaignId: '',
  notes: ''
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_E164_DIGITS_MIN = 8
const PHONE_E164_DIGITS_MAX = 15

type CurrencyMeta = {
  code: string
  locale: string
  symbol: string
}

const COUNTRY_CURRENCY_MAP: Record<string, CurrencyMeta> = {
  in: { code: 'INR', locale: 'hi-IN', symbol: '₹' },
  us: { code: 'USD', locale: 'en-US', symbol: '$' },
  gb: { code: 'GBP', locale: 'en-GB', symbol: '£' },
  ae: { code: 'AED', locale: 'en-AE', symbol: 'د.إ' },
  eu: { code: 'EUR', locale: 'de-DE', symbol: '€' }
}

const FALLBACK_CURRENCY_META: CurrencyMeta = COUNTRY_CURRENCY_MAP.in

const detectLocaleCountryIso2 = (): CountryIso2 => {
  if (typeof navigator === 'undefined' || !navigator.language) {
    return 'in'
  }
  const locale = navigator.language
  const region = locale.includes('-') ? locale.split('-')[1]?.toLowerCase() : ''
  return (region || 'in') as CountryIso2
}

const getLocalTodayIsoDate = (): string => {
  const now = new Date()
  const timezoneOffsetMs = now.getTimezoneOffset() * 60 * 1000
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().split('T')[0]
}

const createCountryCurrencyMap = (): Record<string, string> => {
  const map: Record<string, string> = {
    'India': 'INR',
    'United States': 'USD',
    'United Kingdom': 'GBP',
    'United Arab Emirates': 'AED',
    'Saudi Arabia': 'SAR',
    'Qatar': 'QAR',
    'Kuwait': 'KWD',
    'Oman': 'OMR',
    'Bahrain': 'BHD',
    'Canada': 'CAD',
    'Australia': 'AUD',
    'Singapore': 'SGD',
    'Malaysia': 'MYR',
    'Thailand': 'THB',
    'Indonesia': 'IDR',
    'Japan': 'JPY',
    'China': 'CNY',
    'South Korea': 'KRW',
    'Hong Kong': 'HKD',
    'New Zealand': 'NZD',
    'Switzerland': 'CHF',
    'Sweden': 'SEK',
    'Norway': 'NOK',
    'Denmark': 'DKK',
    'Poland': 'PLN',
    'Czech Republic': 'CZK',
    'Hungary': 'HUF',
    'Russia': 'RUB',
    'Turkey': 'TRY',
    'South Africa': 'ZAR',
    'Egypt': 'EGP',
    'Nigeria': 'NGN',
    'Kenya': 'KES',
    'Brazil': 'BRL',
    'Mexico': 'MXN',
    'Argentina': 'ARS',
    'Chile': 'CLP',
    'Colombia': 'COP',
    'Peru': 'PEN',
    'Israel': 'ILS',
    'Philippines': 'PHP',
    'Vietnam': 'VND',
    'Bangladesh': 'BDT',
    'Pakistan': 'PKR',
    'Sri Lanka': 'LKR',
    'Nepal': 'NPR',
    'Maldives': 'MVR',
    'Mauritius': 'MUR',
    'Seychelles': 'SCR'
  }
  
  const euroCountries = [
    'Germany', 'France', 'Italy', 'Spain', 'Portugal', 'Netherlands',
    'Belgium', 'Austria', 'Greece', 'Ireland', 'Finland', 'Luxembourg',
    'Slovenia', 'Cyprus', 'Malta', 'Slovakia', 'Estonia', 'Latvia',
    'Lithuania', 'Croatia'
  ]
  euroCountries.forEach(country => {
    map[country] = 'EUR'
  })
  
  return map
}

const COUNTRY_CURRENCY_NAME_MAP = createCountryCurrencyMap()

const createInitialFormState = (): FormState => {
  const iso2 = detectLocaleCountryIso2()
  const matchedCountry = Country.getAllCountries().find(
    country => String(country.isoCode || '').toLowerCase() === iso2
  )
  const localeCurrencyCode = String(matchedCountry?.currency || '')
    .trim()
    .toUpperCase()
  const resolvedCurrency =
    COUNTRY_CURRENCY_MAP[iso2]?.code ||
    localeCurrencyCode ||
    FALLBACK_CURRENCY_META.code

  return {
    ...initialForm,
    leadCountry: matchedCountry?.name || '',
    clientCurrency: resolvedCurrency
  }
}

const CreateLead: React.FC = () => {
  const navigate = useNavigate()
  const leadsService = useLeadsService()
  const campaignsService = useCampaignsService()
  const [leadType, setLeadType] = useState<LeadType>(null)
  const [form, setForm] = useState<FormState>(() => createInitialFormState())
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [destinations, setDestinations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [childAges, setChildAges] = useState<string[]>([])
  const [phoneCountryIso2, setPhoneCountryIso2] = useState<CountryIso2>(() =>
    detectLocaleCountryIso2()
  )
  const minTravelDate = useMemo(() => getLocalTodayIsoDate(), [])
  const phoneInputRef = useRef<PhoneInputRefType>(null)

  const isFieldVisible = (fieldName: string) => {
    if (!leadType) return true
    return !HIDDEN_FIELDS_BY_TYPE[leadType]?.includes(fieldName)
  }

  const handleLeadTypeSelect = (type: 'HOLIDAY' | 'VISA') => {
    setLeadType(type)
    setForm(createInitialFormState())
    setChildAges([])
    setShowErrors(false)
    setApiError('')
    setDuplicateWarning('')
  }

  const handleBackToSelection = () => {
    setLeadType(null)
    setForm(createInitialFormState())
    setChildAges([])
    setShowErrors(false)
    setApiError('')
    setDuplicateWarning('')
  }

  useEffect(() => {
    const loadData = async () => {
      const [campaignsRes, destinationsRes] = await Promise.allSettled([
        campaignsService.list({ status: 'ACTIVE' }),
        leadsService.getDestinations()
      ])

      if (campaignsRes.status === 'fulfilled') {
        setCampaigns((campaignsRes.value as any).data || [])
      } else {
        setCampaigns([])
      }

      if (destinationsRes.status === 'fulfilled') {
        const list = destinationsRes.value
        setDestinations(Array.isArray(list) ? list : [])
      } else {
        setDestinations([])
      }
    }
    void loadData()
  }, [campaignsService, leadsService])

  useEffect(() => {
    const checkDuplicates = async () => {
      const email = form.email.trim()
      const phone = form.phone.replace(/\D/g, '')
      
      // Only check if both email and phone have meaningful values
      if (!email && !phone) {
        setDuplicateWarning('')
        return
      }
      
      // Don't check if email is invalid or phone is too short
      if (email && !EMAIL_PATTERN.test(email)) {
        setDuplicateWarning('')
        return
      }
      
      if (phone && phone.length < PHONE_E164_DIGITS_MIN) {
        setDuplicateWarning('')
        return
      }
      
      try {
        const result = await leadsService.checkDuplicate(
          email || undefined,
          phone || undefined
        )
        setDuplicateWarning(
          (result as any).data.isDuplicate
            ? (result as any).data.message ?? 'Similar lead already exists'
            : ''
        )
      } catch {
        setDuplicateWarning('')
      }
    }

    const timer = setTimeout(() => {
      void checkDuplicates()
    }, 500)
    return () => clearTimeout(timer)
  }, [form.email, form.phone, leadsService])

  const validation = useMemo(() => {
    const email = form.email.trim()
    const phoneDigits = form.phone.replace(/\D/g, '')
    const phoneLooksValid =
      form.phone.trim().startsWith('+') &&
      phoneDigits.length >= PHONE_E164_DIGITS_MIN &&
      phoneDigits.length <= PHONE_E164_DIGITS_MAX

    const adultsCountValue = Number(form.adultsCount || 0)
    const childrenCountValue = Number(form.childrenCount || 0)
    const adultsCountSafe = Number.isFinite(adultsCountValue)
      ? adultsCountValue
      : 0
    const childrenCountSafe = Number.isFinite(childrenCountValue)
      ? childrenCountValue
      : 0
    const isTravelDateInPast =
      form.travelDate.trim() !== '' && form.travelDate < minTravelDate

    return {
      firstName: !form.firstName.trim(),
      lastName: !form.lastName.trim(),
      email: !email || !EMAIL_PATTERN.test(email),
      phone: !phoneLooksValid,
      leadCountry: !form.leadCountry,
      clientCurrency: !form.clientCurrency.trim(),
      destinationName: !form.destinationName.trim(),
      travelDate: !form.travelDate || isTravelDateInPast,
      adultsChildren:
        adultsCountSafe < 0 || childrenCountSafe < 0 || adultsCountSafe < 1,
      childrenAges:
        childrenCountSafe > 0 &&
        (childAges.length !== childrenCountSafe ||
          childAges.some(age => {
            const numericAge = Number(age)
            return (
              age.trim() === '' ||
              !Number.isFinite(numericAge) ||
              numericAge < 0 ||
              numericAge > 18
            )
          })),
      budget: false,
      visaRequired: false,
      preferredHotelCategory: false,
      travelPurpose: false
    }
  }, [form, childAges, minTravelDate])

  const hasError = useMemo(
    () => Object.values(validation).some(Boolean),
    [validation]
  )

  const currencyOptions = useMemo(
    () => [
      { value: '', label: 'Select currency' },
      { value: 'INR', label: 'INR - Indian Rupee' },
      { value: 'USD', label: 'USD - US Dollar' },
      { value: 'EUR', label: 'EUR - Euro' },
      { value: 'GBP', label: 'GBP - British Pound' },
      { value: 'AED', label: 'AED - UAE Dirham' },
      { value: 'SAR', label: 'SAR - Saudi Riyal' },
      { value: 'QAR', label: 'QAR - Qatari Riyal' },
      { value: 'KWD', label: 'KWD - Kuwaiti Dinar' },
      { value: 'OMR', label: 'OMR - Omani Rial' },
      { value: 'BHD', label: 'BHD - Bahraini Dinar' },
      { value: 'CAD', label: 'CAD - Canadian Dollar' },
      { value: 'AUD', label: 'AUD - Australian Dollar' },
      { value: 'SGD', label: 'SGD - Singapore Dollar' },
      { value: 'MYR', label: 'MYR - Malaysian Ringgit' },
      { value: 'THB', label: 'THB - Thai Baht' },
      { value: 'JPY', label: 'JPY - Japanese Yen' },
      { value: 'CNY', label: 'CNY - Chinese Yuan' },
      { value: 'CHF', label: 'CHF - Swiss Franc' },
      { value: 'ZAR', label: 'ZAR - South African Rand' },
      { value: 'BRL', label: 'BRL - Brazilian Real' },
      { value: 'MXN', label: 'MXN - Mexican Peso' },
      { value: 'TRY', label: 'TRY - Turkish Lira' },
      { value: 'RUB', label: 'RUB - Russian Ruble' }
    ],
    []
  )

  const allCountryNames = useMemo(
    () => Country.getAllCountries().map(country => country.name),
    []
  )


  const destinationOptions = useMemo(
    () => {
      const destinationNames = destinations
        .map(destination => {
          if (typeof destination === 'string') return destination
          if (!destination || typeof destination !== 'object') return ''
          return (
            destination.name ||
            destination.destinationName ||
            destination.country ||
            ''
          )
        })
        .map(name => String(name).trim())
        .filter(Boolean)

    const mergedNames = Array.from(
      new Set([...allCountryNames, ...destinationNames])
    ).sort((a, b) => a.localeCompare(b))

    return [
      { value: '', label: 'Select destination' },
      ...mergedNames.map(name => ({
        value: name,
        label: name
      }))
    ]
  }, [allCountryNames, destinations])

  const visaOptions = useMemo(
    () => [
      { value: '', label: 'Select visa requirement' },
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' }
    ],
    []
  )

  const hotelCategoryOptions = useMemo(
    () => [
      { value: '', label: 'Select hotel category' },
      { value: '3_STAR', label: '3 Star' },
      { value: '4_STAR', label: '4 Star' },
      { value: '5_STAR', label: '5 Star' },
      { value: 'ANY', label: 'Any' }
    ],
    []
  )

  const travelPurposeOptions = useMemo(
    () => [
      { value: '', label: 'Select purpose' },
      { value: 'LEISURE', label: 'Leisure' },
      { value: 'BUSINESS', label: 'Business' },
      { value: 'HONEYMOON', label: 'Honeymoon' },
      { value: 'FAMILY', label: 'Family' },
      { value: 'ADVENTURE', label: 'Adventure' }
    ],
    []
  )

  const leadSourceOptions = useMemo(
    () => [
      { value: 'Website', label: 'Website' },
      { value: 'Phone', label: 'Phone' },
      { value: 'Referral', label: 'Referral' },
      { value: 'Social', label: 'Social' },
      { value: 'WalkIn', label: 'WalkIn' }
    ],
    []
  )

  const campaignOptions = useMemo(
    () => [
      { value: '', label: 'Select campaign (optional)' },
      ...campaigns.map(campaign => ({
        value: String(campaign.id),
        label: campaign.name
      }))
    ],
    [campaigns]
  )

  const countryOptions = useMemo(
    () => [
      { value: '', label: 'Select country' },
      ...allCountryNames.map(name => ({
        value: name,
        label: name
      }))
    ],
    [allCountryNames]
  )

  const countryMetaByName = useMemo(() => {
    const map = new Map<
      string,
      { iso2: CountryIso2; currency: string }
    >()
    Country.getAllCountries().forEach(country => {
      if (country.name) {
        map.set(country.name, {
          iso2: String(country.isoCode || '').toLowerCase() as CountryIso2,
          currency: COUNTRY_CURRENCY_NAME_MAP[country.name] || ''
        })
      }
    })
    return map
  }, [])

  const countryNameByIso2 = useMemo(() => {
    const map = new Map<CountryIso2, string>()
    Country.getAllCountries().forEach(country => {
      const iso2 = String(country.isoCode || '').toLowerCase() as CountryIso2
      if (country.name) {
        map.set(iso2, country.name)
      }
    })
    return map
  }, [])

  const resolveCurrencyForIso2 = (iso2: CountryIso2): string => {
    const countryName = countryNameByIso2.get(iso2)
    if (!countryName) return 'INR'
    return COUNTRY_CURRENCY_NAME_MAP[countryName] || COUNTRY_CURRENCY_MAP[iso2]?.code || 'INR'
  }

  const selectedCurrencyMeta = useMemo(() => {
    const currencyCode = form.clientCurrency.trim().toUpperCase()
    if (!currencyCode) return FALLBACK_CURRENCY_META
    const meta = getCurrencyLocaleByCode()
    if (meta && typeof meta === 'object' && 'locale' in meta) {
      return meta as unknown as CurrencyMeta
    }
    return FALLBACK_CURRENCY_META
  }, [form.clientCurrency])

  const formattedBudgetPreview = useMemo(() => {
    if (!form.budget) return ''
    const numericBudget = Number((form.budget || '').replace(/,/g, ''))
    if (!Number.isFinite(numericBudget)) return ''
    try {
      return formatValue({
        value: form.budget,
        intlConfig: {
          locale: selectedCurrencyMeta.locale,
          currency: selectedCurrencyMeta.code
        }
      })
    } catch {
      return ''
    }
  }, [form.budget, selectedCurrencyMeta])

  const handleLeadCountryChange = (countryName: string) => {
    const meta = countryMetaByName.get(countryName)
    if (!meta) {
      setForm(prev => ({ ...prev, leadCountry: countryName }))
      return
    }

    setPhoneCountryIso2(meta.iso2)
    setForm(prev => ({
      ...prev,
      leadCountry: countryName,
      clientCurrency: meta.currency || prev.clientCurrency || 'INR'
    }))
  }

  const handlePhoneChange = (
    phone: string,
    meta: { country: { iso2: CountryIso2 } }
  ) => {
    const iso2 = meta.country?.iso2
    if (!iso2) {
      setForm(prev => ({ ...prev, phone }))
      return
    }

    const mappedCountryName = countryNameByIso2.get(iso2)
    setPhoneCountryIso2(iso2)
    setForm(prev => ({
      ...prev,
      phone,
      leadCountry: mappedCountryName || prev.leadCountry,
      clientCurrency: resolveCurrencyForIso2(iso2)
    }))
  }

  const handleSubmit = async () => {
    setShowErrors(true)
    if (hasError) return

    setLoading(true)
    setApiError('')
    const fullName = [form.firstName, form.lastName]
      .map(value => value.trim())
      .filter(Boolean)
      .join(' ')
    const normalizedPhone = form.phone.replace(/\D/g, '')
    const normalizedBudget = Number((form.budget || '').replace(/,/g, ''))
    const adultsCountNumber = Number(form.adultsCount || 0)
    const childrenCountNumber = Number(form.childrenCount || 0)
    const cleanChildAges = childAges
      .map(age => age.trim())
      .filter(age => age !== '')
      .map(age => Number(age))
      .filter(age => Number.isFinite(age) && age >= 0 && age <= 18)

    const childAgesNote =
      childrenCountNumber > 0
        ? `Child Ages: ${cleanChildAges.map(age => String(age)).join(', ')}`
        : ''

    const mergedNotes = [form.notes.trim(), childAgesNote]
      .filter(Boolean)
      .join('\n')

    try {
      await leadsService.createLead({
        fullName,
        email: form.email.trim(),
        phone: normalizedPhone,
        leadCountry: form.leadCountry,
        addressLine: form.location.trim() || undefined,
        clientCurrency: form.clientCurrency.trim().toUpperCase(),
        destinationName: form.destinationName.trim(),
        travelDate: form.travelDate,
        adultsCount: adultsCountNumber,
        childrenCount: childrenCountNumber,
        childAges: cleanChildAges.length > 0 ? cleanChildAges : undefined,
        budget:
          form.budget.trim() && Number.isFinite(normalizedBudget)
            ? normalizedBudget
            : undefined,
        visaRequired: form.visaRequired
          ? form.visaRequired === 'YES'
          : undefined,
        preferredHotelCategory: form.preferredHotelCategory,
        travelPurpose: form.travelPurpose.trim(),
        source: form.leadSource.trim() || 'Website',
        campaignId: form.campaignId || undefined,
        notes: mergedNotes || undefined,
        leadType,
        status: 'OPEN',
        qualificationCompleted: true
      })
      navigate('/leads')
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'Could not create lead.'))
      setLoading(false)
    }
  }

  const fieldError = (key: keyof typeof validation) =>
    showErrors && validation[key]

  if (!leadType) {
    return (
      <div className='mx-auto max-w-9xl space-y-6 px-0'>
        <div className='flex items-center gap-3'>
          <button
            onClick={() => navigate('/leads')}
            className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
            aria-label='Back to leads'
          >
            <FaArrowLeft className='text-sm' />
          </button>
          <div>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
              Create New Lead
            </h1>
            <p className='text-sm text-gray-500'>
              Select the type of lead you want to create
            </p>
          </div>
        </div>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
          <button
            onClick={() => handleLeadTypeSelect('HOLIDAY')}
            className='group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-8 text-left transition-all hover:border-blue-500 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500'
          >
            <div className='absolute right-4 top-4 text-4xl opacity-20 transition-opacity group-hover:opacity-35'>
              🏖️
            </div>
            <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
              Holiday Lead
            </h3>
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
              For holiday packages, tours, and leisure travel bookings
            </p>
            <ul className='mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-500'>
              <li>• Hotel preferences</li>
              <li>• Travel packages</li>
              <li>• Campaign tracking</li>
              <li>• Lead source attribution</li>
            </ul>
            <div className='mt-6 inline-flex items-center text-sm font-medium text-blue-600 dark:text-blue-400'>
              Select Tourist Lead →
            </div>
          </button>

          <button
            onClick={() => handleLeadTypeSelect('VISA')}
            className='group relative overflow-hidden rounded-xl border-2 border-gray-200 bg-white p-8 text-left transition-all hover:border-green-500 hover:shadow-lg dark:border-gray-700 dark:bg-gray-800 dark:hover:border-green-500'
          >
            <div className='absolute right-4 top-4 text-4xl opacity-20 transition-opacity group-hover:opacity-35'>
              ✈️
            </div>
            <h3 className='text-xl font-bold text-gray-900 dark:text-gray-100'>
              Visa Lead
            </h3>
            <p className='mt-2 text-sm text-gray-600 dark:text-gray-400'>
              For visa applications and immigration services
            </p>
            <ul className='mt-4 space-y-2 text-sm text-gray-500 dark:text-gray-500'>
              <li>• Visa processing</li>
              <li>• Document management</li>
              <li>• Application tracking</li>
              <li>• Simplified workflow</li>
            </ul>
            <div className='mt-6 inline-flex items-center text-sm font-medium text-green-600 dark:text-green-400'>
              Select Visa Lead →
            </div>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className='mx-auto max-w-9xl space-y-6'>
      <div className='flex items-center gap-3'>
        <button
          onClick={handleBackToSelection}
          className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
          aria-label='Back to lead type selection'
        >
          <FaArrowLeft className='text-sm' />
        </button>
        <div className='flex-1'>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Create {leadType === 'HOLIDAY' ? 'Holiday' : 'Visa'} Lead
          </h1>
          <p className='text-sm text-gray-500'>
            SOP qualification capture for first response. PAN can be collected
            later after payment or finance onboarding.
          </p>
        </div>
        <span className='inline-flex items-center rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'>
          {leadType === 'HOLIDAY' ? '🏖️ Holiday' : '✈️ Visa'} Lead
        </span>
      </div>

      {duplicateWarning ? (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200'>
          {duplicateWarning}
        </div>
      ) : null}

      {apiError ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
          {apiError}
        </div>
      ) : null}

      <SurfaceCard>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
          Customer & Qualification Details
        </h2>
        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Field
            label='First Name *'
            value={form.firstName}
            onChange={value => setForm(prev => ({ ...prev, firstName: value }))}
            error={fieldError('firstName')}
          />
          <Field
            label='Last Name *'
            value={form.lastName}
            onChange={value => setForm(prev => ({ ...prev, lastName: value }))}
            error={fieldError('lastName')}
          />
          <Field
            label='Email *'
            value={form.email}
            onChange={value => setForm(prev => ({ ...prev, email: value }))}
            error={fieldError('email')}
            type='email'
          />
          <div>
            <label className='field-label'>Phone *</label>
            <PhoneInput
              ref={phoneInputRef}
              value={form.phone}
              defaultCountry={phoneCountryIso2}
              onChange={handlePhoneChange}
              inputClassName={`field-input !w-full ${
                fieldError('phone') ? '!border-red-500' : ''
              }`}
              countrySelectorStyleProps={{
                buttonClassName:
                  'h-[52px] rounded-l-xl border border-gray-200 dark:border-gray-700'
              }}
              inputProps={{
                name: 'phone',
                required: true,
                autoComplete: 'tel',
                placeholder: 'Phone number'
              }}
            />
            {form.phone && !fieldError('phone') ? (
              <p className='mt-1 text-xs text-green-600 dark:text-green-400'>
                Phone number format looks valid.
              </p>
            ) : null}
          </div>
          <div>
            <label className='field-label'>Lead Country *</label>
            <SearchableDropdown
              value={form.leadCountry}
              options={countryOptions}
              hasError={fieldError('leadCountry')}
              searchPlaceholder='Search country...'
              onChange={handleLeadCountryChange}
            />
          </div>
          <div>
            <label className='field-label'>Client Currency *</label>
            <SearchableDropdown
              value={form.clientCurrency}
              options={currencyOptions}
              hasError={fieldError('clientCurrency')}
              searchPlaceholder='Search currency...'
              onChange={value =>
                setForm(prev => ({
                  ...prev,
                  clientCurrency: String(value || '').toUpperCase()
                }))
              }
            />
            {form.leadCountry && COUNTRY_CURRENCY_NAME_MAP[form.leadCountry] && (
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                💡 Auto-selected based on {form.leadCountry}. You can change it manually.
              </p>
            )}
          </div>
          <Field
            label='Address / Location'
            value={form.location}
            onChange={value => setForm(prev => ({ ...prev, location: value }))}
          />
          <div>
            <label className='field-label'>Destination *</label>
            <SearchableDropdown
              value={form.destinationName}
              options={destinationOptions}
              hasError={fieldError('destinationName')}
              searchPlaceholder='Search destination...'
              onChange={value =>
                setForm(prev => ({ ...prev, destinationName: value }))
              }
            />
          </div>
          <div>
            <label className='field-label'>Travel Date *</label>
            <input
              type='date'
              min={minTravelDate}
              className={`field-input ${
                fieldError('travelDate') ? 'border-red-500' : ''
              }`}
              value={form.travelDate}
              onChange={event =>
                setForm(prev => ({ ...prev, travelDate: event.target.value }))
              }
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className='field-label'>Adults *</label>
              <input
                type='number'
                min={1}
                className={`field-input ${
                  fieldError('adultsChildren') ? 'border-red-500' : ''
                }`}
                value={form.adultsCount}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    adultsCount: event.target.value
                  }))
                }
              />
            </div>
            <div>
              <label className='field-label'>Children *</label>
              <input
                type='number'
                min={0}
                className={`field-input ${
                  fieldError('adultsChildren') ? 'border-red-500' : ''
                }`}
                value={form.childrenCount}
                onChange={event => {
                  const rawValue = event.target.value
                  const nextCount = Math.max(
                    0,
                    Math.floor(Number(rawValue || 0))
                  )
                  setForm(prev => ({
                    ...prev,
                    childrenCount: rawValue
                  }))
                  setChildAges(prev => {
                    if (nextCount === prev.length) return prev
                    if (nextCount < prev.length) return prev.slice(0, nextCount)
                    return [
                      ...prev,
                      ...Array.from(
                        { length: nextCount - prev.length },
                        () => ''
                      )
                    ]
                  })
                }}
              />
            </div>
          </div>
          {Number(form.childrenCount || 0) > 0 ? (
            <div className='md:col-span-2'>
              <label className='field-label'>Children Ages *</label>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                {Array.from({ length: Number(form.childrenCount || 0) }).map(
                  (_, index) => (
                    <input
                      key={`child-age-${index}`}
                      type='number'
                      min={0}
                      max={18}
                      step='1'
                      placeholder={`Child ${index + 1} age`}
                      className={`field-input ${
                        fieldError('childrenAges') ? 'border-red-500' : ''
                      }`}
                      value={childAges[index] ?? ''}
                      onChange={event =>
                        setChildAges(prev => {
                          const next = [...prev]
                          next[index] = event.target.value
                          return next
                        })
                      }
                    />
                  )
                )}
              </div>
            </div>
          ) : null}
          <div>
            <label className='field-label'>Budget</label>
            <CurrencyInput
              id='lead-budget'
              name='lead-budget'
              value={form.budget}
              decimalsLimit={2}
              allowNegativeValue={false}
              intlConfig={{
                locale: selectedCurrencyMeta.locale,
                currency: selectedCurrencyMeta.code
              }}
              className={`field-input ${
                fieldError('budget') ? 'border-red-500' : ''
              }`}
              placeholder='Enter budget'
              onValueChange={(value?: string) =>
                setForm(prev => ({ ...prev, budget: value || '' }))
              }
            />
            {formattedBudgetPreview ? (
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                Preview: {formattedBudgetPreview}
              </p>
            ) : null}
          </div>
          {isFieldVisible('visaRequired') && (
            <div>
              <label className='field-label'>Visa Required</label>
              <SearchableDropdown
                value={form.visaRequired}
                options={visaOptions}
                hasError={fieldError('visaRequired')}
                searchPlaceholder='Search visa requirement...'
                onChange={value =>
                  setForm(prev => ({
                    ...prev,
                    visaRequired: value as 'YES' | 'NO' | ''
                  }))
                }
              />
            </div>
          )}
          {isFieldVisible('preferredHotelCategory') && (
            <div>
              <label className='field-label'>Preferred Hotel Category </label>
              <SearchableDropdown
                value={form.preferredHotelCategory}
                options={hotelCategoryOptions}
                hasError={fieldError('preferredHotelCategory')}
                searchPlaceholder='Search hotel category...'
                onChange={value =>
                  setForm(prev => ({
                    ...prev,
                    preferredHotelCategory: value as
                      | '3_STAR'
                      | '4_STAR'
                      | '5_STAR'
                      | 'ANY'
                      | ''
                  }))
                }
              />
            </div>
          )}
          <div>
            <label className='field-label'>Purpose of Travel </label>
            <SearchableDropdown
              value={form.travelPurpose}
              options={travelPurposeOptions}
              hasError={fieldError('travelPurpose')}
              searchPlaceholder='Search purpose...'
              onChange={value =>
                setForm(prev => ({ ...prev, travelPurpose: value }))
              }
            />
          </div>
          {isFieldVisible('leadSource') && (
            <div>
              <label className='field-label'>Lead Source</label>
              <SearchableDropdown
                value={form.leadSource}
                options={leadSourceOptions}
                searchPlaceholder='Search lead source...'
                onChange={value =>
                  setForm(prev => ({ ...prev, leadSource: value }))
                }
              />
            </div>
          )}
          {isFieldVisible('campaignId') && (
            <div>
              <label className='field-label'>Campaign</label>
              <SearchableDropdown
                value={form.campaignId}
                options={campaignOptions}
                searchPlaceholder='Search campaign...'
                onChange={value =>
                  setForm(prev => ({ ...prev, campaignId: value }))
                }
              />
            </div>
          )}
          <div className='md:col-span-2'>
            <label className='field-label'>Notes</label>
            <textarea
              rows={4}
              className='field-input'
              value={form.notes}
              onChange={event =>
                setForm(prev => ({ ...prev, notes: event.target.value }))
              }
            />
          </div>
        </div>
      </SurfaceCard>

      <div className='flex justify-end'>
        <button
          onClick={() => void handleSubmit()}
          disabled={loading}
          className='inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60'
        >
          {loading ? 'Creating...' : 'Create Lead'}
          <FaCheckCircle />
        </button>
      </div>
    </div>
  )
}

const Field = ({
  label,
  value,
  onChange,
  error,
  type = 'text'
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: boolean
  type?: 'text' | 'email' | 'tel'
}) => (
  <div>
    <label className='field-label'>
      {label}
      {label.includes('*') ? '' : null}
    </label>
    <input
      type={type}
      className={`field-input ${error ? 'border-red-500' : ''}`}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  </div>
)

export default CreateLead
