import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaBoxOpen, FaPlus, FaSave, FaTrash } from 'react-icons/fa'
import SurfaceCard from '../../components/ui/SurfaceCard'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { getApiErrorMessage } from '../../api/apiClient'
import { usePackagesService } from '../../hooks/usePackagesService'
import type {
  PackageCategory,
  PackageKind,
  PackageRecord,
  PackageStatus
} from '../../services/packagesService'

const PACKAGE_STATUSES: PackageStatus[] = [
  'DRAFT',
  'ACTIVE',
  'EXPIRED',
  'SOLD_OUT'
]
const PACKAGE_CATEGORIES: PackageCategory[] = [
  'BUDGET',
  'PREMIUM',
  'LUXURY',
  'HONEYMOON',
  'FAMILY'
]

type CustomServiceRow = {
  id: string
  name: string
  description: string
  cost: string
  markupPercent: string
  sellValue: string
}

type ItineraryDayRow = {
  id: string
  title: string
  description: string
}

type PackageFormState = {
  name: string
  destination: string
  durationNights: string
  durationDays: string
  baseCost: string
  markupPercent: string
  startingPrice: string
  packageKind: PackageKind
  packageCategory: PackageCategory | ''
  status: PackageStatus
  validFrom: string
  validTo: string
  inclusions: string
  exclusions: string
  hotelDetails: string
  itineraryItems: ItineraryDayRow[]
  cancellationPolicy: string
  visaDetails: string
  paymentTerms: string
  customServices: CustomServiceRow[]
  isSoldOut: boolean
}

const emptyCustomRow = (): CustomServiceRow => ({
  id: `new-${Date.now()}`,
  name: '',
  description: '',
  cost: '',
  markupPercent: '',
  sellValue: ''
})

const emptyForm: PackageFormState = {
  name: '',
  destination: '',
  durationNights: '',
  durationDays: '',
  baseCost: '',
  markupPercent: '',
  startingPrice: '',
  packageKind: 'READY',
  packageCategory: '',
  status: 'DRAFT',
  validFrom: '',
  validTo: '',
  inclusions: '',
  exclusions: '',
  hotelDetails: '',
  itineraryItems: [],
  cancellationPolicy: '',
  visaDetails: '',
  paymentTerms: '',
  customServices: [],
  isSoldOut: false
}

const toNumberOrUndefined = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

const formatPriceInput = (value: number) => {
  if (!Number.isFinite(value)) return ''
  return String(Number(value.toFixed(2)))
}

const calculateStartingPrice = (baseCost: string, markupPercent: string) => {
  const base = toNumberOrUndefined(baseCost)
  if (base == null) return ''
  const markup = toNumberOrUndefined(markupPercent) ?? 0
  return formatPriceInput(base * (1 + markup / 100))
}

const hasManualStartingPrice = (
  baseCost: string,
  markupPercent: string,
  startingPrice: string
) => {
  const trimmed = startingPrice.trim()
  if (!trimmed) return false
  return trimmed !== calculateStartingPrice(baseCost, markupPercent)
}

const getDayLabel = (index: number) => `Day ${index + 1}`

const parseDayCount = (value: string) => {
  const parsed = Number(value.trim())
  if (!Number.isInteger(parsed) || parsed <= 0) return 0
  return parsed
}

const parseDurationParts = (duration: string) => {
  const trimmed = duration.trim()
  if (!trimmed) {
    return { nights: '', days: '' }
  }
  const nightsMatch = trimmed.match(/(\d+)\s*n(?:ights?)?\b/i)
  const daysMatch =
    trimmed.match(/(\d+)\s*d(?:ays?)?\b/i) ?? trimmed.match(/^(\d+)$/)
  return {
    nights: nightsMatch?.[1] ?? '',
    days: daysMatch?.[1] ?? ''
  }
}

const buildDurationValue = (nights: string, days: string) => {
  const safeNights = nights.trim()
  const safeDays = days.trim()
  if (safeNights && safeDays) return `${safeNights}N/${safeDays}D`
  if (safeNights) return `${safeNights}N`
  if (safeDays) return `${safeDays}D`
  return ''
}

const stripDayPrefix = (value: string) =>
  value
    .trim()
    .replace(/^day\s*\d+\s*(?:[-—:]\s*)?/i, '')
    .trim()

const parsePlainItinerary = (value: string): ItineraryDayRow[] =>
  value
    .split(/\n\s*\n+/)
    .map(chunk => chunk.trim())
    .filter(Boolean)
    .map((chunk, index) => {
      const lines = chunk.split('\n')
      return {
        id: `day-${index + 1}`,
        title: stripDayPrefix((lines[0] ?? '').trim()),
        description: lines.slice(1).join('\n').trim()
      }
    })

const parseItineraryItems = (itinerary: unknown): ItineraryDayRow[] => {
  if (Array.isArray(itinerary)) {
    return itinerary.map((row: Record<string, unknown>, index: number) => ({
      id: String(row?.id ?? `day-${index + 1}`),
      title: stripDayPrefix(
        String(
          row?.title ??
            row?.heading ??
            row?.name ??
            row?.day ??
            row?.dayLabel ??
            ''
        )
      ),
      description: String(row?.description ?? row?.details ?? '')
    }))
  }
  if (typeof itinerary === 'string') {
    return parsePlainItinerary(itinerary)
  }
  if (itinerary && typeof itinerary === 'object') {
    const objectValue = itinerary as Record<string, unknown>
    const plainText =
      typeof objectValue.plain === 'string'
        ? objectValue.plain
        : typeof objectValue.text === 'string'
          ? objectValue.text
          : ''
    if (plainText) {
      return parsePlainItinerary(plainText)
    }
  }
  return []
}

const buildItineraryRows = (
  dayCount: number,
  currentItems: ItineraryDayRow[] = []
): ItineraryDayRow[] =>
  Array.from({ length: dayCount }, (_, index) => ({
    id: currentItems[index]?.id ?? `day-${index + 1}`,
    title: currentItems[index]?.title ?? '',
    description: currentItems[index]?.description ?? ''
  }))

/** Convert stored itinerary (JSONB) to editable plain text for the form. */
export function itineraryToPlainText(itinerary: unknown): string {
  if (itinerary == null) return ''
  if (typeof itinerary === 'string') return itinerary
  if (typeof itinerary === 'object' && !Array.isArray(itinerary)) {
    const o = itinerary as Record<string, unknown>
    if (typeof o.plain === 'string') return o.plain
    if (typeof o.text === 'string') return o.text
  }
  if (Array.isArray(itinerary)) {
    return itinerary
      .map((row: Record<string, unknown>, i: number) => {
        const day = String(row?.day ?? row?.dayLabel ?? `Day ${i + 1}`)
        const title = String(row?.title ?? row?.heading ?? '')
        const desc = String(row?.description ?? row?.details ?? '')
        const head = [day, title].filter(Boolean).join(' — ')
        return desc ? `${head}\n${desc}` : head
      })
      .join('\n\n')
  }
  return ''
}

const PackageDetailView: React.FC<{
  pkg: PackageRecord
  onEdit: () => void
}> = ({ pkg, onEdit }) => {
  const itineraryItems = parseItineraryItems(pkg.itinerary)

  return (
    <div className='space-y-6'>
      <div className='flex items-start justify-between'>
        <div className='md:max-w-[50%]'>
          <h2 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            {pkg.name}
          </h2>
          <p className='text-gray-500'>
            {pkg.destination} • {pkg.duration}
          </p>
        </div>
        <button
          onClick={onEdit}
          className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'
        >
          Edit Package
        </button>
      </div>

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        <SurfaceCard className='p-4'>
          <h3 className='mb-2 font-semibold'>Pricing & Status</h3>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Starting Price:</span>{' '}
              <strong className='text-blue-600'>
                {pkg.startingPrice.toLocaleString()}
              </strong>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Base Cost:</span>{' '}
              <span>{pkg.baseCost.toLocaleString()}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Markup:</span>{' '}
              <span>{pkg.markupPercent}%</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Category:</span>{' '}
              <span className='font-medium uppercase'>
                {pkg.packageCategory || 'N/A'}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Status:</span>{' '}
              <StatusBadge status={pkg.status} />
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard className='p-4'>
          <h3 className='mb-2 font-semibold'>Validity</h3>
          <div className='space-y-2 text-sm'>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Valid From:</span>{' '}
              <span>{pkg.validFrom ? pkg.validFrom.slice(0, 10) : 'N/A'}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Valid To:</span>{' '}
              <span>{pkg.validTo ? pkg.validTo.slice(0, 10) : 'N/A'}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Sold Out:</span>{' '}
              <span
                className={pkg.isSoldOut ? 'text-red-600' : 'text-green-600'}
              >
                {pkg.isSoldOut ? 'Yes' : 'No'}
              </span>
            </div>
            <div className='flex justify-between'>
              <span className='text-gray-500'>Kind:</span>{' '}
              <span className='font-medium'>
                {pkg.packageKind === 'CUSTOMIZED' ? 'Custom' : 'Ready'}
              </span>
            </div>
          </div>
        </SurfaceCard>
      </div>

      {itineraryItems.length > 0 ? (
        <SurfaceCard className='p-4'>
          <h3 className='mb-2 font-semibold text-blue-600'>Itinerary</h3>
          <div className='space-y-3'>
            {itineraryItems.map((item, index) => (
              <div
                key={item.id}
                className='rounded-xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-blue-900/10'
              >
                <div className='flex items-center gap-2'>
                  <span className='rounded-md bg-white px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-200'>
                    {getDayLabel(index)}
                  </span>
                  <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                    {item.title || getDayLabel(index)}
                  </p>
                </div>
                <p className='mt-2 whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
                  {item.description || 'Details will be updated.'}
                </p>
              </div>
            ))}
          </div>
        </SurfaceCard>
      ) : null}

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {pkg.inclusions && (
          <SurfaceCard className='p-4'>
            <h3 className='mb-2 font-semibold text-green-600'>Inclusions</h3>
            <div className='whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
              {pkg.inclusions}
            </div>
          </SurfaceCard>
        )}
        {pkg.exclusions && (
          <SurfaceCard className='p-4'>
            <h3 className='mb-2 font-semibold text-red-600'>Exclusions</h3>
            <div className='whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
              {pkg.exclusions}
            </div>
          </SurfaceCard>
        )}
      </div>

      {pkg.hotelDetails && (
        <SurfaceCard className='p-4'>
          <h3 className='mb-2 font-semibold text-amber-600'>Hotel Details</h3>
          <div className='whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
            {pkg.hotelDetails}
          </div>
        </SurfaceCard>
      )}

      <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
        {pkg.visaDetails && (
          <SurfaceCard className='p-4'>
            <h3 className='mb-2 font-semibold text-purple-600'>Visa Details</h3>
            <div className='whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
              {pkg.visaDetails}
            </div>
          </SurfaceCard>
        )}
        {pkg.paymentTerms && (
          <SurfaceCard className='p-4'>
            <h3 className='mb-2 font-semibold text-indigo-600'>Payment Terms</h3>
            <div className='whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
              {pkg.paymentTerms}
            </div>
          </SurfaceCard>
        )}
      </div>

      {pkg.cancellationPolicy && (
        <SurfaceCard className='p-4'>
          <h3 className='mb-2 font-semibold text-orange-600'>
            Cancellation Policy
          </h3>
          <div className='whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300'>
            {pkg.cancellationPolicy}
          </div>
        </SurfaceCard>
      )}

      {pkg.packageKind === 'CUSTOMIZED' && pkg.customServices.length > 0 && (
        <SurfaceCard className='p-4'>
          <h3 className='mb-4 font-semibold'>Service Lines</h3>
          <div className='overflow-x-auto'>
            <table className='w-full text-left text-sm'>
              <thead>
                <tr className='border-b dark:border-gray-700 text-gray-500 uppercase text-[10px] tracking-wider'>
                  <th className='pb-2 font-semibold'>Service</th>
                  <th className='pb-2 font-semibold text-right'>Cost</th>
                  <th className='pb-2 font-semibold text-right'>Markup %</th>
                  <th className='pb-2 font-semibold text-right'>Sell Value</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                {pkg.customServices.map((s, i) => (
                  <tr key={i}>
                    <td className='py-3'>
                      <div className='font-medium text-gray-900 dark:text-gray-100'>
                        {s.name}
                      </div>
                      {s.description && (
                        <div className='text-xs text-gray-500'>
                          {s.description}
                        </div>
                      )}
                    </td>
                    <td className='py-3 text-right tabular-nums'>
                      {s.cost.toLocaleString()}
                    </td>
                    <td className='py-3 text-right tabular-nums'>
                      {s.markupPercent}%
                    </td>
                    <td className='py-3 text-right font-semibold text-blue-600 tabular-nums'>
                      {(s.sellValue || 0).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SurfaceCard>
      )}
    </div>
  )
}

const PackagesPage: React.FC = () => {
  const packagesService = usePackagesService()
  const [items, setItems] = useState<PackageRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [viewMode, setViewMode] = useState<'VIEW' | 'EDIT'>('VIEW')
  const [form, setForm] = useState<PackageFormState>(emptyForm)
  const [startingPriceManual, setStartingPriceManual] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<PackageStatus | 'ALL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<PackageCategory | 'ALL'>(
    'ALL'
  )
  const [destinationFilter, setDestinationFilter] = useState('')
  const [enquiries, setEnquiries] = useState<any[]>([])
  const [enquiryDraft, setEnquiryDraft] = useState({
    leadId: '',
    fullName: '',
    phone: '',
    email: '',
    source: 'CRM',
    travelDate: '',
    travellersCount: '2'
  })
  const [enquiryLoading, setEnquiryLoading] = useState(false)
  const [enquiryError, setEnquiryError] = useState('')

  const selectedPackage = useMemo(
    () => items.find(item => item.id === selectedId) || null,
    [items, selectedId]
  )

  const pricingValidationMessage = useMemo(() => {
    const baseCost = toNumberOrUndefined(form.baseCost)
    const startingPrice = toNumberOrUndefined(form.startingPrice)
    if (
      baseCost != null &&
      baseCost > 0 &&
      startingPrice != null &&
      startingPrice <= baseCost
    ) {
      return 'Starting price must be greater than base cost.'
    }
    return ''
  }, [form.baseCost, form.startingPrice])

  const statusFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Status' },
      ...PACKAGE_STATUSES.map(status => ({ value: status, label: status }))
    ],
    []
  )

  const categoryFilterOptions = useMemo(
    () => [
      { value: 'ALL', label: 'All Categories' },
      ...PACKAGE_CATEGORIES.map(category => ({
        value: category,
        label: category
      }))
    ],
    []
  )

  const formCategoryOptions = useMemo(
    () => [
      { value: '', label: 'Category' },
      ...PACKAGE_CATEGORIES.map(category => ({
        value: category,
        label: category
      }))
    ],
    []
  )

  const formStatusOptions = useMemo(
    () => PACKAGE_STATUSES.map(status => ({ value: status, label: status })),
    []
  )

  const formKindOptions = useMemo(
    () => [
      {
        value: 'READY' as PackageKind,
        label: 'Ready package (static, pre-costed)'
      },
      {
        value: 'CUSTOMIZED' as PackageKind,
        label: 'Customized package (editable service lines)'
      }
    ],
    []
  )

  const loadPackages = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const rows = await packagesService.list({
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        packageCategory: categoryFilter === 'ALL' ? undefined : categoryFilter,
        destination: destinationFilter || undefined,
        limit: 500,
        page: 1
      })
      setItems(rows)
      if (selectedId && !rows.some(item => item.id === selectedId)) {
        setSelectedId('')
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load packages.'))
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [
    categoryFilter,
    destinationFilter,
    packagesService,
    search,
    selectedId,
    statusFilter
  ])

  const loadEnquiries = useCallback(
    async (id: string) => {
      if (!id) {
        setEnquiries([])
        return
      }
      setEnquiryLoading(true)
      setEnquiryError('')
      try {
        const rows = await packagesService.listEnquiries(id)
        setEnquiries(rows)
      } catch (err) {
        setEnquiryError(
          getApiErrorMessage(err, 'Failed to load package enquiries.')
        )
        setEnquiries([])
      } finally {
        setEnquiryLoading(false)
      }
    },
    [packagesService]
  )

  useEffect(() => {
    void loadPackages()
  }, [loadPackages])

  useEffect(() => {
    if (!selectedPackage) {
      setForm(emptyForm)
      setStartingPriceManual(false)
      setEnquiries([])
      return
    }
    const durationParts = parseDurationParts(selectedPackage.duration || '')
    const baseCost = String(selectedPackage.baseCost ?? '')
    const markupPercent = String(selectedPackage.markupPercent ?? '')
    const startingPrice = String(selectedPackage.startingPrice ?? '')
    const parsedItineraryItems = parseItineraryItems(selectedPackage.itinerary)
    const derivedDayCount =
      Math.max(
        parseDayCount(durationParts.days),
        parsedItineraryItems.length
      ) || 0
    setStartingPriceManual(
      hasManualStartingPrice(baseCost, markupPercent, startingPrice)
    )
    setForm({
      name: selectedPackage.name || '',
      destination: selectedPackage.destination || '',
      durationNights: durationParts.nights,
      durationDays: derivedDayCount > 0 ? String(derivedDayCount) : durationParts.days,
      baseCost,
      markupPercent,
      startingPrice,
      packageKind: selectedPackage.packageKind ?? 'READY',
      packageCategory: selectedPackage.packageCategory ?? '',
      status: selectedPackage.status ?? 'DRAFT',
      validFrom: selectedPackage.validFrom?.slice(0, 10) || '',
      validTo: selectedPackage.validTo?.slice(0, 10) || '',
      inclusions: selectedPackage.inclusions || '',
      exclusions: selectedPackage.exclusions || '',
      hotelDetails: selectedPackage.hotelDetails || '',
      itineraryItems: buildItineraryRows(derivedDayCount, parsedItineraryItems),
      cancellationPolicy: selectedPackage.cancellationPolicy || '',
      visaDetails: selectedPackage.visaDetails || '',
      paymentTerms: selectedPackage.paymentTerms || '',
      customServices: (selectedPackage.customServices || []).map((s, i) => ({
        id: s.id || `cs-${i}`,
        name: s.name || '',
        description: s.description || '',
        cost: String(s.cost ?? ''),
        markupPercent:
          s.markupPercent != null ? String(s.markupPercent) : '',
        sellValue: s.sellValue != null ? String(s.sellValue) : ''
      })),
      isSoldOut: selectedPackage.isSoldOut
    })
    void loadEnquiries(selectedPackage.id)
  }, [loadEnquiries, selectedPackage])

  useEffect(() => {
    if (startingPriceManual) return
    setForm(prev => {
      const nextStartingPrice = calculateStartingPrice(
        prev.baseCost,
        prev.markupPercent
      )
      return prev.startingPrice === nextStartingPrice
        ? prev
        : { ...prev, startingPrice: nextStartingPrice }
    })
  }, [form.baseCost, form.markupPercent, startingPriceManual])

  useEffect(() => {
    const dayCount = parseDayCount(form.durationDays)
    setForm(prev => {
      const nextItems = buildItineraryRows(dayCount, prev.itineraryItems)
      return prev.itineraryItems.length === nextItems.length
        ? prev
        : { ...prev, itineraryItems: nextItems }
    })
  }, [form.durationDays])

  const handleNew = () => {
    setSelectedId('')
    setViewMode('EDIT')
    setForm(emptyForm)
    setStartingPriceManual(false)
    setEnquiries([])
    setEnquiryError('')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.destination.trim()) {
      setError('Package name and destination are required.')
      return
    }
    if (pricingValidationMessage) {
      setError(`${pricingValidationMessage} Increase markup or enter a higher starting price.`)
      return
    }
    setSaving(true)
    setError('')
    const itinerary =
      form.itineraryItems.length > 0
        ? form.itineraryItems.map((item, index) => ({
            day: getDayLabel(index),
            title: item.title.trim() || getDayLabel(index),
            description: item.description.trim()
          }))
        : null

    const customLines =
      form.packageKind === 'CUSTOMIZED'
        ? form.customServices
            .filter(row => row.name.trim() && toNumberOrUndefined(row.cost) != null)
            .map(row => {
              const cost = toNumberOrUndefined(row.cost) ?? 0
              const markupPercent = toNumberOrUndefined(row.markupPercent)
              const sellValue = toNumberOrUndefined(row.sellValue)
              return {
                id: row.id.startsWith('new-') ? undefined : row.id,
                name: row.name.trim(),
                description: row.description.trim() || undefined,
                cost,
                ...(markupPercent != null ? { markupPercent } : {}),
                ...(sellValue != null ? { sellValue } : {})
              }
            })
        : []

    const payload = {
      name: form.name.trim(),
      destination: form.destination.trim(),
      duration:
        buildDurationValue(form.durationNights, form.durationDays) || undefined,
      baseCost: toNumberOrUndefined(form.baseCost),
      markupPercent: toNumberOrUndefined(form.markupPercent),
      startingPrice: toNumberOrUndefined(form.startingPrice),
      packageKind: form.packageKind,
      packageCategory: form.packageCategory || undefined,
      status: form.status,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      inclusions: form.inclusions.trim() || undefined,
      exclusions: form.exclusions.trim() || undefined,
      hotelDetails: form.hotelDetails.trim() || undefined,
      itinerary,
      cancellationPolicy: form.cancellationPolicy.trim() || undefined,
      visaDetails: form.visaDetails.trim() || undefined,
      paymentTerms: form.paymentTerms.trim() || undefined,
      customServices: form.packageKind === 'CUSTOMIZED' ? customLines : [],
      publishToWebsite: false,
      isSoldOut: form.isSoldOut
    }

    try {
      if (selectedId) {
        await packagesService.update(selectedId, payload)
      } else {
        const created = await packagesService.create(payload)
        if (created?.id) {
          setSelectedId(created.id)
        }
      }
      await loadPackages()
      setViewMode('VIEW')
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save package.'))
    } finally {
      setSaving(false)
    }
  }

  const handleCreateEnquiry = async () => {
    if (!selectedId) return
    setEnquiryError('')
    try {
      await packagesService.createEnquiry(selectedId, {
        leadId: enquiryDraft.leadId || undefined,
        fullName: enquiryDraft.fullName || undefined,
        phone: enquiryDraft.phone || undefined,
        email: enquiryDraft.email || undefined,
        source: enquiryDraft.source || undefined,
        travelDate: enquiryDraft.travelDate || undefined,
        travellersCount: Number(enquiryDraft.travellersCount || 1)
      })
      setEnquiryDraft({
        leadId: '',
        fullName: '',
        phone: '',
        email: '',
        source: 'CRM',
        travelDate: '',
        travellersCount: '2'
      })
      await loadEnquiries(selectedId)
    } catch (err) {
      setEnquiryError(getApiErrorMessage(err, 'Could not create enquiry.'))
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Package Management
          </h1>
          <p className='text-sm text-gray-500 md:max-w-[80%]'>
            Create Ready (static) or Customized packages per Holidays SOP — full
            inclusions, itinerary, hotel, visa, and payment terms for quotation
            prefill. Website/CMS publishing is handled elsewhere.
          </p>
        </div>
        <button
          onClick={handleNew}
          className='inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700 md:whitespace-nowrap'
        >
          <FaPlus />
          New Package
        </button>
      </div>

      <SurfaceCard>
        <div className='grid grid-cols-1 gap-3 lg:grid-cols-4'>
          <input
            className='field-input'
            placeholder='Search by name/destination'
            value={search}
            onChange={event => setSearch(event.target.value)}
          />
          <input
            className='field-input'
            placeholder='Destination filter'
            value={destinationFilter}
            onChange={event => setDestinationFilter(event.target.value)}
          />
          <SearchableDropdown
            value={statusFilter}
            options={statusFilterOptions}
            onChange={value => setStatusFilter(value as PackageStatus | 'ALL')}
            searchPlaceholder='Search status...'
          />
          <SearchableDropdown
            value={categoryFilter}
            options={categoryFilterOptions}
            onChange={value =>
              setCategoryFilter(value as PackageCategory | 'ALL')
            }
            searchPlaceholder='Search category...'
          />
        </div>
        <div className='mt-3 flex gap-2'>
          <button
            onClick={() => void loadPackages()}
            className='rounded-xl border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
          >
            Apply Filters
          </button>
        </div>
      </SurfaceCard>

      {error ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
          {error}
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_1fr]'>
        <SurfaceCard>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Packages
            </h2>
            <span className='text-xs text-gray-500'>{items.length} items</span>
          </div>
          {loading ? (
            <p className='text-sm text-gray-500'>Loading packages...</p>
          ) : items.length === 0 ? (
            <p className='text-sm text-gray-500'>No packages found.</p>
          ) : (
            <div className='space-y-3'>
              {items.map(item => (
                <div
                  key={item.id}
                  className={`rounded-xl border p-3 ${
                    selectedId === item.id
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/10'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <div className='flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between'>
                    <button
                      onClick={() => {
                        setSelectedId(item.id)
                        setViewMode('VIEW')
                      }}
                      className='text-left'
                    >
                      <p className='font-semibold text-gray-900 dark:text-gray-100'>
                        {item.name}
                      </p>
                      <p className='text-xs text-gray-500'>
                        {item.destination}
                      </p>
                    </button>
                    <div className='flex items-center gap-2'>
                      <StatusBadge status={item.status} />
                      <span className='rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-600 dark:bg-gray-800 dark:text-gray-300'>
                        {item.packageKind === 'CUSTOMIZED' ? 'Custom' : 'Ready'}
                      </span>
                    </div>
                  </div>
                  <div className='mt-2 text-xs text-gray-600 dark:text-gray-300'>
                    Price {item.startingPrice.toLocaleString()} • Markup{' '}
                    {item.markupPercent}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard>
          {selectedPackage && viewMode === 'VIEW' ? (
            <PackageDetailView
              pkg={selectedPackage}
              onEdit={() => setViewMode('EDIT')}
            />
          ) : (
            <>
              <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                {selectedId ? 'Edit Package' : 'Create Package'}
              </h2>
              <div className='mt-4 grid grid-cols-1 gap-3'>
                <div>
                  <label className='field-label'>Package name</label>
                  <input
                    className='field-input'
                    placeholder='Package name'
                    value={form.name}
                    onChange={event =>
                      setForm(prev => ({ ...prev, name: event.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className='field-label'>Destination</label>
                  <input
                    className='field-input'
                    placeholder='Destination'
                    value={form.destination}
                    onChange={event =>
                      setForm(prev => ({
                        ...prev,
                        destination: event.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className='field-label'>Duration</label>
                  <div className='grid grid-cols-2 gap-2'>
                    <input
                      type='number'
                      min='0'
                      className='field-input'
                      placeholder='Nights'
                      value={form.durationNights}
                      onChange={event =>
                        setForm(prev => ({
                          ...prev,
                          durationNights: event.target.value
                        }))
                      }
                    />
                    <input
                      type='number'
                      min='1'
                      className='field-input'
                      placeholder='Days'
                      value={form.durationDays}
                      onChange={event =>
                        setForm(prev => ({
                          ...prev,
                          durationDays: event.target.value
                        }))
                      }
                    />
                  </div>
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    Saved to backend in the same format, for example `4N/5D`.
                  </p>
                </div>
                <div className='grid grid-cols-3 gap-2'>
                  <div>
                    <label className='field-label'>Base cost</label>
                    <input
                      className='field-input'
                      placeholder='Base cost'
                      value={form.baseCost}
                      onChange={event =>
                        setForm(prev => ({
                          ...prev,
                          baseCost: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Markup %</label>
                    <input
                      className='field-input'
                      placeholder='Markup %'
                      value={form.markupPercent}
                      onChange={event =>
                        setForm(prev => ({
                          ...prev,
                          markupPercent: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Starting price</label>
                    <input
                      className='field-input'
                      placeholder='Starting price'
                      value={form.startingPrice}
                      onChange={event => {
                        const nextValue = event.target.value
                        setForm(prev => ({
                          ...prev,
                          startingPrice: nextValue
                        }))
                        setStartingPriceManual(
                          hasManualStartingPrice(
                            form.baseCost,
                            form.markupPercent,
                            nextValue
                          )
                        )
                      }}
                    />
                    <p
                      className={`mt-1 text-xs ${
                        pricingValidationMessage
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}
                    >
                      {pricingValidationMessage ||
                        ''}
                    </p>
                  </div>
                </div>
                <div>
                  <label className='field-label'>Package type</label>
                  <SearchableDropdown
                    value={form.packageKind}
                    options={formKindOptions}
                    onChange={value =>
                      setForm(prev => ({
                        ...prev,
                        packageKind: value as PackageKind,
                        customServices:
                          value === 'CUSTOMIZED' &&
                          prev.customServices.length === 0
                            ? [emptyCustomRow()]
                            : value === 'READY'
                              ? []
                              : prev.customServices
                      }))
                    }
                    searchPlaceholder='Package type...'
                  />
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label className='field-label'>Category</label>
                    <SearchableDropdown
                      value={form.packageCategory}
                      options={formCategoryOptions}
                      onChange={value =>
                        setForm(prev => ({
                          ...prev,
                          packageCategory: value as PackageCategory | ''
                        }))
                      }
                      searchPlaceholder='Search category...'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Status</label>
                    <SearchableDropdown
                      value={form.status}
                      options={formStatusOptions}
                      onChange={value =>
                        setForm(prev => ({
                          ...prev,
                          status: value as PackageStatus
                        }))
                      }
                      searchPlaceholder='Search status...'
                    />
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-2'>
                  <div>
                    <label className='field-label'>Validity from</label>
                    <input
                      type='date'
                      className='field-input'
                      value={form.validFrom}
                      onChange={event =>
                        setForm(prev => ({
                          ...prev,
                          validFrom: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Validity to</label>
                    <input
                      type='date'
                      className='field-input'
                      value={form.validTo}
                      onChange={event =>
                        setForm(prev => ({
                          ...prev,
                          validTo: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
                <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                  <div>
                    <label className='field-label'>Inclusions</label>
                    <textarea
                      className='field-input'
                      rows={4}
                      value={form.inclusions}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          inclusions: e.target.value
                        }))
                      }
                      placeholder='Hotels, transfers, sightseeing, meals…'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Exclusions</label>
                    <textarea
                      className='field-input'
                      rows={4}
                      value={form.exclusions}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          exclusions: e.target.value
                        }))
                      }
                      placeholder='Flights, tips, visa fees, personal expenses…'
                    />
                  </div>
                </div>
                <div>
                  <label className='field-label'>Hotel details</label>
                  <textarea
                    className='field-input'
                    rows={3}
                    value={form.hotelDetails}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        hotelDetails: e.target.value
                      }))
                    }
                    placeholder='Property names, star category, room type, meal plan…'
                  />
                </div>
                <div>
                  <div className='flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/40 p-3 dark:border-blue-900/40 dark:bg-blue-900/10'>
                    <div>
                      <label className='field-label mb-0'>Itinerary (day-wise)</label>
                      <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                        Day fields are created automatically from the `Days`
                        duration value.
                      </p>
                    </div>
                    {parseDayCount(form.durationDays) <= 0 ? (
                      <p className='rounded-lg border border-dashed border-blue-200 bg-white/80 px-3 py-4 text-sm text-gray-500 dark:border-blue-900/40 dark:bg-gray-950/20 dark:text-gray-400'>
                        Enter the total `Days` in duration to generate itinerary
                        fields.
                      </p>
                    ) : form.itineraryItems.length === 0 ? (
                      <p className='rounded-lg border border-dashed border-blue-200 bg-white/80 px-3 py-4 text-sm text-gray-500 dark:border-blue-900/40 dark:bg-gray-950/20 dark:text-gray-400'>
                        Itinerary day fields will appear here automatically.
                      </p>
                    ) : (
                      <div className='space-y-3'>
                        {form.itineraryItems.map((item, index) => (
                          <div
                            key={item.id}
                            className='rounded-xl border border-blue-100 bg-white p-3 dark:border-blue-900/40 dark:bg-gray-950/20'
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
                                  setForm(prev => ({
                                    ...prev,
                                    itineraryItems: prev.itineraryItems.map((row, rowIndex) =>
                                      rowIndex === index
                                        ? { ...row, title: nextValue }
                                        : row
                                    )
                                  }))
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
                                setForm(prev => ({
                                  ...prev,
                                  itineraryItems: prev.itineraryItems.map((row, rowIndex) =>
                                    rowIndex === index
                                      ? { ...row, description: nextValue }
                                      : row
                                  )
                                }))
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {/*
                    placeholder={`Day 1 — Arrival\nAirport meet & transfer to hotel.\n\nDay 2 — City tour\nMorning sightseeing…`}
                  />
                  <p className='mt-1 text-[11px] text-gray-500'>
                    Write in normal language; one day per block is easiest (blank
                    line between days).
                  </p> */}
                </div>
                <div className='grid grid-cols-1 gap-2 md:grid-cols-2'>
                  <div>
                    <label className='field-label'>Cancellation policy</label>
                    <textarea
                      className='field-input'
                      rows={3}
                      value={form.cancellationPolicy}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          cancellationPolicy: e.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Visa details</label>
                    <textarea
                      className='field-input'
                      rows={3}
                      value={form.visaDetails}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          visaDetails: e.target.value
                        }))
                      }
                      placeholder='Visa type, fees, timeline, documents…'
                    />
                  </div>
                </div>
                <div>
                  <label className='field-label'>Payment terms</label>
                  <textarea
                    className='field-input'
                    rows={3}
                    value={form.paymentTerms}
                    onChange={e =>
                      setForm(prev => ({
                        ...prev,
                        paymentTerms: e.target.value
                      }))
                    }
                    placeholder='Advance %, balance due, modes, non-refundable…'
                  />
                </div>
                {form.packageKind === 'CUSTOMIZED' ? (
                  <div className='rounded-xl border border-amber-200 bg-amber-50/40 p-3 dark:border-amber-900 dark:bg-amber-900/10'>
                    <div className='mb-2 flex items-center justify-between'>
                      <label className='field-label mb-0'>
                        Service lines (cost & sell)
                      </label>
                      <button
                        type='button'
                        onClick={() =>
                          setForm(prev => ({
                            ...prev,
                            customServices: [
                              ...prev.customServices,
                              emptyCustomRow()
                            ]
                          }))
                        }
                        className='text-xs font-semibold text-amber-800 hover:underline dark:text-amber-200'
                      >
                        + Add line
                      </button>
                    </div>
                    <div className='space-y-3'>
                      {form.customServices.length === 0 ? (
                        <p className='text-xs text-gray-600 dark:text-gray-400'>
                          Add one or more services with cost; optional markup %
                          and sell value.
                        </p>
                      ) : null}
                      {form.customServices.map((row, idx) => (
                        <div
                          key={row.id}
                          className='grid grid-cols-1 gap-2 rounded-lg border border-amber-100 bg-white p-2 dark:border-amber-900/40 dark:bg-gray-900/40 md:grid-cols-12'
                        >
                          <input
                            className='field-input md:col-span-3'
                            placeholder='Service name'
                            value={row.name}
                            onChange={e => {
                              const v = e.target.value
                              setForm(prev => ({
                                ...prev,
                                customServices: prev.customServices.map((r, i) =>
                                  i === idx ? { ...r, name: v } : r
                                )
                              }))
                            }}
                          />
                          <input
                            className='field-input md:col-span-3'
                            placeholder='Description'
                            value={row.description}
                            onChange={e => {
                              const v = e.target.value
                              setForm(prev => ({
                                ...prev,
                                customServices: prev.customServices.map((r, i) =>
                                  i === idx ? { ...r, description: v } : r
                                )
                              }))
                            }}
                          />
                          <input
                            className='field-input md:col-span-2'
                            placeholder='Cost'
                            value={row.cost}
                            onChange={e => {
                              const v = e.target.value
                              setForm(prev => ({
                                ...prev,
                                customServices: prev.customServices.map((r, i) =>
                                  i === idx ? { ...r, cost: v } : r
                                )
                              }))
                            }}
                          />
                          <input
                            className='field-input md:col-span-1'
                            placeholder='%'
                            value={row.markupPercent}
                            onChange={e => {
                              const v = e.target.value
                              setForm(prev => ({
                                ...prev,
                                customServices: prev.customServices.map((r, i) =>
                                  i === idx ? { ...r, markupPercent: v } : r
                                )
                              }))
                            }}
                          />
                          <input
                            className='field-input md:col-span-2'
                            placeholder='Sell'
                            value={row.sellValue}
                            onChange={e => {
                              const v = e.target.value
                              setForm(prev => ({
                                ...prev,
                                customServices: prev.customServices.map((r, i) =>
                                  i === idx ? { ...r, sellValue: v } : r
                                )
                              }))
                            }}
                          />
                          <button
                            type='button'
                            title='Remove line'
                            onClick={() =>
                              setForm(prev => ({
                                ...prev,
                                customServices: prev.customServices.filter(
                                  (_, i) => i !== idx
                                )
                              }))
                            }
                            className='flex h-10 items-center justify-center rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-900/20 md:col-span-1'
                          >
                            <FaTrash className='text-xs' />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <label className='inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
                  <input
                    type='checkbox'
                    checked={form.isSoldOut}
                    onChange={event =>
                      setForm(prev => ({
                        ...prev,
                        isSoldOut: event.target.checked
                      }))
                    }
                  />
                  Mark sold out
                </label>
                <div className='flex gap-2'>
                  <button
                    disabled={saving}
                    onClick={() => void handleSave()}
                    className='flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60'
                  >
                    {saving ? 'Saving...' : 'Save Package'}
                    <FaSave />
                  </button>
                  {selectedId && (
                    <button
                      onClick={() => setViewMode('VIEW')}
                      className='rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </SurfaceCard>
      </div>

      {/* <SurfaceCard>
        <div className='flex items-center gap-2'>
          <FaBoxOpen />
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Package Enquiries
          </h2>
        </div>
        {!selectedId ? (
          <p className='mt-3 text-sm text-gray-500'>
            Select a package to manage enquiries.
          </p>
        ) : (
          <>
            <div className='mt-4 grid grid-cols-1 gap-2 md:grid-cols-4'>
              <div>
                <label className='field-label'>Lead ID (optional)</label>
                <input
                  className='field-input'
                  placeholder='Lead ID (optional)'
                  value={enquiryDraft.leadId}
                  onChange={event =>
                    setEnquiryDraft(prev => ({
                      ...prev,
                      leadId: event.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Full name</label>
                <input
                  className='field-input'
                  placeholder='Full name'
                  value={enquiryDraft.fullName}
                  onChange={event =>
                    setEnquiryDraft(prev => ({
                      ...prev,
                      fullName: event.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Phone</label>
                <input
                  className='field-input'
                  placeholder='Phone'
                  value={enquiryDraft.phone}
                  onChange={event =>
                    setEnquiryDraft(prev => ({
                      ...prev,
                      phone: event.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Email</label>
                <input
                  className='field-input'
                  placeholder='Email'
                  value={enquiryDraft.email}
                  onChange={event =>
                    setEnquiryDraft(prev => ({
                      ...prev,
                      email: event.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Travel date</label>
                <input
                  type='date'
                  className='field-input'
                  value={enquiryDraft.travelDate}
                  onChange={event =>
                    setEnquiryDraft(prev => ({
                      ...prev,
                      travelDate: event.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Travellers</label>
                <input
                  className='field-input'
                  placeholder='Travellers'
                  value={enquiryDraft.travellersCount}
                  onChange={event =>
                    setEnquiryDraft(prev => ({
                      ...prev,
                      travellersCount: event.target.value
                    }))
                  }
                />
              </div>
              <div>
                <label className='field-label'>Source</label>
                <input
                  className='field-input'
                  placeholder='Source'
                  value={enquiryDraft.source}
                  onChange={event =>
                    setEnquiryDraft(prev => ({
                      ...prev,
                      source: event.target.value
                    }))
                  }
                />
              </div>
              <button
                onClick={() => void handleCreateEnquiry()}
                className='rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'
              >
                Add Enquiry
              </button>
            </div>
            {enquiryError ? (
              <p className='mt-2 text-sm text-red-600'>{enquiryError}</p>
            ) : null}
            <div className='mt-4 space-y-2'>
              {enquiryLoading ? (
                <p className='text-sm text-gray-500'>Loading enquiries...</p>
              ) : enquiries.length === 0 ? (
                <p className='text-sm text-gray-500'>
                  No enquiries for this package yet.
                </p>
              ) : (
                enquiries.map(enquiry => (
                  <div
                    key={enquiry.id}
                    className='rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700'
                  >
                    <p className='font-medium text-gray-900 dark:text-gray-100'>
                      {enquiry.fullName || 'Unnamed enquiry'}
                    </p>
                    <p className='text-xs text-gray-500'>
                      {enquiry.phone || 'No phone'} •{' '}
                      {enquiry.email || 'No email'} •{' '}
                      {enquiry.travelDate || 'No travel date'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </SurfaceCard> */}
    </div>
  )
}

export default PackagesPage
