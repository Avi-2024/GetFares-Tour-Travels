import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaArrowRotateRight,
  FaCheck,
  FaDesktop,
  FaDownload,
  FaEnvelope,
  FaFloppyDisk,
  FaMobileScreen,
  FaPlus,
  FaPencil,
  FaTrash
} from 'react-icons/fa6'
import {
  FaPlane,
  FaHotel,
  FaCarSide,
  FaShieldAlt,
  FaMapMarkedAlt
} from 'react-icons/fa'
import type { IconType } from 'react-icons'
import SurfaceCard from '../../components/ui/SurfaceCard'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { suppliersApi } from '../../api/suppliers'
import { quotationsApi } from '../../api/quotations'
import { reportApiError } from '../../lib/notify'
import { useAuth } from '../../context/AuthContext'
import { useLeadsService } from '../../hooks/useLeadsService'
import { getCurrencyOptions } from '../../utils/currency'
import { getNationalityOptions } from '../../utils/nationality'
import { nowWallClockString } from '../../utils/clientWallClock'
import { getBrowserTimeZone } from '../../utils/dateTimePreferences'
import { Country } from 'country-state-city'

type Currency = string
type SavedQuote = {
  id: string
  quoteNumber: string
  customer: string
  email: string
  destination: string
  details: string
  total: number
  margin: number
  status: 'pending' | 'draft'
  lastSent: string | null
  sentDate: string | null
}
interface Item {
  id: string
  day: string
  title: string
  description: string
}

type LeadOption = {
  id: string
  leadId?: string | null
  leadCode?: string | null
  lead_code?: string | null
  metaLeadId?: string | null
  meta_lead_id?: string | null
  code?: string | null
  fullName?: string | null
  email?: string | null
  phone?: string | null
  clientCurrency?: string | null
  client_currency?: string | null
  destinationId?: string | null
  destination?: any
  destinationName?: string | null
  travelDate?: string | null
  adultsCount?: number | null
  childrenCount?: number | null
  travelPurpose?: string | null
  leadCountry?: string | null
  country?: string | null
  nationality?: string | null
  addressLine?: string | null
  address_line?: string | null
  panNumber?: string | null
  pan_number?: string | null
  budget?: number | null
  childAges?: number[] | null
}

type TemplateType = 'READY_PACKAGE' | 'VISA' | 'CUSTOM_ITINERARY'

type TemplateOption = {
  id: string
  code: string
  name: string
  templateType: TemplateType
  isActive: boolean
  minMarginPercent: number
  headerBranding?: string
  inclusions?: string
  exclusions?: string
  paymentTerms?: string
  cancellationPolicy?: string
  footerDisclaimer?: string
}

type ServiceKey =
  | 'hotel'
  | 'flights'
  | 'tours'
  | 'visa'
  | 'insurance'
  | 'insurance2'

type ServiceDefinition = {
  key: ServiceKey
  label: string
  itemType: 'HOTEL' | 'FLIGHT' | 'TRANSFER' | 'VISA' | 'INSURANCE' | 'OTHER'
  weight: number
}

type ServiceCostRow = ServiceDefinition & {
  baseCost: number
  markupPercent: number
  markupAmount: number
  sellValue: number
}

type AddOnService = {
  id: string
  name: string
  baseCost: number
  markup: number
  markupPercent?: number
  sellValue: number
  supplierId?: string
  supplierName?: string
}

type PricingCosts = {
  supplierCost: number
  markupPercent: number
  serviceFee: number
  taxPercent: number
  discount: number
}

type FinanceBreakdown = {
  supplierTaxPercent: number
  supplierTaxAmount: number
  gstEnabled: boolean
  gstPercent: number
  gstAmount: number
  tcsEnabled: boolean
  tcsPercent: number
  tcsAmount: number
  totalSaleValue: number
  addOns: number
  subtotal: number
  taxAmount: number
  totalMarkup: number
}

type ServiceOverrideValue = {
  baseCost?: string
  markupPercent?: string
  serviceCharge?: string
  sellValue?: string
  paymentTerms?: string
  supplierId?: string
  supplierName?: string
}

type ServiceOverridesState = Record<string, ServiceOverrideValue>
type PricingField = keyof ServiceOverrideValue
type NumericPricingField = 'baseCost' | 'markupPercent' | 'serviceCharge' | 'sellValue'
type PricingFieldErrors = Record<string, string>

type InclusionShortcut = {
  key: string
  label: string
  icon: IconType
  line: string
}

const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  { key: 'hotel', label: 'Accommodation', itemType: 'HOTEL', weight: 40 },
  { key: 'flights', label: 'Flights', itemType: 'FLIGHT', weight: 25 },
  { key: 'tours', label: 'Tours & Activities', itemType: 'OTHER', weight: 15 },
  { key: 'visa', label: 'Visa Services', itemType: 'VISA', weight: 5 },
  { key: 'insurance', label: 'Insurance', itemType: 'INSURANCE', weight: 8 },
  { key: 'insurance2', label: 'Land Arrangement', itemType: 'TRANSFER', weight: 7 }
]

const INCLUSION_SHORTCUTS: InclusionShortcut[] = [
  {
    key: 'flights',
    label: 'Flights',
    icon: FaPlane,
    line: 'flight tickets'
  },
  {
    key: 'hotel',
    label: 'Hotel',
    icon: FaHotel,
    line: 'Hotel accommodation'
  },
  {
    key: 'transfer',
    label: 'Transfer',
    icon: FaCarSide,
    line: 'Airport and local transfers'
  },
  {
    key: 'insurance',
    label: 'Insurance',
    icon: FaShieldAlt,
    line: 'Travel insurance coverage'
  },
  {
    key: 'tours',
    label: 'Tour & Sightseeing',
    icon: FaMapMarkedAlt,
    line: 'Tour and sightseeing services'
  }
]

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function isUuid(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return UUID_REGEX.test(value.trim())
}

function unwrapApiData<T>(response: unknown): T | null {
  if (!response) return null
  if (typeof response === 'object' && response && 'data' in response) {
    return ((response as { data?: unknown }).data ?? null) as T | null
  }
  return response as T
}

function toTrimmedString(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue
    const text = String(value)
    if (text.trim()) return text
  }
  return ''
}

function resolveLeadDisplayId(
  lead:
    | Pick<
      LeadOption,
      | 'leadId'
      | 'leadCode'
      | 'lead_code'
      | 'metaLeadId'
      | 'meta_lead_id'
      | 'code'
      | 'id'
    >
    | null
): string {
  if (!lead) return ''
  const isUuidLike = (value: unknown): boolean =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      toTrimmedString(value)
    )

  const preferredCode = firstNonEmptyString(
    lead.leadCode,
    lead.lead_code,
    lead.metaLeadId,
    lead.meta_lead_id,
    lead.code
  )
  if (preferredCode && !isUuidLike(preferredCode)) {
    return preferredCode
  }

  const leadIdValue = firstNonEmptyString(lead.leadId)
  if (leadIdValue && !isUuidLike(leadIdValue)) {
    return leadIdValue
  }

  return firstNonEmptyString(preferredCode, leadIdValue, lead.id)
}

function toFiniteNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  }
  return fallback
}

function toYesNoString(value: unknown): 'YES' | 'NO' | '' {
  if (value === null || value === undefined || String(value).trim() === '') {
    return ''
  }
  if (typeof value === 'boolean') {
    return value ? 'YES' : 'NO'
  }
  if (typeof value === 'number') {
    return value === 1 ? 'YES' : value === 0 ? 'NO' : ''
  }
  const normalized = String(value).trim().toLowerCase()
  if (normalized === 'true' || normalized === '1' || normalized === 'yes') return 'YES'
  if (normalized === 'false' || normalized === '0' || normalized === 'no') return 'NO'
  return ''
}

function toDateInputString(value: unknown): string {
  const text = toTrimmedString(value)
  if (!text) return ''
  const parsed = new Date(text)
  if (Number.isNaN(parsed.getTime())) {
    return text.length >= 10 ? text.slice(0, 10) : ''
  }
  return parsed.toISOString().slice(0, 10)
}

function normalizeServiceKey(value: unknown): ServiceKey | null {
  const normalized = toTrimmedString(value).toLowerCase()
  if (!normalized) return null
  const matched = SERVICE_DEFINITIONS.find(
    definition => definition.key === normalized
  )
  return matched?.key ?? null
}

function parseNightsFromDuration(duration: unknown, fallback: number): number {
  if (duration == null || duration === '') return fallback
  const s = String(duration)
  const m = s.match(/(\d+)\s*N/i)
  if (m) return Math.max(1, Number(m[1]) || fallback)
  const n = Number(s)
  if (Number.isFinite(n) && n > 0) return Math.floor(n)
  return fallback
}

function unwrapPackageResponse(res: unknown): Record<string, unknown> | null {
  if (!res || typeof res !== 'object') return null
  const r = res as { data?: unknown }
  const d = r.data
  if (d && typeof d === 'object' && 'data' in (d as object)) {
    const nested = (d as { data?: unknown }).data
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return nested as Record<string, unknown>
    }
  }
  if (d && typeof d === 'object' && !Array.isArray(d)) {
    return d as Record<string, unknown>
  }
  return null
}

function toDateInputValue(
  value: string,
  fallbackNights: number
): string | null {
  if (!value) return null
  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  parsed.setDate(parsed.getDate() + Math.max(0, Number(fallbackNights) || 0))
  return parsed.toISOString().slice(0, 10)
}

function formatDurationLabel(
  duration: unknown,
  fallbackNights: number
): string {
  const raw = String(duration ?? '').trim()
  if (raw) return raw

  const nights = Math.max(0, Number(fallbackNights) || 0)
  if (!nights) return ''

  return `${nights}N/${nights + 1}D`
}

function pluralize(
  value: number,
  singular: string,
  plural = `${singular}s`
): string {
  return `${value} ${value === 1 ? singular : plural}`
}

function parseDurationParts(duration: unknown): {
  nights: string
  days: string
} {
  const text = String(duration ?? '')
  const nights = text.match(/(\d+)\s*N/i)?.[1] ?? ''
  const days = text.match(/(\d+)\s*D/i)?.[1] ?? ''
  return { nights, days }
}

function parseDayCount(value: unknown): number {
  const count = Number(value)
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 0
}

function buildDurationValue(nights: unknown, days: unknown): string {
  const safeNights = String(nights ?? '').trim()
  const safeDays = String(days ?? '').trim()

  if (safeNights && safeDays) return `${safeNights}N/${safeDays}D`
  if (safeNights) return `${safeNights}N`
  if (safeDays) return `${safeDays}D`
  return ''
}

function getDayLabel(index: number): string {
  return `Day ${index + 1}`
}

function buildItineraryRows(dayCount: number, existing: Item[] = []): Item[] {
  return Array.from({ length: Math.max(0, dayCount) }, (_, index) => {
    const current = existing[index]
    return {
      id: current?.id ?? `day-${index + 1}`,
      day: getDayLabel(index),
      title: current?.title ?? '',
      description: current?.description ?? ''
    }
  })
}

function areItineraryRowsEqual(left: Item[], right: Item[]): boolean {
  if (left.length !== right.length) return false
  return left.every((item, index) => {
    const next = right[index]
    return (
      item.id === next?.id &&
      item.day === next?.day &&
      item.title === next?.title &&
      item.description === next?.description
    )
  })
}

function normalizeNumericOverride(
  value: string,
  options: { min: number; max?: number; precision?: number }
): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  const parsed = Number(trimmed)
  if (!Number.isFinite(parsed)) return ''
  const bounded =
    options.max != null
      ? Math.min(options.max, Math.max(options.min, parsed))
      : Math.max(options.min, parsed)
  if (options.precision == null) return String(bounded)
  return bounded.toFixed(options.precision)
}

function getNumericOverrideError(
  value: string | undefined,
  options: { min: number; max?: number }
): string {
  if (value === undefined || value === '') return ''
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return 'Invalid number'
  if (parsed < options.min) return `Must be >= ${options.min}`
  if (options.max != null && parsed > options.max)
    return `Must be <= ${options.max}`
  return ''
}

const initialItinerary: Item[] = [
 
]

type QuotationBuilderPageProps = {
  mode?: 'create' | 'edit'
  quotationId?: string
}

const QuotationBuilderPage: React.FC<QuotationBuilderPageProps> = ({
  mode = 'create',
  quotationId = ''
}) => {
  const navigate = useNavigate()
  const location = useLocation()
  const editingQuotationId = quotationId
  const isEditMode = mode === 'edit'
  const { token } = useAuth()
  const leadsService = useLeadsService()
  const [loadingEditQuotation, setLoadingEditQuotation] = useState(false)
  const [loadedQuotationStatus, setLoadedQuotationStatus] = useState<
    string | null
  >(null)
  const [hasLoadedEditSnapshot, setHasLoadedEditSnapshot] = useState(false)
  const [showPreview, setShowPreview] = useState(true)
  const [mobile, setMobile] = useState(false)
  const [currency, setCurrency] = useState<Currency>('INR')
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [leadsLoading, setLeadsLoading] = useState(false)
  const [leadsError, setLeadsError] = useState('')
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [templatesLoading, setTemplatesLoading] = useState(false)
  const [templatesError, setTemplatesError] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [suppliers, setSuppliers] = useState<
    Array<{ id: string; name: string }>
  >([])
  const [suppliersLoading, setSuppliersLoading] = useState(false)
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saving, setSaving] = useState(false)
  const [destinationMap, setDestinationMap] = useState<Record<string, string>>(
    {}
  )
  const [form, setForm] = useState({
    quote: '',
    version: 'Draft',
    quotationTitle: '',
    customer: '',
    email: '',
    phone: '',
    leadCountry: '',
    nationality: '',
    addressLine: '',
    panNumber: '',
    budget: '',
    destination: '',
    startDate: '',
    endDate: '',
    nights: 1,
    durationDays: '2',
    adults: 1,
    visaRequired: '',
    preferredHotelCategory: '',
    travelPurpose: '',
    leadSource: '',
    campaignId: '',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    children: 0,
    childAges: [] as string[],
    inclusions: '',
    exclusions: '',
    headerBranding: '',
    paymentTerms: '',
    cancellationPolicy: '',
    footerDisclaimer: '',
    hotelDetails: '',
    visaDetails: ''
  })
  const [downloading, setDownloading] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [itineraryItems, setItineraryItems] = useState<Item[]>(
    buildItineraryRows(2, initialItinerary)
  )
  const [showAddModal, setShowAddModal] = useState(false)
  const [showAddOnModal, setShowAddOnModal] = useState(false)
  const [newItem, setNewItem] = useState<{
    day: string
    title: string
    description: string
  }>({
    day: 'Day 3',
    title: '',
    description: ''
  })
  const [packageType] = useState('Leisure')
  const [services] = useState<Record<ServiceKey, boolean>>({
    hotel: true,
    flights: true,
    tours: true,
    visa: false,
    insurance: true,
    insurance2: true
  })
  const [costs, setCosts] = useState<PricingCosts>({
    supplierCost: 0,
    markupPercent: 0,
    serviceFee: 0,
    taxPercent: 0,
    discount: 0
  })

  // Finance breakdown state for detailed cost tracking
  const [finance, setFinance] = useState<FinanceBreakdown>({
    supplierTaxPercent: 0,
    supplierTaxAmount: 0,
    gstEnabled: false,
    gstPercent: 18,
    gstAmount: 0,
    tcsEnabled: false,
    tcsPercent: 5,
    tcsAmount: 0,
    totalSaleValue: 0,
    // Additional fields for comprehensive tracking
    addOns: 0,
    subtotal: 0,
    taxAmount: 0,
    totalMarkup: 0
  })

  // Currency state for multi-currency support
  const [currencies, setCurrencies] = useState({
    costCurrency: 'INR',
    clientCurrency: 'INR',
    supplierCurrency: 'INR'
  })
  const [addOnServices, setAddOnServices] = useState<AddOnService[]>([])
  const [addOnDraft, setAddOnDraft] = useState({
    name: '',
    baseCost: '',
    markupPercent: '',
    supplierId: '',
    supplierName: '',
    sellValue: ''
  })
  const addOnComputedSellValue = useMemo(() => {
    const baseCost = Number(addOnDraft.baseCost)
    const markupPercent = Number(addOnDraft.markupPercent)
    if (!Number.isFinite(baseCost) || !Number.isFinite(markupPercent)) return 0
    const boundedBase = Math.max(0, baseCost)
    const boundedPercent = Math.min(100, Math.max(0, markupPercent))
    const markupAmount = Number(((boundedBase * boundedPercent) / 100).toFixed(2))
    return Number((boundedBase + markupAmount).toFixed(2))
  }, [addOnDraft.baseCost, addOnDraft.markupPercent])
  const [serviceOverrides, setServiceOverrides] =
    useState<ServiceOverridesState>({})
  const [changedPricingCells, setChangedPricingCells] = useState<
    Record<string, boolean>
  >({})
  const previewRef = useRef<HTMLDivElement | null>(null)
  const skipLeadAutofillRef = useRef(false)

  const preselectedLeadId = useMemo(() => {
    const value = new URLSearchParams(location.search).get('leadId') || ''
    return isUuid(value) ? value : ''
  }, [location.search])

  const quotationReturnPath =
    !isEditMode && preselectedLeadId ? `/leads/${preselectedLeadId}` : '/quotations'

  const selectedLead = useMemo(
    () => leads.find(lead => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  )

  const selectedLeadDisplayId = useMemo(
    () => resolveLeadDisplayId(selectedLead),
    [selectedLead]
  )

  const selectedLeadCurrency = useMemo(() => {
    const normalized = toTrimmedString(
      selectedLead?.clientCurrency ?? selectedLead?.client_currency
    ).toUpperCase()
    return /^[A-Z]{3}$/.test(normalized) ? normalized : ''
  }, [selectedLead?.clientCurrency, selectedLead?.client_currency])

  const resolvedTravelStartDate = useMemo(() => {
    if (form.startDate) return form.startDate
    return toDateInputString(selectedLead?.travelDate ?? '')
  }, [form.startDate, selectedLead?.travelDate])

  const isEditLocked =
    isEditMode &&
    loadedQuotationStatus !== null &&
    loadedQuotationStatus === 'APPROVED'

  const unwrapTemplateList = (response: unknown): any[] => {
    const payload = (response as { data?: unknown })?.data ?? response
    if (Array.isArray(payload)) return payload
    if (Array.isArray((payload as { data?: unknown[] })?.data)) {
      return (payload as { data: unknown[] }).data
    }
    if (Array.isArray((payload as { items?: unknown[] })?.items)) {
      return (payload as { items: unknown[] }).items
    }
    return []
  }

  const mapTemplate = (raw: any): TemplateOption => ({
    id: String(raw?.id ?? ''),
    code: String(raw?.code ?? ''),
    name: String(raw?.name ?? ''),
    templateType: (raw?.templateType ??
      raw?.template_type ??
      'READY_PACKAGE') as TemplateType,
    isActive: raw?.isActive ?? raw?.is_active ?? true,
    minMarginPercent: Number(
      raw?.minMarginPercent ?? raw?.min_margin_percent ?? 0
    ),
    headerBranding: raw?.headerBranding ?? raw?.header_branding ?? '',
    inclusions: raw?.inclusions ?? '',
    exclusions: raw?.exclusions ?? '',
    paymentTerms: raw?.paymentTerms ?? raw?.payment_terms ?? '',
    cancellationPolicy:
      raw?.cancellationPolicy ?? raw?.cancellation_policy ?? '',
    footerDisclaimer: raw?.footerDisclaimer ?? raw?.footer_disclaimer ?? ''
  })

  const selectedTemplate = useMemo(
    () =>
      templates.find(template => template.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  )

  const leadDropdownOptions = useMemo(
    () => [
      { value: '', label: 'Select a lead' },
      ...leads.map(lead => {
        const leadLabel = lead.fullName || lead.email || lead.phone || lead.id
        const leadDisplayId = resolveLeadDisplayId(lead)
        return {
          value: lead.id,
          label: leadDisplayId ? `${leadLabel} (${leadDisplayId})` : leadLabel
        }
      })
    ],
    [leads]
  )

  const quotationTemplateOptions = useMemo(
    () => [
      // { value: "", label: "No template (manual quotation)" },
      // Use empty value for custom/manual quotations.
      // This keeps `templateId` undefined on save payload.
      { value: '', label: 'Custom Quotation' },
      ...templates.map(template => ({
        value: template.id,
        label: `${template.code} - ${template.name}${!template.isActive ? ' (Inactive)' : ''
          }`
      }))
    ],
    [templates]
  )

  const supplierDropdownOptions = useMemo(
    () => [
      { value: '', label: 'Select a supplier' },
      ...suppliers.map(supplier => ({
        value: supplier.id,
        label: supplier.name
      }))
    ],
    [suppliers]
  )

  const selectedSupplier = useMemo(
    () =>
      suppliers.find(supplier => supplier.id === selectedSupplierId) || null,
    [selectedSupplierId, suppliers]
  )

  const currencyOptions = useMemo(() => getCurrencyOptions(false), [])

  const countryOptions = useMemo(
    () => [
      { value: '', label: 'Select country' },
      ...Country.getAllCountries()
        .map(country => String(country.name || '').trim())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b))
        .map(name => ({
          value: name,
          label: name
        }))
    ],
    []
  )

  const nationalityOptions = useMemo(() => getNationalityOptions(), [])

  const visaOptions = useMemo(
    () => [
      { value: '', label: 'Visa Required' },
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' }
    ],
    []
  )

  const hotelCategoryOptions = useMemo(
    () => [
      { value: '', label: 'Hotel Category' },
      { value: '3_STAR', label: '3 Star' },
      { value: '4_STAR', label: '4 Star' },
      { value: '5_STAR', label: '5 Star' },
      { value: 'ANY', label: 'Any' }
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


  // const campaignOptions = useMemo(
  //   () => [
  //     { value: '', label: 'Select campaign (optional)' },
  //     ...campaigns.map(campaign => ({
  //       value: String(campaign.id),
  //       label: String(campaign.name ?? campaign.title ?? campaign.id)
  //     }))
  //   ],
  //   [campaigns]
  // )

  const applyTemplateDefaults = (template: TemplateOption | null) => {
    if (!template) return
    setForm(prev => ({
      ...prev,
      headerBranding:
        prev.headerBranding.trim() || !(template.headerBranding || '').trim()
          ? prev.headerBranding
          : String(template.headerBranding),
      inclusions:
        prev.inclusions.trim() || !(template.inclusions || '').trim()
          ? prev.inclusions
          : String(template.inclusions),
      exclusions:
        prev.exclusions.trim() || !(template.exclusions || '').trim()
          ? prev.exclusions
          : String(template.exclusions),
      paymentTerms:
        prev.paymentTerms.trim() || !(template.paymentTerms || '').trim()
          ? prev.paymentTerms
          : String(template.paymentTerms),
      cancellationPolicy:
        prev.cancellationPolicy.trim() ||
          !(template.cancellationPolicy || '').trim()
          ? prev.cancellationPolicy
          : String(template.cancellationPolicy),
      footerDisclaimer:
        prev.footerDisclaimer.trim() ||
          !(template.footerDisclaimer || '').trim()
          ? prev.footerDisclaimer
          : String(template.footerDisclaimer)
    }))
  }

  const toBulletList = (value: string) =>
    value
      .split(/\r?\n|;/g)
      .map(line => line.trim())
      .filter(Boolean)

  const selectedServiceDefinitions = useMemo(
    () => SERVICE_DEFINITIONS.filter(definition => services[definition.key]),
    [services]
  )

  const flagPricingCellChange = useCallback((cellId: string) => {
    setChangedPricingCells(prev => ({ ...prev, [cellId]: true }))
    window.setTimeout(() => {
      setChangedPricingCells(prev => {
        if (!prev[cellId]) return prev
        const next = { ...prev }
        delete next[cellId]
        return next
      })
    }, 700)
  }, [])

  const computeAutoAllocatedBaseCosts = useCallback(
    (overridesSnapshot: ServiceOverridesState): Record<ServiceKey, number> => {
      const activeDefinitions = selectedServiceDefinitions
      if (!activeDefinitions.length) return {} as Record<ServiceKey, number>

      const globalSupplierCost = Number(costs.supplierCost) || 0

      const overriddenKeys = new Set(
        activeDefinitions
          .filter(def => {
            const val = overridesSnapshot[def.key]?.baseCost
            return (
              val !== undefined &&
              val !== '' &&
              !isNaN(Number(val)) &&
              Number(val) >= 0
            )
          })
          .map(def => def.key)
      )

      const overriddenTotal = activeDefinitions.reduce((sum, def) => {
        if (!overriddenKeys.has(def.key)) return sum
        return sum + (Number(overridesSnapshot[def.key]?.baseCost) || 0)
      }, 0)

      const remainingCost = Math.max(0, globalSupplierCost - overriddenTotal)

      const baseWeights = activeDefinitions.map(def =>
        Math.max(0, Number(def.weight) || 0)
      )
      const baseWeightTotal = baseWeights.reduce((sum, weight) => sum + weight, 0)
      const effectiveWeights =
        baseWeightTotal > 0
          ? baseWeights.map(weight => (weight / baseWeightTotal) * 100)
          : activeDefinitions.map(() => 100 / activeDefinitions.length)

      const distributableWeight = activeDefinitions.reduce(
        (sum, definition, index) => {
          if (overriddenKeys.has(definition.key)) return sum
          return sum + effectiveWeights[index]
        },
        0
      )

      let allocatedRemainder = 0
      const freeRows = activeDefinitions.filter(def => !overriddenKeys.has(def.key))

      const result: Partial<Record<ServiceKey, number>> = {}

      activeDefinitions.forEach((definition, index) => {
        const override = overridesSnapshot[definition.key] ?? {}
        if (overriddenKeys.has(definition.key)) {
          result[definition.key] = Number(override.baseCost) || 0
          return
        }

        const isLastFree =
          freeRows.length > 0 &&
          definition.key === freeRows[freeRows.length - 1].key
        const weighted = distributableWeight
          ? (remainingCost * effectiveWeights[index]) / distributableWeight
          : 0
        const baseCost = Number(
          (isLastFree ? remainingCost - allocatedRemainder : weighted).toFixed(2)
        )
        allocatedRemainder = Number((allocatedRemainder + baseCost).toFixed(2))
        result[definition.key] = baseCost
      })

      return result as Record<ServiceKey, number>
    },
    [costs.supplierCost, selectedServiceDefinitions]
  )

  const updateServiceOverrideField = useCallback(
    (rowKey: ServiceKey, field: PricingField, value: string) => {
      setServiceOverrides(prev => {
        if (field === 'baseCost') {
          const hasAnyManualBaseCost = Object.values(prev).some(
            row => row?.baseCost !== undefined && row.baseCost !== ''
          )
          if (!hasAnyManualBaseCost && selectedServiceDefinitions.length > 1) {
            const snapshot = computeAutoAllocatedBaseCosts(prev)
            const seeded: ServiceOverridesState = { ...prev }
            selectedServiceDefinitions.forEach(def => {
              const existing = seeded[def.key] ?? {}
              if (existing.baseCost === undefined || existing.baseCost === '') {
                seeded[def.key] = {
                  ...existing,
                  baseCost: Number(snapshot[def.key] ?? 0).toFixed(2)
                }
              }
            })
            return {
              ...seeded,
              [rowKey]: {
                ...(seeded[rowKey] ?? {}),
                [field]: value
              }
            }
          }
        }

        return {
          ...prev,
          [rowKey]: {
            ...(prev[rowKey] ?? {}),
            [field]: value
          }
        }
      })
      flagPricingCellChange(`${rowKey}.${field}`)
    },
    [
      computeAutoAllocatedBaseCosts,
      flagPricingCellChange,
      selectedServiceDefinitions
    ]
  )

  const clearServiceOverrideField = useCallback(
    (rowKey: ServiceKey, field: PricingField) => {
      setServiceOverrides(prev => {
        const next = { ...prev }
        const row = next[rowKey]
        if (!row) return prev
        const { [field]: _removed, ...rest } = row
        if (!Object.keys(rest).length) {
          delete next[rowKey]
        } else {
          next[rowKey] = rest
        }
        return next
      })
    },
    []
  )

  const focusNextPricingInput = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key !== 'Enter') return
      event.preventDefault()
      const inputs = Array.from(
        document.querySelectorAll<HTMLInputElement>(
          '[data-pricing-input="true"]'
        )
      )
      const currentIndex = inputs.indexOf(event.currentTarget)
      if (currentIndex < 0) return
      const nextInput = inputs[currentIndex + 1]
      if (!nextInput) return
      nextInput.focus()
      nextInput.select()
    },
    []
  )

  const serviceCostRows = useMemo<ServiceCostRow[]>(() => {
    const activeDefinitions = selectedServiceDefinitions
    if (!activeDefinitions.length) return []

    const globalSupplierCost = Number(costs.supplierCost) || 0
    const globalMarkup = Number(costs.markupPercent) || 0

    // Rows with a baseCost override bypass weighted allocation for supplier cost.
    const overriddenKeys = new Set(
      activeDefinitions
        .filter(def => {
          const val = serviceOverrides[def.key]?.baseCost
          return (
            val !== undefined &&
            val !== '' &&
            !isNaN(Number(val)) &&
            Number(val) >= 0
          )
        })
        .map(def => def.key)
    )
    const overriddenTotal = activeDefinitions.reduce((sum, def) => {
      if (!overriddenKeys.has(def.key)) return sum
      return sum + (Number(serviceOverrides[def.key]?.baseCost) || 0)
    }, 0)
    const remainingCost = Math.max(0, globalSupplierCost - overriddenTotal)

    // Keep a stable internal weight mix, but hide weight editing from UI.
    const baseWeights = activeDefinitions.map(def =>
      Math.max(0, Number(def.weight) || 0)
    )
    const baseWeightTotal = baseWeights.reduce((sum, weight) => sum + weight, 0)
    const effectiveWeights =
      baseWeightTotal > 0
        ? baseWeights.map(weight => (weight / baseWeightTotal) * 100)
        : activeDefinitions.map(() => 100 / activeDefinitions.length)

    const distributableWeight = activeDefinitions.reduce(
      (sum, definition, index) => {
        if (overriddenKeys.has(definition.key)) return sum
        return sum + effectiveWeights[index]
      },
      0
    )

    let allocatedRemainder = 0
    const freeRows = activeDefinitions.filter(
      def => !overriddenKeys.has(def.key)
    )

    return activeDefinitions.map((definition, index) => {
      const override = serviceOverrides[definition.key] ?? {}
      const effectiveWeight = effectiveWeights[index]
      const isFlightService = definition.key === 'flights'

      const overrideMarkup = override.markupPercent
      const effectiveMarkup =
        overrideMarkup !== undefined && overrideMarkup !== ''
          ? Number(overrideMarkup)
          : globalMarkup

      let baseCost: number
      if (overriddenKeys.has(definition.key)) {
        baseCost = Number(override.baseCost) || 0
      } else {
        const isLastFree =
          freeRows.length > 0 &&
          definition.key === freeRows[freeRows.length - 1].key
        const weighted = distributableWeight
          ? (remainingCost * effectiveWeights[index]) / distributableWeight
          : 0
        baseCost = Number(
          (isLastFree ? remainingCost - allocatedRemainder : weighted).toFixed(
            2
          )
        )
        allocatedRemainder = Number((allocatedRemainder + baseCost).toFixed(2))
      }

      const overrideServiceCharge =
        override.serviceCharge !== undefined && override.serviceCharge !== ''
          ? Number(override.serviceCharge)
          : null
      const fallbackFlightChargeFromMarkupPercent =
        overrideServiceCharge === null &&
          overrideMarkup !== undefined &&
          overrideMarkup !== ''
          ? Number(((baseCost * Number(overrideMarkup)) / 100).toFixed(2))
          : null

      const computedMarkupAmount = isFlightService
        ? Number(
          (
            overrideServiceCharge ??
            fallbackFlightChargeFromMarkupPercent ??
            0
          ).toFixed(2)
        )
        : Number(((baseCost * effectiveMarkup) / 100).toFixed(2))
      const computedSell = Number((baseCost + computedMarkupAmount).toFixed(2))
      const finalSell = computedSell
      const markupAmount = Number((finalSell - baseCost).toFixed(2))
      const markupPercent =
        baseCost > 0
          ? Number(((markupAmount / baseCost) * 100).toFixed(2))
          : 0

      return {
        ...definition,
        weight: effectiveWeight,
        baseCost,
        markupPercent,
        markupAmount,
        sellValue: finalSell
      }
    })
  }, [
    costs.markupPercent,
    costs.supplierCost,
    selectedServiceDefinitions,
    serviceOverrides
  ])

  useEffect(() => {
    const loadDestinations = async () => {
      try {
        const list = await leadsService.getDestinations()
        const map: Record<string, string> = {}
          ; (Array.isArray(list) ? list : []).forEach((item: any) => {
            if (item?.id) {
              map[item.id] = item.name || item.id
            }
          })
        setDestinationMap(map)
      } catch (_error) {
        setDestinationMap({})
      }
    }

    void loadDestinations()
  }, [leadsService])

  useEffect(() => {
    const loadLeads = async () => {
      if (!token) {
        setLeads([])
        setLeadsError('Login required to load leads.')
        return
      }

      setLeadsLoading(true)
      setLeadsError('')
      try {
        const data = await leadsService.listLeadsRaw({ page: 1, limit: 100 })
        setLeads((Array.isArray(data) ? data : []) as LeadOption[])
      } catch (error) {
        console.error('Failed to load leads:', error)
        setLeads([])
        reportApiError(error, 'Failed to load leads from API.', setLeadsError)
      } finally {
        setLeadsLoading(false)
      }
    }

    void loadLeads()
  }, [leadsService, token])

  useEffect(() => {
    if (isEditMode || !preselectedLeadId || selectedLeadId) return
    if (!leads.some(lead => lead.id === preselectedLeadId)) return
    setSelectedLeadId(preselectedLeadId)
  }, [isEditMode, leads, preselectedLeadId, selectedLeadId])

  const loadTemplates = useCallback(async () => {
    if (!token) {
      setTemplates([])
      setTemplatesError('Login required to load templates.')
      return
    }

    setTemplatesLoading(true)
    setTemplatesError('')
    try {
      const response = await quotationsApi.listTemplates()
      const mapped = unwrapTemplateList(response).map(mapTemplate)
      setTemplates(mapped)
    } catch (error) {
      console.error('Failed to load quotation templates:', error)
      setTemplates([])
      reportApiError(
        error,
        'Failed to load quotation templates.',
        setTemplatesError
      )
    } finally {
      setTemplatesLoading(false)
    }
  }, [token])

  const [packages, setPackages] = useState<any[]>([])
  const [packagesLoading, setPackagesLoading] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState('')

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    if (!token) return
    setPackagesLoading(true)
    quotationsApi
      .listPackages({ limit: 200 })
      .then((res: any) => {
        const list = res?.data?.data ?? res?.data ?? res ?? []
        setPackages(Array.isArray(list) ? list : [])
      })
      .catch(() => setPackages([]))
      .finally(() => setPackagesLoading(false))
  }, [token])

  const packageOptions = useMemo(
    () => [
      {
        value: '',
        label: 'No package - fill quotation manually',
        searchText: 'manual none'
      },
      ...packages.map((pkg: any) => {
        const kind =
          String(
            pkg.packageKind ?? pkg.package_kind ?? 'READY'
          ).toUpperCase() === 'CUSTOMIZED'
            ? 'Custom'
            : 'Ready'
        return {
          value: pkg.id,
          label: `${pkg.name || pkg.title || 'Package'} - ${pkg.destination || ''
            }`,
          searchText: `${pkg.name} ${pkg.destination} ${kind}`,
          rightLabel: kind
        }
      })
    ],
    [packages]
  )

  const selectedPackage = useMemo(
    () =>
      packages.find((pkg: any) => String(pkg.id ?? '') === selectedPackageId) ||
      null,
    [packages, selectedPackageId]
  )

  const sourcePackageName = useMemo(
    () => String(selectedPackage?.name ?? selectedPackage?.title ?? '').trim(),
    [selectedPackage]
  )

  const selectedPackageKindLabel = useMemo(() => {
    const raw = String(
      selectedPackage?.packageKind ?? selectedPackage?.package_kind ?? ''
    )
      .trim()
      .toUpperCase()

    if (raw === 'CUSTOMIZED') return 'Customized Package'
    if (raw === 'READY') return 'Ready Package'
    return raw ? raw.replace(/_/g, ' ') : ''
  }, [selectedPackage])

  const quotationTitleDisplay =
    form.quotationTitle.trim() || sourcePackageName || 'Manual Quotation'
  const previewDurationLabel =
    buildDurationValue(form.nights, form.durationDays) ||
    formatDurationLabel('', form.nights)
  const travellerLabel = pluralize(
    Math.max(0, Number(form.adults) || 0),
    'adult'
  )

  const loadFromPackage = async (packageId: string) => {
    if (!packageId) return
    const fromList = packages.find(
      (p: any) => String(p.id ?? '') === packageId
    ) as Record<string, unknown> | undefined
    let pkg: Record<string, unknown> | undefined = fromList
      ? { ...fromList }
      : undefined
    try {
      const res = await quotationsApi.getPackage(packageId)
      const full = unwrapPackageResponse(res)
      if (full) pkg = { ...pkg, ...full }
    } catch {
      /* list row only */
    }
    if (!pkg) return

    const packageRecordId = String(pkg.id ?? packageId).trim()
    if (packageRecordId) {
      setPackages(prev => {
        const existingIndex = prev.findIndex(
          (item: any) => String(item.id ?? '') === packageRecordId
        )
        if (existingIndex === -1) {
          return [...prev, pkg]
        }
        return prev.map((item: any) =>
          String(item.id ?? '') === packageRecordId ? { ...item, ...pkg } : item
        )
      })
    }

    setServiceOverrides({})

    const kind =
      String(pkg.packageKind ?? pkg.package_kind ?? 'READY').toUpperCase() ===
        'CUSTOMIZED'
        ? 'CUSTOMIZED'
        : 'READY'
    const customRaw = pkg.customServices ?? pkg.custom_services
    const customArr = Array.isArray(customRaw) ? customRaw : []

    if (kind === 'CUSTOMIZED' && customArr.length > 0) {
      setAddOnServices(
        customArr.map((s: any, i: number) => {
          const cost = Number(s?.cost ?? 0) || 0
          const mPct = Number(s?.markupPercent ?? s?.markup_percent ?? 0) || 0
          const sell =
            s?.sellValue != null || s?.sell_value != null
              ? Number(s.sellValue ?? s.sell_value)
              : Number((cost * (1 + mPct / 100)).toFixed(2))
          const mk = Number(((cost * mPct) / 100).toFixed(2))
          return {
            id: String(s?.id ?? `pkg-line-${i}`),
            name: String(s?.name ?? `Service ${i + 1}`),
            weight: 0,
            baseCost: cost,
            markup: mk,
            sellValue: sell
          }
        })
      )
    } else {
      setAddOnServices([])
    }

    const itin = pkg.itinerary
    let parsedItineraryItems: Item[] = []
    if (
      itin &&
      typeof itin === 'object' &&
      !Array.isArray(itin) &&
      (typeof (itin as { plain?: unknown }).plain === 'string' ||
        typeof (itin as { text?: unknown }).text === 'string')
    ) {
      const plain = String(
        (itin as { plain?: string; text?: string }).plain ??
        (itin as { text?: string }).text ??
        ''
      ).trim()
      if (plain) {
        const chunks = plain
          .split(/\n\s*\n+/)
          .map(s => s.trim())
          .filter(Boolean)
        parsedItineraryItems = chunks.map((chunk, i) => {
          const lines = chunk.split('\n')
          const first = (lines[0] ?? '').trim()
          const rest = lines.slice(1).join('\n').trim()
          return {
            id: `it-${i}`,
            day: getDayLabel(i),
            title: first || getDayLabel(i),
            description: rest
          }
        })
      }
    } else if (Array.isArray(itin) && itin.length > 0) {
      parsedItineraryItems = itin.map((row: any, i: number) => ({
        id: String(row?.id ?? `it-${i}`),
        day: getDayLabel(i),
        title: String(row?.title ?? row?.heading ?? ''),
        description: String(row?.description ?? row?.details ?? '')
      }))
    }

    const durationParts = parseDurationParts(pkg.duration)
    const derivedNights =
      durationParts.nights ||
      String(parseNightsFromDuration(pkg.duration, form.nights))
    const derivedDays =
      durationParts.days ||
      (parsedItineraryItems.length > 0
        ? String(parsedItineraryItems.length)
        : '')
    const itineraryDayCount =
      parseDayCount(derivedDays) ||
      (parsedItineraryItems.length > 0 ? parsedItineraryItems.length : 0)
    setItineraryItems(
      buildItineraryRows(itineraryDayCount, parsedItineraryItems)
    )

    setForm(prev => {
      const vf = pkg!.validTo ?? pkg!.valid_to
      const vfStr =
        vf != null && String(vf).length >= 10 ? String(vf).slice(0, 10) : ''
      return {
        ...prev,
        quotationTitle: String(pkg!.name ?? pkg!.title ?? prev.quotationTitle),
        destination: String(
          pkg!.destination ?? pkg!.destinationName ?? prev.destination
        ),
        nights: Number(derivedNights || prev.nights || 1),
        durationDays:
          derivedDays ||
          prev.durationDays ||
          String(parsedItineraryItems.length || 0),
        inclusions: String(pkg!.inclusions ?? prev.inclusions),
        exclusions: String(pkg!.exclusions ?? prev.exclusions),
        paymentTerms: String(
          pkg!.paymentTerms ?? pkg!.payment_terms ?? prev.paymentTerms
        ),
        cancellationPolicy: String(
          pkg!.cancellationPolicy ??
          pkg!.cancellation_policy ??
          prev.cancellationPolicy
        ),
        hotelDetails: String(
          pkg!.hotelDetails ?? pkg!.hotel_details ?? prev.hotelDetails
        ),
        visaDetails: String(
          pkg!.visaDetails ?? pkg!.visa_details ?? prev.visaDetails
        ),
        validUntil: vfStr || prev.validUntil,
        headerBranding: pkg!.name
          ? `Package: ${String(pkg.name)}`
          : prev.headerBranding
      }
    })

    const base = Number(pkg.baseCost ?? pkg.base_cost ?? 0)
    const mk = pkg.markupPercent ?? pkg.markup_percent
    setCosts(prev => ({
      ...prev,
      supplierCost: base > 0 ? base : prev.supplierCost,
      markupPercent:
        mk != null && Number(mk) >= 0 ? Number(mk) : prev.markupPercent
    }))
  }

  useEffect(() => {
    const loadSuppliers = async () => {
      if (!token) {
        setSuppliers([])
        return
      }

      setSuppliersLoading(true)
      try {
        const response = await suppliersApi.list({ page: 1, limit: 100 })
        const payload = (response as any)?.data ?? response
        const data =
          (payload as any)?.data || (payload as any)?.items || payload
        if (Array.isArray(data)) {
          setSuppliers(
            data.map((s: any) => ({
              id: s.id || s._id,
              name: s.name || s.companyName || 'Unnamed Supplier'
            }))
          )
        } else {
          setSuppliers([])
        }
      } catch (error) {
        console.error('Failed to load suppliers:', error)
        setSuppliers([])
      } finally {
        setSuppliersLoading(false)
      }
    }

    void loadSuppliers()
  }, [token])

  useEffect(() => {
    if (!isEditMode || !editingQuotationId) return
    if (!token) {
      setSaveError('Login required to edit quotations.')
      return
    }

    let cancelled = false
    const loadQuotationForEdit = async () => {
      setLoadingEditQuotation(true)
      setSaveError('')
      try {
        const response = await quotationsApi.getById(editingQuotationId)
        const quotation = unwrapApiData<Record<string, unknown>>(response)
        if (!quotation) {
          throw new Error('Quotation payload not found')
        }

        const quotationStatus = toTrimmedString(quotation.status).toUpperCase()
        if (!cancelled) {
          setLoadedQuotationStatus(quotationStatus || null)
          if (quotationStatus === 'APPROVED') {
            setSaveError('Approved quotations cannot be edited in builder.')
          }
        }

        const snapshotRoot =
          quotation.templateSnapshot &&
            typeof quotation.templateSnapshot === 'object'
            ? (quotation.templateSnapshot as Record<string, unknown>)
            : quotation.template_snapshot &&
              typeof quotation.template_snapshot === 'object'
              ? (quotation.template_snapshot as Record<string, unknown>)
              : null

        const builderSnapshot =
          snapshotRoot?.builderSnapshot &&
            typeof snapshotRoot.builderSnapshot === 'object'
            ? (snapshotRoot.builderSnapshot as Record<string, unknown>)
            : null

        const snapshot = builderSnapshot ?? snapshotRoot
        const snapshotLead =
          snapshot?.lead && typeof snapshot.lead === 'object'
            ? (snapshot.lead as Record<string, unknown>)
            : null
        const snapshotPackage =
          snapshot?.package && typeof snapshot.package === 'object'
            ? (snapshot.package as Record<string, unknown>)
            : null
        const snapshotContent =
          snapshot?.content && typeof snapshot.content === 'object'
            ? (snapshot.content as Record<string, unknown>)
            : null
        const snapshotPricing =
          snapshot?.pricing && typeof snapshot.pricing === 'object'
            ? (snapshot.pricing as Record<string, unknown>)
            : null
        const relationLead =
          quotation.lead && typeof quotation.lead === 'object'
            ? (quotation.lead as Record<string, unknown>)
            : null
        const relationDestination =
          quotation.destination && typeof quotation.destination === 'object'
            ? (quotation.destination as Record<string, unknown>)
            : null

        const leadId = toTrimmedString(
          quotation.leadId ?? quotation.lead_id ?? snapshotLead?.id
        )
        if (!cancelled && leadId) {
          skipLeadAutofillRef.current = true
          setSelectedLeadId(leadId)
        }

        const templateIdCandidate = toTrimmedString(
          quotation.templateId ?? quotation.template_id ?? snapshotRoot?.id
        )
        const validTemplateId = isUuid(templateIdCandidate)
          ? templateIdCandidate
          : ''
        if (!cancelled) {
          setSelectedTemplateId(validTemplateId)
        }
        if (!cancelled && validTemplateId) {
          const templateTypeRaw = toTrimmedString(
            snapshotRoot?.templateType ?? snapshotRoot?.template_type
          ).toUpperCase()
          const templateType: TemplateType =
            templateTypeRaw === 'VISA' || templateTypeRaw === 'CUSTOM_ITINERARY'
              ? templateTypeRaw
              : 'READY_PACKAGE'
          const snapshotTemplate: TemplateOption = {
            id: validTemplateId,
            code:
              toTrimmedString(snapshotRoot?.code) ||
              `TMP-${validTemplateId.slice(0, 6).toUpperCase()}`,
            name: toTrimmedString(snapshotRoot?.name) || 'Saved Template',
            templateType,
            isActive: true,
            minMarginPercent: toFiniteNumber(
              snapshotRoot?.minMarginPercent ??
              snapshotRoot?.min_margin_percent,
              0
            ),
            headerBranding: toTrimmedString(snapshotRoot?.headerBranding),
            inclusions: toTrimmedString(snapshotRoot?.inclusions),
            exclusions: toTrimmedString(snapshotRoot?.exclusions),
            paymentTerms: toTrimmedString(
              snapshotRoot?.paymentTerms ?? snapshotRoot?.payment_terms
            ),
            cancellationPolicy: toTrimmedString(
              snapshotRoot?.cancellationPolicy ??
              snapshotRoot?.cancellation_policy
            ),
            footerDisclaimer: toTrimmedString(
              snapshotRoot?.footerDisclaimer ?? snapshotRoot?.footer_disclaimer
            )
          }
          setTemplates(prev =>
            prev.some(template => template.id === snapshotTemplate.id)
              ? prev
              : [...prev, snapshotTemplate]
          )
        }

        const sourcePackageId = toTrimmedString(
          quotation.sourcePackageId ??
          quotation.source_package_id ??
          snapshot?.sourcePackageId ??
          snapshotRoot?.sourcePackageId ??
          snapshotPackage?.id
        )
        if (!cancelled) {
          setSelectedPackageId(sourcePackageId)
        }
        if (!cancelled && sourcePackageId && snapshotPackage) {
          const packageRecord = { ...snapshotPackage, id: sourcePackageId }
          setPackages(prev => {
            const currentIndex = prev.findIndex(
              item => String(item?.id ?? '') === sourcePackageId
            )
            if (currentIndex === -1) {
              return [...prev, packageRecord]
            }
            return prev.map(item =>
              String(item?.id ?? '') === sourcePackageId
                ? { ...item, ...packageRecord }
                : item
            )
          })
        }

        const supplierDetails =
          snapshot?.supplierDetails &&
            typeof snapshot.supplierDetails === 'object'
            ? (snapshot.supplierDetails as Record<string, unknown>)
            : snapshotRoot?.supplierDetails &&
              typeof snapshotRoot.supplierDetails === 'object'
              ? (snapshotRoot.supplierDetails as Record<string, unknown>)
              : snapshotRoot?.supplier &&
                typeof snapshotRoot.supplier === 'object'
                ? (snapshotRoot.supplier as Record<string, unknown>)
                : null

        // Extract supplier from serviceRows if not found in supplierDetails
        let supplierId = toTrimmedString(
          supplierDetails?.supplierId ?? supplierDetails?.id
        )
        let supplierName = toTrimmedString(
          supplierDetails?.supplierName ?? supplierDetails?.name
        )

        if (!cancelled && supplierId) {
          setSelectedSupplierId(supplierId)
        }
        if (!cancelled && supplierId && supplierName) {
          setSuppliers(prev =>
            prev.some(supplier => supplier.id === supplierId)
              ? prev
              : [...prev, { id: supplierId, name: supplierName }]
          )
        }

        const snapshotDurationLabel = firstNonEmptyString(
          quotation.durationLabel,
          quotation.duration_label,
          snapshot?.durationLabel,
          snapshotRoot?.durationLabel,
          snapshotPackage?.duration
        )
        const durationParts = parseDurationParts(snapshotDurationLabel)
        const nights = Math.max(
          1,
          Math.floor(
            toFiniteNumber(
              quotation.durationNights ??
              quotation.duration_nights ??
              snapshot?.durationNights ??
              snapshot?.nights ??
              snapshotRoot?.durationNights ??
              snapshotRoot?.nights,
              parseNightsFromDuration(snapshotDurationLabel, 1)
            )
          )
        )

        const rawItinerary = Array.isArray(snapshot?.itineraryItems)
          ? snapshot.itineraryItems
          : Array.isArray(quotation.itinerary)
            ? quotation.itinerary
            : Array.isArray(snapshotRoot?.itineraryItems)
              ? snapshotRoot.itineraryItems
              : []
        const mappedItinerary = rawItinerary
          .map((row: any, index: number) => ({
            id: String(row?.id ?? `saved-it-${index + 1}`),
            day: String(row?.day ?? getDayLabel(index)),
            title: String(row?.title ?? row?.heading ?? ''),
            description: String(row?.description ?? row?.details ?? '')
          }))
          .filter(
            item =>
              item.day.trim() || item.title.trim() || item.description.trim()
          )
        const durationDays = parseDayCount(
          quotation.durationDays ??
          quotation.duration_days ??
          snapshot?.durationDays ??
          snapshotRoot?.durationDays ??
          durationParts.days
        )
        const itineraryDayCount =
          durationDays || mappedItinerary.length || Math.max(1, nights + 1)

        if (!cancelled) {
          setItineraryItems(
            buildItineraryRows(itineraryDayCount, mappedItinerary)
          )
        }

        const addOnSnapshot = Array.isArray(snapshot?.addOnServices)
          ? snapshot.addOnServices
          : Array.isArray(snapshotRoot?.addOnServices)
            ? snapshotRoot.addOnServices
            : []
        if (!cancelled) {
          setAddOnServices(
            addOnSnapshot
              .map((service: any, index: number) => {
                const baseCost = toFiniteNumber(service?.baseCost, 0)
                const markupPercent = toFiniteNumber(service?.markupPercent, null as any)
                const fallbackMarkupPercent =
                  baseCost > 0
                    ? Number(
                        (
                          (toFiniteNumber(service?.markup, 0) / baseCost) *
                          100
                        ).toFixed(2)
                      )
                    : 0
                const sellValue = toFiniteNumber(
                  service?.sellValue,
                  baseCost + toFiniteNumber(service?.markup, 0)
                )
                return {
                  id: String(service?.id ?? `saved-addon-${index + 1}`),
                  name: toTrimmedString(service?.name) || `Add-on ${index + 1}`,
                  baseCost,
                  markup: toFiniteNumber(service?.markup, sellValue - baseCost),
                  markupPercent: Number.isFinite(markupPercent)
                    ? Math.min(100, Math.max(0, Number(markupPercent)))
                    : fallbackMarkupPercent,
                  sellValue
                  ,
                  supplierId: toTrimmedString(service?.supplierId ?? service?.supplier_id) || undefined,
                  supplierName: toTrimmedString(service?.supplierName ?? service?.supplier_name) || undefined
                }
              })
              .filter(service => service.name)
          )
        }

        const serviceRowSnapshot = Array.isArray(snapshot?.serviceRows)
          ? snapshot.serviceRows
          : Array.isArray(snapshotRoot?.serviceRows)
            ? snapshotRoot.serviceRows
            : []

        // Extract supplier from serviceRows if not found in supplierDetails
        if (!supplierId && serviceRowSnapshot.length > 0) {
          const firstServiceRow = serviceRowSnapshot[0] as Record<string, unknown>
          supplierId = toTrimmedString(
            firstServiceRow?.supplierId ?? firstServiceRow?.supplier_id
          )
          supplierName = toTrimmedString(
            firstServiceRow?.supplierName ?? firstServiceRow?.supplier_name
          )
        }

        if (!cancelled && supplierId) {
          setSelectedSupplierId(supplierId)
        }
        if (!cancelled && supplierId && supplierName) {
          setSuppliers(prev =>
            prev.some(supplier => supplier.id === supplierId)
              ? prev
              : [...prev, { id: supplierId, name: supplierName }]
          )
        }

        const snapshotFlightServiceCharge = Number(
          serviceRowSnapshot
            .filter((row: any) => normalizeServiceKey(row?.key) === 'flights')
            .reduce((sum: number, row: any) => {
              const baseCost = toFiniteNumber(row?.baseCost, 0)
              const serviceCharge = toFiniteNumber(
                row?.serviceCharge,
                toFiniteNumber(row?.markupAmount, toFiniteNumber(row?.sellValue, 0) - baseCost)
              )
              return sum + Math.max(0, serviceCharge)
            }, 0)
            .toFixed(2)
        )
        if (!cancelled) {
          const nextOverrides: ServiceOverridesState = {}
          serviceRowSnapshot.forEach((row: any) => {
            const key = normalizeServiceKey(row?.key)
            if (!key) return
            nextOverrides[key] = {
              baseCost:
                row?.baseCost !== undefined && row?.baseCost !== null
                  ? String(row.baseCost)
                  : undefined,
              markupPercent:
                row?.markupPercent !== undefined && row?.markupPercent !== null
                  ? String(row.markupPercent)
                  : undefined,
              serviceCharge:
                row?.serviceCharge !== undefined && row?.serviceCharge !== null
                  ? String(row.serviceCharge)
                  : key === 'flights' &&
                    row?.markupAmount !== undefined &&
                    row?.markupAmount !== null
                    ? String(row.markupAmount)
                    : undefined,
              sellValue:
                row?.sellValue !== undefined && row?.sellValue !== null
                  ? String(row.sellValue)
                  : undefined,
              paymentTerms: toTrimmedString(row?.paymentTerms) || undefined,
              supplierId: toTrimmedString(row?.supplierId ?? row?.supplier_id) || undefined,
              supplierName: toTrimmedString(row?.supplierName ?? row?.supplier_name) || undefined
            }
          })
          setServiceOverrides(nextOverrides)

          // Add service-level suppliers to the suppliers list
          const serviceSuppliers = serviceRowSnapshot
            .map((row: any) => ({
              id: toTrimmedString(row?.supplierId ?? row?.supplier_id),
              name: toTrimmedString(row?.supplierName ?? row?.supplier_name)
            }))
            .filter((supplier: any) => supplier.id && supplier.name)

          if (serviceSuppliers.length > 0) {
            setSuppliers(prev => {
              const existingIds = new Set(prev.map(s => s.id))
              const newSuppliers = serviceSuppliers.filter((s: any) => !existingIds.has(s.id))
              return [...prev, ...newSuppliers]
            })
          }
        }

        const travelStartDate = toDateInputString(
          quotation.travelStartDate ??
          quotation.travel_start_date ??
          snapshot?.travelStartDate ??
          snapshotRoot?.travelStartDate ??
          relationLead?.travelDate
        )
        const validUntil = toDateInputString(
          snapshot?.validUntil ??
          snapshotRoot?.validUntil ??
          quotation.expiresAt
        )
        const destinationName = firstNonEmptyString(
          quotation.tripDestination,
          quotation.trip_destination,
          snapshot?.destination,
          snapshotRoot?.destination,
          relationDestination?.name,
          snapshotLead?.destination,
          relationLead?.destinationName
        )
        const customerName = firstNonEmptyString(
          snapshot?.customerName,
          snapshotRoot?.customerName,
          snapshotLead?.fullName,
          snapshotLead?.name,
          relationLead?.fullName
        )
        const customerEmail = firstNonEmptyString(
          snapshot?.customerEmail,
          snapshotRoot?.customerEmail,
          snapshotLead?.email,
          relationLead?.email
        )
        const quoteReference = firstNonEmptyString(
          snapshot?.quoteReference,
          snapshotRoot?.quoteReference,
          quotation.quoteNumber
        )
        const versionLabel = firstNonEmptyString(
          snapshot?.versionLabel,
          snapshotRoot?.versionLabel,
          quotation.versionNumber ? `V${quotation.versionNumber}` : null
        )
        const quotationTitle = firstNonEmptyString(
          quotation.quotationTitle,
          quotation.quotation_title,
          snapshot?.quotationTitle,
          snapshotRoot?.quotationTitle,
          snapshotPackage?.name,
          snapshotPackage?.title
        )

        if (!cancelled) {
          setForm(prev => ({
            ...prev,
            quote: quoteReference || prev.quote,
            version: versionLabel || prev.version,
            quotationTitle: quotationTitle || prev.quotationTitle,
            customer: customerName || prev.customer,
            email: customerEmail || prev.email,
            phone: firstNonEmptyString(
              quotation.phone,
              snapshot?.phone,
              snapshotRoot?.phone,
              snapshotLead?.phone,
              relationLead?.phone,
              prev.phone
            ),
            destination: destinationName || prev.destination,
            startDate: travelStartDate || prev.startDate,
            endDate:
              toDateInputString(
                quotation.travelEndDate ??
                quotation.travel_end_date ??
                snapshot?.travelEndDate ??
                snapshot?.travel_end_date ??
                snapshotRoot?.travelEndDate ??
                snapshotRoot?.travel_end_date ??
                relationLead?.travelEndDate ??
                relationLead?.travel_end_date
              ) || prev.endDate,
            nights,
            durationDays: String(itineraryDayCount),
            adults: Math.max(
              1,
              Math.floor(
                toFiniteNumber(
                  snapshot?.adults ??
                  snapshotRoot?.adults ??
                  relationLead?.adultsCount,
                  prev.adults || 1
                )
              )
            ),
            leadCountry: firstNonEmptyString(
              quotation.leadCountry,
              quotation.lead_country,
              snapshot?.leadCountry,
              snapshot?.lead_country,
              snapshotRoot?.leadCountry,
              snapshotRoot?.lead_country,
              relationLead?.leadCountry,
              relationLead?.lead_country,
              snapshotLead?.leadCountry,
              snapshotLead?.lead_country,
              snapshotLead?.country,
              relationLead?.country,
              relationLead?.nationality,
              prev.leadCountry
            ),
            nationality: firstNonEmptyString(
              quotation.nationality,
              snapshot?.nationality,
              snapshotRoot?.nationality,
              snapshotLead?.nationality,
              relationLead?.nationality,
              prev.nationality
            ),
            budget:
              quotation.budget !== undefined && quotation.budget !== null
                ? String(quotation.budget)
                : firstNonEmptyString(
                  snapshot?.budget,
                  snapshotRoot?.budget,
                  relationLead?.budget,
                  prev.budget
                ),
            visaRequired: toYesNoString(
              quotation.visaRequired ??
              quotation.visa_required ??
              snapshot?.visaRequired ??
              snapshotRoot?.visaRequired ??
              (snapshot as any)?.services?.visa ??
              (snapshotRoot as any)?.services?.visa ??
              (quotation as any).services?.visa
            ) || prev.visaRequired,
            validUntil: validUntil || prev.validUntil,
            inclusions: firstNonEmptyString(
              quotation.inclusions,
              snapshotContent?.inclusions,
              snapshotRoot?.inclusions,
              prev.inclusions
            ),
            exclusions: firstNonEmptyString(
              quotation.exclusions,
              snapshotContent?.exclusions,
              snapshotRoot?.exclusions,
              prev.exclusions
            ),
            headerBranding: firstNonEmptyString(
              snapshotContent?.headerBranding,
              snapshotRoot?.headerBranding,
              prev.headerBranding
            ),
            paymentTerms: firstNonEmptyString(
              quotation.paymentTerms,
              quotation.payment_terms,
              snapshotContent?.paymentTerms,
              snapshotRoot?.paymentTerms,
              snapshotRoot?.payment_terms,
              prev.paymentTerms
            ),
            cancellationPolicy: firstNonEmptyString(
              quotation.cancellationPolicy,
              quotation.cancellation_policy,
              snapshotContent?.cancellationPolicy,
              snapshotRoot?.cancellationPolicy,
              snapshotRoot?.cancellation_policy,
              prev.cancellationPolicy
            ),
            footerDisclaimer: firstNonEmptyString(
              snapshotContent?.footerDisclaimer,
              snapshotRoot?.footerDisclaimer,
              snapshotRoot?.footer_disclaimer,
              prev.footerDisclaimer
            ),
            hotelDetails: firstNonEmptyString(
              quotation.hotelDetails,
              quotation.hotel_details,
              snapshotContent?.hotelDetails,
              snapshotRoot?.hotelDetails,
              snapshotRoot?.hotel_details,
              prev.hotelDetails
            ),
            visaDetails: firstNonEmptyString(
              quotation.visaDetails,
              quotation.visa_details,
              snapshotContent?.visaDetails,
              snapshotRoot?.visaDetails,
              snapshotRoot?.visa_details,
              prev.visaDetails
            ),
            addressLine: firstNonEmptyString(
              quotation.addressLine,
              quotation.address_line,
              relationLead?.addressLine,
              relationLead?.address_line,
              snapshot?.addressLine,
              snapshot?.address_line,
              snapshotContent?.addressLine,
              snapshotRoot?.addressLine,
              snapshotRoot?.address_line,
              prev.addressLine
            ),
            travelPurpose: firstNonEmptyString(
              quotation.travelPurpose,
              quotation.travel_purpose,
              snapshotContent?.travelPurpose,
              snapshotRoot?.travelPurpose,
              snapshotRoot?.travel_purpose,
              relationLead?.travelPurpose,
              relationLead?.travel_purpose,
              prev.travelPurpose
            ),
            leadSource: firstNonEmptyString(
              quotation.source,
              quotation.leadSource,
              snapshot?.source,
              snapshotRoot?.source,
              snapshotLead?.source,
              relationLead?.source,
              prev.leadSource
            )
          }))
        }

        if (!cancelled) {
          const snapshotManualServiceFee = toFiniteNumber(
            snapshotPricing?.manualServiceFee,
            NaN
          )
          const snapshotServiceFeeTotal = toFiniteNumber(snapshotPricing?.serviceFee, NaN)
          const persistedServiceFeeTotal = Math.max(
            0,
            toFiniteNumber(
              quotation.serviceFeeAmount,
              Number.isFinite(snapshotServiceFeeTotal) ? snapshotServiceFeeTotal : 0
            )
          )
          const resolvedServiceFee = Number.isFinite(snapshotManualServiceFee)
            ? Math.max(0, snapshotManualServiceFee)
            : Number.isFinite(snapshotServiceFeeTotal)
              ? Math.max(0, snapshotServiceFeeTotal - snapshotFlightServiceCharge)
              : Math.max(0, persistedServiceFeeTotal - snapshotFlightServiceCharge)
          setCosts(prev => ({
            supplierCost: Math.max(
              0,
              toFiniteNumber(
                quotation.supplierCost ?? snapshotPricing?.supplierCost,
                prev.supplierCost
              )
            ),
            markupPercent: Math.max(
              0,
              toFiniteNumber(
                quotation.marginPercent ?? snapshotPricing?.markupPercent,
                prev.markupPercent
              )
            ),
            serviceFee: Math.max(
              0,
              toFiniteNumber(
                resolvedServiceFee,
                prev.serviceFee
              )
            ),
            taxPercent: 0,
            discount: Math.max(
              0,
              toFiniteNumber(
                quotation.discount ?? snapshotPricing?.discount,
                prev.discount
              )
            )
          }))

          setFinance(prev => ({
            ...prev,
            supplierTaxPercent: 0,
            supplierTaxAmount: 0,
            gstEnabled: toBoolean(
              snapshotPricing?.gstEnabled,
              toFiniteNumber(quotation.gstAmount ?? 0, 0) > 0
            ),
            gstPercent: Math.max(
              0,
              toFiniteNumber(
                quotation.gstPercent ?? snapshotPricing?.gstPercent ?? 18,
                18
              )
            ),
            gstAmount: Math.max(
              0,
              toFiniteNumber(quotation.gstAmount ?? 0, 0)
            ),
            tcsEnabled: toBoolean(
              snapshotPricing?.tcsEnabled,
              toFiniteNumber(quotation.tcsAmount ?? 0, 0) > 0
            ),
            tcsPercent: Math.max(
              0,
              toFiniteNumber(
                quotation.tcsPercent ?? snapshotPricing?.tcsPercent ?? 5,
                5
              )
            ),
            tcsAmount: Math.max(
              0,
              toFiniteNumber(quotation.tcsAmount ?? 0, 0)
            ),
            totalSaleValue: Math.max(
              0,
              toFiniteNumber(quotation.totalSaleValue ?? 0, 0)
            )
          }))

          setCurrencies(prev => ({
            costCurrency: toTrimmedString(
              quotation.costCurrency ?? prev.costCurrency
            ).toUpperCase() || 'INR',
            clientCurrency: toTrimmedString(
              quotation.clientCurrency ?? prev.clientCurrency
            ).toUpperCase() || 'INR',
            supplierCurrency: toTrimmedString(
              quotation.supplierCurrency ?? prev.supplierCurrency
            ).toUpperCase() || 'INR'
          }))

          const selectedCurrency = toTrimmedString(
            quotation.clientCurrency ??
            quotation.costCurrency ??
            snapshot?.currency ??
            snapshotRoot?.currency
          ).toUpperCase()
          if (/^[A-Z]{3}$/.test(selectedCurrency)) {
            setCurrency(selectedCurrency)
          }
          setHasLoadedEditSnapshot(true)
        }
      } catch (error) {
        console.error('Failed to load quotation for edit:', error)
        if (!cancelled) {
          reportApiError(
            error,
            'Failed to load quotation for editing.',
            setSaveError
          )
        }
      } finally {
        if (!cancelled) {
          setLoadingEditQuotation(false)
        }
      }
    }

    void loadQuotationForEdit()
    return () => {
      cancelled = true
    }
  }, [editingQuotationId, isEditMode, token])

  useEffect(() => {
    if (skipLeadAutofillRef.current) {
      skipLeadAutofillRef.current = false
      return
    }
    if (isEditMode && hasLoadedEditSnapshot) return
    if (!selectedLead) return

    const resolvedDestination =
      typeof selectedLead.destination === 'string'
        ? selectedLead.destination
        : selectedLead.destination?.name ?? selectedLead.destinationName ?? ''
    const destinationName = selectedLead.destinationId
      ? destinationMap[selectedLead.destinationId] ||
      resolvedDestination ||
      form.destination
      : resolvedDestination || form.destination

    setForm(prev => ({
      ...prev,
      customer: selectedLead.fullName || prev.customer,
      email: selectedLead.email || prev.email,
      phone: selectedLead.phone || prev.phone,
      leadCountry: selectedLead.leadCountry || selectedLead.country || prev.leadCountry,
      nationality: selectedLead.nationality || prev.nationality,
      addressLine: selectedLead.addressLine || selectedLead.address_line || prev.addressLine,
      panNumber: selectedLead.panNumber || selectedLead.pan_number || prev.panNumber,
      budget: selectedLead.budget !== undefined && selectedLead.budget !== null ? String(selectedLead.budget) : prev.budget,
      destination: destinationName,
      startDate: selectedLead.travelDate
        ? selectedLead.travelDate.slice(0, 10)
        : prev.startDate,
      endDate: (selectedLead as any).travelEndDate
        ? (selectedLead as any).travelEndDate.slice(0, 10)
        : prev.endDate,
      adults: Number(selectedLead.adultsCount || prev.adults || 1),
      children: Number(selectedLead.childrenCount || prev.children || 0),
      childAges: Array.isArray(selectedLead.childAges)
        ? selectedLead.childAges.map(age => String(age))
        : prev.childAges,
      travelPurpose: selectedLead.travelPurpose || prev.travelPurpose,
      leadSource: (selectedLead as any).source || prev.leadSource
    }))
    if (selectedLeadCurrency) {
      setCurrency(selectedLeadCurrency)
      setCurrencies(prev => ({
        ...prev,
        clientCurrency: selectedLeadCurrency,
        costCurrency: selectedLeadCurrency
      }))
    }
  }, [
    selectedLead,
    selectedLeadCurrency,
    destinationMap,
    form.destination,
    hasLoadedEditSnapshot,
    isEditMode
  ])

  useEffect(() => {
    const dayCount = parseDayCount(form.durationDays)
    setItineraryItems(prev => {
      const next = buildItineraryRows(dayCount, prev)
      return areItineraryRowsEqual(prev, next) ? prev : next
    })
  }, [form.durationDays])

  const addOnTotal = useMemo(
    () =>
      addOnServices.reduce(
        (sum, item) => sum + (Number(item.sellValue) || 0),
        0
      ),
    [addOnServices]
  )

  const addOnBaseCostTotal = useMemo(
    () =>
      Number(
        addOnServices
          .reduce((sum, item) => sum + (Number(item.baseCost) || 0), 0)
          .toFixed(2)
      ),
    [addOnServices]
  )

  const addOnMarkupTotal = useMemo(
    () =>
      Number(
        addOnServices
          .reduce(
            (sum, item) =>
              sum +
              ((Number(item.sellValue) || 0) - (Number(item.baseCost) || 0)),
            0
          )
          .toFixed(2)
      ),
    [addOnServices]
  )

  // Auto-calculate finance breakdown from service rows + add-ons
  useEffect(() => {
    const serviceSellTotal = Number(
      serviceCostRows
        .reduce((sum, row) => sum + (Number(row.sellValue) || 0), 0)
        .toFixed(2)
    )
    const serviceMarkupTotal = Number(
      serviceCostRows
        .filter(row => row.key !== 'flights')
        .reduce(
          (sum, row) =>
            sum + ((Number(row.sellValue) || 0) - (Number(row.baseCost) || 0)),
          0
        )
        .toFixed(2)
    )

    const markupAmount = Number((serviceMarkupTotal + addOnMarkupTotal).toFixed(2))
    const serviceFeeAmount = Number(costs.serviceFee) || 0
    const subtotal = serviceSellTotal + addOnTotal + serviceFeeAmount
    const gstPercent = finance.gstEnabled ? finance.gstPercent : 0
    const tcsPercent = finance.tcsEnabled ? finance.tcsPercent : 0
    const gstAmount = (subtotal * gstPercent) / 100
    const tcsAmount = (subtotal * tcsPercent) / 100
    const discount = Number(costs.discount) || 0
    const totalSaleValue = subtotal + gstAmount + tcsAmount - discount
    const taxAmount = gstAmount + tcsAmount

    setFinance(prev => ({
      ...prev,
      supplierTaxPercent: 0,
      supplierTaxAmount: 0,
      gstAmount: Number(gstAmount.toFixed(2)),
      tcsAmount: Number(tcsAmount.toFixed(2)),
      totalSaleValue: Number(Math.max(0, totalSaleValue).toFixed(2)),
      subtotal: Number(subtotal.toFixed(2)),
      taxAmount: Number(taxAmount.toFixed(2)),
      totalMarkup: Number(markupAmount.toFixed(2))
    }))
  }, [
    addOnBaseCostTotal,
    addOnMarkupTotal,
    addOnTotal,
    costs.serviceFee,
    costs.discount,
    finance.gstEnabled,
    finance.gstPercent,
    finance.tcsEnabled,
    finance.tcsPercent,
    serviceCostRows
  ])

  const [editingAddOnId, setEditingAddOnId] = useState<string | null>(null)

  const addAddOnService = () => {
    const name = addOnDraft.name.trim()
    const baseCost = Number(addOnDraft.baseCost)
    const markupPercent = Number(addOnDraft.markupPercent)
    const boundedBaseCost = Math.max(0, baseCost)
    const boundedMarkupPercent = Math.min(100, Math.max(0, markupPercent))
    const markup = Number(((boundedBaseCost * boundedMarkupPercent) / 100).toFixed(2))
    const sellValue = Number((boundedBaseCost + markup).toFixed(2))
    if (
      !name ||
      !Number.isFinite(baseCost) ||
      baseCost < 0 ||
      !Number.isFinite(markupPercent) ||
      markupPercent < 0 ||
      !Number.isFinite(sellValue) ||
      sellValue < 0
    ) {
      alert('Please fill all add-on fields with valid values.')
      return
    }
    const supplierId = String(addOnDraft.supplierId || '').trim()
    const supplierName = String(addOnDraft.supplierName || '').trim()
    if (editingAddOnId) {
      setAddOnServices(prev =>
        prev.map(s =>
          s.id === editingAddOnId
            ? {
                id: s.id,
                name,
                baseCost: boundedBaseCost,
                markup,
                markupPercent: boundedMarkupPercent,
                sellValue
                ,
                supplierId: supplierId || undefined,
                supplierName: supplierName || undefined
              }
            : s
        )
      )
      setEditingAddOnId(null)
    } else {
      setAddOnServices(prev => [
        ...prev,
        {
          id: `addon-${Date.now()}`,
          name,
          baseCost: boundedBaseCost,
          markup,
          markupPercent: boundedMarkupPercent,
          sellValue
          ,
          supplierId: supplierId || undefined,
          supplierName: supplierName || undefined
        }
      ])
    }
    setAddOnDraft({
      name: '',
      baseCost: '',
      markupPercent: '',
      supplierId: '',
      supplierName: '',
      sellValue: ''
    })
    setShowAddOnModal(false)
  }

  const editAddOnService = (service: typeof addOnServices[0]) => {
    setEditingAddOnId(service.id)
    setAddOnDraft({
      name: service.name,
      baseCost: String(service.baseCost),
      markupPercent: String(
        service.markupPercent !== undefined
          ? service.markupPercent
          : service.baseCost > 0
            ? Number(((service.markup / service.baseCost) * 100).toFixed(2))
            : 0
      ),
      supplierId: String(service.supplierId ?? ''),
      supplierName: String(service.supplierName ?? ''),
      sellValue: String(service.sellValue)
    })
    setShowAddOnModal(true)
  }

  const removeAddOnService = (id: string) => {
    if (confirm('Remove this service?')) {
      setAddOnServices(prev => prev.filter(s => s.id !== id))
    }
  }

  const serviceBaseCostTotal = useMemo(
    () =>
      Number(
        serviceCostRows
          .reduce((sum, row) => sum + (Number(row.baseCost) || 0), 0)
          .toFixed(2)
      ),
    [serviceCostRows]
  )

  const nonFlightServiceRows = useMemo(
    () => serviceCostRows.filter(row => row.key !== 'flights'),
    [serviceCostRows]
  )

  const flightServiceChargeTotal = useMemo(
    () =>
      Number(
        serviceCostRows
          .filter(row => row.key === 'flights')
          .reduce(
            (sum, row) =>
              sum + ((Number(row.sellValue) || 0) - (Number(row.baseCost) || 0)),
            0
          )
          .toFixed(2)
      ),
    [serviceCostRows]
  )

  const markupBaseCostTotal = useMemo(
    () =>
      Number(
        nonFlightServiceRows
          .reduce((sum, row) => sum + (Number(row.baseCost) || 0), 0)
          .toFixed(2)
      ),
    [nonFlightServiceRows]
  )

  const totalMarkupFromServices = useMemo(
    () =>
      Number(
        nonFlightServiceRows
          .reduce(
            (sum, row) =>
              sum + ((Number(row.sellValue) || 0) - (Number(row.baseCost) || 0)),
            0
          )
          .toFixed(2)
      ),
    [nonFlightServiceRows]
  )

  const effectiveMarkupPercent = useMemo(() => {
    if (!markupBaseCostTotal) return 0
    return Number(
      ((totalMarkupFromServices / markupBaseCostTotal) * 100).toFixed(2)
    )
  }, [markupBaseCostTotal, totalMarkupFromServices])

  const serviceChargesTotal = useMemo(
    () =>
      Number(
        (
          serviceCostRows.reduce((sum, row) => sum + row.sellValue, 0) +
          addOnTotal
        ).toFixed(2)
      ),
    [serviceCostRows, addOnTotal]
  )

  // Keep supplier cost aligned with manually edited service base costs.
  useEffect(() => {
    setCosts(prev => {
      const current = Number(prev.supplierCost) || 0
      if (Math.abs(current - serviceBaseCostTotal) < 0.01) return prev
      return {
        ...prev,
        supplierCost: serviceBaseCostTotal
      }
    })
  }, [serviceBaseCostTotal])

  const computed = useMemo(() => {
    const supplier = serviceBaseCostTotal
    const serviceFee = Number(costs.serviceFee) || 0
    const discount = Number(costs.discount) || 0

    // Calculate from effective sell values so manual overrides are reflected.
    const servicesMarkup = totalMarkupFromServices
    const totalPrice = Number(finance.totalSaleValue) || 0
    const taxVal = Number(finance.taxAmount) || 0
    const profit = Number((servicesMarkup + addOnMarkupTotal).toFixed(2))
    const margin = totalPrice ? Number(((profit / totalPrice) * 100).toFixed(2)) : 0

    return {
      supplier,
      markupVal: servicesMarkup,
      serviceFee,
      addOnTotal,
      taxVal,
      discount,
      totalPrice,
      profit,
      margin
    }
  }, [
    addOnTotal,
    costs.discount,
    costs.serviceFee,
    finance.taxAmount,
    finance.totalSaleValue,
    serviceBaseCostTotal,
    totalMarkupFromServices,
    addOnMarkupTotal
  ])

  const subtotal = Number(finance.subtotal || 0)
  const taxes = Number(finance.taxAmount || 0)
  const total = Number(finance.totalSaleValue || 0)
  const quoteDisplayNumber = form.quote.trim() || 'AUTO-GENERATED'

  const pricingFieldErrors = useMemo<PricingFieldErrors>(() => {
    const errors: PricingFieldErrors = {}
    selectedServiceDefinitions.forEach(definition => {
      const override = serviceOverrides[definition.key] ?? {}
      const isFlightService = definition.key === 'flights'
      const baseCostError = getNumericOverrideError(override.baseCost, {
        min: 0
      })
      const markupError = isFlightService
        ? getNumericOverrideError(override.serviceCharge, { min: 0 })
        : getNumericOverrideError(override.markupPercent, {
          min: 0,
          max: 100
        })
      if (baseCostError) errors[`${definition.key}.baseCost`] = baseCostError
      if (markupError)
        errors[`${definition.key}.${isFlightService ? 'serviceCharge' : 'markupPercent'}`] =
          markupError
    })
    return errors
  }, [selectedServiceDefinitions, serviceOverrides])
  const hasPricingErrors = Object.keys(pricingFieldErrors).length > 0
  const inclusionLines = useMemo(
    () => toBulletList(form.inclusions),
    [form.inclusions]
  )
  const inclusionLineSet = useMemo(
    () => new Set(inclusionLines.map(line => line.toLowerCase())),
    [inclusionLines]
  )
  const exclusionLines = useMemo(
    () => toBulletList(form.exclusions),
    [form.exclusions]
  )

  const toggleInclusionShortcut = useCallback((line: string) => {
    setForm(prev => {
      const currentLines = toBulletList(prev.inclusions)
      const matchIndex = currentLines.findIndex(
        existing => existing.toLowerCase() === line.toLowerCase()
      )
      if (matchIndex >= 0) {
        currentLines.splice(matchIndex, 1)
      } else {
        currentLines.push(line)
      }
      return {
        ...prev,
        inclusions: currentLines.join('\n')
      }
    })
  }, [])

  const money = (v: number) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US'
    // Ensure the value is a valid finite number
    if (!Number.isFinite(v) || isNaN(v)) {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(0)
    }
    // Cap extremely large numbers to prevent display issues
    const cappedValue = Math.min(Math.max(v, -999999999999), 999999999999)
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(cappedValue)
  }



  const formatPreviewDate = (value?: string) => {
    if (!value) return 'N/A'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString()
  }

  const autofillCustomer = () => {
    if (!selectedLead) return

    const resolvedDestination =
      typeof selectedLead.destination === 'string'
        ? selectedLead.destination
        : selectedLead.destination?.name ?? selectedLead.destinationName ?? ''
    const destinationName = selectedLead.destinationId
      ? destinationMap[selectedLead.destinationId] ||
      resolvedDestination ||
      form.destination
      : resolvedDestination || form.destination

    setForm(prev => ({
      ...prev,
      customer: selectedLead.fullName || prev.customer,
      email: selectedLead.email || prev.email,
      phone: selectedLead.phone || prev.phone,
      leadCountry: selectedLead.leadCountry || selectedLead.country || prev.leadCountry,
      nationality: selectedLead.nationality || prev.nationality,
      addressLine: selectedLead.addressLine || selectedLead.address_line || prev.addressLine,
      panNumber: selectedLead.panNumber || selectedLead.pan_number || prev.panNumber,
      budget: selectedLead.budget !== undefined && selectedLead.budget !== null ? String(selectedLead.budget) : prev.budget,
      destination: destinationName,
      startDate: selectedLead.travelDate
        ? selectedLead.travelDate.slice(0, 10)
        : prev.startDate,
      endDate: (selectedLead as any).travelEndDate
        ? (selectedLead as any).travelEndDate.slice(0, 10)
        : prev.endDate,
      adults: Number(selectedLead.adultsCount || prev.adults || 1),
      travelPurpose: selectedLead.travelPurpose || prev.travelPurpose,
      leadSource: (selectedLead as any).source || prev.leadSource
    }))
    if (selectedLeadCurrency) {
      setCurrency(selectedLeadCurrency)
      setCurrencies(prev => ({
        ...prev,
        clientCurrency: selectedLeadCurrency,
        costCurrency: selectedLeadCurrency
      }))
    }
    setSaveError('')
  }

  const addItineraryItem = () => {
    if (
      !newItem.title.trim() ||
      !newItem.description.trim() ||
      !newItem.day.trim()
    ) {
      alert('Please fill all fields for the new item.')
      return
    }
    setItineraryItems(prev => [
      ...prev,
      {
        id: `${Date.now()}`,
        day: newItem.day,
        title: newItem.title,
        description: newItem.description
      }
    ])
    const nextDay = `Day ${itineraryItems.length + 2}`
    setShowAddModal(false)
    setNewItem({ day: nextDay, title: '', description: '' })
  }

  const handleDownload = async () => {
    if (!previewRef.current || downloading) return
    setDownloading(true)
    const previewEl = previewRef.current
    const exportStyle = document.createElement('style')
    exportStyle.setAttribute('data-quotation-pdf', 'true')
    exportStyle.innerHTML = `
      .pdf-exporting .included-service-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        line-height: 1;
        padding-top: 2px;
        padding-bottom: 2px;
        background-color: transparent;
        border-color: transparent;
        border-width: 0;
        font-weight: 600;
      }
      .pdf-exporting .preview-validation {
        display: flex;
        align-items: center;
        gap: 4px;
        line-height: 1.2;
        background-color: transparent;
        border: 0;
        padding: 0;
        font-weight: 600;
      }
      .pdf-exporting .preview-validation-icon {
        display: none;
      }
    `
    document.head.appendChild(exportStyle)
    previewEl.classList.add('pdf-exporting')
    try {
      // Lazy-load only when needed to keep bundle light and avoid install.
      const html2canvasModule = (await import(
        /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm'
      )) as any
      const html2canvas = html2canvasModule.default || html2canvasModule
      const jsPdfModule = (await import(
        /* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm'
      )) as any
      const JsPDF = jsPdfModule.default || jsPdfModule

      const canvas = await html2canvas(previewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      })
      const imgData = canvas.toDataURL('image/png')

      const pdf = new JsPDF('p', 'mm', 'a4')
      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()
      const imgHeight = (canvas.height * pageWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(
        imgData,
        'PNG',
        0,
        position,
        pageWidth,
        imgHeight,
        '',
        'FAST'
      )
      heightLeft -= pageHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(
          imgData,
          'PNG',
          0,
          position,
          pageWidth,
          imgHeight,
          '',
          'FAST'
        )
        heightLeft -= pageHeight
      }

      pdf.save(`${form.quote || 'quotation'}.pdf`)
    } catch (err) {
      console.error('PDF export failed', err)
      alert('Download nahi ho paya, please try again.')
    } finally {
      previewEl.classList.remove('pdf-exporting')
      exportStyle.remove()
      setDownloading(false)
    }
  }

  const buildImportantNotes = () => {
    const itinerarySummary = itineraryItems
      .map(
        item =>
          `${item.day}: ${item.title}${item.description ? ` - ${item.description}` : ''
          }`
      )
      .join('\n')

    const enabledServices = selectedServiceDefinitions
      .map(definition => definition.label)
      .join(', ')

    const supplierName = selectedSupplier?.name?.trim() || ''

    const sections = [
      `Trip Summary:\nQuote Reference: ${form.quote || 'N/A'
      }\nQuotation Title: ${quotationTitleDisplay || 'N/A'}\nVersion: ${form.version || 'N/A'
      }\nDestination: ${form.destination || 'N/A'}\nTravel Date: ${form.startDate || 'N/A'
      }\nNights: ${form.nights}\nDays: ${form.durationDays || 'N/A'
      }\nDuration: ${previewDurationLabel || 'N/A'}\nAdults: ${form.adults
      }\nChildren: ${form.children}\n${Array.isArray(form.childAges) && form.childAges.length
        ? `Child Ages: ${form.childAges
          .filter(age => String(age).trim())
          .join(', ')}`
        : ''
      }Package Type: ${packageType}${sourcePackageName ? `\nSelected Package: ${sourcePackageName}` : ''
      }${supplierName ? `\nSupplier: ${supplierName}` : ''}`,
      enabledServices ? `Enabled Services:\n${enabledServices}` : '',
      itinerarySummary ? `Itinerary:\n${itinerarySummary}` : '',
      form.headerBranding.trim()
        ? `Header Branding:\n${form.headerBranding.trim()}`
        : '',
      form.inclusions.trim() ? `Inclusions:\n${form.inclusions.trim()}` : '',
      form.exclusions.trim() ? `Exclusions:\n${form.exclusions.trim()}` : '',
      form.hotelDetails.trim()
        ? `Hotel Details:\n${form.hotelDetails.trim()}`
        : '',
      form.visaDetails.trim()
        ? `Visa Details:\n${form.visaDetails.trim()}`
        : '',
      form.paymentTerms.trim()
        ? `Payment Terms:\n${form.paymentTerms.trim()}`
        : '',
      form.cancellationPolicy.trim()
        ? `Cancellation Policy:\n${form.cancellationPolicy.trim()}`
        : '',
      form.footerDisclaimer.trim()
        ? `Footer Disclaimer:\n${form.footerDisclaimer.trim()}`
        : ''
    ].filter(Boolean)

    if (!sections.length) return undefined
    return sections.join('\n\n').slice(0, 3900)
  }

  const buildBuilderSnapshot = () => {
    const travelEndDate = toDateInputValue(resolvedTravelStartDate, form.nights)

    return {
      quoteReference: form.quote.trim() || null,
      versionLabel: form.version.trim() || null,
      quotationTitle: form.quotationTitle.trim() || null,
      lead: {
        id: selectedLeadId || null,
        leadId: selectedLeadDisplayId || null,
        leadCode: selectedLeadDisplayId || null,
        metaLeadId:
          toTrimmedString(
            selectedLead?.metaLeadId ?? selectedLead?.meta_lead_id
          ) || null,
        fullName: form.customer.trim() || selectedLead?.fullName || null,
        email: form.email.trim() || selectedLead?.email || null,
        phone: selectedLead?.phone || null,
        destination:
          form.destination.trim() ||
          selectedLead?.destinationName ||
          (selectedLead?.destinationId
            ? destinationMap[selectedLead.destinationId]
            : null) ||
          null,
        childrenCount: Number(form.children) || 0,
        childAges: (Array.isArray(form.childAges) ? form.childAges : [])
          .map(age => Number(age))
          .filter(age => Number.isFinite(age))
      },
      customerName: form.customer.trim() || null,
      customerEmail: form.email.trim() || null,
      destination: form.destination.trim() || null,
      travelStartDate: resolvedTravelStartDate || null,
      travelEndDate,
      nights: Number(form.nights) || 0,
      durationNights: Number(form.nights) || 0,
      durationDays: parseDayCount(form.durationDays) || 0,
      durationLabel: previewDurationLabel || null,
      adults: Number(form.adults) || 0,
      children: Number(form.children) || 0,
      childAges: (Array.isArray(form.childAges) ? form.childAges : [])
        .map(age => Number(age))
        .filter(age => Number.isFinite(age)),
      validUntil: form.validUntil || null,
      packageType,
      currency,
      package: selectedPackageId
        ? {
          id: selectedPackageId,
          name: sourcePackageName || null,
          duration: previewDurationLabel || null,
          destination: form.destination.trim() || null,
          validFrom:
            String(
              selectedPackage?.validFrom ?? selectedPackage?.valid_from ?? ''
            ).trim() ||
            form.startDate ||
            null,
          validTo:
            String(
              selectedPackage?.validTo ?? selectedPackage?.valid_to ?? ''
            ).trim() ||
            form.validUntil ||
            null,
          kind:
            selectedPackage?.packageKind ??
            selectedPackage?.package_kind ??
            null
        }
        : null,
      supplierDetails: selectedSupplierId
        ? {
          supplierId: selectedSupplierId,
          supplierName: selectedSupplier?.name || null
        }
        : null,
      enabledServices: selectedServiceDefinitions.map(definition => ({
        key: definition.key,
        label: definition.label,
        itemType: definition.itemType
      })),
      services,
      serviceRows: serviceCostRows.map(row => {
        const override = serviceOverrides[row.key] ?? {}
        return {
          key: row.key,
          label: row.label,
          itemType: row.itemType,
          weight: row.weight,
          baseCost:
            override.baseCost !== undefined && override.baseCost !== ''
              ? Number(override.baseCost)
              : row.baseCost,
          markupPercent:
            override.markupPercent !== undefined &&
              override.markupPercent !== ''
              ? Number(override.markupPercent)
              : row.markupPercent,
          serviceCharge:
            row.key === 'flights'
              ? override.serviceCharge !== undefined &&
                override.serviceCharge !== ''
                ? Number(override.serviceCharge)
                : row.markupAmount
              : undefined,
          markupAmount: row.markupAmount,
          sellValue: row.sellValue,
          paymentTerms: override.paymentTerms?.trim() || null,
          supplierId: override.supplierId?.trim() || null,
          supplierName: override.supplierName?.trim() || null
        }
      }),
      addOnServices: addOnServices.map(service => ({
        id: service.id,
        name: service.name,
        baseCost: Number(service.baseCost) || 0,
        markup: Number(service.markup) || 0,
        markupPercent:
          service.markupPercent !== undefined
            ? Number(service.markupPercent) || 0
            : undefined,
        sellValue: Number(service.sellValue) || 0,
        supplierId: service.supplierId?.trim() || null,
        supplierName: service.supplierName?.trim() || null
      })),
      itineraryItems: itineraryItems.map(item => ({
        id: item.id,
        day: item.day,
        title: item.title,
        description: item.description
      })),
      content: {
        headerBranding: form.headerBranding,
        inclusions: form.inclusions,
        exclusions: form.exclusions,
        paymentTerms: form.paymentTerms,
        cancellationPolicy: form.cancellationPolicy,
        footerDisclaimer: form.footerDisclaimer,
        hotelDetails: form.hotelDetails,
        visaDetails: form.visaDetails,
        leadCountry: form.leadCountry,
        addressLine: form.addressLine,
        budget: form.budget,
        travelPurpose: form.travelPurpose,
        leadSource: form.leadSource
      },
      pricing: {
        supplierCost: Number(costs.supplierCost) || 0,
        addOnBaseCost: addOnBaseCostTotal,
        markupPercent: Number(costs.markupPercent) || 0,
        addOnMarkup: addOnMarkupTotal,
        manualServiceFee: Number(costs.serviceFee) || 0,
        serviceFee: Number(
          ((Number(costs.serviceFee) || 0) + flightServiceChargeTotal).toFixed(2)
        ),
        taxPercent: 0,
        discount: Number(costs.discount) || 0,
        taxAmount: Number(finance.taxAmount) || 0,
        totalPrice: Number(finance.totalSaleValue) || 0,
        profit: Number(computed.profit) || 0,
        margin: Number(computed.margin) || 0,
        supplierTaxPercent: 0,
        gstEnabled: Boolean(finance.gstEnabled),
        gstPercent: Number(finance.gstPercent) || 0,
        tcsEnabled: Boolean(finance.tcsEnabled),
        tcsPercent: Number(finance.tcsPercent) || 0,
        serviceChargesTotal,
        totalMarkupFromServices
      }
    }
  }

  const handleSave = async () => {
    if (saving) return
    setSaveError('')
    if (isEditMode && !editingQuotationId) {
      setSaveError('Quotation ID is missing for edit mode.')
      return
    }
    if (isEditLocked) {
      setSaveError('Approved quotations cannot be edited.')
      return
    }
    if (!resolvedTravelStartDate) {
      setSaveError(
        'Travel Date is required. Select a lead with travel date or fill Start Date.'
      )
      return
    }
    if (hasPricingErrors) {
      setSaveError('Fix pricing validation errors before saving.')
      return
    }
    setSaving(true)

    try {
      if (!token) {
        const newQuote: SavedQuote = {
          id: String(Date.now()),
          quoteNumber: form.quote || 'Draft',
          customer: form.customer || 'Unnamed Customer',
          email: form.email || 'New Lead',
          destination: form.destination || 'Destination',
          details: [
            quotationTitleDisplay,
            previewDurationLabel || `${form.nights} nights`
          ]
            .filter(Boolean)
            .join(' • '),
          total: computed.totalPrice,
          margin: Number(computed.margin.toFixed(1)),
          status: 'pending',
          lastSent: null,
          sentDate: new Date().toISOString().slice(0, 10)
        }

        if (typeof window !== 'undefined') {
          const existingRaw = localStorage.getItem('quotations_custom')
          const existing = existingRaw
            ? (JSON.parse(existingRaw) as SavedQuote[])
            : []
          localStorage.setItem(
            'quotations_custom',
            JSON.stringify([newQuote, ...existing])
          )
        }

        setShowSaved(true)
        setTimeout(() => navigate(quotationReturnPath), 1200)
        return
      }

      let quoteLeadId = selectedLeadId

      const cleanChildAges = (Array.isArray(form.childAges) ? form.childAges : [])
        .map(age => Number(age))
        .filter(age => Number.isFinite(age) && age >= 0 && age <= 18)

      const leadPayload = {
        fullName: (form.customer || '').trim() || 'Unknown Customer',
        clientCreatedAt: nowWallClockString(),
        clientTimezone: getBrowserTimeZone(),
        email: (form.email || '').trim() || undefined,
        phone: (form.phone || '').trim(),
        destinationName: (form.destination || '').trim() || undefined,
        travelDate: form.startDate || undefined,
        travelEndDate: form.endDate || undefined,
        adultsCount: Math.max(1, Number(form.adults) || 1),
        childrenCount: Math.max(0, Number(form.children) || 0),
        childAges: cleanChildAges.length > 0 ? cleanChildAges : undefined,
        leadCountry: (form.leadCountry || '').trim() || undefined,
        nationality: (form.nationality || '').trim() || undefined,
        budget: Number(form.budget) ? Number(form.budget) : undefined,
        travelPurpose: (form.travelPurpose || '').trim() || undefined,
        source: (form.leadSource || '').trim() || 'Quotation Builder',
        campaignId: form.campaignId || undefined,
        notes:
          form.quotationTitle?.trim()
            ? `Quotation: ${form.quotationTitle.trim()}`
            : undefined
      }

      if (!isEditMode) {
        if (!quoteLeadId) {
          const newLead = await leadsService.createLead(leadPayload)
          const createdLead = unwrapApiData(newLead) || newLead || {}
          quoteLeadId =
            String((createdLead as any).id || (createdLead as any).leadId || '')
          if (!quoteLeadId) {
            throw new Error('Failed to create lead for quotation.')
          }
          setSelectedLeadId(quoteLeadId)
        } else {
          await leadsService.updateLead(quoteLeadId, leadPayload)
        }
      }

      const manualServiceFee = Number(costs.serviceFee) || 0
      // Flight markup is treated as service charge (not markup %) and must still
      // be included in persisted financial totals for backend parity.
      const serviceFee = Number((manualServiceFee + flightServiceChargeTotal).toFixed(2))
      const totalSupplierCost = Number(
        (serviceBaseCostTotal + addOnBaseCostTotal).toFixed(2)
      )
      const markupAmount = Number(
        (totalMarkupFromServices + addOnMarkupTotal).toFixed(2)
      )
      const components = [
        ...serviceCostRows.map(row => {
          const override = serviceOverrides[row.key] ?? {}
          return {
            itemType: row.itemType,
            description: `${row.label}${form.destination ? ` - ${form.destination}` : ''
              }${override.paymentTerms ? ` (${override.paymentTerms})` : ''}`,
            cost: row.baseCost,
            sellValue: row.sellValue,
            supplierId: override.supplierId?.trim() || null,
            supplierName: override.supplierName?.trim() || null
          }
        }),
        ...addOnServices.map(service => ({
          itemType: 'OTHER',
          description: `Add-on Service - ${service.name}`,
          cost: Number((Number(service.baseCost) || 0).toFixed(2)),
          sellValue: Number((Number(service.sellValue) || 0).toFixed(2)),
          supplierId: service.supplierId?.trim() || null,
          supplierName: service.supplierName?.trim() || null
        }))
      ]

      const discount = Number(costs.discount) || 0

      const expiresInHours = (() => {
        if (!form.validUntil) return undefined
        const diffMs = new Date(form.validUntil).getTime() - Date.now()
        if (!Number.isFinite(diffMs) || diffMs <= 0) return undefined
        const hours = Math.ceil(diffMs / (1000 * 60 * 60))
        return Math.min(hours, 720)
      })()

      const buildAutoTemplateCode = () => {
        const stamp = Date.now().toString(36).toUpperCase()
        const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
        return `AUTO-${stamp}-${rand}`.slice(0, 50)
      }

      const buildAutoTemplateName = () => {
        const title = toTrimmedString(form.quotationTitle)
        if (title) return title.slice(0, 150)
        const destination = toTrimmedString(form.destination)
        if (destination) return `Custom - ${destination}`.slice(0, 150)
        return `Custom Quotation Template`.slice(0, 150)
      }

      let resolvedTemplateId: string | undefined = isUuid(selectedTemplateId)
        ? selectedTemplateId
        : undefined

      // If "Custom Quotation" selected, auto-save it as a reusable template
      // before saving quotation.
      if (!isEditMode && !selectedTemplateId) {
        const templatePayload = {
          code: buildAutoTemplateCode(),
          name: buildAutoTemplateName(),
          templateType: 'CUSTOM_ITINERARY' as TemplateType,
          minMarginPercent: 0,
          isActive: true,
          headerBranding: form.headerBranding?.trim() || undefined,
          inclusions: form.inclusions?.trim() || undefined,
          exclusions: form.exclusions?.trim() || undefined,
          paymentTerms: form.paymentTerms?.trim() || undefined,
          cancellationPolicy: form.cancellationPolicy?.trim() || undefined,
          footerDisclaimer: form.footerDisclaimer?.trim() || undefined
        }

        try {
          const created = await quotationsApi.createTemplate(templatePayload)
          const createdTemplate =
            unwrapApiData<Record<string, unknown>>(created) || {}
          const createdTemplateId = toTrimmedString(
            (createdTemplate as any).id ?? (createdTemplate as any).templateId
          )
          if (createdTemplateId) {
            resolvedTemplateId = createdTemplateId
            setSelectedTemplateId(createdTemplateId)
            setTemplates(prev =>
              prev.some(t => t.id === createdTemplateId)
                ? prev
                : [
                    ...prev,
                    {
                      id: createdTemplateId,
                      code: toTrimmedString((createdTemplate as any).code),
                      name: toTrimmedString((createdTemplate as any).name),
                      templateType:
                        ((createdTemplate as any).templateType ??
                          (createdTemplate as any).template_type ??
                          'CUSTOM_ITINERARY') as TemplateType,
                      isActive:
                        (createdTemplate as any).isActive ??
                        (createdTemplate as any).is_active ??
                        true,
                      minMarginPercent: toFiniteNumber(
                        (createdTemplate as any).minMarginPercent ??
                          (createdTemplate as any).min_margin_percent,
                        0
                      ),
                      headerBranding: toTrimmedString(
                        (createdTemplate as any).headerBranding ??
                          (createdTemplate as any).header_branding
                      ),
                      inclusions: toTrimmedString(
                        (createdTemplate as any).inclusions
                      ),
                      exclusions: toTrimmedString(
                        (createdTemplate as any).exclusions
                      ),
                      paymentTerms: toTrimmedString(
                        (createdTemplate as any).paymentTerms ??
                          (createdTemplate as any).payment_terms
                      ),
                      cancellationPolicy: toTrimmedString(
                        (createdTemplate as any).cancellationPolicy ??
                          (createdTemplate as any).cancellation_policy
                      ),
                      footerDisclaimer: toTrimmedString(
                        (createdTemplate as any).footerDisclaimer ??
                          (createdTemplate as any).footer_disclaimer
                      )
                    }
                  ]
            )
          }
        } catch (error) {
          console.error('Failed to auto-save custom template:', error)
          reportApiError(
            error,
            'Failed to save quotation template for custom quotation.',
            setSaveError
          )
          return
        }
      }

      const basePayload = {
        ...(resolvedTemplateId ? { templateId: resolvedTemplateId } : {}),
        components,
        marginPercent: Number(costs.markupPercent) || 0,
        discount,
        taxPercent: 0,
        supplierCost: totalSupplierCost,
        markupAmount,
        serviceFeeAmount: serviceFee,
        taxAmount: Number(finance.taxAmount) || 0,
        // Finance breakdown fields
        supplierTaxAmount: 0,
        gstAmount: finance.gstAmount,
        tcsAmount: finance.tcsAmount,
        totalSaleValue: Number(finance.totalSaleValue) || 0,
        // Currency fields
        costCurrency: currencies.costCurrency,
        clientCurrency: currencies.clientCurrency,
        supplierCurrency: currencies.supplierCurrency,
        importantNotes: buildImportantNotes(),
        builderSnapshot: buildBuilderSnapshot(),
        ...(expiresInHours ? { expiresInHours } : {})
      }
      if (isEditMode && editingQuotationId) {
        await quotationsApi.update(editingQuotationId, basePayload)
      } else {
        await quotationsApi.create({
          ...basePayload,
          leadId: quoteLeadId
        })
      }
      setShowSaved(true)
      setTimeout(() => navigate(quotationReturnPath), 1200)
    } catch (error) {
      console.error('Failed to save quotation:', error)
      reportApiError(
        error,
        isEditMode
          ? 'Failed to update quotation.'
          : 'Failed to create quotation.',
        setSaveError
      )
    } finally {
      setSaving(false)
    }
  }

  if (isEditMode && !editingQuotationId) {
    return (
      <div className='rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200'>
        Quotation ID missing. Please open edit from the quotations list.
      </div>
    )
  }

  if (isEditMode && loadingEditQuotation && !hasLoadedEditSnapshot) {
    return (
      <div className='rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300'>
        Loading quotation details...
      </div>
    )
  }

  return (
    <>
      <div className='space-y-6'>
        <div className='flex flex-col justify-between gap-3 lg:flex-row lg:items-center'>
          <div>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate(-1)}
                className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                aria-label='Back to quotations'
                title='Back to Quotations'
              >
                <FaArrowLeft className='text-sm' />
              </button>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                {isEditMode ? 'Edit Quotation' : 'Quotation Builder'}
              </h1>
            </div>
            <p className='text-sm text-gray-500'>
              {isEditMode
                ? 'Update your draft quotation with the same builder experience.'
                : 'Create and preview polished quotations quickly.'}
            </p>

            {saveError ? (
              <p className='mt-2 text-sm text-red-600'>{saveError}</p>
            ) : null}
          </div>
          <div className='grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center'>
            <span className='inline-flex w-full items-center justify-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 sm:w-auto'>
              {form.version}
            </span>
            <button
              onClick={handleDownload}
              className='inline-flex w-full items-center justify-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 sm:w-auto'
              disabled={downloading}
            >
              <FaDownload className='shrink-0' />
              {downloading ? 'Preparing...' : 'Download'}
            </button>
            <button className='inline-flex w-full items-center justify-center gap-1 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 sm:w-auto'>
              <FaEnvelope className='shrink-0' /> Send
            </button>
            <button
              onClick={handleSave}
              disabled={saving || hasPricingErrors || isEditLocked}
              className='col-span-3 w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto'
            >
              <FaFloppyDisk className='mr-2 inline' />{' '}
              {saving
                ? isEditMode
                  ? 'Updating...'
                  : 'Saving...'
                : isEditMode
                  ? 'Update Quotation'
                  : 'Save Quotation'}
            </button>
          </div>
        </div>

        <div className='relative grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]'>
          {/* Left Column - Scrollable with hidden scrollbar */}
          <div className='space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 scrollbar-hide'>
            <SurfaceCard>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                  Customer & Trip
                </h2>
                <div className='flex gap-2'>
                  <button
                    onClick={autofillCustomer}
                    className='text-sm text-blue-600'
                  >
                    Auto-fill
                  </button>
                  <button
                    onClick={() =>
                      navigate(
                        selectedLeadId ? `/leads/${selectedLeadId}` : '/leads'
                      )
                    }
                    className='text-sm text-blue-600'
                  >
                    Edit Lead
                  </button>
                </div>
              </div>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div>
                  <label className='field-label'>Lead</label>
                  <SearchableDropdown
                    value={selectedLeadId}
                    options={leadDropdownOptions}
                    onChange={setSelectedLeadId}
                    disabled={leadsLoading}
                    searchPlaceholder='Search lead...'
                  />
                  {leadsLoading ? (
                    <p className='mt-1 text-xs text-gray-500'>
                      Loading leads...
                    </p>
                  ) : null}
                  {leadsError ? (
                    <p className='mt-1 text-xs text-red-600'>{leadsError}</p>
                  ) : null}
                </div>
                <div>
                  <label className='field-label'>Lead ID </label>
                  <input
                    type='text'
                    className='field-input overflow-hidden text-ellipsis'
                    value={selectedLeadDisplayId}
                    placeholder='Select lead to view ID'
                    readOnly
                  />
                </div>
                <div className='md:col-span-2 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
                  <div className='grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-end'>
                    <div>
                      <label className='field-label'>Quotation Template</label>
                      <SearchableDropdown
                        value={selectedTemplateId}
                        options={quotationTemplateOptions}
                        disabled={templatesLoading}
                        searchPlaceholder='Search quotation template...'
                        onChange={nextId => {
                          // Backward-compat for older "CUSTOM" sentinel.
                          const normalizedId = nextId === 'CUSTOM' ? '' : nextId
                          setSelectedTemplateId(normalizedId)
                          const template =
                            templates.find(item => item.id === normalizedId) ||
                            null
                          applyTemplateDefaults(template)
                        }}
                      />
                    </div>
                    <button
                      type='button'
                      onClick={() => applyTemplateDefaults(selectedTemplate)}
                      disabled={!selectedTemplate}
                      className='rounded-lg border border-blue-200 px-3 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40 disabled:cursor-not-allowed dark:border-blue-800 dark:text-blue-200 dark:hover:bg-blue-900/30'
                    >
                      Apply Template Defaults
                    </button>
                  </div>
                  {templatesLoading ? (
                    <p className='mt-2 text-xs text-gray-500'>
                      Loading templates...
                    </p>
                  ) : null}
                  {templatesError ? (
                    <p className='mt-2 text-xs text-red-600'>
                      {templatesError}
                    </p>
                  ) : null}
                  {selectedTemplate ? (
                    <p className='mt-2 text-xs text-gray-600 dark:text-gray-300'>
                      Selected: {selectedTemplate.name} (
                      {selectedTemplate.templateType}) - Min margin{' '}
                      {selectedTemplate.minMarginPercent}%
                    </p>
                  ) : null}

                  <div className='mt-3'>
                    <label className='field-label'>Supplier</label>
                    <SearchableDropdown
                      value={selectedSupplierId}
                      options={supplierDropdownOptions}
                      onChange={setSelectedSupplierId}
                      disabled={suppliersLoading}
                      searchPlaceholder='Search supplier...'
                    />
                    {suppliersLoading ? (
                      <p className='mt-1 text-xs text-gray-500'>
                        Loading suppliers...
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className='md:col-span-2 rounded-xl border border-green-200 bg-green-50/30 p-3 dark:border-green-800 dark:bg-green-900/10'>
                  <label className='field-label text-green-700 dark:text-green-300'>
                    Load from package (Ready or Customized)
                  </label>
                  <p className='mb-2 text-[11px] text-green-600 dark:text-green-400'>
                    Select a catalog package to prefill the quotation. After
                    loading, you can edit the title, duration, itinerary, and
                    content here without changing the source package. Customized
                    packages also load editable service lines.
                  </p>
                  <SearchableDropdown
                    value={selectedPackageId}
                    options={packageOptions}
                    disabled={packagesLoading}
                    searchPlaceholder='Search packages...'
                    onChange={pkgId => {
                      setSelectedPackageId(pkgId)
                      if (pkgId) void loadFromPackage(pkgId)
                    }}
                  />
                  {packagesLoading ? (
                    <p className='mt-1 text-xs text-gray-500'>
                      Loading packages...
                    </p>
                  ) : null}
                </div>

                <div className='md:col-span-2 rounded-xl border border-gray-200 bg-gray-50/40 p-3 dark:border-gray-700 dark:bg-gray-900/20'>
                  <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                    Customer Profile
                  </p>
                  <div className='mt-3 grid grid-cols-1 gap-4 md:grid-cols-2'>
                    <Field
                      label='Quotation / Package Title'
                      value={form.quotationTitle}
                      onChange={v => setForm(p => ({ ...p, quotationTitle: v }))}
                    />
                    <Field
                      label='Customer Name'
                      value={form.customer}
                      onChange={v => setForm(p => ({ ...p, customer: v }))}
                    />
                    <Field
                      label='Email'
                      value={form.email}
                      onChange={v => setForm(p => ({ ...p, email: v }))}
                    />
                    <div>
                      <label className='field-label'>Phone</label>
                      <input
                        type='tel'
                        className='field-input'
                        value={form.phone || ''}
                        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder='Customer phone number'
                      />
                    </div>
                    <div>
                      <label className='field-label'>Lead Country</label>
                      <SearchableDropdown
                        value={form.leadCountry || ''}
                        options={countryOptions}
                        searchPlaceholder='Search country...'
                        onChange={value => setForm(p => ({ ...p, leadCountry: value }))}
                      />
                    </div>
                    <div>
                      <label className='field-label'>Nationality</label>
                      <SearchableDropdown
                        value={form.nationality || ''}
                        options={nationalityOptions}
                        searchPlaceholder='Search nationality...'
                        onChange={value => setForm(p => ({ ...p, nationality: value }))}
                      />
                    </div>
                    <div>
                      <label className='field-label'>Client Currency</label>
                      <SearchableDropdown
                        value={currency}
                        options={currencyOptions}
                        searchPlaceholder='Search currency...'
                        onChange={value => {
                          const next = String(value || 'INR').toUpperCase()
                          setCurrency(next)
                          setCurrencies(prev => ({
                            ...prev,
                            clientCurrency: next,
                            costCurrency: next
                          }))
                        }}
                      />
                    </div>
                    <div className='md:col-span-2'>
                      <label className='field-label'>Address / Location</label>
                      <textarea
                        className='field-input'
                        rows={2}
                        placeholder='Enter customer address or location'
                        value={form.addressLine || ''}
                        onChange={e => setForm(p => ({ ...p, addressLine: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>

                <div className='md:col-span-2 rounded-xl border border-gray-200 bg-gray-50/40 p-3 dark:border-gray-700 dark:bg-gray-900/20'>
                  <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                    Trip Plan
                  </p>
                  <div className='mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
                    <Field
                      label='Destination'
                      value={form.destination}
                      onChange={v => setForm(p => ({ ...p, destination: v }))}
                    />
                    <div>
                      <label className='field-label'>Start Date *</label>
                      <input
                        type='date'
                        className='field-input'
                        value={form.startDate}
                        onChange={e =>
                          setForm(p => ({ ...p, startDate: e.target.value }))
                        }
                      />
                      {!form.startDate && selectedLead?.travelDate ? (
                        <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          Using lead travel date: {toDateInputString(selectedLead.travelDate)}
                        </p>
                      ) : null}
                    </div>
                    <div>
                      <label className='field-label'>End Date</label>
                      <input
                        type='date'
                        className='field-input'
                        min={form.startDate || undefined}
                        value={form.endDate}
                        onChange={e =>
                          setForm(p => ({ ...p, endDate: e.target.value }))
                        }
                      />
                    </div>
                    <div>
                      <label className='field-label'>Valid Until <span className='text-gray-400 font-normal'>(Quotation expiry)</span></label>
                      <input
                        type='date'
                        className='field-input'
                        value={form.validUntil}
                        onChange={e =>
                          setForm(p => ({ ...p, validUntil: e.target.value }))
                        }
                      />
                      <p className='mt-0.5 text-xs text-gray-400'>How long this quoted price is valid for the customer.</p>
                    </div>
                    <div className='md:col-span-2 lg:col-span-1'>
                      <label className='field-label'>Duration</label>
                      <div className='grid grid-cols-2 gap-2'>
                        <div>
                          <label className='mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400'>Nights</label>
                          <input
                            type='number'
                            min='0'
                            className='field-input overflow-hidden text-ellipsis'
                            placeholder='Nights'
                            value={form.nights}
                            onChange={e => {
                              const nights = Number(e.target.value || 0)
                              const days = nights + 1
                              setForm(p => ({
                                ...p,
                                nights,
                                durationDays: String(days)
                              }))
                            }}
                          />
                        </div>
                        <div>
                          <label className='mb-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400'>Days</label>
                          <input
                            type='number'
                            min='1'
                            className='field-input overflow-hidden text-ellipsis'
                            placeholder='Days'
                            value={form.durationDays}
                            onChange={e => {
                              const days = Number(e.target.value || 0)
                              const nights = Math.max(0, days - 1)
                              setForm(p => ({
                                ...p,
                                durationDays: e.target.value,
                                nights
                              }))
                            }}
                          />
                        </div>
                      </div>
                      <p className='mt-0.5 text-xs text-gray-500'>
                        Duration saves as {previewDurationLabel || '0N/0D'}.
                      </p>
                    </div>
                    <div>
                      <label className='field-label'>Adults</label>
                      <input
                        type='number'
                        min='1'
                        className='field-input overflow-hidden text-ellipsis'
                        value={form.adults}
                        onChange={e =>
                          setForm(p => ({
                            ...p,
                            adults: Math.max(1, Number(e.target.value || 1))
                          }))
                        }
                      />
                    </div>
                    <div className='lg:col-span-1'>
                      <label className='field-label'>Children</label>
                      <input
                        type='number'
                        min='0'
                        className='field-input overflow-hidden text-ellipsis'
                        value={form.children}
                        onChange={e => {
                          const nextChildren = Math.max(0, Number(e.target.value || 0))
                          setForm(prev => {
                            const currentAges = Array.isArray(prev.childAges)
                              ? prev.childAges
                              : []
                            const nextAges = Array.from({ length: nextChildren }, (_, i) =>
                              currentAges[i] ?? ''
                            )
                            return {
                              ...prev,
                              children: nextChildren,
                              childAges: nextAges
                            }
                          })
                        }}
                      />
                    </div>
                    {Number(form.children) > 0 ? (
                      <div className='md:col-span-1 lg:col-span-2'>
                        <label className='field-label'>Child Ages</label>
                        <div
                          className={`grid gap-2 ${Number(form.children) === 1
                              ? 'grid-cols-1'
                              : 'grid-cols-2 md:grid-cols-4'
                            }`}
                        >
                          {Array.from({ length: Number(form.children) }).map((_, index) => (
                            <input
                              key={index}
                              type='number'
                              min='0'
                              max='18'
                              className='field-input overflow-hidden text-ellipsis'
                              placeholder={`Age ${index + 1}`}
                              value={form.childAges?.[index] ?? ''}
                              onChange={e => {
                                const nextValue = e.target.value
                                setForm(prev => {
                                  const currentAges = Array.isArray(prev.childAges)
                                    ? [...prev.childAges]
                                    : []
                                  currentAges[index] = nextValue
                                  return {
                                    ...prev,
                                    childAges: currentAges
                                  }
                                })
                              }}
                            />
                          ))}
                        </div>
                        <p className='mt-0.5 text-xs text-gray-500'>
                          Enter age for each child (0-18).
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className='md:col-span-2 rounded-xl border border-gray-200 bg-gray-50/40 p-3 dark:border-gray-700 dark:bg-gray-900/20'>
                  <p className='text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                    Preferences & Lead Meta
                  </p>
                  <div className='mt-3 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3'>
                    <div>
                      <label className='field-label'>Budget</label>
                      <input
                        type='number'
                        min='0'
                        className='field-input overflow-hidden text-ellipsis'
                        placeholder='Customer budget'
                        value={form.budget || ''}
                        onChange={e => {
                          const value = e.target.value
                          const digitsOnly = /^[\d]{0,20}$/
                          if (!digitsOnly.test(value)) return
                          setForm(p => ({ ...p, budget: value }))
                        }}
                      />
                    </div>
                    <div>
                      <label className='field-label'>Visa Requirement</label>
                      <SearchableDropdown
                        value={form.visaRequired}
                        options={visaOptions}
                        searchPlaceholder='Search visa requirement...'
                        onChange={value => setForm(p => ({ ...p, visaRequired: value }))}
                      />
                    </div>
                    <div>
                      <label className='field-label'>Preferred Hotel Category</label>
                      <SearchableDropdown
                        value={form.preferredHotelCategory}
                        options={hotelCategoryOptions}
                        searchPlaceholder='Search hotel category...'
                        onChange={value => setForm(p => ({ ...p, preferredHotelCategory: value }))}
                      />
                    </div>
                    <div>
                      <label className='field-label'>Travel Purpose</label>
                      <input
                        className='field-input'
                        placeholder='Travel purpose'
                        value={form.travelPurpose}
                        onChange={e => setForm(p => ({ ...p, travelPurpose: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className='field-label'>Lead Source</label>
                      <SearchableDropdown
                        value={form.leadSource}
                        options={leadSourceOptions}
                        searchPlaceholder='Search source...'
                        onChange={value => setForm(p => ({ ...p, leadSource: value }))}
                      />
                    </div>
                    <Field
                      label='Quote Reference'
                      value={form.quote}
                      onChange={v => setForm(p => ({ ...p, quote: v }))}
                    />
                    <div>
                      <label className='field-label'>PAN Number (optional)</label>
                      <input
                        className='field-input'
                        placeholder='Enter PAN number'
                        value={form.panNumber || ''}
                        onChange={e => setForm(p => ({ ...p, panNumber: e.target.value.toUpperCase() }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </SurfaceCard>
            <SurfaceCard>
              <div className='mb-4'>
                <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                  Itinerary Items
                </h2>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  Day fields are created automatically from the quotation Days value.
                </p>
              </div>
              {parseDayCount(form.durationDays) <= 0 ? (
                <div className='rounded-xl border border-dashed border-blue-200 bg-blue-50/40 px-3 py-4 text-sm text-gray-500 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-gray-400'>
                  Enter the total Days in duration to generate itinerary
                  fields.
                </div>
              ) : (
                <div className='space-y-3'>
                  {itineraryItems.map((item, index) => (
                    <div
                      key={item.id}
                      className='rounded-xl border border-blue-100 bg-blue-50/30 p-3 dark:border-blue-900/40 dark:bg-blue-900/10'
                    >
                      <div className='mb-3 flex items-center gap-2'>
                        <span className='rounded-md bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'>
                          {getDayLabel(index)}
                        </span>
                        <input
                          className='field-input'
                          placeholder='Title (Arrival, Sightseeing, Leisure...)'
                          value={item.title}
                          onChange={event => {
                            const nextValue = event.target.value
                            setItineraryItems(prev =>
                              prev.map((row, rowIndex) =>
                                rowIndex === index
                                  ? { ...row, title: nextValue }
                                  : row
                              )
                            )
                          }}
                        />
                      </div>
                      <textarea
                        className='field-input'
                        rows={4}
                        placeholder='Add the plan for this day...'
                        value={item.description}
                        onChange={event => {
                          const nextValue = event.target.value
                          setItineraryItems(prev =>
                            prev.map((row, rowIndex) =>
                              rowIndex === index
                                ? { ...row, description: nextValue }
                                : row
                            )
                          )
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </SurfaceCard>
            <SurfaceCard>
              <div className='mb-3 flex items-start justify-between gap-3'>
                <div>
                  <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                    Pricing Breakdown
                  </h2>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Edit any field to recalculate all values automatically.
                  </p>
                </div>
                <SearchableDropdown
                  className='w-28'
                  value={currency}
                  options={currencyOptions}
                  searchPlaceholder='Search currency...'
                  onChange={value =>
                    (() => {
                      const next = String(value || 'INR').toUpperCase()
                      setCurrency(next)
                      setCurrencies(prev => ({
                        ...prev,
                        clientCurrency: next,
                        costCurrency: next
                      }))
                    })()
                  }
                />
              </div>
              <div className='mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2.5 text-xs text-blue-700'>
                Formula: <strong>Total Sale Value</strong> = Supplier Cost +
                Markup + Service Fee + Tax - Discount.
              </div>
              <div className='mb-4 grid grid-cols-1 gap-3 text-xs text-gray-600 md:grid-cols-3'>
                <div className='rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900'>
                  <p className='font-semibold text-gray-800 dark:text-gray-100'>
                    Step 1: Cost Split
                  </p>
                  <p className='mt-1'>
                    Supplier cost is distributed automatically across selected
                    services.
                  </p>
                </div>
                <div className='rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900'>
                  <p className='font-semibold text-gray-800 dark:text-gray-100'>
                    Step 2: Markup
                  </p>
                  <p className='mt-1'>
                    Markup percent is applied per service. Flights use fixed
                    service charge instead of percentage.
                  </p>
                </div>
                <div className='rounded-lg border border-gray-200 bg-white px-3 py-2.5 dark:border-gray-700 dark:bg-gray-900'>
                  <p className='font-semibold text-gray-800 dark:text-gray-100'>
                    Step 3: Final Amount
                  </p>
                  <p className='mt-1'>
                    Service Fee and Tax are added, Discount is subtracted.
                  </p>
                </div>
              </div>
              <div className='grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,3.5fr)_minmax(0,1fr)]'>
                <div className='space-y-4'>
                  <PricingTable
                    rows={serviceCostRows}
                    overrides={serviceOverrides}
                    money={money}
                    changedCells={changedPricingCells}
                    fieldErrors={pricingFieldErrors}
                    onUpdateField={updateServiceOverrideField}
                    onClearField={clearServiceOverrideField}
                    onCellKeyDown={focusNextPricingInput}
                    suppliers={suppliers}
                    suppliersLoading={suppliersLoading}
                  />
                  <div className='rounded-xl border border-blue-200 bg-blue-50/30 p-3 dark:border-blue-800 dark:bg-blue-900/10'>
                    <div className='mb-2 flex items-center justify-between'>
                      <h3 className='text-sm font-semibold text-gray-800 dark:text-gray-100'>
                        Add-on Services
                      </h3>
                      <button
                        onClick={() => setShowAddOnModal(true)}
                        className='rounded-lg border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                      >
                        <FaPlus className='mr-1 inline' /> Add Service
                      </button>
                    </div>
                    {addOnServices.length ? (
                      <div className='space-y-2 text-xs text-gray-600 dark:text-gray-300'>
                        <div className='grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                          <span>Service</span>
                          <span className='text-right w-20'>Base Cost</span>
                          <span className='text-right w-20'>Markup</span>
                          <span className='text-right w-20'>Sell Value</span>
                          <span className='text-right w-16'>Actions</span>
                        </div>
                        {addOnServices.map(service => (
                          <div
                            key={service.id}
                            className='grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-2'
                          >
                            <span>{service.name}</span>
                            <span className='text-right w-20'>
                              {money(Number(service.baseCost) || 0)}
                            </span>
                            <span className='text-right w-20'>
                              {money(Number(service.markup) || 0)}
                            </span>
                            <span className='text-right w-20 font-medium text-gray-800 dark:text-gray-100'>
                              {money(Number(service.sellValue) || 0)}
                            </span>
                            <div className='flex gap-1'>
                              <button
                                onClick={() => editAddOnService(service)}
                                className='rounded p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                title='Edit'
                              >
                                <FaPencil className='text-xs' />
                              </button>
                              <button
                                onClick={() => removeAddOnService(service.id)}
                                className='rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20'
                                title='Remove'
                              >
                                <FaTrash className='text-xs' />
                              </button>
                            </div>
                          </div>
                        ))}
                        <div className='flex items-center justify-between border-t border-gray-200 pt-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200'>
                          <span>Add-on Total</span>
                          <span className='truncate max-w-[150px]'>{money(Math.min(addOnTotal, 999999999999))}</span>
                        </div>
                        <div className='flex items-center justify-between border-t border-gray-200 pt-2 text-xs font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100'>
                          <span>Services Total</span>
                          <span className='truncate max-w-[150px]'>{money(Math.min(serviceChargesTotal, 999999999999))}</span>
                        </div>
                      </div>
                    ) : (
                      <div className='space-y-2 text-xs text-gray-500'>
                        <p>No add-on services added yet.</p>
                        <div className='flex items-center justify-between border-t border-gray-200 pt-2 text-xs font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100'>
                          <span>Services Total</span>
                          <span className='truncate max-w-[150px]'>{money(Math.min(serviceChargesTotal, 999999999999))}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className='rounded-lg border border-blue-100 bg-blue-50 px-3 py-3 dark:border-blue-900/50 dark:bg-blue-900/20'>
                    <p className='text-xs uppercase text-center text-blue-700 dark:text-blue-300'>
                      Total Sale Value
                    </p>
                    <p className='mt-1 text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-300 truncate'>
                      {money(Math.min(total, 999999999999))}
                    </p>
                  </div>
                </div>
                <SummaryPanel
                  form={form}
                  previewDurationLabel={previewDurationLabel}
                  itineraryCount={itineraryItems.length}
                  selectedServiceCount={selectedServiceDefinitions.length}
                  costs={costs}
                  setCosts={setCosts}
                  finance={finance}
                  setFinance={setFinance}
                  addOnTotal={addOnTotal}
                  addOnMarkup={addOnMarkupTotal}
                  flightServiceCharge={flightServiceChargeTotal}
                  effectiveMarkupPercent={effectiveMarkupPercent}
                  subtotal={subtotal}
                  taxes={taxes}
                  totalMarkup={totalMarkupFromServices || computed.markupVal}
                  money={money}
                />
              </div>
            </SurfaceCard>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <SurfaceCard>
                <h3 className='mb-2 text-sm font-semibold text-green-700'>
                  Inclusions
                </h3>
                <p className='mb-2 text-[11px] text-gray-500 dark:text-gray-400'>
                  Tap icons to add/remove common inclusion lines quickly.
                </p>
                <div className='mb-3 flex flex-wrap gap-2'>
                  {INCLUSION_SHORTCUTS.map(shortcut => {
                    const Icon = shortcut.icon
                    const isActive = inclusionLineSet.has(
                      shortcut.line.toLowerCase()
                    )
                    return (
                      <button
                        key={shortcut.key}
                        type='button'
                        onClick={() => toggleInclusionShortcut(shortcut.line)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition ${isActive
                            ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-blue-700 dark:hover:text-blue-300'
                          }`}
                      >
                        <Icon className='text-xs' />
                        <span>{shortcut.label}</span>
                      </button>
                    )
                  })}
                </div>
                <textarea
                  rows={5}
                  value={form.inclusions}
                  onChange={e =>
                    setForm(p => ({ ...p, inclusions: e.target.value }))
                  }
                  className='field-input'
                />
              </SurfaceCard>
              <SurfaceCard>
                <h3 className='mb-2 text-sm font-semibold text-red-700'>
                  Exclusions
                </h3>
                <textarea
                  rows={5}
                  value={form.exclusions}
                  onChange={e =>
                    setForm(p => ({ ...p, exclusions: e.target.value }))
                  }
                  className='field-input'
                />
              </SurfaceCard>
            </div>
            <SurfaceCard>
              <h3 className='mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                Template Content Blocks
              </h3>
              <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
                <div className='md:col-span-2'>
                  <label className='field-label'>Header Branding</label>
                  <textarea
                    rows={2}
                    className='field-input'
                    value={form.headerBranding}
                    onChange={event =>
                      setForm(prev => ({
                        ...prev,
                        headerBranding: event.target.value
                      }))
                    }
                    placeholder='Brand header line shown on quotation'
                  />
                </div>
                <div>
                  <label className='field-label'>Payment Terms</label>
                  <textarea
                    rows={3}
                    className='field-input'
                    value={form.paymentTerms}
                    onChange={event =>
                      setForm(prev => ({
                        ...prev,
                        paymentTerms: event.target.value
                      }))
                    }
                    placeholder='Payment plan and conditions'
                  />
                </div>
                <div>
                  <label className='field-label'>Cancellation Policy</label>
                  <textarea
                    rows={3}
                    className='field-input'
                    value={form.cancellationPolicy}
                    onChange={event =>
                      setForm(prev => ({
                        ...prev,
                        cancellationPolicy: event.target.value
                      }))
                    }
                    placeholder='Cancellation and refund terms'
                  />
                </div>
                <div>
                  <label className='field-label'>Hotel details</label>
                  <textarea
                    rows={3}
                    className='field-input'
                    value={form.hotelDetails}
                    onChange={event =>
                      setForm(prev => ({
                        ...prev,
                        hotelDetails: event.target.value
                      }))
                    }
                    placeholder='Hotel name, star category, rooms, meal plan, check-in/out'
                  />
                </div>
                <div>
                  <label className='field-label'>Visa details</label>
                  <textarea
                    rows={3}
                    className='field-input'
                    value={form.visaDetails}
                    onChange={event =>
                      setForm(prev => ({
                        ...prev,
                        visaDetails: event.target.value
                      }))
                    }
                    placeholder='Visa type, fees, processing time, documents required'
                  />
                </div>
                <div className='md:col-span-2'>
                  <label className='field-label'>Footer Disclaimer</label>
                  <textarea
                    rows={2}
                    className='field-input'
                    value={form.footerDisclaimer}
                    onChange={event =>
                      setForm(prev => ({
                        ...prev,
                        footerDisclaimer: event.target.value
                      }))
                    }
                    placeholder='Legal/compliance footer note'
                  />
                </div>
              </div>
            </SurfaceCard>
          </div>

          {/* Right Column - Fixed Preview */}
          {showPreview ? (
            <div className='xl:block xl:overflow-y-auto xl:max-h-[calc(100vh-200px)] xl:pr-2 scrollbar-hide'>
              <SurfaceCard className='h-fit'>
                <div className='mb-4 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => setMobile(false)}
                      className={`rounded-lg px-2 py-1 text-xs ${!mobile
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                    >
                      <FaDesktop className='mr-1 inline' /> Desktop
                    </button>
                    <button
                      onClick={() => setMobile(true)}
                      className={`rounded-lg px-2 py-1 text-xs ${mobile
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                    >
                      <FaMobileScreen className='mr-1 inline' /> Mobile
                    </button>
                  </div>
                  <div className='flex gap-2 ml-2'>
                    <button className='rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-gray-700'>
                      <FaArrowRotateRight className='mr-1  inline' /> Refresh
                    </button>
                    <button
                      onClick={() => setShowPreview(false)}
                      className='rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-gray-700'
                    >
                      Hide
                    </button>
                  </div>
                </div>
                <div
                  ref={previewRef}
                  className={`mx-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 ${mobile ? 'max-w-[360px]' : 'max-w-3xl'
                    }`}
                >
                  <div className='mb-6 flex flex-col sm:items-start items-center justify-between gap-4 border-b border-gray-100 pb-4 dark:border-gray-800'>
                    <div className='flex items-center gap-2'>
                      <div className='flex h-8 w-8 items-center justify-center rounded-lg'>
                        <img
                          src='/logo1.png'
                          alt='Get2Vacations'
                          className='h-8 w-6'
                        />
                      </div>
                      <div>
                        <p className='font-semibold'>
                          Get2Vacations
                        </p>
                        <p className='text-xs text-gray-500'>
                          support@Get2Vacations.com
                        </p>
                      </div>
                    </div>
                    <div className='text-center sm:text-right'>
                      <p className='text-lg font-bold text-blue-600'>
                        QUOTATION
                      </p>
                      <p className='text-xs text-gray-500 whitespace-nowrap'>
                        #{quoteDisplayNumber}
                      </p>
                    </div>
                  </div>
                  <div className='mb-4 grid grid-cols-2 gap-2 text-[11px] text-gray-500'>
                    <p>
                      Quote No:{' '}
                      <span className='font-semibold text-gray-700'>
                        {quoteDisplayNumber}
                      </span>
                    </p>
                    <p className='text-right'>
                      Generated:{' '}
                      <span className='font-semibold text-gray-700'>
                        {new Date().toLocaleDateString()}
                      </span>
                    </p>
                    <p>
                      Package Type:{' '}
                      <span className='font-semibold text-gray-700'>
                        {packageType}
                      </span>
                    </p>
                    <p className='text-right'>
                      Duration:{' '}
                      <span className='font-semibold text-gray-700'>
                        {previewDurationLabel || 'N/A'}
                      </span>
                    </p>
                    <p>
                      Title:{' '}
                      <span className='font-semibold text-gray-700'>
                        {quotationTitleDisplay}
                      </span>
                    </p>
                    <p className='text-right'>
                      Services:{' '}
                      <span className='font-semibold text-gray-700'>
                        {selectedServiceDefinitions.length}
                      </span>
                    </p>
                  </div>

                  {selectedTemplate || form.headerBranding.trim() ? (
                    <div className='mb-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700'>
                      {selectedTemplate ? (
                        <p>
                          Template: {selectedTemplate.code} -{' '}
                          {selectedTemplate.name}
                        </p>
                      ) : null}
                      {form.headerBranding.trim() ? (
                        <p className={selectedTemplate ? 'mt-1' : ''}>
                          {form.headerBranding.trim()}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className='mb-4 rounded-xl border border-gray-200 p-3'>
                    <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:items-start'>
                      <div className='min-w-0'>
                        <p className='font-semibold text-gray-900 break-words'>
                          {form.customer || 'Guest Name'}
                        </p>
                        <p className='text-xs text-gray-500 break-words'>
                          {form.email || 'guest@email.com'}
                        </p>
                        <p className='mt-1 text-xs text-gray-500 break-words'>
                          Lead ID:{' '}
                          <span className='font-medium text-gray-700'>
                            {selectedLeadDisplayId || 'N/A'}
                          </span>
                        </p>
                      </div>
                      <div className='min-w-0 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 sm:text-right dark:bg-gray-800/40'>
                        <p className='font-medium text-gray-700 dark:text-gray-200 break-words'>
                          {form.destination || 'Destination'}
                        </p>
                        <p className='mt-1 break-words'>
                          Duration:{' '}
                          <span className='font-medium text-gray-700 dark:text-gray-200'>
                            {previewDurationLabel || 'N/A'}
                          </span>
                        </p>
                        <p className='mt-1 break-words'>
                          Travellers:{' '}
                          <span className='font-medium text-gray-700 dark:text-gray-200'>
                            {travellerLabel}
                          </span>
                        </p>
                      </div>
                    </div>
                    <div className='mt-3 grid grid-cols-1 gap-2 text-xs text-gray-500 sm:grid-cols-2'>
                      <p className='break-words'>
                        Travel Date:{' '}
                        <span className='text-gray-700'>
                          {formatPreviewDate(form.startDate)}
                        </span>
                      </p>
                      <p className='break-words sm:text-right'>
                        Valid Until:{' '}
                        <span className='text-gray-700'>
                          {formatPreviewDate(form.validUntil)}
                        </span>
                      </p>
                    </div>
                  </div>

                  {quotationTitleDisplay || selectedPackageKindLabel ? (
                    <div className='mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3'>
                      <p className='mb-2 text-xs  font-semibold uppercase tracking-wide text-blue-700'>
                        Trip Snapshot
                      </p>
                      <div className='grid grid-cols-1 gap-2 text-xs text-blue-900 sm:grid-cols-3'>
                        <div>
                          <p className='font-semibold uppercase tracking-wide text-blue-600'>
                            Title
                          </p>
                          <p className='mt-1'>{quotationTitleDisplay}</p>
                        </div>
                        <div>
                          <p className='font-semibold uppercase tracking-wide text-blue-600'>
                            Duration
                          </p>
                          <p className='mt-1'>
                            {previewDurationLabel || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className='font-semibold uppercase tracking-wide text-blue-600'>
                            Type
                          </p>
                          <p className='mt-1'>
                            {selectedPackageKindLabel ||
                              (sourcePackageName
                                ? 'Package Copy'
                                : packageType)}
                          </p>
                        </div>
                      </div>
                      {sourcePackageName ? (
                        <p className='mt-2 text-[11px] text-blue-700'>
                          Source package: {sourcePackageName}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  <div className='mb-4'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Included Services
                    </p>
                    {selectedServiceDefinitions.length ? (
                      <div className='flex flex-wrap gap-1.5'>
                        {selectedServiceDefinitions.map(definition => (
                          <span
                            key={definition.key}
                            className='included-service-chip rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-700'
                          >
                            {definition.label}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className='text-xs text-amber-600'>
                        No services selected yet.
                      </p>
                    )}
                  </div>

                  <div className='mb-4 rounded-xl border border-gray-200 p-3'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Financial Snapshot
                    </p>
                    <div className='space-y-1.5 text-xs'>
                      <div className='flex items-center justify-between text-gray-600'>
                        <span>Service Charges</span>
                        <span className='font-medium text-gray-800'>
                          {money(total)}
                        </span>
                      </div>
                      <div className='flex items-center justify-between border-t border-gray-200 pt-2 text-sm font-semibold'>
                        <span>Total Sale Value</span>
                        <span className='text-blue-600'>{money(total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className='mb-4 rounded-xl border border-gray-200 p-3'>
                    <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Itinerary Snapshot
                    </p>
                    <div className='space-y-2'>
                      {itineraryItems.map(item => (
                        <div
                          key={`preview-itinerary-${item.id}`}
                          className='text-xs'
                        >
                          <p className='font-medium text-gray-800'>
                            {item.day}: {item.title}
                          </p>
                          <p className='text-gray-500'>{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {form.inclusions.trim() || form.exclusions.trim() ? (
                    <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                      <div className='rounded-xl border border-green-200 bg-green-50 p-3'>
                        <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-green-700'>
                          Inclusions
                        </p>
                        {inclusionLines.length ? (
                          <ul className='space-y-1 text-xs text-green-800'>
                            {inclusionLines.map((line, index) => (
                              <li key={`inc-${index}`}>- {line}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className='text-xs text-green-700'>
                            No inclusions added.
                          </p>
                        )}
                      </div>
                      <div className='rounded-xl border border-red-200 bg-red-50 p-3'>
                        <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-red-700'>
                          Exclusions
                        </p>
                        {exclusionLines.length ? (
                          <ul className='space-y-1 text-xs text-red-800'>
                            {exclusionLines.map((line, index) => (
                              <li key={`exc-${index}`}>- {line}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className='text-xs text-red-700'>
                            No exclusions added.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}

                  {form.hotelDetails.trim() || form.visaDetails.trim() ? (
                    <div className='mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2'>
                      {form.hotelDetails.trim() ? (
                        <div className='rounded-xl border border-sky-200 bg-sky-50 p-3'>
                          <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-sky-700'>
                            Hotel Details
                          </p>
                          <p className='text-xs whitespace-pre-wrap text-sky-900'>
                            {form.hotelDetails.trim()}
                          </p>
                        </div>
                      ) : null}
                      {form.visaDetails.trim() ? (
                        <div className='rounded-xl border border-violet-200 bg-violet-50 p-3'>
                          <p className='mb-2 text-xs font-semibold uppercase tracking-wide text-violet-700'>
                            Visa Details
                          </p>
                          <p className='text-xs whitespace-pre-wrap text-violet-900'>
                            {form.visaDetails.trim()}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className='preview-validation rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-700'>
                    <FaCheck className='preview-validation-icon mr-1 inline' />{' '}
                    Preview validated and ready to share.
                  </div>

                  {form.paymentTerms.trim() ||
                    form.cancellationPolicy.trim() ||
                    form.footerDisclaimer.trim() ? (
                    <div className='mt-4 space-y-2 rounded-xl border border-gray-200 p-3 text-xs dark:border-gray-700'>
                      {form.paymentTerms.trim() ? (
                        <div>
                          <p className='font-semibold text-gray-700 dark:text-gray-200'>
                            Payment Terms
                          </p>
                          <p className='text-gray-600 dark:text-gray-300'>
                            {form.paymentTerms.trim()}
                          </p>
                        </div>
                      ) : null}
                      {form.cancellationPolicy.trim() ? (
                        <div>
                          <p className='font-semibold text-gray-700 dark:text-gray-200'>
                            Cancellation Policy
                          </p>
                          <p className='text-gray-600 dark:text-gray-300'>
                            {form.cancellationPolicy.trim()}
                          </p>
                        </div>
                      ) : null}
                      {form.footerDisclaimer.trim() ? (
                        <div>
                          <p className='font-semibold text-gray-700 dark:text-gray-200'>
                            Footer Disclaimer
                          </p>
                          <p className='text-gray-600 dark:text-gray-300'>
                            {form.footerDisclaimer.trim()}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </SurfaceCard>
            </div>
          ) : (
            <SurfaceCard className='flex h-fit items-center justify-center sticky top-4'>
              <button
                onClick={() => setShowPreview(true)}
                className='rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white'
              >
                Show Preview
              </button>
            </SurfaceCard>
          )}
        </div>

        {showAddModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur'>
            <div className='w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-700'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  Add Itinerary Item
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className='text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
                >
                  <i className='fa-solid fa-xmark'></i>
                </button>
              </div>
              <div className='space-y-3'>
                <div>
                  <label className='field-label'>Day</label>
                  <input
                    className='field-input'
                    value={newItem.day}
                    onChange={e =>
                      setNewItem(p => ({ ...p, day: e.target.value }))
                    }
                    placeholder='Day 3'
                  />
                </div>
                <div>
                  <label className='field-label'>Title</label>
                  <input
                    className='field-input'
                    value={newItem.title}
                    onChange={e =>
                      setNewItem(p => ({ ...p, title: e.target.value }))
                    }
                    placeholder='Excursion / Transfer / Activity'
                  />
                </div>
                <div>
                  <label className='field-label'>Description</label>
                  <textarea
                    rows={3}
                    className='field-input'
                    value={newItem.description}
                    onChange={e =>
                      setNewItem(p => ({ ...p, description: e.target.value }))
                    }
                    placeholder='Add short details for the guest'
                  />
                </div>
              </div>
              <div className='mt-4 flex items-center justify-end gap-2'>
                <button
                  onClick={() => setShowAddModal(false)}
                  className='px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                >
                  Cancel
                </button>
                <button
                  onClick={addItineraryItem}
                  className='px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700'
                >
                  Save Item
                </button>
              </div>
            </div>
          </div>
        )}

        {showAddOnModal && (
          <div className='fixed -inset-6 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur'>
            <div className='w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-700'>
              <div className='mb-3 flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  {editingAddOnId ? 'Edit Service' : 'Add Service'}
                </h3>
                <button
                  onClick={() => setShowAddOnModal(false)}
                  className='text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100'
                >
                  <i className='fa-solid fa-xmark'></i>
                </button>
              </div>
              <div className='space-y-3'>
                <div>
                  <label className='field-label'>Service Name</label>
                  <input
                    className='field-input overflow-hidden text-ellipsis'
                    value={addOnDraft.name}
                    onChange={e =>
                      setAddOnDraft(p => ({ ...p, name: e.target.value }))
                    }
                    placeholder='Airport pickup / Cruise / Extra nights'
                  />
                </div>
                <div>
                  <label className='field-label'>Supplier</label>
                  <SearchableDropdown
                    value={addOnDraft.supplierId}
                    options={[
                      { value: '', label: 'No supplier selected' },
                      ...suppliers.map(supplier => ({
                        value: supplier.id,
                        label: supplier.name
                      }))
                    ]}
                    onChange={value => {
                      const supplierId = String(value || '')
                      const supplier = suppliers.find(s => s.id === supplierId) || null
                      setAddOnDraft(p => ({
                        ...p,
                        supplierId,
                        supplierName: supplier ? supplier.name : ''
                      }))
                    }}
                    searchPlaceholder='Search supplier...'
                    disabled={suppliersLoading}
                  />
                </div>
                <div>
                  <label className='field-label'>Base Cost</label>
                  <input
                    type='number'
                    min='0'
                    className='field-input overflow-hidden text-ellipsis'
                    value={addOnDraft.baseCost}
                    onChange={e =>
                      setAddOnDraft(p => ({
                        ...p,
                        baseCost: e.target.value
                      }))
                    }
                    placeholder='0.00'
                  />
                </div>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div>
                    <label className='field-label'>Markup %</label>
                    <input
                      type='number'
                      min='0'
                      max='100'
                      step='0.1'
                      className='field-input overflow-hidden text-ellipsis'
                      value={addOnDraft.markupPercent}
                      onChange={e =>
                        setAddOnDraft(p => ({
                          ...p,
                          markupPercent: e.target.value
                        }))
                      }
                      placeholder='0'
                    />
                    <p className='mt-1 text-[10px] text-gray-500 dark:text-gray-400'>
                      Markup amount: {money(Math.min(Math.max(0, addOnComputedSellValue - (Number(addOnDraft.baseCost) || 0)), 999999999999))}
                    </p>
                  </div>
                  <div>
                    <label className='field-label'>Sell Value</label>
                    <input
                      type='number'
                      min='0'
                      className='field-input cursor-not-allowed bg-gray-100 dark:bg-gray-700/60'
                      value={addOnComputedSellValue}
                      readOnly
                      placeholder='0.00'
                    />
                    <p className='mt-1 text-[10px] text-gray-500 dark:text-gray-400'>
                      Auto-calculated as Base + Markup
                    </p>
                  </div>
                </div>
              </div>
              <div className='mt-4 flex items-center justify-end gap-2'>
                <button
                  onClick={() => setShowAddOnModal(false)}
                  className='rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                >
                  Cancel
                </button>
                <button
                  onClick={addAddOnService}
                  className='rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700'
                >
                  {editingAddOnId ? 'Update Service' : 'Add Service'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSaved && (
        <div className='fixed top-4 left-1/2 transform -translate-x-1/2 z-[60] animate-fadeIn'>
          <div className='flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800'>
            <FaCheck className='text-green-600 dark:text-green-400' />
            <p className='text-sm font-medium text-green-800 dark:text-green-300'>
              {isEditMode ? 'Quotation updated successfully' : 'Quotation saved successfully'}
            </p>
          </div>
        </div>
      )}
    </>
  )
}

// This file contains the improved PricingTable and PricingRow components
// Copy these components to replace the existing ones in QuotationBuilderPage.tsx

const PricingTable = ({
  rows,
  overrides,
  changedCells,
  fieldErrors,
  onUpdateField,
  onClearField,
  onCellKeyDown,
  money,
  suppliers,
  suppliersLoading
}: {
  rows: ServiceCostRow[]
  overrides: ServiceOverridesState
  changedCells: Record<string, boolean>
  fieldErrors: PricingFieldErrors
  onUpdateField: (
    rowKey: ServiceKey,
    field: PricingField,
    value: string
  ) => void
  onClearField: (rowKey: ServiceKey, field: PricingField) => void
  onCellKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  money: (value: number) => string
  suppliers: Array<{ id: string; name: string }>
  suppliersLoading: boolean
}) => {
  return (
    <div className='space-y-3'>
      {!rows.length ? (
        <div className='rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center dark:border-gray-700 dark:bg-gray-800'>
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            Enable services in Cost &amp; Profit section to view pricing
            breakdown.
          </p>
        </div>
      ) : (
        <>
          <div className='space-y-3'>
            {rows.map((row, rowIndex) => (
              <PricingRow
                key={row.key}
                row={row}
                rowIndex={rowIndex}
                override={overrides[row.key] ?? {}}
                changedCells={changedCells}
                fieldErrors={fieldErrors}
                onUpdateField={onUpdateField}
                onClearField={onClearField}
                onCellKeyDown={onCellKeyDown}
                money={money}
                suppliers={suppliers}
                suppliersLoading={suppliersLoading}
              />
            ))}
          </div>
          {/* <div className='rounded-xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-4 dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300'>
                  Total Summary
                </p>
                <div className='mt-2 flex items-center gap-4'>
                  <div>
                    <p className='text-xs text-blue-600 dark:text-blue-400'>
                      Total Sell Value
                    </p>
                    <p className='text-lg font-bold tabular-nums text-blue-900 dark:text-blue-100 truncate max-w-[200px]'>
                      {money(Math.min(totalSellValue, 999999999999))}
                    </p>
                  </div>
                </div>
              </div>
              <div className='rounded-lg border border-green-300 bg-green-50 px-3 py-2 dark:border-green-800 dark:bg-green-900/30'>
                <p className='text-xs font-semibold text-green-700 dark:text-green-300'>
                  Auto-allocated
                </p>
              </div>
            </div>
          </div> */}
        </>
      )}
    </div>
  )
}

const PricingRow = ({
  row,
  override,
  changedCells,
  fieldErrors,
  onUpdateField,
  onClearField,
  onCellKeyDown,
  money,
  suppliers,
  suppliersLoading
}: {
  row: ServiceCostRow
  rowIndex: number
  override: ServiceOverrideValue
  changedCells: Record<string, boolean>
  fieldErrors: PricingFieldErrors
  onUpdateField: (
    rowKey: ServiceKey,
    field: PricingField,
    value: string
  ) => void
  onClearField: (rowKey: ServiceKey, field: PricingField) => void
  onCellKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
  money: (value: number) => string
  suppliers: Array<{ id: string; name: string }>
  suppliersLoading: boolean
}) => {
  const isFlightService = row.key === 'flights'
  const markupFieldKey: 'markupPercent' | 'serviceCharge' = isFlightService
    ? 'serviceCharge'
    : 'markupPercent'
  const hasBaseCostOverride = override.baseCost !== undefined
  const hasMarkupOverride = isFlightService
    ? override.serviceCharge !== undefined
    : override.markupPercent !== undefined

  const supplierDropdownOptions = useMemo(
    () => [
      { value: '', label: 'No supplier selected' },
      ...suppliers.map(supplier => ({
        value: supplier.id,
        label: supplier.name
      }))
    ],
    [suppliers]
  )

  const handleSupplierChange = (supplierId: string) => {
    const selectedSupplier = suppliers.find(s => s.id === supplierId)
    onUpdateField(row.key, 'supplierId', supplierId)
    if (selectedSupplier) {
      onUpdateField(row.key, 'supplierName', selectedSupplier.name)
    } else {
      onClearField(row.key, 'supplierName')
    }
  }

  const displayBaseCost = hasBaseCostOverride
    ? String(override.baseCost)
    : row.baseCost.toFixed(2)
  const displayMarkup = hasMarkupOverride
    ? String(
      isFlightService ? override.serviceCharge : override.markupPercent
    )
    : isFlightService
      ? row.markupAmount.toFixed(2)
      : row.markupPercent.toFixed(1)
  const displaySell = row.sellValue.toFixed(2)

  const sharedInputClass =
    'h-9 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm leading-tight text-right tabular-nums transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 overflow-hidden text-ellipsis'

  const fieldClass = (field: NumericPricingField) => {
    const key = `${row.key}.${field}`
    const hasError = Boolean(fieldErrors[key])
    const changed = Boolean(changedCells[key])
    return `${sharedInputClass} ${hasError ? 'border-red-400 focus:ring-red-400' : ''
      } ${changed ? 'ring-2 ring-green-300 bg-green-50/60 dark:bg-green-900/20' : ''
      }`
  }

  const normalizeOnBlur = (
    field: NumericPricingField,
    value: string
  ) => {
    const options =
      field === 'markupPercent'
        ? { min: 0, max: 100, precision: 1 }
        : { min: 0, precision: 2 }
    const normalized = normalizeNumericOverride(value, options)
    if (!normalized) {
      onClearField(row.key, field)
      return
    }
    // Always keep the override if user manually entered a value
    onUpdateField(row.key, field, normalized)
  }

  return (
    <div className='rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-900'>
      <div className='mb-3 flex items-start justify-between'>
        <div className='flex-1'>
          <h4 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
            {row.label}
          </h4>
          <p className='text-xs text-gray-500 dark:text-gray-400'>
            Auto-allocated • {row.itemType}
          </p>
        </div>
        <div className='rounded-lg bg-blue-50 px-3 py-1.5 dark:bg-blue-900/30'>
          <p className='text-xs font-semibold text-blue-700 dark:text-blue-300 truncate'>
            {money(Math.min(row.sellValue, 999999999999))}
          </p>
          <p className='text-[10px] text-blue-600 dark:text-blue-400'>
            Sell Value
          </p>
        </div>
      </div>

      <div className='mb-3 rounded-lg border border-purple-200 bg-purple-50/30 p-3 dark:border-purple-800 dark:bg-purple-900/10'>
        <label className='mb-1.5 block text-xs font-semibold text-purple-700 dark:text-purple-300'>
          🏢 Supplier for this service
        </label>
        <SearchableDropdown
          value={override.supplierId ?? ''}
          options={supplierDropdownOptions}
          onChange={handleSupplierChange}
          disabled={suppliersLoading}
          searchPlaceholder='Search supplier...'
        />
        {suppliersLoading ? (
          <p className='mt-1 text-[10px] text-gray-500'>Loading suppliers...</p>
        ) : null}
        {override.supplierId && override.supplierName ? (
          <p className='mt-1.5 text-xs font-medium text-purple-700 dark:text-purple-300'>
            ✓ Selected: {override.supplierName}
          </p>
        ) : (
          <p className='mt-1.5 text-[10px] text-gray-500 dark:text-gray-400'>
            No supplier assigned to this service
          </p>
        )}
      </div>

      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3'>
        <div>
          <label className='mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300'>
            Base Cost
          </label>
          <input
            data-pricing-input='true'
            type='number'
            min='0'
            step='0.01'
            value={displayBaseCost}
            onFocus={event => event.currentTarget.select()}
            onKeyDown={onCellKeyDown}
            onChange={event =>
              onUpdateField(row.key, 'baseCost', event.target.value)
            }
            onBlur={event => normalizeOnBlur('baseCost', event.target.value)}
            className={fieldClass('baseCost')}
          />
          {fieldErrors[`${row.key}.baseCost`] ? (
            <p className='mt-1 text-[10px] text-red-600'>
              {fieldErrors[`${row.key}.baseCost`]}
            </p>
          ) : null}
        </div>

        <div>
          <label className='mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300'>
            {isFlightService ? 'Service Charge' : 'Markup %'}
          </label>
          <input
            data-pricing-input='true'
            type='number'
            min='0'
            max={isFlightService ? undefined : '100'}
            step={isFlightService ? '0.01' : '0.1'}
            value={displayMarkup}
            onFocus={event => event.currentTarget.select()}
            onKeyDown={onCellKeyDown}
            onChange={event =>
              onUpdateField(row.key, markupFieldKey, event.target.value)
            }
            onBlur={event =>
              normalizeOnBlur(markupFieldKey, event.target.value)
            }
            className={fieldClass(markupFieldKey)}
          />
          {fieldErrors[`${row.key}.${markupFieldKey}`] ? (
            <p className='mt-1 text-[10px] text-red-600'>
              {fieldErrors[`${row.key}.${markupFieldKey}`]}
            </p>
          ) : null}
          <p className='mt-1 text-[10px] text-gray-500 dark:text-gray-400'>
            {isFlightService ? 'Service Charge' : 'Markup'}: {money(Math.min(row.markupAmount, 999999999999))}
          </p>
        </div>

        <div>
          <label className='mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300'>
            Final Sell Value
          </label>
          <input
            type='number'
            min='0'
            step='0.01'
            value={displaySell}
            readOnly
            className={`${sharedInputClass} cursor-not-allowed bg-gray-100 font-semibold text-blue-600 dark:bg-gray-700/60 dark:text-blue-300`}
          />
          <p className='mt-1 text-[10px] text-gray-500 dark:text-gray-400'>
            Auto-calculated as Base + {isFlightService ? 'Service Charge' : 'Markup'}
          </p>
        </div>
      </div>

      {/* <div className="mt-3">
        <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-gray-300">
          Payment Terms (Optional)
        </label>
        <input
          data-pricing-input="true"
          type="text"
          value={override.paymentTerms ?? ''}
          placeholder="e.g. 50% advance, 50% on arrival"
          onKeyDown={onCellKeyDown}
          onChange={event =>
            onUpdateField(row.key, 'paymentTerms', event.target.value)
          }
          className="h-9 w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm leading-tight text-left transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
        />
      </div> */}
    </div>
  )
}
const SummaryPanel = ({
  form,
  previewDurationLabel,
  itineraryCount,
  selectedServiceCount,
  costs,
  setCosts,
  finance,
  setFinance,
  addOnTotal,
  addOnMarkup,
  flightServiceCharge,
  effectiveMarkupPercent,
  subtotal,
  taxes,
  totalMarkup,
  money
}: {
  form: {
    destination: string
    startDate: string
    adults: number
  }
  previewDurationLabel: string
  itineraryCount: number
  selectedServiceCount: number
  costs: PricingCosts
  setCosts: React.Dispatch<React.SetStateAction<PricingCosts>>
  finance: FinanceBreakdown
  setFinance: React.Dispatch<React.SetStateAction<FinanceBreakdown>>
  addOnTotal: number
  addOnMarkup: number
  flightServiceCharge: number
  effectiveMarkupPercent: number
  subtotal: number
  taxes: number
  totalMarkup: number
  money: (value: number) => string
}) => {
  const inputClass =
    'h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm leading-tight text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'
  const totalServiceFee = Number((costs.serviceFee + flightServiceCharge).toFixed(2))

  const updateCost = (field: keyof PricingCosts, value: string) => {
    setCosts(previous => {
      const next = Number(value)
      if (!Number.isFinite(next)) return previous
      const bounded = Math.max(0, next)
      return {
        ...previous,
        [field]: bounded
      }
    })
  }

  const updateFinancePercent = (
    field: 'gstPercent' | 'tcsPercent',
    value: string
  ) => {
    setFinance(previous => {
      const next = Number(value)
      if (!Number.isFinite(next)) return previous
      return {
        ...previous,
        [field]: Math.max(0, next)
      }
    })
  }

  const toggleFinanceFlag = (field: 'gstEnabled' | 'tcsEnabled', value: boolean) => {
    setFinance(previous => ({
      ...previous,
      [field]: value
    }))
  }

  const updateTotalServiceFee = (value: string) => {
    setCosts(previous => {
      const next = Number(value)
      if (!Number.isFinite(next)) return previous
      const boundedTotal = Math.max(0, next)
      const manualFee = Math.max(0, boundedTotal - flightServiceCharge)
      return {
        ...previous,
        serviceFee: Number(manualFee.toFixed(2))
      }
    })
  }

  return (
    <div className='space-y-3'>
      <div className='rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900'>
        <p className='text-xs font-semibold uppercase text-center tracking-wide text-gray-500'>
          Trip Snapshot
        </p>
        <div className='mt-2 space-y-1.5 text-xs text-gray-600 dark:text-gray-300'>
          <div className='flex flex-col my-3 items-center justify-between'>
            <span>Destination</span>
            <span className='font-medium text-gray-800 dark:text-gray-100'>
              {form.destination || 'Not set'}
            </span>
          </div>
          <div className='flex items-center flex-col pb-3 justify-between'>
            <span>Travel Date</span>
            <span className='font-medium text-gray-800 dark:text-gray-100'>
              {form.startDate || 'Not set'}
            </span>
          </div>
          <div className='flex items-center flex-col pb-3 justify-between'>
            <span>Duration</span>
            <span className='font-medium text-gray-800 dark:text-gray-100'>
              {previewDurationLabel || 'N/A'}
            </span>
          </div>
          <div className='flex items-center flex-col  justify-between'>
            <span>Travellers</span>
            <span className='font-medium text-gray-800 dark:text-gray-100'>
              {form.adults || 0}
            </span>
          </div>
        </div>
      </div>

      <div className='overflow-x-hidden rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900'>
        <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
          Financial Summary
        </p>
        <div className='mt-3 space-y-8'>
          <div className='grid grid-row-[minmax(0,1fr)_minmax(0,120px)] items-center gap-1'>
            <span className='min-w-0 text-xs leading-snug text-gray-500'>Supplier Cost</span>
            <input
              type='number'
              min='0'
              step='0.01'
              value={costs.supplierCost}
              onFocus={event => event.currentTarget.select()}
              onChange={event => updateCost('supplierCost', event.target.value)}
              className={inputClass}
            />
          </div>
          <div className='grid grid-row-[minmax(0,1fr)_minmax(0,120px)] items-center gap-1'>
            <span className='min-w-0 text-xs leading-snug text-gray-500'>Service Fee</span>
            <input
              type='number'
              min='0'
              step='0.01'
              value={totalServiceFee}
              onFocus={event => event.currentTarget.select()}
              onChange={event => updateTotalServiceFee(event.target.value)}
              className={inputClass}
            />
          </div>
          <p className='-mt-1 break-words text-[11px] text-gray-500 dark:text-gray-400'>
            Manual {money(costs.serviceFee)} + Flight charge {money(flightServiceCharge)}
          </p>
          <div className='grid grid-row-[minmax(0,1fr)_minmax(0,120px)] items-center gap-1'>
            <span className='min-w-0 text-xs leading-snug text-gray-500'>Apply GST</span>
            <select
              value={finance.gstEnabled ? 'yes' : 'no'}
              onChange={event =>
                toggleFinanceFlag('gstEnabled', event.target.value === 'yes')
              }
              className='h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm leading-tight text-right focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'
            >
              <option value='no'>No</option>
              <option value='yes'>Yes</option>
            </select>
          </div>
          {finance.gstEnabled ? (
            <div className='grid grid-row-[minmax(0,1fr)_minmax(0,120px)] items-center gap-1'>
              <span className='min-w-0 text-xs leading-snug text-gray-500'>GST %</span>
              <input
                type='number'
                min='0'
                step='0.1'
                value={finance.gstPercent}
                onFocus={event => event.currentTarget.select()}
                onChange={event =>
                  updateFinancePercent('gstPercent', event.target.value)
                }
                className={inputClass}
              />
            </div>
          ) : null}
          <div className='grid grid-row-[minmax(0,1fr)_minmax(0,120px)] items-center gap-1'>
            <span className='min-w-0 text-xs leading-snug text-gray-500'>Apply TCS</span>
            <select
              value={finance.tcsEnabled ? 'yes' : 'no'}
              onChange={event =>
                toggleFinanceFlag('tcsEnabled', event.target.value === 'yes')
              }
              className='h-10 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm leading-tight text-right focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100'
            >
              <option value='no'>No</option>
              <option value='yes'>Yes</option>
            </select>
          </div>
          {finance.tcsEnabled ? (
            <div className='grid grid-cols-[minmax(0,1fr)_minmax(0,120px)] items-center gap-1'>
              <span className='min-w-0 text-xs leading-snug text-gray-500'>TCS %</span>
              <input
                type='number'
                min='0'
                step='0.1'
                value={finance.tcsPercent}
                onFocus={event => event.currentTarget.select()}
                onChange={event =>
                  updateFinancePercent('tcsPercent', event.target.value)
                }
                className={inputClass}
              />
            </div>
          ) : null}
          {/* <div className='grid grid-cols-[1fr_120px] items-center gap-2'>
            <span className='text-xs text-gray-500'>Default Markup %</span>
            <input
              type='number'
              min='0'
              max='100'
              step='0.1'
              value={costs.markupPercent}
              onFocus={event => event.currentTarget.select()}
              onChange={event => updateCost('markupPercent', event.target.value)}
              className={inputClass}
            />
          </div> */}
          <div className='grid grid-row-[minmax(0,1fr)_minmax(0,120px)] items-center gap-1'>
            <span className='min-w-0 text-xs leading-snug text-gray-500'>Effective Markup %</span>
            <div className='h-10 w-full min-w-0 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm leading-tight text-right tabular-nums font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300'>
              {effectiveMarkupPercent.toFixed(2)}
            </div>
          </div>
          <div className='grid grid-row-[minmax(0,1fr)_minmax(0,120px)] items-center gap-1'>
            <span className='min-w-0 text-xs leading-snug text-gray-500'>Discount</span>
            <input
              type='number'
              min='0'
              step='0.01'
              value={costs.discount}
              onFocus={event => event.currentTarget.select()}
              onChange={event => updateCost('discount', event.target.value)}
              className={inputClass}
            />
          </div>
          <div className='grid grid-row-[minmax(0,1fr)_minmax(0,120px)] items-center gap-1'>
            <span className='min-w-0 text-xs font-medium leading-snug text-gray-500'>Profit (Auto)</span>
            <div className='h-10 min-w-0 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm leading-tight text-right tabular-nums font-semibold text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300 overflow-hidden'>
              <span className='truncate block'>{money(Math.min(totalMarkup + addOnMarkup, 999999999999))}</span>
            </div>
          </div>
          <div className='space-y-1.5 overflow-hidden  rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5  text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'>
            <div className='flex min-w-0 flex-col items-center pb-5 justify-between gap-2'>
              <span className='min-w-0 text-center'>Total Markup</span>
              <span className='min-w-0 max-w-[120px] truncate text-right font-medium tabular-nums'>
                {money(Math.min(totalMarkup, 999999999999))}
              </span>
            </div>
            <div className='flex min-w-0 flex-col items-center pb-5 justify-between gap-2'>
              <span className='min-w-0 text-center'>Flight Service Charge</span>
              <span className='min-w-0 max-w-[120px] truncate text-right font-medium tabular-nums'>
                {money(flightServiceCharge)}
              </span>
            </div>
            <div className='flex min-w-0 items-center flex-col pb-5 justify-between gap-2'>
              <span className='min-w-0'>Add-ons</span>
              <span className='min-w-0 max-w-[120px] truncate text-right font-medium tabular-nums'>
                {money(Math.min(addOnTotal, 999999999999))}
              </span>
            </div>
            <div className='flex min-w-0 items-center pb-5 flex-col justify-between gap-2'>
              <span className='min-w-0'>Subtotal</span>
              <span className='min-w-0 max-w-[120px] truncate text-right font-medium tabular-nums'>
                {money(Math.min(subtotal, 999999999999))}
              </span>
            </div>
            <div className='flex min-w-0 items-center flex-col justify-between gap-2'>
              <span className='min-w-0 text-center'>Tax Amount</span>
              <span className='min-w-0 max-w-[120px] truncate text-right font-medium tabular-nums'>
                {money(Math.min(taxes, 999999999999))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className='rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900'>
        <p className='text-xs font-semibold text-center uppercase tracking-wide text-gray-500'>
          Itinerary Summary
        </p>
        <div className='mt-2 space-y-1.5 text-xs text-gray-600 dark:text-gray-300'>
          <div className='flex items-center justify-between'>
            <span>Itinerary Days</span>
            <span className='font-medium text-gray-800 dark:text-gray-100'>
              {itineraryCount}
            </span>
          </div>
          <div className='flex items-center justify-between'>
            <span>Active Services</span>
            <span className='font-medium text-gray-800 dark:text-gray-100'>
              {selectedServiceCount}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

const Field = ({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) => (
  <div>
    <label className='field-label'>{label}</label>
    <input
      className='field-input'
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
)

// const NumberField = ({
//   label,
//   value,
//   onChange,
//   prefix
// }: {
//   label: string
//   value: number
//   onChange: (v: number) => void
//   prefix?: string
// }) => (
//   <div>
//     <label className='field-label'>{label}</label>
//     <div className='flex items-center gap-2'>
//       {prefix ? (
//         <span className='text-gray-500 dark:text-gray-400 text-sm'>
//           {prefix}
//         </span>
//       ) : null}
//       <input
//         type='number'
//         className='field-input'
//         value={value}
//         onChange={e => onChange(Number(e.target.value || 0))}
//       />
//     </div>
//   </div>
// )

// const SummaryTile = ({
//   label,
//   value,
//   tone
// }: {
//   label: string
//   value: string
//   tone: 'blue' | 'green' | 'amber' | 'purple'
// }) => {
//   const toneMap: Record<typeof tone, string> = {
//     blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200',
//     green:
//       'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200',
//     amber:
//       'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200',
//     purple:
//       'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-200'
//   }
//   return (
//     <div
//       className={`rounded-xl border border-gray-200 dark:border-gray-700 p-3 ${toneMap[tone]}`}
//     >
//       <p className='text-xs uppercase tracking-wide font-semibold'>{label}</p>
//       <p className='text-lg font-bold mt-1'>{value}</p>
//     </div>
//   )
// }

export default QuotationBuilderPage
