import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { FaXmark } from 'react-icons/fa6'
import { CurrencyInput } from '../../components/form'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { LoadingButton } from '../../components/ui/ButtonSpinner'
import { paymentsApi } from '../../api/payments'
import { refundsApi } from '../../api/refunds'
import { fetchBookingPickerOptions } from '../../lib/bookingPickerCache'
import { getCurrencyOptions, formatCurrency } from '../../utils/currency'
import { reportApiError } from '../../lib/notify'

const MAX_REFUND_PROOF_SIZE = 5 * 1024 * 1024

const formatFileSize = (bytes: number) => {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const power = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  )
  const value = bytes / Math.pow(1024, power)
  return `${value % 1 === 0 ? value : value.toFixed(1)} ${units[power]}`
}

const formatPaymentStateLabel = (
  payment: Pick<PaymentOption, 'isVerified' | 'status'>,
) => {
  if (payment.isVerified) return 'Verified'
  const normalizedStatus = String(payment.status || 'PENDING')
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()
  return normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1)
}

type BookingOption = {
  id: string
  bookingNumber: string
  customer?: string
  currency?: string
}

type PaymentOption = {
  id: string
  referenceId: string
  amount: number
  currency: string
  isVerified: boolean
  status: string
  paymentMode?: string
  paidAt?: string
  createdAt?: string
}

type FinanceUser = {
  id: string
  fullName: string
  email?: string
}

export type CreateRefundModalProps = {
  isOpen: boolean
  raisedByName: string
  onClose: () => void
  onCreated: (refund: unknown) => void
}

const CreateRefundModal = ({
  isOpen,
  raisedByName,
  onClose,
  onCreated,
}: CreateRefundModalProps) => {
  const [form, setForm] = useState({
    bookingId: '',
    paymentId: '',
    assignedTo: '',
    refundAmount: '' as number | '',
    currency: 'INR',
    supplierPenalty: '' as number | '',
    serviceCharge: '' as number | '',
    notes: '',
  })
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [bookings, setBookings] = useState<BookingOption[]>([])
  const [payments, setPayments] = useState<PaymentOption[]>([])
  const [financeUsers, setFinanceUsers] = useState<FinanceUser[]>([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [loadingFinanceUsers, setLoadingFinanceUsers] = useState(false)
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [proofUploadError, setProofUploadError] = useState('')
  const proofInputRef = useRef<HTMLInputElement | null>(null)
  const currencyOptions = useMemo(() => getCurrencyOptions(false), [])

  const mergeBookings = useCallback((incoming: BookingOption[]) => {
    if (!incoming.length) return
    setBookings(prev => {
      const byId = new Map(prev.map(item => [item.id, item]))
      incoming.forEach(item => {
        if (item.id) byId.set(item.id, item)
      })
      return Array.from(byId.values())
    })
  }, [])

  const loadRecentBookings = useCallback(async () => {
    setLoadingBookings(true)
    try {
      const rows = await fetchBookingPickerOptions()
      mergeBookings(
        rows.map(row => ({
          id: row.id,
          bookingNumber: row.bookingNumber,
          customer: row.customer,
          currency: row.currency,
        })),
      )
    } catch (err) {
      console.error('Failed to load booking options:', err)
      setFormError('Failed to load bookings. Try searching again.')
    } finally {
      setLoadingBookings(false)
    }
  }, [mergeBookings])

  const searchBookings = useCallback(
    async (query: string) => {
      const term = query.trim()
      if (term.length < 2) return
      setLoadingBookings(true)
      try {
        const rows = await fetchBookingPickerOptions(term)
        mergeBookings(
          rows.map(row => ({
            id: row.id,
            bookingNumber: row.bookingNumber,
            customer: row.customer,
            currency: row.currency,
          })),
        )
      } catch (err) {
        console.error('Failed to search bookings:', err)
        setFormError('Booking search failed. Please retry.')
      } finally {
        setLoadingBookings(false)
      }
    },
    [mergeBookings],
  )

  const loadPaymentsForBooking = useCallback(async (bookingId: string) => {
    const normalized = bookingId.trim()
    if (!normalized) {
      setPayments([])
      return
    }

    setLoadingPayments(true)
    try {
      const paymentsRes = await paymentsApi.list({ bookingId: normalized })
      const payload = (paymentsRes as { data?: unknown })?.data ?? paymentsRes
      const list =
        (payload as { data?: unknown[] })?.data ??
        (Array.isArray(payload) ? payload : [])

      const mapped = (Array.isArray(list) ? list : [])
        .map((payment: Record<string, unknown>) => {
          const id = String(payment.id ?? '')
          const referenceId = String(
            payment.paymentReference ??
              payment.payment_reference ??
              payment.gatewayPaymentId ??
              payment.gateway_payment_id ??
              id,
          ).trim()
          const isVerified = Boolean(
            payment.isVerified ?? payment.is_verified ?? false,
          )
          const status = String(payment.status ?? '').toUpperCase()
          return {
            id,
            referenceId: referenceId || id,
            amount: Number(payment.amount ?? 0),
            currency: String(payment.currency ?? 'INR').toUpperCase(),
            paymentMode: String(
              payment.paymentMode ?? payment.payment_mode ?? '',
            ).toUpperCase(),
            isVerified,
            status,
            paidAt: (payment.paidAt ?? payment.paid_at) as string | undefined,
            createdAt: (payment.createdAt ??
              payment.created_at) as string | undefined,
          }
        })
        .filter(
          payment =>
            payment.status !== 'REFUNDED' &&
            Boolean(payment.id),
        )

      setPayments(mapped)

      const defaultPayment = mapped.find(payment => payment.isVerified) ?? null
      if (defaultPayment) {
        setForm(current => {
          if (current.bookingId !== normalized) return current
          if (current.paymentId) return current
          return {
            ...current,
            paymentId: defaultPayment.id,
            refundAmount: defaultPayment.amount,
          }
        })
      }
    } catch (err) {
      console.error('Failed to load payments for booking:', err)
      setPayments([])
    } finally {
      setLoadingPayments(false)
    }
  }, [])

  const loadFinanceUsers = useCallback(async () => {
    setLoadingFinanceUsers(true)
    try {
      const response = await refundsApi.listAssignableUsers()
      const payload = (response as { data?: unknown })?.data ?? response
      const data =
        (payload as { data?: unknown[] })?.data ??
        (payload as { items?: unknown[] })?.items ??
        payload ??
        []
      setFinanceUsers(
        (Array.isArray(data) ? data : []).map((item: Record<string, unknown>) => ({
          id: String(item.id ?? ''),
          fullName: String(item.fullName ?? item.full_name ?? ''),
          email: item.email ? String(item.email) : undefined,
        })),
      )
    } catch (err) {
      setFinanceUsers([])
      reportApiError(err, 'Failed to load finance users')
    } finally {
      setLoadingFinanceUsers(false)
    }
  }, [])

  const resetForm = useCallback(() => {
    setForm({
      bookingId: '',
      paymentId: '',
      assignedTo: '',
      refundAmount: '',
      currency: 'INR',
      supplierPenalty: '',
      serviceCharge: '',
      notes: '',
    })
    setFormError('')
    setProofFile(null)
    setProofUploadError('')
    if (proofInputRef.current) {
      proofInputRef.current.value = ''
    }
  }, [])

  useEffect(() => {
    if (!isOpen) return
    resetForm()
    setPayments([])
    void loadFinanceUsers()
    if (bookings.length === 0) {
      void loadRecentBookings()
    }
  }, [isOpen, resetForm, loadFinanceUsers, loadRecentBookings, bookings.length])

  useEffect(() => {
    if (!isOpen) return
    const bookingId = form.bookingId.trim()
    if (!bookingId) {
      setPayments([])
      return
    }
    void loadPaymentsForBooking(bookingId)
  }, [isOpen, form.bookingId, loadPaymentsForBooking])

  const bookingById = useMemo(
    () => new Map(bookings.map(booking => [booking.id, booking])),
    [bookings],
  )

  const bookingDropdownOptions = useMemo(
    () => [
      {
        value: '',
        label: loadingBookings ? 'Loading bookings...' : 'Select booking...',
      },
      ...bookings.map(booking => {
        const customerName = booking.customer || 'Unknown Customer'
        const bookingLabel = booking.bookingNumber || booking.id
        return {
          value: booking.id,
          label: `${customerName} · ${bookingLabel}`,
          leftLabel: customerName,
          rightLabel: bookingLabel,
          selectedLabel: `${customerName} · ${bookingLabel}`,
          searchText: `${customerName} ${bookingLabel} ${booking.id}`,
        }
      }),
    ],
    [bookings, loadingBookings],
  )

  const paymentDropdownOptions = useMemo(() => {
    const selectedBookingId = form.bookingId.trim()
    return [
      {
        value: '',
        label: loadingPayments
          ? 'Loading payments...'
          : !selectedBookingId
            ? 'Select booking first'
            : payments.length === 0
              ? 'No payments for this booking'
              : 'Select payment...',
      },
      ...payments.map(payment => {
        const booking = bookingById.get(form.bookingId)
        const customerName = booking?.customer || 'Unknown Customer'
        const amountLabel = formatCurrency(payment.amount, payment.currency)
        const modeLabel = payment.paymentMode
          ? payment.paymentMode.replace(/_/g, ' ')
          : ''
        const paymentState = formatPaymentStateLabel(payment)
        const paymentMeta = [amountLabel, modeLabel, paymentState]
          .filter(Boolean)
          .join(' · ')
        return {
          value: payment.id,
          label: `${customerName} ${payment.referenceId} ${amountLabel}`,
          leftLabel: customerName,
          rightLabel: payment.referenceId,
          rightSubLabel: paymentMeta,
          rightSubEmphasis: payment.isVerified,
          selectedLabel: `${customerName} · ${payment.referenceId} · ${amountLabel}`,
          searchText: `${customerName} ${payment.referenceId} ${amountLabel} ${modeLabel} ${paymentState} ${payment.status}`,
        }
      }),
    ]
  }, [
    form.bookingId,
    loadingPayments,
    payments,
    bookingById,
  ])

  const financeUserOptions = useMemo(
    () => [
      {
        value: '',
        label: loadingFinanceUsers
          ? 'Loading finance users...'
          : financeUsers.length > 0
            ? 'Select finance person (optional)...'
            : 'No finance users — create an Accounts user in Settings',
      },
      ...financeUsers.map(user => ({
        value: user.id,
        label: `${user.fullName}${user.email ? ` - ${user.email}` : ''}`,
      })),
    ],
    [financeUsers, loadingFinanceUsers],
  )

  const selectedPayment = useMemo(
    () => payments.find(payment => payment.id === form.paymentId) ?? null,
    [payments, form.paymentId],
  )

  const currencyLocked = Boolean(form.bookingId.trim())

  const handleProofFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf' && !file.type.startsWith('image/')) {
      setProofUploadError('Upload a PDF or image as refund proof')
      event.target.value = ''
      return
    }

    if (file.size > MAX_REFUND_PROOF_SIZE) {
      setProofUploadError('Refund proof must be 5 MB or smaller')
      event.target.value = ''
      return
    }

    setProofUploadError('')
    setProofFile(file)
  }

  const handleSubmit = async () => {
    if (!form.bookingId || !form.paymentId || form.refundAmount === '') {
      setFormError('Select booking, payment, and refund amount.')
      return
    }
    if (selectedPayment && !selectedPayment.isVerified) {
      setFormError('Only verified payments can be refunded. Choose a verified payment reference.')
      return
    }
    if (!raisedByName) {
      setFormError('Your name could not be loaded. Refresh or sign in again.')
      return
    }

    setSaving(true)
    setFormError('')
    try {
      const assignedTo = form.assignedTo.trim()
      const payload: Record<string, string | number> = {
        bookingId: form.bookingId,
        paymentId: form.paymentId,
        raisedByName,
        refundAmount: Number(form.refundAmount),
        supplierPenalty: Number(form.supplierPenalty || 0),
        serviceCharge: Number(form.serviceCharge || 0),
        ...(assignedTo ? { assignedTo } : {}),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      }

      const requestBody = proofFile
        ? (() => {
            const formData = new FormData()
            Object.entries(payload).forEach(([key, value]) => {
              formData.append(key, String(value))
            })
            formData.append('proofFile', proofFile, proofFile.name)
            return formData
          })()
        : payload

      const response = await refundsApi.create(requestBody)
      const data =
        (response as { data?: { data?: unknown } })?.data?.data ??
        (response as { data?: unknown })?.data ??
        response
      onCreated(data)
      onClose()
    } catch (err) {
      console.error('Failed to create refund:', err)
      reportApiError(err, 'Failed to create refund', setFormError)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4'>
        <div className='my-8 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-900'>
          <div className='sticky top-0 flex items-center justify-between rounded-t-xl border-b border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Create Refund Request
          </h3>
          <button
            type='button'
            onClick={onClose}
            className='text-gray-400 hover:text-gray-600'
          >
            <FaXmark className='text-xl' />
          </button>
        </div>

        <div className='overflow-y-auto p-6 space-y-4'>
          {formError ? (
            <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
              {formError}
            </div>
          ) : null}

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Booking *
              </label>
              <SearchableDropdown
                value={form.bookingId}
                onChange={value => {
                  const selected = bookings.find(booking => booking.id === value)
                  setForm(current => ({
                    ...current,
                    bookingId: value,
                    paymentId: '',
                    refundAmount: '',
                    currency:
                      selected?.currency ?
                        String(selected.currency).toUpperCase()
                      : 'INR',
                  }))
                }}
                options={bookingDropdownOptions}
                searchPlaceholder='Booking number or ID (min 2 chars)...'
                disabled={loadingBookings}
                onSearch={searchBookings}
                onMenuOpen={() => {
                  if (bookings.length === 0 && !loadingBookings) {
                    void loadRecentBookings()
                  }
                }}
              />
            </div>
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Payment Reference *
              </label>
              <SearchableDropdown
                value={form.paymentId}
                onChange={value => {
                  const payment =
                    payments.find(item => item.id === value) || null
                  if (!payment) {
                    setForm(current => ({ ...current, paymentId: '', refundAmount: '' }))
                    return
                  }
                  setForm(current => ({
                    ...current,
                    paymentId: payment.id,
                    currency: payment.currency,
                    refundAmount: payment.amount,
                  }))
                }}
                options={paymentDropdownOptions}
                searchPlaceholder='Search payment reference...'
                disabled={loadingPayments || !form.bookingId}
              />
              {selectedPayment ? (
                <p className='mt-1 text-xs text-emerald-700 dark:text-emerald-300'>
                  Selected: {formatCurrency(selectedPayment.amount, selectedPayment.currency)}{' '}
                  ({[
                    selectedPayment.paymentMode?.replace(/_/g, ' ') || 'payment',
                    formatPaymentStateLabel(selectedPayment),
                  ].join(' · ')})
                </p>
              ) : null}
            </div>
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Assign Finance Person
              </label>
              <SearchableDropdown
                value={form.assignedTo}
                onChange={value =>
                  setForm(current => ({ ...current, assignedTo: value }))
                }
                options={financeUserOptions}
                searchPlaceholder='Search finance user...'
                disabled={loadingFinanceUsers}
              />
            </div>
            <CurrencyInput
              label='Refund Amount'
              value={form.refundAmount}
              onChange={value =>
                setForm(current => ({ ...current, refundAmount: value }))
              }
              required
            />
            <div>
              <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
                Currency
              </label>
              <SearchableDropdown
                value={form.currency}
                onChange={value =>
                  setForm(current => ({ ...current, currency: value }))
                }
                options={currencyOptions}
                searchPlaceholder='Search currency...'
                disabled={currencyLocked}
              />
              {currencyLocked ?
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  Currency comes from the booking and cannot be changed.
                </p>
              : null}
            </div>
            <CurrencyInput
              label='Supplier Penalty'
              value={form.supplierPenalty}
              onChange={value =>
                setForm(current => ({ ...current, supplierPenalty: value }))
              }
            />
            <CurrencyInput
              label='Service Charge'
              value={form.serviceCharge}
              onChange={value =>
                setForm(current => ({ ...current, serviceCharge: value }))
              }
            />
          </div>

          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
              Raised By *
            </label>
            <input
              type='text'
              readOnly
              value={raisedByName}
              className='w-full cursor-not-allowed rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800/80 dark:text-gray-200'
            />
          </div>

          <div>
            <label className='mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300'>
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={event =>
                setForm(current => ({ ...current, notes: event.target.value }))
              }
              rows={3}
              placeholder='Refund reason, proof notes, or approval context'
              className='w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900'
            />
          </div>

          <div className='rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900'>
            <p className='mb-2 text-sm font-semibold text-gray-800 dark:text-gray-100'>
              Refund Proof
            </p>
            {proofFile ? (
              <div className='flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800'>
                <div>
                  <p className='text-sm font-medium text-gray-800 dark:text-gray-100'>
                    {proofFile.name}
                  </p>
                  <p className='text-xs text-gray-500'>
                    {formatFileSize(proofFile.size)}
                  </p>
                </div>
                <button
                  type='button'
                  className='text-xs font-semibold text-red-600 hover:underline'
                  onClick={() => {
                    setProofFile(null)
                    setProofUploadError('')
                    if (proofInputRef.current) {
                      proofInputRef.current.value = ''
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <p className='text-sm text-gray-500'>
                Upload refund proof image or PDF, max 5 MB.
              </p>
            )}
            <div className='mt-3'>
              <label
                htmlFor='create-refund-proof-upload'
                className='inline-flex cursor-pointer items-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-blue-500 hover:text-blue-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              >
                Upload Proof
              </label>
              <input
                id='create-refund-proof-upload'
                ref={proofInputRef}
                type='file'
                accept='application/pdf,image/*'
                className='hidden'
                onChange={handleProofFileChange}
              />
            </div>
            {proofUploadError ? (
              <p className='mt-2 text-xs text-red-500'>{proofUploadError}</p>
            ) : null}
          </div>
        </div>

        <div className='flex justify-end gap-3 border-t border-gray-200 p-6 dark:border-gray-800'>
          <button
            type='button'
            onClick={onClose}
            className='rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200'
          >
            Cancel
          </button>
          <LoadingButton
            onClick={() => void handleSubmit()}
            loading={saving}
            loadingLabel='Creating...'
            className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
          >
            Create Refund
          </LoadingButton>
        </div>
      </div>
    </div>
  )
}

export default CreateRefundModal
