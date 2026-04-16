import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCircleCheck,
  FaPenToSquare,
  FaPlus,
  FaRotate,
  FaEye,
  FaSort,
  FaChevronLeft,
  FaChevronRight,
  FaXmark
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import { suppliersApi } from '../../api/suppliers'
import { reportApiError } from '../../lib/notify'
import {
  PhoneInput,
  type CountryIso2,
  type PhoneInputRefType
} from 'react-international-phone'
import 'react-international-phone/style.css'
import { Country } from 'country-state-city'
import SearchableDropdown from '../../components/ui/SearchableDropdown'


interface Supplier {
  id: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
  panNumber?: string
  ssnNumber?: string
  ninoNumber?: string
  sinNumber?: string
  tfnNumber?: string
  gstNumber?: string
  addressLine?: string
  country?: string
  invoiceBeneficiaryName?: string
  invoiceBankName?: string
  invoiceAccountNumber?: string
  invoiceIfscSwift?: string
  invoiceUpiId?: string
  supplierCurrency?: string
  contractUrl?: string
  rateValidUntil?: string
  paymentDeadlineDate?: string
  productionCommitment?: string
  isActive?: boolean
}

type SupplierForm = {
  name: string
  contactPerson: string
  phone: string
  email: string
  panNumber: string
  ssnNumber: string
  ninoNumber: string
  sinNumber: string
  tfnNumber: string
  gstNumber: string
  addressLine: string
  country: string
  invoiceBeneficiaryName: string
  invoiceBankName: string
  invoiceAccountNumber: string
  invoiceIfscSwift: string
  invoiceUpiId: string
  supplierCurrency: string
  contractUrl: string
  rateValidUntil: string
  paymentDeadlineDate: string
  productionCommitment: string
  isActive: boolean
}

const emptySupplierForm: SupplierForm = {
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  panNumber: '',
  ssnNumber: '',
  ninoNumber: '',
  sinNumber: '',
  tfnNumber: '',
  gstNumber: '',
  addressLine: '',
  country: '',
  invoiceBeneficiaryName: '',
  invoiceBankName: '',
  invoiceAccountNumber: '',
  invoiceIfscSwift: '',
  invoiceUpiId: '',
  supplierCurrency: 'INR',
  contractUrl: '',
  rateValidUntil: '',
  paymentDeadlineDate: '',
  productionCommitment: '',
  isActive: true
}




const detectLocaleCountryIso2 = (): CountryIso2 => {
  if (typeof navigator === 'undefined' || !navigator.language) {
    return 'in'
  }
  const locale = navigator.language
  const region = locale.includes('-') ? locale.split('-')[1]?.toLowerCase() : ''
  return (region || 'in') as CountryIso2
}

const normalizeDate = (value?: string | null) => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
    return value.slice(0, 10)
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''
  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const unwrapList = (payload: unknown): any[] => {
  const data = (payload as { data?: unknown })?.data ?? payload
  if (Array.isArray((data as { data?: unknown[] })?.data)) {
    return (data as { data: unknown[] }).data
  }
  if (Array.isArray((data as { items?: unknown[] })?.items)) {
    return (data as { items: unknown[] }).items
  }
  if (Array.isArray(data)) return data
  return []
}

const unwrapObject = (payload: unknown): any =>
  (payload as { data?: unknown })?.data ?? payload

const mapSupplier = (raw: any): Supplier => ({
  id: String(raw?.id ?? ''),
  name: String(raw?.name ?? 'Unknown Supplier'),
  contactPerson: raw?.contactPerson ?? raw?.contact_person ?? '',
  phone: raw?.phone ?? '',
  email: raw?.email ?? '',
  panNumber: raw?.panNumber ?? raw?.pan_number ?? '',
  gstNumber: raw?.gstNumber ?? raw?.gst_number ?? '',
  ninoNumber: raw?.ninoNumber ?? raw?.nino_number ?? '',
  sinNumber: raw?.sinNumber ?? raw?.sin_number ?? '',
  tfnNumber: raw?.tfnNumber ?? raw?.tfn_number ?? '',
  addressLine: raw?.addressLine ?? raw?.address_line ?? raw?.address ?? '',
  country: raw?.country ?? '',
  invoiceBeneficiaryName: raw?.invoiceBeneficiaryName ?? raw?.invoice_beneficiary_name ?? '',
  invoiceBankName: raw?.invoiceBankName ?? raw?.invoice_bank_name ?? '',
  invoiceAccountNumber: raw?.invoiceAccountNumber ?? raw?.invoice_account_number ?? '',
  invoiceIfscSwift: raw?.invoiceIfscSwift ?? raw?.invoice_ifsc_swift ?? '',
  invoiceUpiId: raw?.invoiceUpiId ?? raw?.invoice_upi_id ?? '',
  supplierCurrency: raw?.supplierCurrency ?? raw?.supplier_currency ?? 'INR',
  contractUrl: raw?.contractUrl ?? raw?.contract_url ?? '',
  rateValidUntil: raw?.rateValidUntil ?? raw?.rate_valid_until ?? '',
  paymentDeadlineDate:
    raw?.paymentDeadlineDate ?? raw?.payment_deadline_date ?? '',
  productionCommitment:
    raw?.productionCommitment ?? raw?.production_commitment ?? '',
  isActive: raw?.isActive ?? raw?.is_active ?? true
})

const SuppliersPage: React.FC = () => {
  const navigate = useNavigate()
  const [loadingSuppliers, setLoadingSuppliers] = useState(false)
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierStatusFilter, setSupplierStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL')
  const [countryFilter, setCountryFilter] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<'name' | 'country'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingSupplierId, setEditingSupplierId] = useState<string>('')
  const [supplierForm, setSupplierForm] = useState<SupplierForm>(emptySupplierForm)
  const [phoneCountryIso2, setPhoneCountryIso2] = useState<CountryIso2>(() =>
    detectLocaleCountryIso2()
  )


  const phoneInputRef = useRef<PhoneInputRefType>(null)


  const countries = useMemo(() => {
    const uniqueCountries = new Set(suppliers.map(s => s.country).filter(Boolean))
    return Array.from(uniqueCountries).sort()
  }, [suppliers])

  const filteredAndSortedSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLowerCase()
    let filtered = suppliers.filter(supplier => {
      const statusMatch =
        supplierStatusFilter === 'ALL' ||
        (supplierStatusFilter === 'ACTIVE' && supplier.isActive !== false) ||
        (supplierStatusFilter === 'INACTIVE' && supplier.isActive === false)
      const countryMatch = countryFilter === 'ALL' || supplier.country === countryFilter
      const searchMatch = !query || `${supplier.name} ${supplier.contactPerson} ${supplier.email} ${supplier.country}`.toLowerCase().includes(query)
      return statusMatch && countryMatch && searchMatch
    })

    filtered.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name)
      } else if (sortBy === 'country') {
        comparison = (a.country || '').localeCompare(b.country || '')
      }
      return sortOrder === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [suppliers, supplierSearch, supplierStatusFilter, countryFilter, sortBy, sortOrder])

  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAndSortedSuppliers.slice(startIndex, endIndex)
  }, [filteredAndSortedSuppliers, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredAndSortedSuppliers.length / itemsPerPage)

  const supplierStats = useMemo(() => ({
    total: suppliers.length,
    active: suppliers.filter(item => item.isActive !== false).length,
    inactive: suppliers.filter(item => item.isActive === false).length
  }), [suppliers])

  const loadSuppliers = async () => {
    setLoadingSuppliers(true)
    setError('')
    try {
      const response = await suppliersApi.list({ page: 1, limit: 500 })
      const rows = unwrapList(response).map(mapSupplier)
      setSuppliers(rows)
    } catch (err) {
      reportApiError(err, 'Failed to load suppliers', setError)
    } finally {
      setLoadingSuppliers(false)
    }
  }

  useEffect(() => {
    void loadSuppliers()
  }, [])

  useEffect(() => {
    setCurrentPage(1)
  }, [supplierSearch, supplierStatusFilter, countryFilter])

  const resetSupplierForm = () => {
    setSupplierForm(emptySupplierForm)
    setEditingSupplierId('')
    setShowCreateModal(false)
  }

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplierId(supplier.id)
    setSupplierForm({
      name: supplier.name || '',
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      panNumber: supplier.panNumber || '',
      ssnNumber: supplier.ssnNumber || '',
      ninoNumber: supplier.ninoNumber || '',
      sinNumber: supplier.sinNumber || '',
      tfnNumber: supplier.tfnNumber || '',
      gstNumber: supplier.gstNumber || '',
      addressLine: supplier.addressLine || '',
      country: supplier.country || '',
      invoiceBeneficiaryName: supplier.invoiceBeneficiaryName || '',
      invoiceBankName: supplier.invoiceBankName || '',
      invoiceAccountNumber: supplier.invoiceAccountNumber || '',
      invoiceIfscSwift: supplier.invoiceIfscSwift || '',
      invoiceUpiId: supplier.invoiceUpiId || '',
      supplierCurrency: supplier.supplierCurrency || 'INR',
      contractUrl: supplier.contractUrl || '',
      rateValidUntil: normalizeDate(supplier.rateValidUntil),
      paymentDeadlineDate: normalizeDate(supplier.paymentDeadlineDate),
      productionCommitment: supplier.productionCommitment || '',
      isActive: supplier.isActive !== false
    })
    setShowCreateModal(true)
  }

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      setError('Supplier name is required')
      return
    }

    setSavingSupplier(true)
    setError('')
    setNotice('')

    try {
      const payload = {
        name: supplierForm.name.trim(),
        contactPerson: supplierForm.contactPerson.trim() || undefined,
        phone: supplierForm.phone.trim() || undefined,
        email: supplierForm.email.trim() || undefined,
        panNumber: supplierForm.panNumber.trim() || undefined,
        gstNumber: supplierForm.gstNumber.trim() || undefined,
        addressLine: supplierForm.addressLine.trim() || undefined,
        country: supplierForm.country.trim() || undefined,
        invoiceBeneficiaryName:
          supplierForm.invoiceBeneficiaryName.trim() || undefined,
        invoiceBankName: supplierForm.invoiceBankName.trim() || undefined,
        invoiceAccountNumber:
          supplierForm.invoiceAccountNumber.trim() || undefined,
        invoiceIfscSwift: supplierForm.invoiceIfscSwift.trim() || undefined,
        invoiceUpiId: supplierForm.invoiceUpiId.trim() || undefined,
        supplierCurrency: supplierForm.supplierCurrency.trim() || undefined,
        contractUrl: supplierForm.contractUrl.trim() || undefined,
        rateValidUntil: supplierForm.rateValidUntil || undefined,
        paymentDeadlineDate: supplierForm.paymentDeadlineDate || undefined,
        productionCommitment: supplierForm.productionCommitment.trim() || undefined,
        isActive: supplierForm.isActive
      }

      if (editingSupplierId) {
        const updated = await suppliersApi.update(editingSupplierId, payload)
        const row = mapSupplier(unwrapObject(updated))
        setSuppliers(prev => prev.map(item => (item.id === row.id ? row : item)))
        setNotice('Supplier updated successfully')
      } else {
        const created = await suppliersApi.create(payload)
        const row = mapSupplier(unwrapObject(created))
        setSuppliers(prev => [row, ...prev])
        setNotice('Supplier created successfully')
      }

      resetSupplierForm()
    } catch (err) {
      reportApiError(err, 'Failed to save supplier', setError)
    } finally {
      setSavingSupplier(false)
    }
  }

  const handleSort = (field: 'name' | 'country') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
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


  const countryMetaByName = useMemo(() => {
    const map = new Map<
      string,
      { iso2: CountryIso2, currency: string }
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

  const resolveCurrencybyIso2 = (iso2: CountryIso2): string => {
    const countryName = countryNameByIso2.get(iso2)
    if (!countryName) return 'INR'
    return COUNTRY_CURRENCY_NAME_MAP[countryName] || 'INR'
  }
  // const allCountryNames = useMemo(
  //   () => Country.getAllCountries().map(country => country.name),
  //   []
  // )

  const countryOptions = useMemo(() => {
    return Country.getAllCountries().map(c => ({
      label: c.name,
      value: c.name,
      isoCode: c.isoCode
    }))
  }, [])

  const handleSupplierCountryChange = (countryName: string) => {
    const meta = countryMetaByName.get(countryName)
    if (!meta) {
      setSupplierForm(prev => ({
        ...prev,
        country: countryName
      }))
      return
    }

    setPhoneCountryIso2(meta.iso2)
    setSupplierForm(prev => ({
      ...prev,
      country: countryName,
      supplierCurrency: meta.currency || prev.supplierCurrency || 'INR'
    }))
  }

  const handlePhoneChange = (
    phone: string,
    meta: { country: { iso2: CountryIso2 } }
  ) => {

    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length > 12) return


    const iso2 = meta.country?.iso2
    if (!iso2) {
      setSupplierForm(prev => ({ ...prev, phone }))
      return
    }

    const mappedCountryName = countryNameByIso2.get(iso2)
    setPhoneCountryIso2(iso2)
    setSupplierForm(prev => ({
      ...prev,
      phone,
      country: mappedCountryName || prev.country,
      supplierCurrency: resolveCurrencybyIso2(iso2)
    }))
  }

  const taxfields = () => {
    switch (supplierForm.country) {
      case 'United States':
        return (
          <div id='ssnnumber'>
            <label className='field-label'>SSN Number</label>
            <input
              value={supplierForm.ssnNumber}
              onChange={e => setSupplierForm(prev => ({ ...prev, ssnNumber: e.target.value.toUpperCase() }))}
              className='field-input'
              placeholder='123-45-6789'
            />
          </div>
        )
      case 'United Kingdom':
        return (
          <div id='ninonumber'>
            <label className='field-label'>NINO Number</label>
            <input
              value={supplierForm.ninoNumber}
              onChange={e => setSupplierForm(prev => ({ ...prev, ninoNumber: e.target.value.toUpperCase() }))}
              className='field-input'
              placeholder='QQ 12 34 56 C'
            />
          </div>
        )
      case 'Canada':
        return (
          <div id='sinnumber'>
            <label className='field-label'>SIN Number</label>
            <input
              value={supplierForm.sinNumber}
              onChange={e => setSupplierForm(prev => ({ ...prev, sinNumber: e.target.value.toUpperCase() }))}
              className='field-input'
              placeholder=''
            />
          </div>
        )
      case 'Australia':
        return (
          <div id='tfnnumber'>
            <label className='field-label'>TFN Number</label>
            <input
              value={supplierForm.tfnNumber}
              onChange={e => setSupplierForm(prev => ({ ...prev, tfnNumber: e.target.value.toUpperCase() }))}
              className='field-input'
              placeholder='XXX-XXX-XXX'
            />
          </div>
        )
      default:
        return (
          <div id='pannumber'>
            <label className='field-label'>PAN Number</label>
            <input
              value={supplierForm.panNumber}
              onChange={e => setSupplierForm(prev => ({ ...prev, panNumber: e.target.value.toUpperCase() }))}
              className='field-input'
              placeholder='ABCDE1234F'
            />
          </div>)
    }

  }

  return (
    <div className='space-y-5'>
      <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Supplier Management
          </h1>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Manage suppliers, contracts, and business relationships
          </p>
        </div>
        <div className='flex gap-2'>
          <button
            onClick={() => void loadSuppliers()}
            className='inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
          >
            <FaRotate /> Refresh
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700'
          >
            <FaPlus /> Add Supplier
          </button>
        </div>
      </div>

      {error && (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-300'>
          {error}
        </div>
      )}
      {notice && (
        <div className='rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-900 dark:bg-green-900/30 dark:text-green-300'>
          {notice}
        </div>
      )}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        <StatCard title='Total Suppliers' value={supplierStats.total} color='blue' />
        <StatCard title='Active' value={supplierStats.active} color='green' />
        <StatCard title='Inactive' value={supplierStats.inactive} color='gray' />
      </div>

      <SurfaceCard className='p-0'>
        <div className='border-b border-gray-200 p-4 dark:border-gray-700'>
          <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <input
              value={supplierSearch}
              onChange={e => setSupplierSearch(e.target.value)}
              className='field-input max-w-md'
              placeholder='Search suppliers...'
            />
            <div className='flex flex-wrap gap-2'>
              <select
                value={supplierStatusFilter}
                onChange={e => setSupplierStatusFilter(e.target.value as any)}
                className='field-input'
              >
                <option value='ALL'>All Status</option>
                <option value='ACTIVE'>Active</option>
                <option value='INACTIVE'>Inactive</option>
              </select>
              <select
                value={countryFilter}
                onChange={e => setCountryFilter(e.target.value)}
                className='field-input'
              >
                <option value='ALL'>All Countries</option>
                {countries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className='overflow-x-auto'>
          {loadingSuppliers ? (
            <div className='flex items-center justify-center py-12'>
              <FaRotate className='h-8 w-8 animate-spin text-blue-600' />
            </div>
          ) : paginatedSuppliers.length ? (
            <table className='w-full'>
              <thead className='bg-gray-50 dark:bg-gray-800/50'>
                <tr className='border-b border-gray-200 dark:border-gray-700'>
                  <th className='px-4 py-3 text-left'>
                    <button
                      onClick={() => handleSort('name')}
                      className='inline-flex items-center gap-1 text-xs font-semibold uppercase text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    >
                      Supplier Name
                      {sortBy === 'name' && <FaSort />}
                    </button>
                  </th>
                  <th className='px-4 py-3 text-left'>
                    <button
                      onClick={() => handleSort('country')}
                      className='inline-flex items-center gap-1 text-xs font-semibold uppercase text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                    >
                      Country
                      {sortBy === 'country' && <FaSort />}
                    </button>
                  </th>
                  <th className='px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Currency</th>
                  <th className='px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Contact Person</th>
                  <th className='px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Phone</th>
                  <th className='px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Email</th>
                  <th className='px-4 py-3 text-center text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Status</th>
                  <th className='px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600 dark:text-gray-400'>Actions</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                {paginatedSuppliers.map(supplier => (
                  <tr
                    key={supplier.id}
                    onClick={() => navigate(`/suppliers/${supplier.id}`)}
                    className='cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  >
                    <td className='px-4 py-3'>
                      <p className='font-semibold text-gray-900 dark:text-gray-100'>{supplier.name}</p>
                    </td>
                    <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>{supplier.country || '-'}</td>
                    <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>{supplier.supplierCurrency}</td>
                    <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>{supplier.contactPerson || '-'}</td>
                    <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>{supplier.phone || '-'}</td>
                    <td className='px-4 py-3 text-sm text-gray-700 dark:text-gray-300'>{supplier.email || '-'}</td>
                    <td className='px-4 py-3 text-center'>
                      {supplier.isActive !== false ? (
                        <span className='inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300'>
                          <FaCircleCheck /> Active
                        </span>
                      ) : (
                        <span className='inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-300'>
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className='px-4 py-3 text-right'>
                      <div className='flex items-center justify-end gap-2'>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            navigate(`/suppliers/${supplier.id}`)
                          }}
                          className='inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-900/30 dark:text-blue-300'
                        >
                          <FaEye /> View
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            handleEditSupplier(supplier)
                          }}
                          className='inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                        >
                          <FaPenToSquare /> Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className='py-12 text-center'>
              <p className='text-sm text-gray-500'>No suppliers found</p>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className='flex items-center justify-between border-t border-gray-200 px-4 py-3 dark:border-gray-700'>
            <p className='text-sm text-gray-600 dark:text-gray-400'>
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredAndSortedSuppliers.length)} of {filteredAndSortedSuppliers.length} suppliers
            </p>
            <div className='flex gap-2'>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className='inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700'
              >
                <FaChevronLeft /> Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className='inline-flex items-center gap-1 rounded-md border border-gray-200 px-3 py-1 text-sm disabled:opacity-50 dark:border-gray-700'
              >
                Next <FaChevronRight />
              </button>
            </div>
          </div>
        )}
      </SurfaceCard>

      {showCreateModal && (
        <div className='fixed -inset-5 z-50 bg-black/50 p-3 sm:p-4'>
          <div className='mx-auto flex h-full w-full max-w-5xl items-center justify-center'>
            <div className='flex max-h-[94vh] w-full flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900'>
              <div className='flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700 sm:px-6'>
                <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  {editingSupplierId ? 'Edit Supplier' : 'Create Supplier'}
                </h2>
                <button onClick={resetSupplierForm} className='rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800'>
                  <FaXmark />
                </button>
              </div>

              <div className='flex-1 overflow-y-auto px-4 py-4 sm:px-6'>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
                  <div className='md:col-span-2 lg:col-span-3'>
                    <label className='field-label'>Supplier Name *</label>
                    <input
                      value={supplierForm.name}
                      onChange={e =>{
                           const value = e.target.value
                        const OnlyLetters = /^[a-zA-Z\s]*$/
                        if (!OnlyLetters.test(value)) return
                        setSupplierForm(prev => ({ ...prev, name: value }))}}
                      className='field-input'
                      placeholder='Enter supplier name'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Contact Person</label>
                    <input
                      value={supplierForm.contactPerson}
                      onChange={e => {
                        const value = e.target.value
                        const OnlyLetters = /^[a-zA-Z\s]*$/
                        if (!OnlyLetters.test(value)) return

                        setSupplierForm(prev => ({ ...prev, contactPerson: value }))
                      }}
                      className='field-input'
                      placeholder='Enter contact person'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Phone</label>
                    <PhoneInput
                      ref={phoneInputRef}
                      defaultCountry={phoneCountryIso2}
                      value={supplierForm.phone}
                      onChange={handlePhoneChange}
                      inputClassName="field-input"
                      countrySelectorStyleProps={{
                        buttonClassName: "phone-flag-btn"
                      }}
                    />

                    {supplierForm.phone && (
                      <p style={{ color: 'green', fontSize: '12px' }}>
                        {/* Phone number format looks valid. */}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className='field-label'>Email</label>
                    <input
                      type='email'
                      required={true}
                      value={supplierForm.email}
                      onChange={e => setSupplierForm(prev => ({ ...prev, email: e.target.value }))}
                      className='field-input'
                      placeholder='Enter email address'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Country</label>
                    <SearchableDropdown
                      value={supplierForm.country}
                      options={countryOptions}
                      onChange={handleSupplierCountryChange}
                      placeholder='Enter country'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Supplier Currency</label>
                    <SearchableDropdown
                      value={supplierForm.supplierCurrency}
                      options={currencyOptions}
                      onChange={value => setSupplierForm(prev => ({ ...prev, supplierCurrency: String(value || '').toUpperCase() }))}
                      searchPlaceholder='INR / USD / AED'
                    />
                  </div>

                  <div>
                    <label className='field-label'>Rate Valid Until</label>
                    <input
                      type='date'
                      value={supplierForm.rateValidUntil}
                      onChange={e => setSupplierForm(prev => ({ ...prev, rateValidUntil: e.target.value }))}
                      className='field-input'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Payment Deadline</label>
                    <input
                      type='date'
                      value={supplierForm.paymentDeadlineDate}
                      onChange={e => setSupplierForm(prev => ({ ...prev, paymentDeadlineDate: e.target.value }))}
                      className='field-input'
                    />
                  </div>

                  <div >
                    {taxfields()}
                  </div>

                  <div>
                    <label className='field-label'>GST Number</label>
                    <input
                      value={supplierForm.gstNumber}
                      onChange={e => setSupplierForm(prev => ({ ...prev, gstNumber: e.target.value.toUpperCase() }))}
                      className='field-input'
                      placeholder='27ABCDE1234F1Z5'
                    />
                  </div>

                  <div className='md:col-span-2 lg:col-span-2'>
                    <label className='field-label'>Contract URL</label>
                    <input
                      type='url'
                      value={supplierForm.contractUrl}
                      onChange={e => setSupplierForm(prev => ({ ...prev, contractUrl: e.target.value }))}
                      className='field-input'
                      placeholder='https://...'
                    />
                  </div>
                  <div className='md:col-span-2 lg:col-span-3'>
                    <label className='field-label'>Address</label>
                    <textarea
                      rows={2}
                      value={supplierForm.addressLine}
                      onChange={e => setSupplierForm(prev => ({ ...prev, addressLine: e.target.value }))}
                      className='field-input'
                      placeholder='Supplier address'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Beneficiary Name</label>
                    <input
                      value={supplierForm.invoiceBeneficiaryName}
                      onChange={e => setSupplierForm(prev => ({ ...prev, invoiceBeneficiaryName: e.target.value }))}
                      className='field-input'
                      placeholder='Beneficiary name'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Bank Name</label>
                    <input
                      value={supplierForm.invoiceBankName}
                      onChange={e => setSupplierForm(prev => ({ ...prev, invoiceBankName: e.target.value }))}
                      className='field-input'
                      placeholder='Bank name'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Account Number</label>
                    <input
                      value={supplierForm.invoiceAccountNumber}
                      onChange={e => setSupplierForm(prev => ({ ...prev, invoiceAccountNumber: e.target.value }))}
                      className='field-input'
                      placeholder='Account number'
                    />
                  </div>
                  <div>
                    <label className='field-label'>IFSC / SWIFT</label>
                    <input
                      value={supplierForm.invoiceIfscSwift}
                      onChange={e => setSupplierForm(prev => ({ ...prev, invoiceIfscSwift: e.target.value.toUpperCase() }))}
                      className='field-input'
                      placeholder='IFSC / SWIFT'
                    />
                  </div>
                  <div>
                    <label className='field-label'>UPI ID</label>
                    <input
                      value={supplierForm.invoiceUpiId}
                      onChange={e => setSupplierForm(prev => ({ ...prev, invoiceUpiId: e.target.value }))}
                      className='field-input'
                      placeholder='name@upi'
                    />
                  </div>
                  <div className='md:col-span-2 lg:col-span-3'>
                    <label className='field-label'>Production Commitment</label>
                    <textarea
                      rows={3}
                      value={supplierForm.productionCommitment}
                      onChange={e => setSupplierForm(prev => ({ ...prev, productionCommitment: e.target.value }))}
                      className='field-input'
                      placeholder='Write production commitment details'
                    />
                  </div>
                </div>
              </div>

              <div className='flex flex-col gap-3 border-t border-gray-200 px-4 py-3 dark:border-gray-700 sm:flex-row sm:items-center sm:justify-between sm:px-6'>
                <label htmlFor='supplier-active-modal' className='inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
                  <input
                    id='supplier-active-modal'
                    type='checkbox'
                    checked={supplierForm.isActive}
                    onChange={e => setSupplierForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Supplier is active
                </label>
                <div className='flex flex-wrap gap-2'>
                  <button
                    onClick={resetSupplierForm}
                    className='rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => void handleSaveSupplier()}
                    disabled={savingSupplier}
                    className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
                  >
                    <FaCircleCheck /> {editingSupplierId ? 'Update' : 'Create'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
  }



const StatCard = ({ title, value, color }: { title: string; value: number; color: 'blue' | 'green' | 'gray' }) => {
  const colorClasses = {
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-300',
    green: 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-900/20 dark:text-green-300',
    gray: 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/60 dark:text-gray-300'
  }

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <p className='text-xs font-medium uppercase tracking-wide opacity-75'>{title}</p>
      <p className='mt-1 text-3xl font-bold'>{value}</p>
    </div>
  )
}


export default SuppliersPage
