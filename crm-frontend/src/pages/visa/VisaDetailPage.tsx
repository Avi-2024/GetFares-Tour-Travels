import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  FaArrowLeft,
  FaCheck,
  FaDownload,
  FaEye,
  FaUpload,
  FaXmark
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import StatusBadge from '../../components/ui/StatusBadge'
import EmptyState from '../../components/ui/EmptyState'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { visaApi } from '../../api/visa'
import { bookingsApi } from '../../api/bookings'
import { suppliersApi } from '../../api/suppliers'
import { reportApiError } from '../../lib/notify'
import { validateVisaTransition } from '../../utils/workflowValidation'
import {
  DOCUMENT_TYPE_OPTIONS,
  getCountryVisaChecklist,
  humanizeVisaStage,
  normalizeVisaStage,
  VISA_WORKFLOW_STAGES,
  type VisaWorkflowStage
} from './visaWorkflow'

type VisaDocument = {
  id: string
  documentType: string
  fileUrl: string
  isVerified: boolean
  uploadedAt: string | null
}
type ChecklistKey =
  | 'passportVerified'
  | 'visaVerified'
  | 'insuranceVerified'
  | 'ticketVerified'
  | 'hotelVerified'
  | 'transferVerified'
  | 'tourVerified'
  | 'finalItineraryUploaded'
  | 'travelReady'
type ChecklistItem = {
  id: ChecklistKey
  label: string
  completed: boolean
  required: boolean
}
type VisaCase = {
  id: string
  bookingId?: string | null
  supplierId?: string | null
  country?: string | null
  visaType?: string | null
  visaNumber?: string | null
  fees?: number | null
  appointmentDate?: string | null
  submissionDate?: string | null
  workflowStage: VisaWorkflowStage
  rejectionReason?: string | null
  visaValidUntil?: string | null
  deliveredAt?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  daysToExpiry?: number | null
  expiryStatus?: string | null
}

const checklistConfig: Array<{
  id: ChecklistKey
  label: string
  required: boolean
}> = [
  { id: 'passportVerified', label: 'Passport Copy', required: true },
  { id: 'visaVerified', label: 'Visa Form / Visa Copy', required: true },
  { id: 'insuranceVerified', label: 'Travel Insurance', required: false },
  { id: 'ticketVerified', label: 'Flight Itinerary', required: false },
  { id: 'hotelVerified', label: 'Hotel Voucher', required: false },
  { id: 'transferVerified', label: 'Transfer Details', required: false },
  { id: 'tourVerified', label: 'Tour Vouchers', required: false },
  { id: 'finalItineraryUploaded', label: 'Final Itinerary', required: false },
  { id: 'travelReady', label: 'Travel Ready', required: false }
]

const mapChecklist = (data?: Record<string, any>): ChecklistItem[] =>
  checklistConfig.map(item => ({
    id: item.id,
    label: item.label,
    required: item.required,
    completed: Boolean(data?.[item.id] ?? false)
  }))
const mapDoc = (doc: any): VisaDocument => ({
  id: String(doc?.id || ''),
  documentType: String(doc?.documentType || doc?.document_type || 'OTHER'),
  fileUrl: String(doc?.fileUrl || doc?.file_url || '#'),
  isVerified: Boolean(doc?.isVerified ?? doc?.is_verified ?? false),
  uploadedAt: doc?.uploadedAt || doc?.uploaded_at || null
})
const fmtDate = (value?: string | null) =>
  value
    ? new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '-'
const fmtDateTime = (value?: string | null) =>
  value
    ? new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : '-'
const fmtMoney = (value?: number | null) =>
  value === null || value === undefined
    ? '-'
    : `Rs ${Number(value).toLocaleString('en-IN')}`

const VisaDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [visaCase, setVisaCase] = useState<VisaCase | null>(null)
  const [workflowStage, setWorkflowStage] = useState<VisaWorkflowStage>(
    'DOCUMENT_COLLECTION'
  )
  const [appointmentDate, setAppointmentDate] = useState('')
  const [submissionDate, setSubmissionDate] = useState('')
  const [visaValidUntil, setVisaValidUntil] = useState('')
  const [deliveredAt, setDeliveredAt] = useState('')
  const [visaNumber, setVisaNumber] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [documents, setDocuments] = useState<VisaDocument[]>([])
  const [checklist, setChecklist] = useState<ChecklistItem[]>(mapChecklist())
  const [bookingLabelById, setBookingLabelById] = useState<
    Record<string, string>
  >({})
  const [supplierNameById, setSupplierNameById] = useState<
    Record<string, string>
  >({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState('')
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploadDocumentType, setUploadDocumentType] =
    useState<string>('PASSPORT')
  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage(text)
    setMessageType(type)
    window.setTimeout(() => setMessage(''), 3000)
  }

  useEffect(() => {
    const loadPage = async () => {
      if (!id) return
      setLoading(true)
      setPageError('')
      try {
        const [caseRes, docsRes, checklistRes, bookingsRes, suppliersRes] =
          await Promise.all([
            visaApi.getById(id),
            visaApi.listDocuments(id),
            visaApi.getChecklist(id),
            bookingsApi.list({ page: 1, limit: 300 }),
            suppliersApi.list({ page: 1, limit: 300 })
          ])
        const c =
          (caseRes as any)?.data?.data ?? (caseRes as any)?.data ?? caseRes
        const bookingRows =
          (bookingsRes as any)?.data?.data ||
          (bookingsRes as any)?.data?.items ||
          (bookingsRes as any)?.data ||
          bookingsRes ||
          []
        const supplierRows =
          (suppliersRes as any)?.data?.data ||
          (suppliersRes as any)?.data?.items ||
          (suppliersRes as any)?.data ||
          suppliersRes ||
          []
        const bookingMap: Record<string, string> = {}
        const supplierMap: Record<string, string> = {}
        ;(Array.isArray(bookingRows) ? bookingRows : []).forEach(
          (booking: any) => {
            const bookingId = String(booking?.id || '')
            if (!bookingId) return
            const bookingNumber =
              booking?.bookingNumber || booking?.booking_number || bookingId
            const customer =
              booking?.customerName ||
              booking?.customer_name ||
              booking?.leadName ||
              booking?.lead_name ||
              ''
            bookingMap[bookingId] = customer
              ? `${bookingNumber} - ${customer}`
              : String(bookingNumber)
          }
        )
        ;(Array.isArray(supplierRows) ? supplierRows : []).forEach(
          (supplier: any) => {
            const supplierId = String(supplier?.id || '')
            const name = String(supplier?.name || '').trim()
            if (supplierId && name) supplierMap[supplierId] = name
          }
        )
        setBookingLabelById(bookingMap)
        setSupplierNameById(supplierMap)
        const mapped: VisaCase = {
          id: String(c?.id || id),
          bookingId: c?.bookingId ?? c?.booking_id ?? null,
          supplierId: c?.supplierId ?? c?.supplier_id ?? null,
          country: c?.country ?? null,
          visaType: c?.visaType ?? c?.visa_type ?? null,
          visaNumber: c?.visaNumber ?? c?.visa_number ?? null,
          fees: c?.fees ?? null,
          appointmentDate: c?.appointmentDate ?? c?.appointment_date ?? null,
          submissionDate: c?.submissionDate ?? c?.submission_date ?? null,
          workflowStage: normalizeVisaStage(
            c?.workflowStage ?? c?.workflow_stage ?? c?.status
          ),
          rejectionReason: c?.rejectionReason ?? c?.rejection_reason ?? null,
          visaValidUntil: c?.visaValidUntil ?? c?.visa_valid_until ?? null,
          deliveredAt: c?.deliveredAt ?? c?.delivered_at ?? null,
          createdAt: c?.createdAt ?? c?.created_at ?? null,
          updatedAt: c?.updatedAt ?? c?.updated_at ?? null,
          daysToExpiry: c?.daysToExpiry ?? null,
          expiryStatus: c?.expiryStatus ?? null
        }
        setVisaCase(mapped)
        setWorkflowStage(mapped.workflowStage)
        setAppointmentDate(
          mapped.appointmentDate
            ? String(mapped.appointmentDate).slice(0, 10)
            : ''
        )
        setSubmissionDate(
          mapped.submissionDate
            ? String(mapped.submissionDate).slice(0, 10)
            : ''
        )
        setVisaValidUntil(
          mapped.visaValidUntil
            ? String(mapped.visaValidUntil).slice(0, 10)
            : ''
        )
        setDeliveredAt(
          mapped.deliveredAt ? String(mapped.deliveredAt).slice(0, 10) : ''
        )
        setVisaNumber(mapped.visaNumber || '')
        setRejectionReason(mapped.rejectionReason || '')
        const docs =
          (docsRes as any)?.data?.data ?? (docsRes as any)?.data ?? docsRes
        const chk =
          (checklistRes as any)?.data?.data ??
          (checklistRes as any)?.data ??
          checklistRes
        setDocuments(Array.isArray(docs) ? docs.map(mapDoc) : [])
        setChecklist(mapChecklist(chk || {}))
      } catch (err) {
        console.error('Failed to load visa case:', err)
        reportApiError(err, 'Failed to load visa case.', setPageError)
      } finally {
        setLoading(false)
      }
    }
    void loadPage()
  }, [id])

  const validationError = useMemo(
    () =>
      validateVisaTransition(
        workflowStage,
        rejectionReason,
        visaValidUntil,
        appointmentDate
      ),
    [appointmentDate, rejectionReason, visaValidUntil, workflowStage]
  )
  const countryChecklist = useMemo(
    () => getCountryVisaChecklist(visaCase?.country || undefined),
    [visaCase?.country]
  )
  const progressPercentage = useMemo(
    () =>
      checklist.length
        ? (checklist.filter(item => item.completed).length / checklist.length) *
          100
        : 0,
    [checklist]
  )
  const workflowStageOptions = useMemo(
    () =>
      VISA_WORKFLOW_STAGES.map(stage => ({
        value: stage.value,
        label: stage.label
      })),
    []
  )
  const documentTypeOptions = useMemo(
    () =>
      DOCUMENT_TYPE_OPTIONS.map(item => ({
        value: item,
        label: humanizeVisaStage(item)
      })),
    []
  )
  const bookingLabel = visaCase?.bookingId
    ? bookingLabelById[visaCase.bookingId] || visaCase.bookingId
    : 'Not linked'
  const supplierLabel = visaCase?.supplierId
    ? supplierNameById[visaCase.supplierId] || visaCase.supplierId
    : 'Not linked'
  const activityItems = useMemo(
    () =>
      [
        visaCase?.createdAt
          ? `Case created on ${fmtDateTime(visaCase.createdAt)}`
          : null,
        submissionDate
          ? `Submission recorded for ${fmtDate(submissionDate)}`
          : null,
        appointmentDate
          ? `Appointment scheduled for ${fmtDate(appointmentDate)}`
          : null,
        visaValidUntil
          ? `Validity captured till ${fmtDate(visaValidUntil)}`
          : null,
        deliveredAt ? `Delivered on ${fmtDate(deliveredAt)}` : null,
        ...documents.map(
          doc =>
            `${humanizeVisaStage(doc.documentType)} uploaded${
              doc.isVerified ? ' and verified' : ''
            }`
        )
      ].filter(Boolean) as string[],
    [
      appointmentDate,
      deliveredAt,
      documents,
      submissionDate,
      visaCase?.createdAt,
      visaValidUntil
    ]
  )

  const saveWorkflow = async () => {
    if (!id) return
    if (validationError) {
      showMessage(validationError, 'error')
      return
    }
    setSaving(true)
    try {
      const response = await visaApi.changeStatus(id, {
        workflowStage,
        appointmentDate: appointmentDate || undefined,
        submissionDate: submissionDate || undefined,
        visaValidUntil: visaValidUntil || undefined,
        deliveredAt: deliveredAt || undefined,
        visaNumber: visaNumber.trim() || undefined,
        rejectionReason: rejectionReason.trim() || undefined
      })
      const updated =
        (response as any)?.data?.data ?? (response as any)?.data ?? response
      setVisaCase(prev => ({
        ...(prev || { id, workflowStage }),
        bookingId:
          updated?.bookingId ?? updated?.booking_id ?? prev?.bookingId ?? null,
        supplierId:
          updated?.supplierId ??
          updated?.supplier_id ??
          prev?.supplierId ??
          null,
        country: updated?.country ?? prev?.country ?? null,
        visaType:
          updated?.visaType ?? updated?.visa_type ?? prev?.visaType ?? null,
        visaNumber:
          (updated?.visaNumber ?? updated?.visa_number ?? visaNumber) || null,
        fees: updated?.fees ?? prev?.fees ?? null,
        appointmentDate:
          (updated?.appointmentDate ??
            updated?.appointment_date ??
            appointmentDate) ||
          null,
        submissionDate:
          (updated?.submissionDate ??
            updated?.submission_date ??
            submissionDate) ||
          null,
        workflowStage: normalizeVisaStage(
          updated?.workflowStage ?? updated?.workflow_stage ?? workflowStage
        ),
        rejectionReason:
          (updated?.rejectionReason ??
            updated?.rejection_reason ??
            rejectionReason) ||
          null,
        visaValidUntil:
          (updated?.visaValidUntil ??
            updated?.visa_valid_until ??
            visaValidUntil) ||
          null,
        deliveredAt:
          (updated?.deliveredAt ?? updated?.delivered_at ?? deliveredAt) ||
          null,
        createdAt:
          updated?.createdAt ?? updated?.created_at ?? prev?.createdAt ?? null,
        updatedAt:
          updated?.updatedAt ?? updated?.updated_at ?? new Date().toISOString(),
        daysToExpiry: updated?.daysToExpiry ?? prev?.daysToExpiry ?? null,
        expiryStatus: updated?.expiryStatus ?? prev?.expiryStatus ?? null
      }))
      showMessage(
        `Workflow updated to ${humanizeVisaStage(workflowStage)}`,
        'success'
      )
    } catch (err) {
      console.error('Failed to update visa workflow:', err)
      reportApiError(err, 'Failed to update visa workflow.')
    } finally {
      setSaving(false)
    }
  }

  const handleVerifyDocument = async (documentId: string) => {
    try {
      await visaApi.verifyDocument(documentId, { isVerified: true })
      setDocuments(prev =>
        prev.map(doc =>
          doc.id === documentId ? { ...doc, isVerified: true } : doc
        )
      )
      showMessage('Document verified successfully.', 'success')
    } catch (err) {
      console.error('Failed to verify visa document:', err)
      reportApiError(err, 'Failed to verify document.')
    }
  }

  const handleChecklistToggle = async (fieldId: ChecklistKey) => {
    if (!id) return
    const currentItem = checklist.find(item => item.id === fieldId)
    if (!currentItem) return
    const nextValue = !currentItem.completed
    setChecklist(prev =>
      prev.map(item =>
        item.id === fieldId ? { ...item, completed: nextValue } : item
      )
    )
    try {
      await visaApi.updateChecklist(id, { [fieldId]: nextValue })
    } catch (err) {
      console.error('Failed to update checklist:', err)
      setChecklist(prev =>
        prev.map(item =>
          item.id === fieldId
            ? { ...item, completed: currentItem.completed }
            : item
        )
      )
      reportApiError(err, 'Failed to update checklist.')
    }
  }

  const handleUploadDocument = async () => {
    if (!id || !uploadFile) return
    try {
      const formData = new FormData()
      formData.append('documentType', uploadDocumentType)
      formData.append('file', uploadFile)
      const response = await visaApi.addDocument(id, formData)
      const created =
        (response as any)?.data?.data ?? (response as any)?.data ?? response
      setDocuments(prev => [mapDoc(created), ...prev])
      setShowUploadModal(false)
      setUploadFile(null)
      setUploadDocumentType('PASSPORT')
      showMessage('Document uploaded successfully.', 'success')
    } catch (err) {
      console.error('Failed to upload visa document:', err)
      reportApiError(err, 'Failed to upload document.')
    }
  }

  return (
    <div className='mx-auto max-w-7xl space-y-4 px-4 sm:space-y-6 sm:px-0'>
      <div className='flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between'>
        <div className='flex items-start gap-3'>
          <button
            onClick={() => navigate('/visa')}
            className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
            aria-label='Back to visa list'
          >
            <FaArrowLeft className='text-sm' />
          </button>
          <div>
            <h1 className='text-xl font-bold text-gray-900 dark:text-gray-100 sm:text-2xl'>
              Visa Case {id ? `#${id.slice(0, 8)}` : ''}
            </h1>
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400 sm:text-sm'>
              Track documents, workflow stage, appointment date, validity, and
              delivery in one place.
            </p>
            {pageError ? (
              <p className='mt-2 text-sm text-red-500'>{pageError}</p>
            ) : null}
          </div>
        </div>
        <StatusBadge status={workflowStage} />
      </div>

      {message ? (
        <SurfaceCard
          className={`border p-4 text-sm ${
            messageType === 'success'
              ? 'border-green-200 bg-green-50/70 text-green-700 dark:border-green-800 dark:bg-green-900/20 dark:text-green-300'
              : 'border-red-200 bg-red-50/70 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message}
        </SurfaceCard>
      ) : null}
      {loading ? (
        <div className='flex justify-center p-8'>
          <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600'></div>
        </div>
      ) : null}

      <SurfaceCard className='p-4'>
        <div className='mb-2 flex items-center justify-between'>
          <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
            Checklist Progress
          </span>
          <span className='text-sm font-semibold text-blue-600'>
            {Math.round(progressPercentage)}%
          </span>
        </div>
        <div className='h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700'>
          <div
            className='h-full rounded-full bg-blue-600 transition-all duration-300'
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </SurfaceCard>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
        <div className='space-y-6 lg:col-span-2'>
          <SurfaceCard className='p-5'>
            <div className='mb-4'>
              <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                Workflow Update
              </h2>
              <p className='text-sm text-gray-500 dark:text-gray-400'>
                PRD-based visa stages with required dates for biometrics,
                approval, and delivery.
              </p>
            </div>
            <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
              <div>
                <label className='field-label'>Workflow Stage</label>
                <SearchableDropdown
                  value={workflowStage}
                  options={workflowStageOptions}
                  onChange={value =>
                    setWorkflowStage(value as VisaWorkflowStage)
                  }
                  searchPlaceholder='Search workflow stage...'
                />
              </div>
              <div>
                <label className='field-label'>Visa Number</label>
                <input
                  type='text'
                  className='field-input'
                  value={visaNumber}
                  onChange={e => setVisaNumber(e.target.value)}
                  placeholder='Enter visa number'
                />
              </div>
              <div>
                <label className='field-label'>Appointment Date</label>
                <input
                  type='date'
                  className='field-input'
                  value={appointmentDate}
                  onChange={e => setAppointmentDate(e.target.value)}
                />
              </div>
              <div>
                <label className='field-label'>Submission Date</label>
                <input
                  type='date'
                  className='field-input'
                  value={submissionDate}
                  onChange={e => setSubmissionDate(e.target.value)}
                />
              </div>
              <div>
                <label className='field-label'>Visa Valid Until</label>
                <input
                  type='date'
                  className='field-input'
                  value={visaValidUntil}
                  onChange={e => setVisaValidUntil(e.target.value)}
                />
              </div>
              <div>
                <label className='field-label'>Delivered At</label>
                <input
                  type='date'
                  className='field-input'
                  value={deliveredAt}
                  onChange={e => setDeliveredAt(e.target.value)}
                />
              </div>
              <div className='md:col-span-2'>
                <label className='field-label'>Rejection Reason</label>
                <textarea
                  rows={3}
                  className='field-input'
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  placeholder='Required only if case is rejected'
                />
              </div>
            </div>
            {validationError ? (
              <p className='mt-3 text-sm text-amber-600 dark:text-amber-300'>
                {validationError}
              </p>
            ) : null}
            <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
              <button
                onClick={() => void saveWorkflow()}
                disabled={saving}
                className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60'
              >
                {saving ? 'Saving...' : 'Update Workflow'}
              </button>
              <button
                onClick={() => navigate('/visa')}
                className='rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800'
              >
                Save & Back
              </button>
            </div>
          </SurfaceCard>

          <SurfaceCard className='p-5'>
            <div className='mb-4 flex items-center justify-between'>
              <div>
                <h2 className='text-base font-semibold text-gray-900 dark:text-gray-100'>
                  Documents
                </h2>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Real backend upload connected to visa document storage.
                </p>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className='inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700'
              >
                <FaUpload /> Upload
              </button>
            </div>
            {documents.length === 0 ? (
              <EmptyState
                title='No documents'
                description='Upload required documents for visa processing.'
                icon={<FaUpload className='text-4xl' />}
              />
            ) : (
              <div className='space-y-2'>
                {documents.map(doc => (
                  <div
                    key={doc.id}
                    className='flex flex-col gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50 sm:flex-row sm:items-center sm:justify-between'
                  >
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                          {humanizeVisaStage(doc.documentType)}
                        </span>
                        {doc.isVerified ? (
                          <span className='text-xs text-green-600'>
                            Verified
                          </span>
                        ) : null}
                      </div>
                      <p className='text-xs text-gray-500'>
                        {fmtDateTime(doc.uploadedAt)}
                      </p>
                    </div>
                    <div className='flex items-center gap-2'>
                      <a
                        href={doc.fileUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600'
                      >
                        <FaEye />
                      </a>
                      <a
                        href={doc.fileUrl}
                        target='_blank'
                        rel='noreferrer'
                        className='rounded-lg p-2 text-gray-500 transition-colors hover:bg-green-50 hover:text-green-600'
                      >
                        <FaDownload />
                      </a>
                      {!doc.isVerified ? (
                        <button
                          onClick={() => void handleVerifyDocument(doc.id)}
                          className='rounded-lg p-2 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600'
                        >
                          <FaCheck />
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
          <SurfaceCard className='p-5'>
            <h2 className='mb-4 text-base font-semibold text-gray-900 dark:text-gray-100'>
              Recent Activity
            </h2>
            {activityItems.length === 0 ? (
              <p className='text-sm text-gray-500'>No activity yet.</p>
            ) : (
              <div className='space-y-2'>
                {activityItems.map((item, index) => (
                  <div
                    key={`${item}-${index}`}
                    className='rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-300'
                  >
                    {item}
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </div>

        <div className='space-y-6'>
          <SurfaceCard className='p-5'>
            <h3 className='mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100'>
              Case Details
            </h3>
            <div className='space-y-3 text-sm'>
              <div className='flex justify-between gap-3'>
                <span className='text-gray-500'>Country</span>
                <span className='font-medium text-gray-900 dark:text-gray-100'>
                  {visaCase?.country || '-'}
                </span>
              </div>
              <div className='flex justify-between gap-3'>
                <span className='text-gray-500'>Visa Type</span>
                <span className='font-medium text-gray-900 dark:text-gray-100'>
                  {visaCase?.visaType || '-'}
                </span>
              </div>
              <div className='flex justify-between gap-3'>
                <span className='text-gray-500'>Booking</span>
                <span className='text-right font-medium text-gray-900 dark:text-gray-100'>
                  {bookingLabel}
                </span>
              </div>
              <div className='flex justify-between gap-3'>
                <span className='text-gray-500'>Supplier</span>
                <span className='text-right font-medium text-gray-900 dark:text-gray-100'>
                  {supplierLabel}
                </span>
              </div>
              <div className='flex justify-between gap-3'>
                <span className='text-gray-500'>Appointment</span>
                <span className='font-medium text-gray-900 dark:text-gray-100'>
                  {fmtDate(appointmentDate)}
                </span>
              </div>
              <div className='flex justify-between gap-3'>
                <span className='text-gray-500'>Expiry</span>
                <span className='font-medium text-gray-900 dark:text-gray-100'>
                  {fmtDate(visaValidUntil)}
                </span>
              </div>
              <div className='flex justify-between gap-3'>
                <span className='text-gray-500'>Fees</span>
                <span className='font-medium text-gray-900 dark:text-gray-100'>
                  {fmtMoney(visaCase?.fees)}
                </span>
              </div>
              <div className='rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40'>
                <p className='text-xs uppercase tracking-wide text-gray-500'>
                  Expiry Status
                </p>
                <p className='mt-1 text-sm font-semibold text-gray-900 dark:text-gray-100'>
                  {humanizeVisaStage(visaCase?.expiryStatus || 'not_set')}
                </p>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  {visaCase?.daysToExpiry !== null &&
                  visaCase?.daysToExpiry !== undefined
                    ? `${visaCase.daysToExpiry} day(s) remaining`
                    : 'Validity not captured yet.'}
                </p>
              </div>
              <div className='pt-2 text-xs text-gray-500'>
                Created: {fmtDateTime(visaCase?.createdAt)}
                <br />
                Updated: {fmtDateTime(visaCase?.updatedAt)}
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard className='p-5'>
            <h3 className='mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100'>
              Required Checklist
            </h3>
            <div className='space-y-2'>
              {checklist.map(item => (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 rounded-lg p-2 ${
                    item.completed
                      ? 'bg-green-50 dark:bg-green-900/10'
                      : 'bg-gray-50 dark:bg-gray-800/50'
                  }`}
                >
                  <input
                    type='checkbox'
                    checked={item.completed}
                    onChange={() => void handleChecklistToggle(item.id)}
                    className='rounded border-gray-300 text-blue-600 focus:ring-blue-500'
                  />
                  <span
                    className={`flex-1 text-xs ${
                      item.completed
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {item.label}
                    {item.required ? (
                      <span className='ml-1 text-red-500'>*</span>
                    ) : null}
                  </span>
                  {item.completed ? (
                    <FaCheck className='text-xs text-green-600' />
                  ) : null}
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard className='p-5'>
            <h3 className='mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100'>
              Country Guide
            </h3>
            <div className='space-y-2'>
              {countryChecklist.map(item => (
                <div
                  key={item}
                  className='rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300'
                >
                  {item}
                </div>
              ))}
            </div>
          </SurfaceCard>
        </div>
      </div>

      {showUploadModal ? (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4'>
          <div className='w-full max-w-md rounded-xl bg-white p-6 shadow-xl dark:bg-gray-900'>
            <div className='mb-4 flex items-center justify-between'>
              <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
                Upload Document
              </h3>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                  setUploadDocumentType('PASSPORT')
                }}
                className='text-gray-400 hover:text-gray-600'
              >
                <FaXmark className='text-xl' />
              </button>
            </div>
            <div className='space-y-4'>
              <div>
                <label className='field-label'>Document Type</label>
                <SearchableDropdown
                  value={uploadDocumentType}
                  options={documentTypeOptions}
                  onChange={setUploadDocumentType}
                  searchPlaceholder='Search document type...'
                />
              </div>
              <div>
                <label className='field-label'>Select File</label>
                <input
                  type='file'
                  onChange={e => setUploadFile(e.target.files?.[0] || null)}
                  className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700'
                  accept='.pdf,.jpg,.jpeg,.png,.doc,.docx'
                />
              </div>
              <p className='text-xs text-gray-500'>
                Accepted: PDF, JPG, PNG, DOC, DOCX
              </p>
            </div>
            <div className='mt-6 flex justify-end gap-3'>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  setUploadFile(null)
                  setUploadDocumentType('PASSPORT')
                }}
                className='rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50'
              >
                Cancel
              </button>
              <button
                onClick={() => void handleUploadDocument()}
                disabled={!uploadFile}
                className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50'
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default VisaDetailPage
