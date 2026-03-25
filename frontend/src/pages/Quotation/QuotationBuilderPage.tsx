import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaArrowLeft,
  FaArrowRotateRight,
  FaCheck,
  FaDesktop,
  FaDownload,
  FaEnvelope,
  FaFloppyDisk,
  FaMobileScreen,
  FaPlus
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { suppliersApi } from '../../api/suppliers'
import { quotationsApi } from '../../api/quotations'
import { getApiErrorMessage } from '../../api/apiClient'
import { useAuth } from '../../context/AuthContext'
import { useLeadsService } from '../../hooks/useLeadsService'

type Currency = 'USD' | 'EUR' | 'INR'
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
  fullName?: string | null
  email?: string | null
  phone?: string | null
  destinationId?: string | null
  destination?: any
  destinationName?: string | null
  travelDate?: string | null
  adultsCount?: number | null
  childrenCount?: number | null
  travelPurpose?: string | null
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

type ServiceKey = 'hotel' | 'flights' | 'tours' | 'visa' | 'insurance'

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

const SERVICE_DEFINITIONS: ServiceDefinition[] = [
  { key: 'hotel', label: 'Accommodation', itemType: 'HOTEL', weight: 45 },
  { key: 'flights', label: 'Flights', itemType: 'FLIGHT', weight: 25 },
  { key: 'tours', label: 'Tours & Activities', itemType: 'OTHER', weight: 15 },
  { key: 'visa', label: 'Visa Services', itemType: 'VISA', weight: 8 },
  { key: 'insurance', label: 'Insurance', itemType: 'INSURANCE', weight: 7 }
]

const initialItinerary: Item[] = [
  {
    id: '1',
    day: 'Day 1',
    title: 'Arrival & Transfer',
    description: 'Private speedboat transfer from airport to resort.'
  },
  {
    id: '2',
    day: 'Day 2',
    title: 'Lagoon Excursion',
    description: 'Guided reef and lagoon experience with lunch.'
  }
]

const QuotationBuilderPage: React.FC = () => {
  const navigate = useNavigate()
  const { token } = useAuth()
  const leadsService = useLeadsService()
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
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([])
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
    customer: '',
    email: '',
    destination: '',
    startDate: '',
    nights: 1,
    adults: 1,
    validUntil: '',
    inclusions: '',
    exclusions: '',
    headerBranding: '',
    paymentTerms: '',
    cancellationPolicy: '',
    footerDisclaimer: ''
  })
  const [downloading, setDownloading] = useState(false)
  const [showSaved, setShowSaved] = useState(false)
  const [itineraryItems, setItineraryItems] = useState<Item[]>(initialItinerary)
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
  const [packageType, setPackageType] = useState('Leisure')
  const [services, setServices] = useState<Record<ServiceKey, boolean>>({
    hotel: true,
    flights: true,
    tours: true,
    visa: false,
    insurance: false
  })
  const [costs, setCosts] = useState({
    supplierCost: 4200,
    markupPercent: 12,
    serviceFee: 120,
    taxPercent: 5,
    discount: 0
  })
  const [addOnServices, setAddOnServices] = useState<
    {
      id: string
      name: string
      weight: number
      baseCost: number
      markup: number
      sellValue: number
    }[]
  >([])
  const [addOnDraft, setAddOnDraft] = useState({
    name: '',
    weight: '',
    baseCost: '',
    markup: '',
    sellValue: ''
  })
  const previewRef = useRef<HTMLDivElement | null>(null)

  const selectedLead = useMemo(
    () => leads.find(lead => lead.id === selectedLeadId) || null,
    [leads, selectedLeadId]
  )

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
      ...leads.map(lead => ({
        value: lead.id,
        label: lead.fullName || lead.email || lead.phone || lead.id
      }))
    ],
    [leads]
  )

  const quotationTemplateOptions = useMemo(
    () => [
      { value: '', label: 'No template (manual quotation)' },
      ...templates.map(template => ({
        value: template.id,
        label: `${template.code} - ${template.name}${
          !template.isActive ? ' (Inactive)' : ''
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

  const packageTypeOptions = useMemo(
    () =>
      ['Leisure', 'Corporate', 'Group', 'Visa Only', 'Insurance Only'].map(
        item => ({
          value: item,
          label: item
        })
      ),
    []
  )

  const currencyOptions = useMemo(
    () => [
      { value: 'INR', label: 'INR' },
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' }
    ],
    []
  )

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

  const serviceCostRows = useMemo<ServiceCostRow[]>(() => {
    const activeDefinitions = selectedServiceDefinitions
    if (!activeDefinitions.length) {
      return []
    }
    const totalWeight = activeDefinitions.reduce(
      (sum, definition) => sum + definition.weight,
      0
    )
    const supplierCost = Number(costs.supplierCost) || 0
    const markupPercent = Number(costs.markupPercent) || 0

    let allocatedCost = 0

    return activeDefinitions.map((definition, index) => {
      const isLast = index === activeDefinitions.length - 1
      const weightedCost = totalWeight
        ? (supplierCost * definition.weight) / totalWeight
        : 0
      const baseCost = Number(
        (isLast ? supplierCost - allocatedCost : weightedCost).toFixed(2)
      )
      allocatedCost = Number((allocatedCost + baseCost).toFixed(2))
      const markupAmount = Number(((baseCost * markupPercent) / 100).toFixed(2))
      const sellValue = Number((baseCost + markupAmount).toFixed(2))

      return {
        ...definition,
        baseCost,
        markupPercent,
        markupAmount,
        sellValue
      }
    })
  }, [costs.markupPercent, costs.supplierCost, selectedServiceDefinitions])

  useEffect(() => {
    const loadDestinations = async () => {
      try {
        const list = await leadsService.getDestinations()
        const map: Record<string, string> = {}
        ;(Array.isArray(list) ? list : []).forEach((item: any) => {
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
        setLeadsError(
          getApiErrorMessage(error, 'Failed to load leads from API.')
        )
      } finally {
        setLeadsLoading(false)
      }
    }

    void loadLeads()
  }, [leadsService, token])

  useEffect(() => {
    const loadTemplates = async () => {
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
        setTemplatesError(
          getApiErrorMessage(error, 'Failed to load quotation templates.')
        )
      } finally {
        setTemplatesLoading(false)
      }
    }

    void loadTemplates()
  }, [token])

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
        const data = (payload as any)?.data || (payload as any)?.items || payload
        if (Array.isArray(data)) {
          setSuppliers(data.map((s: any) => ({
            id: s.id || s._id,
            name: s.name || s.companyName || 'Unnamed Supplier'
          })))
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
      destination: destinationName,
      startDate: selectedLead.travelDate
        ? selectedLead.travelDate.slice(0, 10)
        : prev.startDate,
      adults: Number(selectedLead.adultsCount || prev.adults || 1)
    }))
  }, [selectedLead, destinationMap, form.destination])

  const addOnTotal = useMemo(
    () =>
      addOnServices.reduce(
        (sum, item) => sum + (Number(item.sellValue) || 0),
        0
      ),
    [addOnServices]
  )

  const addAddOnService = () => {
    const name = addOnDraft.name.trim()
    const weight = Number(addOnDraft.weight)
    const baseCost = Number(addOnDraft.baseCost)
    const markup = Number(addOnDraft.markup)
    const sellValue = Number(addOnDraft.sellValue)
    if (
      !name ||
      !Number.isFinite(weight) ||
      weight < 0 ||
      !Number.isFinite(baseCost) ||
      baseCost < 0 ||
      !Number.isFinite(markup) ||
      markup < 0 ||
      !Number.isFinite(sellValue) ||
      sellValue <= 0
    ) {
      alert('Please fill all add-on fields with valid values.')
      return
    }
    setAddOnServices(prev => [
      ...prev,
      {
        id: `addon-${Date.now()}`,
        name,
        weight,
        baseCost,
        markup,
        sellValue
      }
    ])
    setAddOnDraft({
      name: '',
      weight: '',
      baseCost: '',
      markup: '',
      sellValue: ''
    })
    setShowAddOnModal(false)
  }

  const computed = useMemo(() => {
    const supplier = Number(costs.supplierCost) || 0
    const markupVal = supplier * ((Number(costs.markupPercent) || 0) / 100)
    const serviceFee = Number(costs.serviceFee) || 0
    const preTax = supplier + markupVal + serviceFee + addOnTotal
    const taxVal = preTax * ((Number(costs.taxPercent) || 0) / 100)
    const discount = Number(costs.discount) || 0
    const totalPrice = Math.max(preTax + taxVal - discount, 0)
    const profit = totalPrice - supplier - taxVal
    const margin = totalPrice ? (profit / totalPrice) * 100 : 0
    return {
      supplier,
      markupVal,
      serviceFee,
      addOnTotal,
      taxVal,
      discount,
      totalPrice,
      profit,
      margin
    }
  }, [addOnTotal, costs])

  const subtotal =
    computed.supplier +
    computed.markupVal +
    computed.serviceFee +
    computed.addOnTotal
  const taxes = computed.taxVal
  const total = computed.totalPrice
  const quoteDisplayNumber = form.quote.trim() || 'AUTO-GENERATED'

  const totalMarkupFromServices = useMemo(
    () =>
      Number(
        serviceCostRows
          .reduce((sum, row) => sum + row.markupAmount, 0)
          .toFixed(2)
      ),
    [serviceCostRows]
  )
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
  const inclusionLines = useMemo(
    () => toBulletList(form.inclusions),
    [form.inclusions]
  )
  const exclusionLines = useMemo(
    () => toBulletList(form.exclusions),
    [form.exclusions]
  )

  const money = (v: number) => {
    const locale = currency === 'INR' ? 'en-IN' : 'en-US'
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(v)
  }

  const formatPreviewDateTime = (value?: string) => {
    if (!value) return 'N/A'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleString()
  }

  const formatPreviewDate = (value?: string) => {
    if (!value) return 'N/A'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return value
    return parsed.toLocaleDateString()
  }

  const autofillCustomer = () => {
    if (selectedLead) {
      setForm(p => ({
        ...p,
        customer: selectedLead.fullName || p.customer,
        email: selectedLead.email || p.email,
        destination:
          (selectedLead.destinationId &&
            destinationMap[selectedLead.destinationId]) ||
          p.destination,
        startDate: selectedLead.travelDate
          ? selectedLead.travelDate.slice(0, 10)
          : p.startDate,
        adults: Number(selectedLead.adultsCount || p.adults || 1)
      }))
      setSaveError('')
      return
    }
    setSaveError('Select a lead to auto-fill.')
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
          `${item.day}: ${item.title}${
            item.description ? ` - ${item.description}` : ''
          }`
      )
      .join('\n')

    const enabledServices = selectedServiceDefinitions
      .map(definition => definition.label)
      .join(', ')

    const sections = [
      `Trip Summary:\nDestination: ${form.destination || 'N/A'}\nTravel Date: ${
        form.startDate || 'N/A'
      }\nNights: ${form.nights}\nAdults: ${
        form.adults
      }\nPackage Type: ${packageType}`,
      enabledServices ? `Enabled Services:\n${enabledServices}` : '',
      itinerarySummary ? `Itinerary:\n${itinerarySummary}` : '',
      form.headerBranding.trim()
        ? `Header Branding:\n${form.headerBranding.trim()}`
        : '',
      form.inclusions.trim() ? `Inclusions:\n${form.inclusions.trim()}` : '',
      form.exclusions.trim() ? `Exclusions:\n${form.exclusions.trim()}` : '',
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

  const handleSave = () => {
    setSaveError('')

    if (!token) {
      const newQuote: SavedQuote = {
        id: String(Date.now()),
        quoteNumber: form.quote || 'Draft',
        customer: form.customer || 'Unnamed Customer',
        email: form.email || 'New Lead',
        destination: form.destination || 'Destination',
        details: `${form.nights} nights - ${packageType}`,
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
      setTimeout(() => navigate('/quotations'), 1200)
      return
    }

    if (!selectedLeadId) {
      setSaveError('Please select a lead before saving.')
      return
    }

    if (!selectedServiceDefinitions.length) {
      setSaveError('Select at least one service in Package Builder.')
      return
    }

    const supplier = Number(costs.supplierCost) || 0
    const serviceFee = Number(costs.serviceFee) || 0
    const components = [
      ...serviceCostRows.map(row => ({
        itemType: row.itemType,
        description: `${row.label}${
          form.destination ? ` - ${form.destination}` : ''
        }`,
        cost: row.baseCost
      })),
      ...(serviceFee
        ? [
            {
              itemType: 'OTHER',
              description: 'Service Fee',
              cost: Number(serviceFee.toFixed(2))
            }
          ]
        : [])
    ]

    const taxPercent = Number(costs.taxPercent) || 0
    const discount = Number(costs.discount) || 0
    const markupAmount =
      Number(costs.supplierCost || 0) * (Number(costs.markupPercent || 0) / 100)

    const expiresInHours = (() => {
      if (!form.validUntil) return undefined
      const diffMs = new Date(form.validUntil).getTime() - Date.now()
      if (!Number.isFinite(diffMs) || diffMs <= 0) return undefined
      const hours = Math.ceil(diffMs / (1000 * 60 * 60))
      return Math.min(hours, 720)
    })()

    const payload = {
      leadId: selectedLeadId,
      ...(selectedTemplateId ? { templateId: selectedTemplateId } : {}),
      components,
      marginPercent: Number(costs.markupPercent) || 0,
      discount,
      taxPercent,
      supplierCost: supplier,
      markupAmount,
      serviceFeeAmount: serviceFee,
      taxAmount: Number(computed.taxVal) || 0,
      costCurrency: currency,
      clientCurrency: currency,
      supplierCurrency: currency,
      importantNotes: buildImportantNotes(),
      ...(expiresInHours ? { expiresInHours } : {})
    }

    setSaving(true)
    quotationsApi
      .create(payload)
      .then(() => {
        setShowSaved(true)
        setTimeout(() => navigate('/quotations'), 1200)
      })
      .catch(error => {
        console.error('Failed to save quotation:', error)
        setSaveError(
          getApiErrorMessage(
            error,
            'Failed to save quotation. Please try again.'
          )
        )
      })
      .finally(() => setSaving(false))
  }

  return (
    <>
      <div className='space-y-6'>
        <div className='flex flex-col justify-between gap-3 lg:flex-row lg:items-center'>
          <div>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate('/quotations')}
                className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                aria-label='Back to quotations'
                title='Back to Quotations'
              >
                <FaArrowLeft className='text-sm' />
              </button>
              <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
                Quotation Builder
              </h1>
            </div>
            <p className='text-sm text-gray-500'>
              Create and preview polished quotations quickly.
            </p>
            <div className='mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700'>
              <p className='font-semibold'>How Template Works</p>
              <p className='mt-1'>
                1) Create template in Templates page. 2) Select template here.
                3) Save quote to lock snapshot with quotation for audit-safe
                rendering.
              </p>
            </div>
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
              className='inline-flex w-full items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 sm:w-auto'
              disabled={downloading}
            >
              <FaDownload className='shrink-0' />
              {downloading ? 'Preparing...' : 'Download'}
            </button>
            <button className='inline-flex w-full items-center justify-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 sm:w-auto'>
              <FaEnvelope className='shrink-0' /> Send
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className='col-span-3 w-full rounded-xl bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto'
            >
              <FaFloppyDisk className='mr-2 inline' /> Save Quotation
            </button>
          </div>
        </div>

        <div className='relative grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.1fr]'>
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
                          setSelectedTemplateId(nextId)
                          const template =
                            templates.find(item => item.id === nextId) || null
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

                  <div>
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
                <Field
                  label='Customer'
                  value={form.customer}
                  onChange={v => setForm(p => ({ ...p, customer: v }))}
                />
                <Field
                  label='Email'
                  value={form.email}
                  onChange={v => setForm(p => ({ ...p, email: v }))}
                />
                <Field
                  label='Destination'
                  value={form.destination}
                  onChange={v => setForm(p => ({ ...p, destination: v }))}
                />
                <Field
                  label='Quote Reference'
                  value={form.quote}
                  onChange={v => setForm(p => ({ ...p, quote: v }))}
                />
                <div>
                  <label className='field-label'>Start Date</label>
                  <input
                    type='date'
                    className='field-input'
                    value={form.startDate}
                    onChange={e =>
                      setForm(p => ({ ...p, startDate: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className='field-label'>Valid Until</label>
                  <input
                    type='datetime-local'
                    className='field-input'
                    value={form.validUntil}
                    onChange={e =>
                      setForm(p => ({ ...p, validUntil: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className='field-label'>Nights</label>
                  <input
                    type='number'
                    className='field-input'
                    value={form.nights}
                    onChange={e =>
                      setForm(p => ({
                        ...p,
                        nights: Number(e.target.value || 1)
                      }))
                    }
                  />
                </div>
                <div>
                  <label className='field-label'>Adults</label>
                  <input
                    type='number'
                    className='field-input'
                    value={form.adults}
                    onChange={e =>
                      setForm(p => ({
                        ...p,
                        adults: Number(e.target.value || 1)
                      }))
                    }
                  />
                </div>
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                  Package Builder
                </h2>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  Select scope & services
                </span>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='field-label'>Package Type</label>
                  <SearchableDropdown
                    value={packageType}
                    options={packageTypeOptions}
                    searchPlaceholder='Search package type...'
                    onChange={setPackageType}
                  />
                </div>
                <div className='flex flex-wrap gap-2'>
                  {SERVICE_DEFINITIONS.map(service => (
                    <button
                      key={service.key}
                      onClick={() =>
                        setServices(prev => ({
                          ...prev,
                          [service.key]: !prev[service.key]
                        }))
                      }
                      className={`px-3 py-2 text-xs rounded-lg border ${
                        services[service.key]
                          ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-700 dark:text-blue-200'
                          : 'bg-white border-gray-200 text-gray-600 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {service.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-3'>
                {selectedServiceDefinitions.map(definition => (
                  <div
                    key={definition.key}
                    className='rounded-lg border border-gray-200 dark:border-gray-700 p-3'
                  >
                    <p className='text-xs uppercase text-gray-500 dark:text-gray-400 mb-1'>
                      {definition.itemType}
                    </p>
                    <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                      {definition.label}
                    </p>
                  </div>
                ))}
              </div>
            </SurfaceCard>

            <SurfaceCard>
              <div className='mb-3 flex items-center justify-between'>
                <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                  Cost & Profit
                </h2>
                <span className='text-xs text-gray-500 dark:text-gray-400'>
                  Auto calculations
                </span>
              </div>
              <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                <NumberField
                  label='Supplier Cost'
                  value={costs.supplierCost}
                  onChange={v => setCosts(p => ({ ...p, supplierCost: v }))}
                  prefix='$'
                />
                <NumberField
                  label='Markup %'
                  value={costs.markupPercent}
                  onChange={v => setCosts(p => ({ ...p, markupPercent: v }))}
                />
                <NumberField
                  label='Service Fee'
                  value={costs.serviceFee}
                  onChange={v => setCosts(p => ({ ...p, serviceFee: v }))}
                  prefix='$'
                />
                <NumberField
                  label='Tax %'
                  value={costs.taxPercent}
                  onChange={v => setCosts(p => ({ ...p, taxPercent: v }))}
                />
                <NumberField
                  label='Discount'
                  value={costs.discount}
                  onChange={v => setCosts(p => ({ ...p, discount: v }))}
                  prefix='$'
                />
              </div>
              <div className='mt-4 grid grid-cols-1 md:grid-cols-4 gap-3'>
                <SummaryTile
                  label='Total Price'
                  value={money(computed.totalPrice)}
                  tone='blue'
                />
                <SummaryTile
                  label='Profit'
                  value={money(computed.profit)}
                  tone='green'
                />
                <SummaryTile
                  label='Margin'
                  value={`${computed.margin.toFixed(1)}%`}
                  tone='amber'
                />
                <SummaryTile
                  label='Tax'
                  value={money(computed.taxVal)}
                  tone='purple'
                />
              </div>
            </SurfaceCard>
            <SurfaceCard>
              <div className='mb-4 flex items-center justify-between'>
                <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                  Itinerary Items
                </h2>
                <button
                  onClick={() => setShowAddModal(true)}
                  className='rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300'
                >
                  <FaPlus className='mr-1 inline' /> Add Item
                </button>
              </div>
              <div className='space-y-3'>
                {itineraryItems.map(i => (
                  <div
                    key={i.id}
                    className='rounded-xl border border-gray-200 p-3 dark:border-gray-700'
                  >
                    <div className='mb-1 flex items-center gap-2'>
                      <span className='rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700'>
                        {i.day}
                      </span>
                      <h3 className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        {i.title}
                      </h3>
                    </div>
                    <p className='text-xs text-gray-500'>{i.description}</p>
                  </div>
                ))}
              </div>
            </SurfaceCard>
            <SurfaceCard>
              <div className='mb-3 flex items-start justify-between gap-3'>
                <div>
                  <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                    Pricing Breakdown
                  </h2>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    Auto generated from Supplier Cost, Markup, Service Fee, Tax,
                    and Discount.
                  </p>
                </div>
                <SearchableDropdown
                  className='w-28'
                  value={currency}
                  options={currencyOptions}
                  searchPlaceholder='Search currency...'
                  onChange={value => setCurrency(value as Currency)}
                />
              </div>
              <div className='mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700'>
                Formula: <strong>Total Sale Value</strong> = Supplier Cost +
                Markup + Service Fee + Tax - Discount.
              </div>
              <div className='mb-3 grid grid-cols-1 gap-2 text-xs text-gray-600 md:grid-cols-3'>
                <div className='rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900'>
                  <p className='font-semibold text-gray-800 dark:text-gray-100'>
                    Step 1: Cost Split
                  </p>
                  <p className='mt-1'>
                    Supplier cost is distributed to selected services by weight.
                  </p>
                </div>
                <div className='rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900'>
                  <p className='font-semibold text-gray-800 dark:text-gray-100'>
                    Step 2: Markup
                  </p>
                  <p className='mt-1'>
                    Markup percent is applied on each service allocated cost.
                  </p>
                </div>
                <div className='rounded-lg border border-gray-200 bg-white px-3 py-2 dark:border-gray-700 dark:bg-gray-900'>
                  <p className='font-semibold text-gray-800 dark:text-gray-100'>
                    Step 3: Final Amount
                  </p>
                  <p className='mt-1'>
                    Service Fee and Tax are added, Discount is subtracted.
                  </p>
                </div>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm'>
                  <thead>
                    <tr className='border-b border-gray-200 text-gray-500 dark:border-gray-700'>
                      <th className='py-2 text-left'>Service</th>
                      <th className='py-2 text-right'>Weight</th>
                      <th className='py-2 text-right'>Base Cost</th>
                      <th className='py-2 text-right'>Markup</th>
                      <th className='py-2 text-right'>Sell Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceCostRows.map(row => (
                      <tr
                        key={row.key}
                        className='border-b border-gray-100 dark:border-gray-800'
                      >
                        <td className='py-2'>{row.label}</td>
                        <td className='py-2 text-right text-gray-500'>
                          {row.weight}%
                        </td>
                        <td className='py-2 text-right'>
                          {money(row.baseCost)}
                        </td>
                        <td className='py-2 text-right text-green-600'>
                          {row.markupPercent.toFixed(1)}%
                          <span className='ml-1 text-[11px] text-green-500'>
                            ({money(row.markupAmount)})
                          </span>
                        </td>
                        <td className='py-2 text-right font-medium'>
                          {money(row.sellValue)}
                        </td>
                      </tr>
                    ))}
                    {!serviceCostRows.length ? (
                      <tr>
                        <td
                          colSpan={5}
                          className='py-3 text-center text-xs text-gray-500'
                        >
                          Select at least one service in Package Builder.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              <div className='mt-4 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900'>
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
                    <div className='grid grid-cols-5 gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500'>
                      <span>Service</span>
                      <span className='text-right'>Weight</span>
                      <span className='text-right'>Base Cost</span>
                      <span className='text-right'>Markup</span>
                      <span className='text-right'>Sell Value</span>
                    </div>
                    {addOnServices.map(service => (
                      <div
                        key={service.id}
                        className='grid grid-cols-5 items-center gap-2'
                      >
                        <span>{service.name}</span>
                        <span className='text-right'>
                          {Number(service.weight || 0).toFixed(1)}%
                        </span>
                        <span className='text-right'>
                          {money(Number(service.baseCost) || 0)}
                        </span>
                        <span className='text-right'>
                          {money(Number(service.markup) || 0)}
                        </span>
                        <span className='text-right font-medium text-gray-800 dark:text-gray-100'>
                          {money(Number(service.sellValue) || 0)}
                        </span>
                      </div>
                    ))}
                    <div className='flex items-center justify-between border-t border-gray-200 pt-2 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:text-gray-200'>
                      <span>Add-on Total</span>
                      <span>{money(addOnTotal)}</span>
                    </div>
                    <div className='flex items-center justify-between border-t border-gray-200 pt-2 text-xs font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100'>
                      <span>Services Total</span>
                      <span>{money(serviceChargesTotal)}</span>
                    </div>
                  </div>
                ) : (
                  <div className='space-y-2 text-xs text-gray-500'>
                    <p>No add-on services added yet.</p>
                    <div className='flex items-center justify-between border-t border-gray-200 pt-2 text-xs font-semibold text-gray-800 dark:border-gray-700 dark:text-gray-100'>
                      <span>Services Total</span>
                      <span>{money(serviceChargesTotal)}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className='mt-4 rounded-xl bg-gray-50 p-3 dark:bg-gray-800'>
                <div className='mb-1 flex justify-between text-xs text-gray-500'>
                  <span>Supplier Cost</span>
                  <span>{money(computed.supplier)}</span>
                </div>
                <div className='mb-1 flex justify-between text-xs text-gray-500'>
                  <span>Total Markup</span>
                  <span>
                    {money(totalMarkupFromServices || computed.markupVal)}
                  </span>
                </div>
                <div className='mb-1 flex justify-between text-xs text-gray-500'>
                  <span>Service Fee</span>
                  <span>{money(computed.serviceFee)}</span>
                </div>
                {addOnTotal ? (
                  <div className='mb-1 flex justify-between text-xs text-gray-500'>
                    <span>Add-on Services</span>
                    <span>{money(addOnTotal)}</span>
                  </div>
                ) : null}
                <div className='mb-1 flex justify-between text-xs text-gray-500'>
                  <span>Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className='mb-1 flex justify-between text-xs text-gray-500'>
                  <span>Taxes ({costs.taxPercent}%)</span>
                  <span>{money(taxes)}</span>
                </div>
                {costs.discount ? (
                  <div className='mb-1 flex justify-between text-xs text-gray-500'>
                    <span>Discount</span>
                    <span>-{money(costs.discount)}</span>
                  </div>
                ) : null}
                <div className='flex justify-between border-t border-gray-200 pt-2 text-sm font-semibold'>
                  <span>Total</span>
                  <span className='text-blue-600'>{money(total)}</span>
                </div>
              </div>
            </SurfaceCard>
            <div className='grid grid-cols-1 gap-6 md:grid-cols-2'>
              <SurfaceCard>
                <h3 className='mb-2 text-sm font-semibold text-green-700'>
                  Inclusions
                </h3>
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
                      className={`rounded-lg px-2 py-1 text-xs ${
                        !mobile
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      <FaDesktop className='mr-1 inline' /> Desktop
                    </button>
                    <button
                      onClick={() => setMobile(true)}
                      className={`rounded-lg px-2 py-1 text-xs ${
                        mobile
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                      }`}
                    >
                      <FaMobileScreen className='mr-1 inline' /> Mobile
                    </button>
                  </div>
                  <div className='flex gap-2'>
                    <button className='rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 dark:border-gray-700'>
                      <FaArrowRotateRight className='mr-1 inline' /> Refresh
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
                  className={`mx-auto rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900 ${
                    mobile ? 'max-w-[360px]' : 'max-w-3xl'
                  }`}
                >
                  <div className='mb-6 flex items-start justify-between border-b border-gray-100 pb-4 dark:border-gray-800'>
                    <div className='flex items-center gap-2'>
                      <div className='flex h-8 w-8 items-center justify-center rounded-lg'>
                        <img
                          src='/logo1.png'
                          alt='Get2Vacation'
                          className='h-8 w-6'
                        />
                      </div>
                      <div>
                        <p className='font-semibold'>Get2Vacation Travel CRM</p>
                        <p className='text-xs text-gray-500'>
                          support@Get2Vacation.com
                        </p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='text-lg font-bold text-blue-600'>
                        QUOTATION
                      </p>
                      <p className='text-xs text-gray-500'>
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
                      Package:{' '}
                      <span className='font-semibold text-gray-700'>
                        {packageType}
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
                    <div className='flex items-center justify-between text-sm'>
                      <div>
                        <p className='font-semibold text-gray-900'>
                          {form.customer || 'Guest Name'}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {form.email || 'guest@email.com'}
                        </p>
                      </div>
                      <div className='text-right text-xs text-gray-500'>
                        <p>{form.destination || 'Destination'}</p>
                        <p>
                          {form.nights} nights - {form.adults} adults
                        </p>
                      </div>
                    </div>
                    <div className='mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500'>
                      <p>
                        Travel Date:{' '}
                        <span className='text-gray-700'>
                          {formatPreviewDate(form.startDate)}
                        </span>
                      </p>
                      <p className='text-right'>
                        Valid Until:{' '}
                        <span className='text-gray-700'>
                          {formatPreviewDateTime(form.validUntil)}
                        </span>
                      </p>
                    </div>
                  </div>

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
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 backdrop-blur'>
            <div className='w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900 border border-gray-200 dark:border-gray-700'>
              <div className='mb-3 flex items-center justify-between'>
                <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                  Add Service
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
                    className='field-input'
                    value={addOnDraft.name}
                    onChange={e =>
                      setAddOnDraft(p => ({ ...p, name: e.target.value }))
                    }
                    placeholder='Airport pickup / Cruise / Extra nights'
                  />
                </div>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div>
                    <label className='field-label'>Weight (%)</label>
                    <input
                      type='number'
                      min='0'
                      className='field-input'
                      value={addOnDraft.weight}
                      onChange={e =>
                        setAddOnDraft(p => ({ ...p, weight: e.target.value }))
                      }
                      placeholder='0'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Base Cost</label>
                    <input
                      type='number'
                      min='0'
                      className='field-input'
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
                </div>
                <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
                  <div>
                    <label className='field-label'>Markup</label>
                    <input
                      type='number'
                      min='0'
                      className='field-input'
                      value={addOnDraft.markup}
                      onChange={e =>
                        setAddOnDraft(p => ({ ...p, markup: e.target.value }))
                      }
                      placeholder='0.00'
                    />
                  </div>
                  <div>
                    <label className='field-label'>Sell Value</label>
                    <input
                      type='number'
                      min='0'
                      className='field-input'
                      value={addOnDraft.sellValue}
                      onChange={e =>
                        setAddOnDraft(p => ({
                          ...p,
                          sellValue: e.target.value
                        }))
                      }
                      placeholder='0.00'
                    />
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
                  Add Service
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showSaved && (
        <div className='fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4'>
          <div className='w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl p-6 text-center'>
            <div className='mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600'>
              <FaCheck className='text-xl' />
            </div>
            <p className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              Quotation saved
            </p>
            <p className='text-sm text-gray-500 dark:text-gray-400 mt-1'>
              Redirecting to quotations list...
            </p>
          </div>
        </div>
      )}
    </>
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

const NumberField = ({
  label,
  value,
  onChange,
  prefix
}: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
}) => (
  <div>
    <label className='field-label'>{label}</label>
    <div className='flex items-center gap-2'>
      {prefix ? (
        <span className='text-gray-500 dark:text-gray-400 text-sm'>
          {prefix}
        </span>
      ) : null}
      <input
        type='number'
        className='field-input'
        value={value}
        onChange={e => onChange(Number(e.target.value || 0))}
      />
    </div>
  </div>
)

const SummaryTile = ({
  label,
  value,
  tone
}: {
  label: string
  value: string
  tone: 'blue' | 'green' | 'amber' | 'purple'
}) => {
  const toneMap: Record<typeof tone, string> = {
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-200',
    green:
      'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-200',
    amber:
      'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-200',
    purple:
      'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-200'
  }
  return (
    <div
      className={`rounded-xl border border-gray-200 dark:border-gray-700 p-3 ${toneMap[tone]}`}
    >
      <p className='text-xs uppercase tracking-wide font-semibold'>{label}</p>
      <p className='text-lg font-bold mt-1'>{value}</p>
    </div>
  )
}

export default QuotationBuilderPage
