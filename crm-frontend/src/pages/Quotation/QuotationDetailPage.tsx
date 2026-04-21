import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCheck,
  FaEnvelope,
  FaEye,
  FaFilePdf,
  FaPaperPlane,
  FaPencil,
  FaPlus,
  FaXmark,
  FaClockRotateLeft
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import { quotationsApi } from '../../api'
import { reportApiError, notify } from '../../lib/notify'
import { validateQuoteTransition } from '../../utils/workflowValidation'
import PdfTemplate from './PdfTemplate'

type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'APPROVED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'PENDING'

type TabId = 'components' | 'versions' | 'logs'

type ComponentRow = {
  id: string
  itemType: 'HOTEL' | 'FLIGHT' | 'TRANSFER' | 'VISA' | 'INSURANCE' | 'OTHER'
  description: string
  cost: number
}

type VersionRow = {
  id: string
  version: number
  createdAt: string
  createdBy: string
  changes: string
}

type SendLogRow = {
  id: string
  sentAt: string
  sentTo: string
  method: 'email' | 'whatsapp' | 'manual'
  viewedAt?: string
  viewCount: number
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'components', label: 'Components' },
  { id: 'versions', label: 'Versions' },
  { id: 'logs', label: 'Send Logs' }
]

function unwrapData<T> (response: unknown): T | null {
  if (!response) return null
  if (typeof response === 'object' && response && 'data' in response) {
    return (response as { data: T }).data ?? null
  }
  return response as T
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const formatDate = (value?: string | null) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatMoney = (amount: number, currency = 'INR') => {
  const normalized = String(currency || 'INR').toUpperCase()
  try {
    return new Intl.NumberFormat(normalized === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(toNumber(amount, 0))
  } catch (_error) {
    return `${toNumber(amount, 0).toLocaleString()} ${normalized}`
  }
}

const formatDurationLabel = (duration: unknown, fallbackNights: number) => {
  const raw = String(duration ?? '').trim()
  if (raw) return raw

  const nights = Math.max(0, Number(fallbackNights) || 0)
  if (!nights) return ''

  return `${nights}N/${nights + 1}D`
}

const pluralize = (value: number, singular: string, plural = `${singular}s`) =>
  `${value} ${value === 1 ? singular : plural}`

const formatDateOnly = (value?: string | null) => {
  if (!value) return 'N/A'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return String(value)
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  })
}

const mapStatus = (value?: string): QuoteStatus => {
  switch (String(value || '').toUpperCase()) {
    case 'DRAFT':
      return 'DRAFT'
    case 'SENT':
      return 'SENT'
    case 'VIEWED':
      return 'VIEWED'
    case 'APPROVED':
      return 'APPROVED'
    case 'REJECTED':
      return 'REJECTED'
    case 'EXPIRED':
      return 'EXPIRED'
    default:
      return 'PENDING'
  }
}

const toTs = (value?: string | null) => {
  if (!value) return 0
  const ts = new Date(value).getTime()
  return Number.isFinite(ts) ? ts : 0
}

const mapChannel = (value?: string): 'email' | 'whatsapp' | 'manual' => {
  const channel = String(value || '').toUpperCase()
  if (channel === 'WHATSAPP') return 'whatsapp'
  if (channel === 'EMAIL') return 'email'
  return 'manual'
}

const extractImportantNoteValue = (notes: unknown, label: string): string | null => {
  const raw = String(notes ?? '')
  if (!raw.trim()) return null
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`^${escapedLabel}:\\s*(.+)$`, 'mi')
  const match = raw.match(pattern)
  const value = match?.[1]?.trim() ?? ''
  return value || null
}

const QuotationDetailPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [quotation, setQuotation] = useState<any | null>(null)
  const [rows, setRows] = useState<ComponentRow[]>([])
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [logs, setLogs] = useState<SendLogRow[]>([])

  const [activeTab, setActiveTab] = useState<TabId>('components')
  const [status, setStatus] = useState<QuoteStatus>('PENDING')
  const [savingStatus, setSavingStatus] = useState(false)
  const [showSendDropdown, setShowSendDropdown] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState('')
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const pdfExportRef = useRef<HTMLDivElement | null>(null)
  const pdfTemplateRef = useRef<HTMLDivElement | null>(null)

  const loadDetails = useCallback(async () => {
    if (!id) {
      setLoading(false)
      return null
    }

    setLoading(true)
    setError('')

    try {
      const [quoteRes, versionsRes, logsRes, viewsRes] =
        await Promise.allSettled([
          quotationsApi.getById(id),
          quotationsApi.versions(id),
          quotationsApi.sendLogs(id),
          quotationsApi.views(id)
        ])

      if (quoteRes.status !== 'fulfilled') {
        throw quoteRes.reason
      }

      const quoteData = unwrapData<any>(quoteRes.value)
      if (!quoteData) {
        throw new Error('Quotation not found')
      }

      setQuotation(quoteData)
      setStatus(mapStatus(quoteData.status))

      const snapshotServiceRows = Array.isArray(
        quoteData.templateSnapshot?.serviceRows
      )
        ? quoteData.templateSnapshot.serviceRows
        : Array.isArray(quoteData.templateSnapshot?.builderSnapshot?.serviceRows)
          ? quoteData.templateSnapshot.builderSnapshot.serviceRows
          : []

      const itemRows = Array.isArray(quoteData.items) && quoteData.items.length
        ? quoteData.items.map((item: any) => ({
            id: String(item.id ?? `${item.itemType}-${item.description}`),
            itemType: (item.itemType || 'OTHER') as ComponentRow['itemType'],
            description: String(item.description || 'N/A'),
            cost: toNumber(item.cost, 0)
          }))
        : snapshotServiceRows.map((item: any, index: number) => ({
            id: String(item.id ?? `${item.key ?? index}`),
            itemType: (item.itemType || 'OTHER') as ComponentRow['itemType'],
            description: String(
              item.description ??
                `${item.label ?? item.key ?? 'Service'} - ${
                  quoteData.tripDestination ??
                  quoteData.templateSnapshot?.destination ??
                  'N/A'
                }`
            ),
            cost: toNumber(item.baseCost ?? item.cost, 0)
          }))
      setRows(itemRows)

      const versionRowsRaw =
        versionsRes.status === 'fulfilled'
          ? unwrapData<any[]>(versionsRes.value) ?? []
          : []
      const mappedVersions: VersionRow[] = (
        Array.isArray(versionRowsRaw) ? versionRowsRaw : []
      ).map((row, index) => ({
        id: String(row.id ?? index),
        version: Number(row.versionNumber ?? row.version ?? index + 1),
        createdAt: String(row.createdAt ?? row.created_at ?? ''),
        createdBy: row.editorId
          ? `User ${String(row.editorId).slice(0, 8)}`
          : 'System',
        changes: String(row.action || 'Updated')
      }))
      setVersions(mappedVersions)

      const sendLogsRaw =
        logsRes.status === 'fulfilled'
          ? unwrapData<any[]>(logsRes.value) ?? []
          : []
      const viewRows =
        viewsRes.status === 'fulfilled'
          ? unwrapData<any[]>(viewsRes.value) ?? []
          : []

      const mappedLogs: SendLogRow[] = (
        Array.isArray(sendLogsRaw) ? sendLogsRaw : []
      ).map((log, index) => {
        const sentAt = String(log.sentAt ?? log.sent_at ?? '')
        const sentTs = toTs(sentAt)
        const matchingViews = (Array.isArray(viewRows) ? viewRows : []).filter(
          view => {
            const viewedTs = toTs(view.viewedAt ?? view.viewed_at)
            return sentTs ? viewedTs >= sentTs : viewedTs > 0
          }
        )
        const lastViewedAt = matchingViews
          .map(view => String(view.viewedAt ?? view.viewed_at ?? ''))
          .filter(Boolean)
          .sort((a, b) => toTs(b) - toTs(a))[0]

        return {
          id: String(log.id ?? index),
          sentAt,
          sentTo: String(
            log.recipientEmail ??
              log.recipient_email ??
              log.recipientPhone ??
              log.recipient_phone ??
              'N/A'
          ),
          method: mapChannel(log.deliveryChannel ?? log.delivery_channel),
          viewedAt: lastViewedAt,
          viewCount: matchingViews.length
        }
      })

      setLogs(mappedLogs)
      return quoteData
    } catch (err) {
      console.error('Failed to load quotation detail:', err)
      reportApiError(err, 'Failed to load quotation details', setError)
      setQuotation(null)
      setRows([])
      setVersions([])
      setLogs([])
      return null
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadDetails()
  }, [loadDetails])

  const lead = quotation?.lead ?? quotation?.relations?.lead ?? null
  const snapshot = quotation?.templateSnapshot ?? null
  const snapshotBuilder = snapshot?.builderSnapshot ?? null
  const snapshotLead = snapshot?.lead ?? snapshot?.builderSnapshot?.lead ?? null
  const snapshotPricing = snapshot?.pricing ?? snapshotBuilder?.pricing ?? null
  const packageSnapshot =
    snapshot?.package ?? snapshot?.builderSnapshot?.package ?? null
  const destination =
    quotation?.destination ??
    quotation?.relations?.destination ??
    quotation?.lead?.destination ??
    null
  const template = quotation?.template ?? quotation?.relations?.template ?? null
  // const pricing = quotation?.pricing ?? quotation?.relations?.pricing ?? null
  // const booking = quotation?.booking ?? quotation?.relations?.booking ?? null
  const createdByUser =
    quotation?.createdByUser ?? quotation?.relations?.createdByUser ?? null
  const approvedByUser =
    quotation?.approvedByUser ?? quotation?.relations?.approvedByUser ?? null
  const sentByUser =
    quotation?.sentByUser ?? quotation?.relations?.sentByUser ?? null
  const contentTemplate = {
    ...(template ?? {}),
    ...(quotation?.templateSnapshot ?? {}),
    inclusions:
      quotation?.inclusions ??
      quotation?.templateSnapshot?.inclusions ??
      template?.inclusions ??
      null,
    exclusions:
      quotation?.exclusions ??
      quotation?.templateSnapshot?.exclusions ??
      template?.exclusions ??
      null,
    hotelDetails:
      quotation?.hotelDetails ??
      quotation?.templateSnapshot?.hotelDetails ??
      null,
    visaDetails:
      quotation?.visaDetails ??
      quotation?.templateSnapshot?.visaDetails ??
      null,
    paymentTerms:
      quotation?.paymentTerms ??
      quotation?.templateSnapshot?.paymentTerms ??
      template?.paymentTerms ??
      null,
    cancellationPolicy:
      quotation?.cancellationPolicy ??
      quotation?.templateSnapshot?.cancellationPolicy ??
      template?.cancellationPolicy ??
      null
  }
  const displayCustomerName =
    snapshot?.customerName ??
    snapshotLead?.fullName ??
    snapshotLead?.name ??
    lead?.fullName ??
    'N/A'
  const displayCustomerEmail =
    snapshot?.customerEmail ?? snapshotLead?.email ?? lead?.email ?? 'N/A'
  const displayCustomerPhone = snapshotLead?.phone ?? lead?.phone ?? 'N/A'
  const notedQuotationTitle = extractImportantNoteValue(
    quotation?.importantNotes,
    'Quotation Title'
  )
  const displayQuotationTitle =
    quotation?.quotationTitle ??
    snapshot?.quotationTitle ??
    snapshotBuilder?.quotationTitle ??
    packageSnapshot?.name ??
    packageSnapshot?.title ??
    notedQuotationTitle ??
    'Manual Quotation'
  const displayDestinationName =
    quotation?.tripDestination ??
    snapshot?.destination ??
    snapshotBuilder?.destination ??
    destination?.name ??
    snapshotLead?.destination ??
    lead?.destinationName ??
    'N/A'
  const displayDestinationCountry = destination?.country || 'N/A'
  const displayPackageName =
    packageSnapshot?.name ?? packageSnapshot?.title ?? null
  const displayTemplateName =
    quotation?.templateSnapshot?.name ??
    template?.name ??
    'Manual (No Template)'
  const displayTemplateCode =
    quotation?.templateSnapshot?.code ?? template?.code ?? 'CUSTOM'
  const displayPackageKind = String(
    packageSnapshot?.kind ??
      packageSnapshot?.packageKind ??
      snapshot?.packageType ??
      ''
  )
    .trim()
    .replace(/_/g, ' ')
  const displayDuration =
    quotation?.durationLabel ??
    snapshot?.durationLabel ??
    snapshotBuilder?.durationLabel ??
    (formatDurationLabel(
      packageSnapshot?.duration,
      toNumber(
        quotation?.durationNights ??
          snapshot?.durationNights ??
          snapshot?.nights,
        0
      )
    ) ||
      'N/A')
  const displayAdultsCount = Math.max(
    0,
    toNumber(
      snapshot?.adults ??
        snapshotBuilder?.adults ??
        lead?.adultsCount ??
        lead?.adults_count,
      0
    )
  )
  const displayChildrenCount = Math.max(
    0,
    toNumber(
      snapshot?.children ??
        snapshotBuilder?.children ??
        lead?.childrenCount ??
        lead?.children_count,
      0
    )
  )
  const displayChildAges = (
    snapshot?.childAges ??
    snapshotBuilder?.childAges ??
    lead?.childAges ??
    []
  )
    .map((value: unknown) => Number(value))
    .filter((value: number) => Number.isFinite(value) && value >= 0)

  const displayTravellerSummary = [
    pluralize(displayAdultsCount, 'adult'),
    displayChildrenCount > 0
      ? pluralize(displayChildrenCount, 'child', 'children')
      : null,
    displayChildAges.length ? `Ages ${displayChildAges.join(', ')}` : null
  ]
    .filter(Boolean)
    .join(', ')

  const displayTravelStartDate =
    snapshot?.travelStartDate ??
    snapshotBuilder?.travelStartDate ??
    quotation?.travelStartDate ??
    lead?.travelDate ??
    null
  const displayTravelEndDate =
    snapshot?.travelEndDate ??
    snapshotBuilder?.travelEndDate ??
    quotation?.travelEndDate ??
    lead?.travelEndDate ??
    null
  const displayValidUntil =
    snapshot?.validUntil ??
    snapshotBuilder?.validUntil ??
    quotation?.expiresAt ??
    null
  const itineraryItems = useMemo(() => {
    const raw = quotation?.itinerary ?? snapshot?.itineraryItems ?? []
    if (!Array.isArray(raw)) return []

    return raw
      .map((item: any, index: number) => ({
        id: String(item?.id ?? index),
        day: String(item?.day ?? `Day ${index + 1}`),
        title: String(item?.title ?? ''),
        description: String(item?.description ?? '')
      }))
      .filter(item => item.day || item.title || item.description)
  }, [quotation?.itinerary, snapshot?.itineraryItems])

  const noteSections = useMemo(() => {
    const raw = String(quotation?.importantNotes || '').trim()
    if (!raw) return []
    return raw
      .split(/\n{2,}/)
      .map(block => block.trim())
      .filter(Boolean)
      .map((block, index) => {
        const lines = block.split('\n')
        const first = lines[0]?.trim() || ''
        if (first.endsWith(':')) {
          return {
            id: `${index}-${first}`,
            title: first.slice(0, -1),
            content: lines.slice(1).join('\n').trim() || '-'
          }
        }
        return {
          id: `${index}-Notes`,
          title: 'Notes',
          content: block
        }
      })
      .filter(section => {
        const titleLower = section.title.toLowerCase()
        return titleLower === 'trip summary' || titleLower === 'enabled services'
      })
  }, [quotation?.importantNotes])

  const displayCurrency = useMemo(() => {
    const value =
      quotation?.clientCurrency ??
      quotation?.costCurrency ??
      snapshot?.currency ??
      snapshotBuilder?.currency ??
      snapshotPricing?.clientCurrency ??
      snapshotPricing?.costCurrency ??
      quotation?.pricing?.clientCurrency ??
      quotation?.pricing?.costCurrency ??
      'INR'
    return String(value || 'INR').toUpperCase()
  }, [quotation, snapshot, snapshotBuilder, snapshotPricing])

  const summary = useMemo(() => {
    const totalCost =
      toNumber(quotation?.totalCost, NaN) ||
      toNumber(snapshotPricing?.supplierCost, NaN) ||
      rows.reduce((sum, row) => sum + toNumber(row.cost, 0), 0)
    const persistedMarginPercent =
      toNumber(quotation?.marginPercent, NaN) ||
      toNumber(snapshotPricing?.margin, NaN)
    const markupAmount = Number.isFinite(toNumber(quotation?.markupAmount, NaN))
      ? toNumber(quotation?.markupAmount, 0)
      : Number.isFinite(toNumber(snapshotPricing?.profit, NaN))
        ? toNumber(snapshotPricing?.profit, 0)
      : Number(
          (
            totalCost *
            (Number.isFinite(persistedMarginPercent) ? persistedMarginPercent : 0)
          ).toFixed(2)
        )
    const derivedMarginPercent =
      totalCost > 0
        ? Number(((markupAmount / totalCost) * 100).toFixed(2))
        : 0
    const marginPercent =
      Number.isFinite(persistedMarginPercent) && persistedMarginPercent > 0
        ? persistedMarginPercent
        : derivedMarginPercent
    const discount = toNumber(quotation?.discount ?? snapshotPricing?.discount, 0)
    const taxAmount = toNumber(
      quotation?.taxAmount ?? quotation?.tax ?? snapshotPricing?.taxAmount,
      0
    )
    const finalPrice = toNumber(
      quotation?.finalPrice ??
        quotation?.totalSaleValue ??
        snapshotPricing?.totalPrice,
      totalCost - discount + taxAmount
    )

    return { totalCost, marginPercent, markupAmount, discount, taxAmount, finalPrice }
  }, [quotation, rows, snapshotPricing])

  const commercial = useMemo(() => {
    const supplierCost =
      toNumber(quotation?.supplierCost, NaN) ||
      toNumber(snapshotPricing?.supplierCost, NaN) ||
      rows.reduce((sum, row) => sum + toNumber(row.cost, 0), 0)
    const markupAmount =
      toNumber(quotation?.markupAmount, NaN) ||
      toNumber(snapshotPricing?.profit, NaN) ||
      supplierCost *
        (toNumber(quotation?.marginPercent ?? snapshotPricing?.margin, 0) / 100)
    const serviceFeeAmount = toNumber(
      quotation?.serviceFeeAmount ?? snapshotPricing?.serviceFee,
      0
    )
    const persistedTotalTax = toNumber(
      quotation?.taxAmount ?? quotation?.tax ?? snapshotPricing?.taxAmount,
      NaN
    )
    const supplierTaxAmount = toNumber(quotation?.supplierTaxAmount, 0)
    const supplierTaxPercent = toNumber(
      quotation?.supplierTaxPercent ?? snapshotPricing?.supplierTaxPercent,
      0
    )
    const gstAmount = toNumber(quotation?.gstAmount, 0)
    const gstPercent = toNumber(
      quotation?.gstPercent ?? snapshotPricing?.gstPercent,
      0
    )
    const tcsAmount = toNumber(quotation?.tcsAmount, 0)
    const tcsPercent = toNumber(
      quotation?.tcsPercent ?? snapshotPricing?.tcsPercent,
      0
    )
    const computedTaxAmount = Number(
      (supplierTaxAmount + gstAmount + tcsAmount).toFixed(2)
    )
    const taxAmount = Number.isFinite(persistedTotalTax)
      ? persistedTotalTax
      : computedTaxAmount
    const discount = toNumber(quotation?.discount, 0)
    const subtotal = supplierCost + markupAmount + serviceFeeAmount
    const taxableBase = Math.max(subtotal - discount, 0)
    const effectiveTaxPercent =
      taxableBase > 0 ? Number(((taxAmount / taxableBase) * 100).toFixed(2)) : 0
    const finalAmount = toNumber(
      quotation?.totalSaleValue ??
        quotation?.finalPrice ??
        snapshotPricing?.totalPrice,
      Math.max(subtotal + taxAmount - discount, 0)
    )
    const rawMarginPercent = toNumber(
      quotation?.marginPercent ?? snapshotPricing?.margin,
      NaN
    )
    const derivedMarginPercent =
      supplierCost > 0
        ? Number(((markupAmount / supplierCost) * 100).toFixed(2))
        : 0

    return {
      supplierCost,
      markupAmount,
      serviceFeeAmount,
      persistedTotalTax: Number.isFinite(persistedTotalTax)
        ? persistedTotalTax
        : null,
      supplierTaxAmount,
      supplierTaxPercent,
      gstAmount,
      gstPercent,
      tcsAmount,
      tcsPercent,
      taxAmount,
      taxableBase,
      effectiveTaxPercent,
      discount,
      subtotal,
      finalAmount,
      marginPercent:
        Number.isFinite(rawMarginPercent) && rawMarginPercent > 0
          ? rawMarginPercent
          : derivedMarginPercent
    }
  }, [quotation, rows, snapshotPricing])

  const handleApprove = async () => {
    if (!id) return
    setSavingStatus(true)
    setError('')
    try {
      const res = await quotationsApi.changeStatus(id, { status: 'APPROVED' })
      const payload = unwrapData<any>(res)
      if (payload?.status) {
        setStatus(mapStatus(payload.status))
      } else {
        setStatus('APPROVED')
      }
      const latest = await loadDetails()
      if (latest && mapStatus(latest.status) !== 'APPROVED') {
        setError(
          'Approval did not save. Approve margin first if required, then retry.'
        )
      }
    } catch (err) {
      console.error('Failed to approve quotation:', err)
      reportApiError(err, 'Failed to approve quotation', setError)
    } finally {
      setSavingStatus(false)
    }
  }

  const handleRejectConfirm = async () => {
    if (!id) return
    const validationError = validateQuoteTransition(
      'REJECTED',
      rejectReason || ''
    )
    if (validationError) {
      setRejectError(validationError)
      return
    }

    setSavingStatus(true)
    setError('')
    try {
      await quotationsApi.changeStatus(id, {
        status: 'REJECTED',
        reason: rejectReason
      })
      setStatus('REJECTED')
      setShowRejectModal(false)
      setRejectReason('')
      setRejectError('')
      await loadDetails()
    } catch (err) {
      console.error('Failed to reject quotation:', err)
      reportApiError(err, 'Failed to reject quotation', setRejectError)
    } finally {
      setSavingStatus(false)
    }
  }

  const handleSend = async (method: 'email' | 'whatsapp') => {
    if (!id) return

    const recipientEmail =
      snapshot?.customerEmail ?? snapshotLead?.email ?? lead?.email ?? ''
    const recipientPhone = snapshotLead?.phone ?? lead?.phone ?? ''

    if (method === 'email' && !recipientEmail) {
      setError('Lead email is missing. Cannot send quotation by email.')
      setShowSendDropdown(false)
      return
    }

    if (method === 'whatsapp' && !recipientPhone) {
      setError('Lead phone is missing. Cannot send quotation by WhatsApp.')
      setShowSendDropdown(false)
      return
    }

    setSavingStatus(true)
    setError('')
    try {
      // Generate PDF using the React template
      if (!pdfTemplateRef.current) {
        throw new Error('PDF template not available')
      }

      const element = pdfTemplateRef.current
      element.style.display = 'block'
      element.style.position = 'fixed'
      element.style.top = '-9999px'
      element.style.left = '-9999px'
      element.style.width = '794px'
      element.style.zIndex = '-9999'

      await new Promise(resolve => setTimeout(resolve, 500))

      // Import html2canvas and jsPDF
      const html2canvasModule = await import(
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm'
      )
      const html2canvas = (html2canvasModule as any).default

      const jsPdfModule = await import(
        'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm'
      )
      const JsPDF = (jsPdfModule as any).default

      // Render to canvas
      const pdf = new JsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pages = Array.from(
        element.querySelectorAll('.pdf-page')
      ) as HTMLElement[]
      const targets = pages.length ? pages : [element]
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 10
      const availableWidth = pageWidth - margin * 2

      for (let idx = 0; idx < targets.length; idx += 1) {
        const node = targets[idx]
        const canvas = await html2canvas(node, {
          // Keep file size manageable for uploads.
          scale: 1.25,
          useCORS: true,
          backgroundColor: '#ffffff',
          allowTaint: true,
          letterRendering: true
        })
        const imgData = canvas.toDataURL('image/jpeg', 0.78)
        const imgWidth = availableWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        if (idx > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight)
      }

      // Convert PDF to blob and send
      const pdfBlob = pdf.output('blob')
      const formData = new FormData()
      formData.append('quotationId', id)
      formData.append('pdf', pdfBlob, `quotation-${quotation?.quoteNumber || id}.pdf`)

      // Get auth token from localStorage
      const token = localStorage.getItem('auth_token')

      // Upload PDF to backend via proxy
      const uploadRes = await fetch(`/api/quotations/${id}/upload-pdf`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!uploadRes.ok) {
        throw new Error('Failed to upload PDF')
      }

      const uploadData = await uploadRes.json()
      const pdfUrl = uploadData.pdfUrl

      // Send quotation with PDF link
      await quotationsApi.send(id, {
        channel: method === 'email' ? 'EMAIL' : 'WHATSAPP',
        ...(method === 'email' ? { recipientEmail } : { recipientPhone }),
        pdfUrl: pdfUrl
      })

      setShowSendDropdown(false)
      setError('')
      const methodName = method === 'email' ? 'Email' : 'WhatsApp'
      notify.success(`Quotation sent successfully via ${methodName}!`)
      console.log('Quotation sent successfully via ' + method)
    } catch (err) {
      console.error('Failed to send quotation:', err)
      reportApiError(err, 'Failed to send quotation', setError)
    } finally {
      // Restore element
      if (pdfTemplateRef.current) {
        pdfTemplateRef.current.style.display = 'none'
        pdfTemplateRef.current.style.position = 'absolute'
        pdfTemplateRef.current.style.top = '-9999px'
      }
      setSavingStatus(false)
    }
  }

  const handleDownloadPdf = async () => {
    if (!pdfTemplateRef.current || downloadingPdf) return

    const element = pdfTemplateRef.current
    setDownloadingPdf(true)

    try {
      // Show element temporarily for rendering
      element.style.display = 'block'
      element.style.position = 'fixed'
      element.style.top = '-9999px'
      element.style.left = '-9999px'
      element.style.width = '794px'
      element.style.zIndex = '-9999'

      await new Promise(resolve => setTimeout(resolve, 500))

      // Import html2canvas and jsPDF
      const html2canvasModule = await import(
        'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm'
      )
      const html2canvas = (html2canvasModule as any).default

      const jsPdfModule = await import(
        'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/+esm'
      )
      const JsPDF = (jsPdfModule as any).default

      // Render to canvas
      const pdf = new JsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      })

      const pages = Array.from(
        element.querySelectorAll('.pdf-page')
      ) as HTMLElement[]
      const targets = pages.length ? pages : [element]
      const pageWidth = pdf.internal.pageSize.getWidth()
      const margin = 10
      const availableWidth = pageWidth - margin * 2

      for (let idx = 0; idx < targets.length; idx += 1) {
        const node = targets[idx]
        const canvas = await html2canvas(node, {
          // Keep file size manageable for downloads too.
          scale: 1.25,
          useCORS: true,
          backgroundColor: '#ffffff',
          allowTaint: true,
          letterRendering: true
        })
        const imgData = canvas.toDataURL('image/jpeg', 0.78)
        const imgWidth = availableWidth
        const imgHeight = (canvas.height * imgWidth) / canvas.width

        if (idx > 0) pdf.addPage()
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight)
      }

      // Save PDF
      const quoteRef = quotation?.quoteNumber ?? quotation?.id ?? 'quotation'
      pdf.save(`quotation-${quoteRef}.pdf`)
    } catch (err) {
      console.error('PDF Download Error:', err)
      const errorMsg = err instanceof Error ? err.message : String(err)
      reportApiError(
        new Error(`PDF Generation Failed: ${errorMsg}`),
        'Failed to download PDF - Check console for details',
        setError
      )
    } finally {
      // Restore element
      if (element) {
        element.style.display = 'none'
        element.style.position = 'absolute'
        element.style.top = '-9999px'
      }
      setDownloadingPdf(false)
    }
  }

  const isApproved = status === 'APPROVED'
  const isRejected = status === 'REJECTED'
  const canEditQuotation = status !== 'APPROVED'

  if (!id) {
    return (
      <EmptyState
        title='Quotation ID missing'
        description='Open this page from quotation list with a valid quotation ID.'
        icon={<FaFilePdf className='text-4xl' />}
      />
    )
  }

  if (loading) {
    return (
      <div className='p-4 text-sm text-gray-500'>
        Loading quotation details...
      </div>
    )
  }

  if (!quotation) {
    return (
      <EmptyState
        title='Quotation not found'
        description={error || 'No quotation found for this ID.'}
        icon={<FaFilePdf className='text-4xl' />}
      />
    )
  }

  return (
    <div className='space-y-4 sm:space-y-6 px-0 sm:px-0'>
      <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4'>
        <div>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center gap-3'>
              <button
                onClick={() => navigate('/quotations')}
                className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
                aria-label='Back to quotations'
                title='Back to Quotations'
              >
                <FaArrowLeft className='text-sm' />
              </button>
              <h1 className='text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100'>
                {((displayCustomerName || '').trim() || 'Customer Quotation') +
                  ` (#${quotation.quoteNumber ?? quotation.id ?? 'N/A'})`}
              </h1>
            </div>
          </div>
          <div className='flex items-center gap-2 mt-1'>
            <p className='text-xs sm:text-sm text-gray-500'>
              Created {formatDate(quotation.createdAt)}
            </p>
            <span className='text-gray-300'>-</span>
            <p className='text-xs sm:text-sm text-gray-500'>
              Last sent {formatDate(quotation.sentAt)}
            </p>
          </div>
          {error ? <p className='mt-2 text-sm text-red-600'>{error}</p> : null}

          {quotation.requiresApproval && quotation.status === 'DRAFT' ? (
            <div className='mt-3 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-700 dark:bg-amber-900/30'>
              <div className='flex-1'>
                <p className='text-sm font-medium text-amber-800 dark:text-amber-200'>
                  Margin below template minimum — Department Head approval
                  required before sending.
                </p>
                <p className='mt-0.5 text-xs text-amber-600 dark:text-amber-400'>
                  Margin: {quotation.marginPercent ?? 0}% (min:{' '}
                  {quotation.minMarginPercent ?? 0}%)
                </p>
              </div>
              <button
                onClick={async () => {
                  try {
                    setSavingStatus(true)
                    await quotationsApi.approveMargin(id!)
                    await loadDetails()
                  } catch (err) {
                    reportApiError(err, 'Failed to approve margin', setError)
                  } finally {
                    setSavingStatus(false)
                  }
                }}
                disabled={savingStatus}
                className='shrink-0 rounded-lg bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60'
              >
                Approve Margin
              </button>
            </div>
          ) : null}
        </div>

        <div className='flex flex-nowrap items-center gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible'>
          {canEditQuotation ? (
            <button
              onClick={() => navigate(`/quotations/${id}/edit`)}
              className='h-9 px-4 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors inline-flex items-center whitespace-nowrap shrink-0'
            >
              <FaPencil className='mr-2' /> Edit
            </button>
          ) : null}
          <button
            onClick={() => void handleDownloadPdf()}
            disabled={downloadingPdf}
            className='h-9 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center whitespace-nowrap shrink-0 disabled:opacity-60'
          >
            <FaFilePdf className='mr-2' /> PDF
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className='h-9 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors inline-flex items-center whitespace-nowrap shrink-0'
          >
            <FaEye className='mr-2' /> Preview
          </button>
        </div>
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4'>
        <SurfaceCard className='p-3 sm:p-4'>
          <p className='text-xs uppercase tracking-wide text-gray-500 truncate'>
            Total Cost
          </p>
          <p className='text-lg sm:text-xl font-bold mt-1 text-gray-900 dark:text-gray-100 truncate' title={formatMoney(summary.totalCost, displayCurrency)}>
            {formatMoney(summary.totalCost, displayCurrency)}
          </p>
        </SurfaceCard>
        <SurfaceCard className='p-3 sm:p-4'>
          <p className='text-xs uppercase tracking-wide text-gray-500 truncate'>
            Markup
          </p>
          <p className='text-lg sm:text-xl font-bold mt-1 text-gray-900 dark:text-gray-100 truncate' title={summary.marginPercent > 0 ? `${summary.marginPercent}%` : formatMoney(summary.markupAmount, displayCurrency)}>
            {summary.marginPercent > 0
              ? `${summary.marginPercent}%`
              : formatMoney(summary.markupAmount, displayCurrency)}
          </p>
          {summary.marginPercent > 0 ? (
            <p className='text-xs mt-1 text-gray-500 truncate' title={formatMoney(summary.markupAmount, displayCurrency)}>
              {formatMoney(summary.markupAmount, displayCurrency)}
            </p>
          ) : null}
        </SurfaceCard>
        <SurfaceCard className='p-3 sm:p-4'>
          <p className='text-xs uppercase tracking-wide text-gray-500 truncate'>
            Discount
          </p>
          <p className='text-lg sm:text-xl font-bold mt-1 text-gray-900 dark:text-gray-100 truncate' title={formatMoney(summary.discount, displayCurrency)}>
            {formatMoney(summary.discount, displayCurrency)}
          </p>
        </SurfaceCard>
        <SurfaceCard className='p-3 sm:p-4'>
          <p className='text-xs uppercase tracking-wide text-gray-500 truncate'>
            Service Fee
          </p>
          <p className='text-lg sm:text-xl font-bold mt-1 text-gray-900 dark:text-gray-100 truncate' title={formatMoney(commercial.serviceFeeAmount, displayCurrency)}>
            {formatMoney(commercial.serviceFeeAmount, displayCurrency)}
          </p>
        </SurfaceCard>
        <SurfaceCard className='p-3 sm:p-4'>
          <p className='text-xs uppercase tracking-wide text-gray-500 truncate'>
            Tax
          </p>
          <p className='text-lg sm:text-xl font-bold mt-1 text-gray-900 dark:text-gray-100 truncate' title={formatMoney(commercial.taxAmount, displayCurrency)}>
            {formatMoney(commercial.taxAmount, displayCurrency)}
          </p>
        </SurfaceCard>
        <SurfaceCard className='p-3 sm:p-4'>
          <p className='text-xs uppercase tracking-wide text-gray-500 truncate'>
            Final Price
          </p>
          <p className='text-lg sm:text-xl font-bold mt-1 text-blue-600 dark:text-blue-400 truncate' title={formatMoney(summary.finalPrice, displayCurrency)}>
            {formatMoney(summary.finalPrice, displayCurrency)}
          </p>
        </SurfaceCard>
      </div>

      <div className='relative grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]'>
        {/* Left Column - Scrollable */}
        <div ref={pdfExportRef} className='space-y-4 sm:space-y-6 overflow-y-auto max-h-[calc(100vh-200px)] pr-2 scrollbar-hide'>
          <SurfaceCard className='p-4 sm:p-5'>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4'>
              Lead Details
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              <div>
                <p className='text-xs uppercase tracking-wide text-gray-500'>
                  Customer
                </p>
                <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  {displayCustomerName}
                </p>
                <p className='text-xs text-gray-500'>{displayCustomerEmail}</p>
                <p className='text-xs text-gray-500'>{displayCustomerPhone}</p>
              </div>

              <div>
                <p className='text-xs uppercase tracking-wide text-gray-500'>
                  Destination
                </p>
                <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  {displayDestinationName}
                </p>
                <p className='text-xs text-gray-500'>
                  {displayDestinationCountry}
                </p>
              </div>

              <div>
                <p className='text-xs uppercase tracking-wide text-gray-500'>
                  Travel Plan
                </p>
                <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  {displayDuration}
                </p>
                <p className='text-xs text-gray-500'>{displayTravellerSummary}</p>
                <p className='text-xs text-gray-500'>
                  Travel Date {formatDateOnly(displayTravelStartDate)}
                  {displayTravelEndDate
                    ? ` to ${formatDateOnly(displayTravelEndDate)}`
                    : ''}
                </p>
                <p className='text-xs text-gray-500'>
                  Valid Until {formatDate(displayValidUntil)}
                </p>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className='p-4 sm:p-5'>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4'>
              Package & Template Details
            </h2>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            <div>
              <p className='text-xs uppercase tracking-wide text-gray-500'>
                Quotation Title
              </p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {displayQuotationTitle}
              </p>
              <p className='text-xs text-gray-500'>
                {displayPackageName
                  ? `Source Package: ${displayPackageName}`
                  : 'Manually authored in quotation'}
              </p>
              <p className='text-xs text-gray-500'>
                {displayPackageKind || 'Quotation-owned trip content'}
              </p>
            </div>

            <div>
              <p className='text-xs uppercase tracking-wide text-gray-500'>
                Template
              </p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {displayTemplateName}
              </p>
              <p className='text-xs text-gray-500'>
                {displayTemplateCode}
              </p>
            </div>

            <div>
              <p className='text-xs uppercase tracking-wide text-gray-500'>
                Created By
              </p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {createdByUser?.fullName || quotation.createdBy || 'N/A'}
              </p>
              <p className='text-xs text-gray-500'>
                {createdByUser?.email || 'N/A'}
              </p>
            </div>

            <div>
              <p className='text-xs uppercase tracking-wide text-gray-500'>
                Approved By
              </p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {approvedByUser?.fullName || quotation.approvedBy || 'N/A'}
              </p>
              <p className='text-xs text-gray-500'>
                {formatDate(quotation.approvedAt)}
              </p>
            </div>

            <div>
              <p className='text-xs uppercase tracking-wide text-gray-500'>
                Sent By
              </p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {sentByUser?.fullName || quotation.sentBy || 'N/A'}
              </p>
              <p className='text-xs text-gray-500'>
                {formatDate(quotation.sentAt)}
              </p>
            </div>

            <div>
              <p className='text-xs uppercase tracking-wide text-gray-500'>
                View Count
              </p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {toNumber(quotation.viewCount, 0)}
              </p>
              <p className='text-xs text-gray-500'>
                Last viewed {formatDate(quotation.lastViewedAt)}
              </p>
            </div>
          </div>
          </SurfaceCard>

          <SurfaceCard className='p-4 sm:p-5'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500'>
              Commercial Breakdown
            </h2>
            <span className='rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700'>
              Currency: {displayCurrency}
            </span>
          </div>
          <div className='mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4'>
            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
              <p className='text-xs text-gray-500'>Supplier Cost</p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {formatMoney(commercial.supplierCost, displayCurrency)}
              </p>
            </div>
            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
              <p className='text-xs text-gray-500'>
                Markup ({commercial.marginPercent}%)
              </p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {formatMoney(commercial.markupAmount, displayCurrency)}
              </p>
            </div>
            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
              <p className='text-xs text-gray-500'>Service Fee</p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {formatMoney(commercial.serviceFeeAmount, displayCurrency)}
              </p>
            </div>
            <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
              <p className='text-xs text-gray-500'>Tax (Client Bill)</p>
              <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                {formatMoney(commercial.taxAmount, displayCurrency)}
              </p>
              <p className='mt-1 text-[11px] text-gray-500'>
                {commercial.effectiveTaxPercent}% on{' '}
                {formatMoney(commercial.taxableBase, displayCurrency)}
              </p>
              {commercial.persistedTotalTax !== null ? (
                <p className='text-[11px] text-gray-500'>
                  Source: quotation tax total
                </p>
              ) : null}
              {commercial.gstAmount > 0 ? (
                <p className='text-[11px] text-gray-500'>
                  GST (Government Tax, {commercial.gstPercent}%):{' '}
                  {formatMoney(commercial.gstAmount, displayCurrency)}
                </p>
              ) : null}
              {commercial.tcsAmount > 0 ? (
                <p className='text-[11px] text-gray-500'>
                  TCS (Collected from Client, {commercial.tcsPercent}%):{' '}
                  {formatMoney(commercial.tcsAmount, displayCurrency)}
                </p>
              ) : null}
              {commercial.supplierTaxAmount > 0 ? (
                <p className='text-[11px] text-gray-500'>
                  Supplier Tax (Vendor Side, {commercial.supplierTaxPercent}%):{' '}
                  {formatMoney(commercial.supplierTaxAmount, displayCurrency)}
                </p>
              ) : null}
            </div>
          </div>

       
          <div className='mt-3 flex flex-col gap-1 text-sm text-gray-600 dark:text-gray-300'>
            <div className='flex items-center justify-between'>
              <span>Subtotal</span>
              <span>{formatMoney(commercial.subtotal, displayCurrency)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span>Discount</span>
              <span>-{formatMoney(commercial.discount, displayCurrency)}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span>Tax</span>
              <span>+{formatMoney(commercial.taxAmount, displayCurrency)}</span>
            </div>
            <div className='flex items-center justify-between border-t border-gray-200 pt-2 font-semibold text-gray-900 dark:border-gray-700 dark:text-gray-100'>
              <span>Final Amount</span>
              <span>
                {formatMoney(commercial.finalAmount, displayCurrency)}
              </span>
            </div>
          </div>
          </SurfaceCard>

          {itineraryItems.length ||
        noteSections.length ||
        contentTemplate?.headerBranding ||
        contentTemplate?.hotelDetails ||
        contentTemplate?.visaDetails ||
        contentTemplate?.inclusions ||
        contentTemplate?.exclusions ||
        contentTemplate?.paymentTerms ||
        contentTemplate?.cancellationPolicy ||
        contentTemplate?.footerDisclaimer ? (
          <SurfaceCard className='p-4 sm:p-5'>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500'>
              Quotation Content
            </h2>
            <div className='mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2'>
              {itineraryItems.length ? (
                <div className='rounded-lg border border-blue-200 bg-blue-50 p-3 lg:col-span-2'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-blue-700'>
                    Itinerary Snapshot
                  </p>
                  <div className='mt-2 space-y-3'>
                    {itineraryItems.map(item => (
                      <div key={item.id} className='text-sm text-blue-900'>
                        <p className='font-semibold'>
                          {item.day}: {item.title || item.day}
                        </p>
                        {item.description ? (
                          <p className='mt-1 whitespace-pre-wrap text-blue-900/90'>
                            {item.description}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {contentTemplate?.headerBranding ? (
                <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Header Branding
                  </p>
                  <p className='mt-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap'>
                    {contentTemplate.headerBranding}
                  </p>
                </div>
              ) : null}
              {contentTemplate?.paymentTerms ? (
                <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Payment Terms
                  </p>
                  <p className='mt-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap'>
                    {contentTemplate.paymentTerms}
                  </p>
                </div>
              ) : null}
              {contentTemplate?.cancellationPolicy ? (
                <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Cancellation Policy
                  </p>
                  <p className='mt-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap'>
                    {contentTemplate.cancellationPolicy}
                  </p>
                </div>
              ) : null}
              {contentTemplate?.footerDisclaimer ? (
                <div className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                    Footer Disclaimer
                  </p>
                  <p className='mt-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap'>
                    {contentTemplate.footerDisclaimer}
                  </p>
                </div>
              ) : null}
              {contentTemplate?.hotelDetails ? (
                <div className='rounded-lg border border-sky-200 bg-sky-50 p-3'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-sky-700'>
                    Hotel Details
                  </p>
                  <p className='mt-1 text-sm text-sky-900 whitespace-pre-wrap'>
                    {contentTemplate.hotelDetails}
                  </p>
                </div>
              ) : null}
              {contentTemplate?.visaDetails ? (
                <div className='rounded-lg border border-violet-200 bg-violet-50 p-3'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-violet-700'>
                    Visa Details
                  </p>
                  <p className='mt-1 text-sm text-violet-900 whitespace-pre-wrap'>
                    {contentTemplate.visaDetails}
                  </p>
                </div>
              ) : null}
              {contentTemplate?.inclusions ? (
                <div className='rounded-lg border border-green-200 bg-green-50 p-3'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-green-700'>
                    Inclusions
                  </p>
                  <p className='mt-1 text-sm text-green-800 whitespace-pre-wrap'>
                    {contentTemplate.inclusions}
                  </p>
                </div>
              ) : null}
              {contentTemplate?.exclusions ? (
                <div className='rounded-lg border border-red-200 bg-red-50 p-3'>
                  <p className='text-xs font-semibold uppercase tracking-wide text-red-700'>
                    Exclusions
                  </p>
                  <p className='mt-1 text-sm text-red-800 whitespace-pre-wrap'>
                    {contentTemplate.exclusions}
                  </p>
                </div>
              ) : null}
            </div>

            {noteSections.length ? (
              <div className='mt-4 space-y-3'>
                {noteSections.map(section => (
                  <div
                    key={section.id}
                    className='rounded-lg border border-gray-200 p-3 dark:border-gray-700'
                  >
                    <p className='text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      {section.title}
                    </p>
                    <p className='mt-1 text-sm text-gray-700 dark:text-gray-200 whitespace-pre-wrap'>
                      {section.content}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </SurfaceCard>
          ) : null}

          <SurfaceCard className='overflow-hidden border border-gray-200 dark:border-gray-800'>
          <div className='border-b border-gray-200 dark:border-gray-800 p-3 sm:p-4'>
            <div className='sm:hidden'>
              <select
                value={activeTab}
                onChange={e => setActiveTab(e.target.value as TabId)}
                className='w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm'
              >
                {tabs.map(tab => (
                  <option key={tab.id} value={tab.id}>
                    {tab.label}
                  </option>
                ))}
              </select>
            </div>

            <div className='hidden sm:flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-max'>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    activeTab === tab.id
                      ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className='p-4'>
            {activeTab === 'components' && (
              <div className='space-y-4'>
                {rows.length ? (
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead>
                        <tr className='border-b border-gray-200 dark:border-gray-800'>
                          <th className='pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                            Type
                          </th>
                          <th className='pb-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                            Description
                          </th>
                          <th className='pb-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider'>
                            Cost
                          </th>
                        </tr>
                      </thead>
                      <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                        {rows.map(row => (
                          <tr
                            key={row.id}
                            className='hover:bg-gray-50 dark:hover:bg-gray-800/40'
                          >
                            <td className='py-3 text-sm text-gray-700 dark:text-gray-300'>
                              {row.itemType}
                            </td>
                            <td className='py-3 text-sm text-gray-900 dark:text-gray-100'>
                              {row.description}
                            </td>
                            <td className='py-3 text-right text-sm font-medium text-gray-900 dark:text-gray-100'>
                              {formatMoney(row.cost, displayCurrency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState
                    title='No components'
                    description='This quotation has no quotation items.'
                    icon={<FaPlus className='text-4xl' />}
                  />
                )}
              </div>
            )}

            {activeTab === 'versions' && (
              <div className='space-y-3'>
                {versions.length ? (
                  versions.map(version => (
                    <div
                      key={version.id}
                      className='flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg'
                    >
                      <div className='w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0'>
                        <FaClockRotateLeft className='text-blue-600 dark:text-blue-400 text-sm' />
                      </div>
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center justify-between gap-2'>
                          <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                            Version {version.version}
                          </p>
                          <p className='text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap'>
                            {formatDate(version.createdAt)}
                          </p>
                        </div>
                        <p className='text-xs text-gray-600 dark:text-gray-300 mt-1'>
                          {version.changes}
                        </p>
                        <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>
                          by {version.createdBy}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title='No version history'
                    description='No version logs found for this quotation.'
                    icon={<FaClockRotateLeft className='text-4xl' />}
                  />
                )}
              </div>
            )}

            {activeTab === 'logs' && (
              <div className='space-y-3'>
                {logs.length ? (
                  logs.map(log => (
                    <div
                      key={log.id}
                      className='p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg space-y-2'
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-2'>
                          {log.method === 'email' ? (
                            <FaEnvelope className='text-blue-500' />
                          ) : log.method === 'whatsapp' ? (
                            <FaPaperPlane className='text-green-500' />
                          ) : (
                            <FaPaperPlane className='text-gray-500' />
                          )}
                          <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                            Sent via {log.method}
                          </p>
                        </div>
                        <p className='text-xs text-gray-500 dark:text-gray-400'>
                          {formatDate(log.sentAt)}
                        </p>
                      </div>
                      <p className='text-xs text-gray-600 dark:text-gray-300'>
                        To: {log.sentTo}
                      </p>
                      {log.viewedAt ? (
                        <p className='text-xs text-green-600 dark:text-green-400 flex items-center gap-1'>
                          <FaEye /> Viewed {log.viewCount} times - Last{' '}
                          {formatDate(log.viewedAt)}
                        </p>
                      ) : (
                        <p className='text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1'>
                          <FaEye /> Not viewed yet
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <EmptyState
                    title='No send logs'
                    description='Send this quotation to start tracking delivery and views.'
                    icon={<FaEye className='text-4xl' />}
                  />
                )}
              </div>
            )}
          </div>
          </SurfaceCard>
        </div>

        {/* Right Column - Fixed Send Actions & Summary */}
        <div className='xl:block xl:overflow-y-auto xl:max-h-[calc(100vh-200px)] xl:pr-2 scrollbar-hide'>
          <SurfaceCard className='p-4 sm:p-5 sticky top-0'>
            <h2 className='text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4'>
              Actions
            </h2>
            <div className='space-y-3'>
              <div className='relative'>
                <button
                  onClick={() => setShowSendDropdown(prev => !prev)}
                  className='w-full h-10 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center justify-center gap-2 font-medium'
                  disabled={savingStatus}
                >
                  <FaPaperPlane /> Send Quotation
                </button>

                {showSendDropdown && (
                  <>
                    <div
                      className='fixed inset-0 z-10'
                      onClick={() => setShowSendDropdown(false)}
                    />
                    <div className='absolute right-0 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-20 py-1'>
                      <button
                        onClick={() => void handleSend('email')}
                        className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2'
                      >
                        <FaEnvelope className='text-gray-500' /> Email
                      </button>
                      <button
                        onClick={() => void handleSend('whatsapp')}
                        className='w-full text-left px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center gap-2'
                      >
                        <FaPaperPlane className='text-green-500' /> WhatsApp
                      </button>
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={() => void handleApprove()}
                disabled={savingStatus || isApproved}
                className={`w-full h-10 px-4 rounded-lg text-sm font-medium text-white transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 ${
                  isApproved
                    ? 'bg-green-600 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                <FaCheck /> {isApproved ? 'Approved' : 'Approve'}
              </button>

              <button
                onClick={() => setShowRejectModal(true)}
                disabled={savingStatus || isRejected}
                className={`w-full h-10 px-4 rounded-lg text-sm transition-colors inline-flex items-center justify-center gap-2 disabled:opacity-60 ${
                  isRejected
                    ? 'bg-red-600 text-white border border-red-600 cursor-not-allowed'
                    : 'border border-red-200 text-red-600 hover:bg-red-50'
                }`}
              >
                <FaXmark /> {isRejected ? 'Rejected' : 'Reject'}
              </button>
            </div>

            <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
              <h3 className='text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3'>
                Quick Summary
              </h3>
              <div className='space-y-2 text-sm'>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Status</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    status === 'APPROVED'
                      ? 'bg-green-100 text-green-700'
                      : status === 'REJECTED'
                      ? 'bg-red-100 text-red-700'
                      : status === 'SENT'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {status}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Final Amount</span>
                  <span className='font-semibold text-blue-600 dark:text-blue-400'>
                    {formatMoney(commercial.finalAmount, displayCurrency)}
                  </span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Margin</span>
                  <span className='font-semibold'>{summary.marginPercent}%</span>
                </div>
                <div className='flex items-center justify-between'>
                  <span className='text-gray-600 dark:text-gray-400'>Views</span>
                  <span className='font-semibold'>{toNumber(quotation.viewCount, 0)}</span>
                </div>
              </div>
            </div>
          </SurfaceCard>
        </div>
      </div>

      {showRejectModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-md w-full p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Reject Quotation
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className='text-gray-400 hover:text-gray-600'
              >
                <FaXmark className='text-xl' />
              </button>
            </div>

            <p className='text-sm text-gray-600 dark:text-gray-400 mb-4'>
              Please provide a reason for rejection.
            </p>

            <textarea
              value={rejectReason}
              onChange={e => {
                setRejectReason(e.target.value)
                setRejectError('')
              }}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:text-gray-100 ${
                rejectError
                  ? 'border-red-500'
                  : 'border-gray-300 dark:border-gray-700'
              }`}
              placeholder='Enter rejection reason...'
            />

            {rejectError ? (
              <p className='mt-2 text-sm text-red-600'>{rejectError}</p>
            ) : null}

            <div className='flex justify-end gap-3 mt-6'>
              <button
                onClick={() => setShowRejectModal(false)}
                className='px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700'
              >
                Cancel
              </button>
              <button
                onClick={() => void handleRejectConfirm()}
                disabled={savingStatus}
                className='px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-60 transition-colors'
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='relative max-h-[95vh] w-full max-w-4xl overflow-hidden rounded-lg bg-white dark:bg-gray-900 shadow-2xl'>
            {/* Modal Header */}
            <div className='flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-4 sm:p-6'>
              <h2 className='text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100'>
                Quotation Preview
              </h2>
              <button
                onClick={() => setShowPreview(false)}
                className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
              >
                <FaXmark />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className='overflow-y-auto' style={{ maxHeight: 'calc(90vh - 120px)' }}>
              <div className='bg-gray-50 dark:bg-gray-800 p-4 sm:p-6'>
                <div className='rounded-lg bg-white dark:bg-gray-900 p-4 sm:p-6'>
                  <PdfTemplate
                    data={{
                      packageName: displayPackageName || displayQuotationTitle || 'Package',
                      email: displayCustomerEmail,
                      leadId:
                        (lead as any)?.leadCode ??
                        (lead as any)?.leadId ??
                        (snapshotLead as any)?.leadCode ??
                        (snapshotLead as any)?.leadId ??
                        quotation?.lead?.leadCode ??
                        quotation?.lead?.leadId ??
                        (quotation?.id ?? 'N/A'),
                      guestName: displayCustomerName,
                      guestEmail: displayCustomerEmail,
                      nights: toNumber(
                        quotation?.durationNights ??
                          snapshot?.durationNights ??
                          snapshot?.nights,
                        1
                      ),
                      adults: displayAdultsCount,
                      children: displayChildrenCount,
                      travelDate: formatDateOnly(displayTravelStartDate),
                      validUntil: formatDateOnly(displayValidUntil),
                      total: String(snapshotPricing?.total ?? quotation?.total ?? '0'),
                      totalSellValue: String(commercial.finalAmount),
                      currency: displayCurrency,
                      itinerary: itineraryItems.map((item: any) => ({
                        title: item.day && item.title ? `${item.day}: ${item.title}` : item.title || item.day || 'Day',
                        points: item.description ? [item.description] : []
                      })),
                      destination: displayDestinationName,
                      quotationTitle: displayQuotationTitle,
                      templateName: displayTemplateName,
                      packageType: displayPackageKind || 'Standard Package',
                      inclusions: String(contentTemplate?.inclusions ?? ''),
                      exclusions: String(contentTemplate?.exclusions ?? ''),
                      headerBranding: String(contentTemplate?.headerBranding ?? ''),
                      paymentTerms: String(contentTemplate?.paymentTerms ?? ''),
                      cancellationPolicy: String(contentTemplate?.cancellationPolicy ?? ''),
                      footerDisclaimer: String(contentTemplate?.footerDisclaimer ?? ''),
                      hotelDetails: String(contentTemplate?.hotelDetails ?? ''),
                      quoteReference: String(quotation?.quoteNumber ?? quotation?.id ?? ''),
                      quotationStatus: String(status ?? ''),
                      supplierName: String(createdByUser?.fullName ?? createdByUser?.name ?? ''),
                      enabledServices: String(
                        noteSections.find(s => s.title.toLowerCase() === 'enabled services')
                          ?.content ?? ''
                      )
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className='flex flex-col gap-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-2 sm:p-3 sm:flex-row sm:justify-end'>
              <button
                onClick={() => setShowPreview(false)}
                className='h-9 px-4 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors inline-flex items-center justify-center whitespace-nowrap'
              >
                Close
              </button>
              <button
                onClick={() => {
                  void handleDownloadPdf()
                  setShowPreview(false)
                }}
                disabled={downloadingPdf}
                className='h-9 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors inline-flex items-center justify-center whitespace-nowrap disabled:opacity-60'
              >
                <FaFilePdf className='mr-2' /> Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden PDF Template for export */}
      <div
        ref={pdfTemplateRef}
        style={{ display: 'none', position: 'absolute', top: '-9999px' }}
      >
        <PdfTemplate
          data={{
            packageName: displayPackageName || displayQuotationTitle || 'Package',
            email: displayCustomerEmail,
            leadId:
              (lead as any)?.leadCode ??
              (lead as any)?.leadId ??
              (snapshotLead as any)?.leadCode ??
              (snapshotLead as any)?.leadId ??
              quotation?.lead?.leadCode ??
              quotation?.lead?.leadId ??
              (quotation?.id ?? 'N/A'),
            guestName: displayCustomerName,
            guestEmail: displayCustomerEmail,
            nights: toNumber(
              quotation?.durationNights ??
                snapshot?.durationNights ??
                snapshot?.nights,
              1
            ),
            adults: displayAdultsCount,
            children: displayChildrenCount,
            travelDate: formatDateOnly(displayTravelStartDate),
            validUntil: formatDateOnly(displayValidUntil),
            total: String(snapshotPricing?.total ?? quotation?.total ?? '0'),
            totalSellValue: String(commercial.finalAmount),
            currency: displayCurrency,
            itinerary: itineraryItems.map((item: any) => ({
              title: item.day && item.title ? `${item.day}: ${item.title}` : item.title || item.day || 'Day',
              points: item.description ? [item.description] : []
            })),
            destination: displayDestinationName,
            quotationTitle: displayQuotationTitle,
            templateName: displayTemplateName,
            packageType: displayPackageKind || 'Standard Package',
            inclusions: String(contentTemplate?.inclusions ?? ''),
            exclusions: String(contentTemplate?.exclusions ?? ''),
            headerBranding: String(contentTemplate?.headerBranding ?? ''),
            paymentTerms: String(contentTemplate?.paymentTerms ?? ''),
            cancellationPolicy: String(contentTemplate?.cancellationPolicy ?? ''),
            footerDisclaimer: String(contentTemplate?.footerDisclaimer ?? ''),
            hotelDetails: String(contentTemplate?.hotelDetails ?? ''),
            quoteReference: String(quotation?.quoteNumber ?? quotation?.id ?? ''),
            quotationStatus: String(status ?? ''),
            supplierName: String(createdByUser?.fullName ?? createdByUser?.name ?? ''),
            enabledServices: String(
              noteSections.find(s => s.title.toLowerCase() === 'enabled services')
                ?.content ?? ''
            )
          }}
        />
      </div>
    </div>
  )
}

export default QuotationDetailPage
