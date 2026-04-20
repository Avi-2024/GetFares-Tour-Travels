import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaPlus, FaDownload } from 'react-icons/fa6'
import { TextInput } from '../../components/form'
import SurfaceCard from '../../components/ui/SurfaceCard'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import Timeline from '../../components/ui/Timeline'
import { complaintsApi } from '../../api/complaints'
import { bookingsApi } from '../../api/bookings'
import { quotationsApi } from '../../api/quotations'
import { reportApiError } from '../../lib/notify'
import { useUsersService } from '../../hooks/useUsersService'
import { useLeadsService } from '../../hooks/useLeadsService'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isUuid = (value: string) => UUID_PATTERN.test(value.trim())

const complaintsSeed = [
  {
    id: 'cmp-1',
    bookingId: 'BK-2034',
    issueType: 'Hotel downgrade',
    description: 'Client reported mismatch in room type.',
    status: 'OPEN'
  },
  {
    id: 'cmp-2',
    bookingId: 'BK-2030',
    issueType: 'Transfer delay',
    description: 'Airport transfer reached late.',
    status: 'IN_PROGRESS'
  }
]

type AssignableUser = {
  id: string
  fullName?: string
  email?: string
  isActive?: boolean
}

type BookingRecord = {
  id?: string
  bookingNumber?: string
  quotationId?: string
  quotation_id?: string
  email?: string
  customerEmail?: string
  customer_email?: string
  phone?: string
  customerPhone?: string
  customer_phone?: string
  customer?: {
    email?: string
    phone?: string
  }
}

type QuotationRecord = {
  id?: string
  leadId?: string
  lead_id?: string
}

type LeadRecord = {
  id?: string
  fullName?: string
  customerName?: string
  name?: string
  email?: string
}

type BookingOption = {
  value: string
  label: string
}

type BookingMeta = {
  customerName?: string
  bookingNumber?: string
  customerEmail?: string
  customerPhone?: string
}

const extractRows = <T,>(response: unknown): T[] => {
  const payload = response as {
    data?: { data?: T[]; items?: T[] } | T[]
  }
  const data =
    (payload?.data as { data?: T[]; items?: T[] })?.data ??
    (payload?.data as { data?: T[]; items?: T[] })?.items ??
    payload?.data ??
    response
  return Array.isArray(data) ? (data as T[]) : []
}

const shortId = (value: string) =>
  value.length > 12 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value

const ComplaintsPage = () => {
  const navigate = useNavigate()
  const usersService = useUsersService()
  const leadsService = useLeadsService()
  const [rows, setRows] = useState(complaintsSeed)
  const [loading, setLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [showAllRows, setShowAllRows] = useState(false)
  const [page, setPage] = useState(1)
  const [form, setForm] = useState({
    bookingId: '',
    assignedTo: '',
    issueType: '',
    description: '',
    status: 'OPEN'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [assigneeUsers, setAssigneeUsers] = useState<AssignableUser[]>([])
  const [bookingOptions, setBookingOptions] = useState<BookingOption[]>([])
  const [bookingMetaById, setBookingMetaById] = useState<
    Record<string, BookingMeta>
  >({})
  const assigneeOptions = assigneeUsers.map(user => ({
    value: user.id,
    label: user.fullName
      ? `${user.fullName}${user.email ? ` (${user.email})` : ''}`
      : user.email || user.id
  }))
  const fallbackBookingOptions = Array.from(
    new Set(rows.map(row => row.bookingId).filter(id => isUuid(id || '')))
  )
    .filter(id => !bookingOptions.some(option => option.value === id))
    .map(id => ({
      value: id,
      label: shortId(id)
    }))
  const mergedBookingOptions = [...bookingOptions, ...fallbackBookingOptions]
  const bookingDropdownOptions = [
    {
      value: '',
      label: loadingBookings ? 'Loading bookings...' : 'Select booking'
    },
    ...mergedBookingOptions
  ]
  const assigneeDropdownOptions = [
    { value: '', label: loadingUsers ? 'Loading assignees...' : 'Select user' },
    ...assigneeOptions
  ]
  const complaintStatusOptions = [
    { value: 'OPEN', label: 'OPEN' },
    { value: 'IN_PROGRESS', label: 'IN_PROGRESS' },
    { value: 'RESOLVED', label: 'RESOLVED' }
  ]

  const formatBookingDisplay = (bookingId?: string) => {
    if (!bookingId) return '-'
    const meta = bookingMetaById[bookingId]
    if (!meta) return bookingId
    const bookingLabel = meta.bookingNumber || shortId(bookingId)
    return meta.customerName
      ? `${meta.customerName} - ${bookingLabel}`
      : bookingLabel
  }

  const exportAllRows = () => {
    if (!rows.length) return

    const headers = ['ID', 'Booking', 'Issue', 'Status']
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`

    const dataRows = rows.map(row => [
      row.id ?? '',
      formatBookingDisplay(row.bookingId),
      row.issueType ?? '',
      row.status ?? ''
    ])

    const csv = [headers, ...dataRows]
      .map(row => row.map(cell => escapeCsv(String(cell))).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const filteredRows = rows.filter(row => {
    const query = searchTerm.trim().toLowerCase()
    if (!query) return true
    const bookingDisplay = formatBookingDisplay(row.bookingId)
    const bookingMeta = bookingMetaById[row.bookingId || '']
    const createdAtText = (row as any)?.createdAt
      ? new Date((row as any).createdAt).toLocaleDateString()
      : ''
    const createdAtIso = (row as any)?.createdAt
      ? new Date((row as any).createdAt).toISOString().split('T')[0]
      : ''
    const haystack = [
      row.id,
      row.bookingId,
      bookingDisplay,
      row.issueType,
      row.status,
      (row as any)?.description ?? '',
      bookingMeta?.customerName ?? '',
      bookingMeta?.customerEmail ?? '',
      bookingMeta?.customerPhone ?? '',
      createdAtText,
      createdAtIso
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })

  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const paginatedRows = filteredRows.slice(
    (page - 1) * pageSize,
    page * pageSize
  )
  const displayRows = showAllRows ? paginatedRows : filteredRows.slice(0, 3)

  useEffect(() => {
    if (!showAllRows) {
      setPage(1)
    }
  }, [showAllRows, rows.length])

  // Fetch complaints on mount
  useEffect(() => {
    const fetchComplaints = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        console.log('No auth token found, using seed data')
        return
      }

      try {
        setLoading(true)
        const response: any = await complaintsApi.list()
        if (response?.data && Array.isArray(response.data)) {
          setRows(response.data)
        } else if (Array.isArray(response)) {
          setRows(response)
        }
      } catch (err) {
        console.error('Failed to fetch complaints:', err)
        reportApiError(
          err,
          'Authentication required. Please login to view complaints.',
          setError
        )
        // Keep using seed data on error
      } finally {
        setLoading(false)
      }
    }

    fetchComplaints()
  }, [leadsService])

  useEffect(() => {
    const loadBookingOptions = async () => {
      if (!localStorage.getItem('auth_token')) return
      try {
        setLoadingBookings(true)
        const [bookingsResult, quotationsResult, leadsResult] =
          await Promise.allSettled([
            bookingsApi.list({ page: 1, limit: 500 }),
            quotationsApi.list({ page: 1, limit: 500 }),
            leadsService.listLeadsRaw({ page: 1, limit: 500 })
          ])

        const bookingRows =
          bookingsResult.status === 'fulfilled'
            ? extractRows<BookingRecord>(bookingsResult.value)
            : []
        const quotationRows =
          quotationsResult.status === 'fulfilled'
            ? extractRows<QuotationRecord>(quotationsResult.value)
            : []
        const leadRows =
          leadsResult.status === 'fulfilled'
            ? extractRows<LeadRecord>(leadsResult.value)
            : []

        const quotationToLead = new Map<string, string>()
        quotationRows.forEach(quotation => {
          const quotationId = quotation.id
          const leadId = quotation.leadId || quotation.lead_id
          if (quotationId && leadId) {
            quotationToLead.set(quotationId, leadId)
          }
        })

        const leadNameById = new Map<string, string>()
        const leadEmailById = new Map<string, string>()
        const leadPhoneById = new Map<string, string>()
        leadRows.forEach(lead => {
          const leadId = lead.id
          const leadName =
            lead.fullName || lead.customerName || lead.name || lead.email
          if (leadId && leadName) {
            leadNameById.set(leadId, leadName)
          }
          if (leadId && lead.email) {
            leadEmailById.set(leadId, lead.email)
          }
          const phone = (lead as any)?.phone || (lead as any)?.mobile
          if (leadId && phone) {
            leadPhoneById.set(leadId, String(phone))
          }
        })

        const optionsMap = new Map<string, BookingOption>()
        const bookingMeta: Record<string, BookingMeta> = {}

        bookingRows.forEach(booking => {
          const bookingId = booking.id
          if (!bookingId) return

          const quotationId = booking.quotationId || booking.quotation_id
          const leadId = quotationId ? quotationToLead.get(quotationId) : null
          const customerName = leadId ? leadNameById.get(leadId) : undefined
          const bookingNumber = booking.bookingNumber
          const bookingLabel = bookingNumber || shortId(bookingId)
          const label = customerName
            ? `${customerName} - ${bookingLabel}`
            : bookingLabel

          optionsMap.set(bookingId, {
            value: bookingId,
            label
          })

          bookingMeta[bookingId] = {
            customerName,
            bookingNumber,
            customerEmail:
              booking.email ||
              booking.customerEmail ||
              booking.customer_email ||
              booking.customer?.email ||
              (leadId ? leadEmailById.get(leadId) : '') ||
              '',
            customerPhone:
              booking.phone ||
              booking.customerPhone ||
              booking.customer_phone ||
              booking.customer?.phone ||
              (leadId ? leadPhoneById.get(leadId) : '') ||
              ''
          }
        })

        setBookingOptions(
          Array.from(optionsMap.values()).sort((a, b) =>
            a.label.localeCompare(b.label)
          )
        )
        setBookingMetaById(bookingMeta)
      } catch (err) {
        console.error('Failed to load bookings for complaint form:', err)
      } finally {
        setLoadingBookings(false)
      }
    }

    void loadBookingOptions()
  }, [])

  useEffect(() => {
    const loadAssignees = async () => {
      if (!localStorage.getItem('auth_token')) return
      try {
        setLoadingUsers(true)
        const response = await usersService.list()
        const rows = ((response as { data?: AssignableUser[] }).data ?? [])
          .filter(user => user?.id)
          .filter(user => user.isActive !== false)
        setAssigneeUsers(rows)
      } catch (err) {
        console.error('Failed to load assignees:', err)
      } finally {
        setLoadingUsers(false)
      }
    }

    void loadAssignees()
  }, [usersService])

  const createComplaint = async () => {
    const bookingId = form.bookingId.trim()
    const assignedTo = form.assignedTo.trim()
    const issueType = form.issueType.trim()
    const description = form.description.trim()

    if (!issueType || issueType.length < 2) {
      setError('Issue Type must be at least 2 characters.')
      return
    }

    if (!description || description.length < 5) {
      setError('Description must be at least 5 characters.')
      return
    }

    if (bookingId && !isUuid(bookingId)) {
      setError('Booking ID must be a valid UUID.')
      return
    }

    if (assignedTo && !isUuid(assignedTo)) {
      setError('Assigned To must be a valid User UUID.')
      return
    }

    const token = localStorage.getItem('auth_token')
    if (!token) {
      setError('Authentication required. Please login to create complaints.')
      return
    }

    try {
      setLoading(true)
      setError('')
      setSuccess('')

      const payload = {
        bookingId: bookingId || undefined,
        assignedTo: assignedTo || undefined,
        issueType,
        description,
        status: form.status
      }

      const response: any = await complaintsApi.create(payload)
      const newComplaint = response?.data || response

      // Add to local state
      if (newComplaint && newComplaint.id) {
        setRows(current => [newComplaint, ...current])
        setSuccess('Complaint created successfully!')

        // Reset form
        setForm({
          bookingId: '',
          assignedTo: '',
          issueType: '',
          description: '',
          status: 'OPEN'
        })
      } else {
        // If no proper response, refetch the list
        const listResponse: any = await complaintsApi.list()
        if (listResponse?.data && Array.isArray(listResponse.data)) {
          setRows(listResponse.data)
        } else if (Array.isArray(listResponse)) {
          setRows(listResponse)
        }
        setSuccess('Complaint created successfully!')

        // Reset form anyway
        setForm({
          bookingId: '',
          assignedTo: '',
          issueType: '',
          description: '',
          status: 'OPEN'
        })
      }
    } catch (err) {
      console.error('Failed to create complaint:', err)
      reportApiError(
        err,
        'Failed to create complaint. Please try again.',
        setError
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-start justify-between gap-3'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Complaints
          </h1>
          <p className='text-sm text-gray-500'>
            Track post-sales complaints and activity trail.
          </p>
        </div>
        <button
          onClick={exportAllRows}
          disabled={!rows.length}
          className='inline-flex items-center justify-center rounded-xl border border-green-500 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:text-gray-200 dark:hover:bg-gray-800'
        >
          <FaDownload className='mr-2' /> Export
        </button>
      </div>

      {!localStorage.getItem('auth_token') && (
        <div className='p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
          <p className='text-sm text-yellow-800 dark:text-yellow-300'>
            ⚠️ You are viewing sample data. Please login to access real
            complaints data.
          </p>
        </div>
      )}

      <SurfaceCard>
        <h2 className='mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100'>
          Raise Complaint
        </h2>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <label className='field-label'>Booking ID</label>
            <SearchableDropdown
              value={form.bookingId}
              options={bookingDropdownOptions}
              onChange={value =>
                setForm(current => ({ ...current, bookingId: value }))
              }
              searchPlaceholder='Search booking...'
            />
          </div>
          <div>
            <label className='field-label'>Assigned To</label>
            <SearchableDropdown
              value={form.assignedTo}
              options={assigneeDropdownOptions}
              onChange={value =>
                setForm(current => ({ ...current, assignedTo: value }))
              }
              searchPlaceholder='Search assignee...'
            />
          </div>
          <TextInput
            label='Issue Type'
            value={form.issueType}
            onChange={value =>
              setForm(current => ({ ...current, issueType: value }))
            }
            required
            error={!form.issueType && error ? 'Required' : ''}
          />
          <div>
            <label className='field-label'>Status</label>
            <SearchableDropdown
              value={form.status}
              options={complaintStatusOptions}
              onChange={value =>
                setForm(current => ({
                  ...current,
                  status: value
                }))
              }
              searchPlaceholder='Search status...'
            />
          </div>
          <div className='md:col-span-2'>
            <label className='field-label'>Description</label>
            <textarea
              className='field-input'
              rows={3}
              value={form.description}
              onChange={event =>
                setForm(current => ({
                  ...current,
                  description: event.target.value
                }))
              }
            />
          </div>
        </div>
        {error && (
          <div className='mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between'>
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            <button
              onClick={() => setError('')}
              className='text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 ml-2'
            >
              ×
            </button>
          </div>
        )}
        {success && (
          <div className='mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between'>
            <p className='text-sm text-green-600 dark:text-green-400'>
              {success}
            </p>
            <button
              onClick={() => setSuccess('')}
              className='text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 ml-2'
            >
              ×
            </button>
          </div>
        )}
        <button
          onClick={createComplaint}
          disabled={loading}
          className='mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <FaPlus className='mr-2 inline' />{' '}
          {loading ? 'Creating...' : 'Create Complaint'}
        </button>
      </SurfaceCard>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <SurfaceCard className='p-0 overflow-hidden'>
          <div className='flex flex-col gap-3 border-b border-gray-100 px-5 py-3 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between'>
            <div className='flex items-center justify-between sm:justify-start sm:gap-3'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                Complaints
              </h3>
              {filteredRows.length > 3 ? (
                <button
                  onClick={() => setShowAllRows(value => !value)}
                  className='text-xs font-medium text-blue-600 hover:text-blue-700'
                >
                  {showAllRows ? 'Show Less' : 'View All'}
                </button>
              ) : null}
            </div>
            <div className='relative w-full sm:max-w-xs'>
              <input
                value={searchTerm}
                onChange={event => {
                  setSearchTerm(event.target.value)
                  setPage(1)
                }}
                placeholder='Search complaints...'
                className='w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              />
            </div>
          </div>
          {loading && rows.length === 0 ? (
            <div className='flex items-center justify-center py-12'>
              <div className='text-center'>
                <div className='w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2'></div>
                <p className='text-sm text-gray-500'>Loading complaints...</p>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <div className='flex items-center justify-center py-12'>
              <p className='text-sm text-gray-500'>No complaints found</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className='divide-y divide-gray-100 dark:divide-gray-800 sm:hidden'>
                {displayRows.map(row => (
                  (() => {
                    const bookingMeta = bookingMetaById[row.bookingId || '']
                    return (
                  <button
                    key={row.id}
                    onClick={() => navigate(`/complaints/${row.id}`)}
                    className='w-full text-left px-5 py-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  >
                    <div className='flex items-start justify-between gap-3'>
                      <div className='min-w-0'>
                        <p className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                          {row.issueType}
                        </p>
                        {bookingMeta?.customerName ? (
                          <p className='mt-1 text-xs font-medium text-gray-700 dark:text-gray-200 truncate'>
                            {bookingMeta.customerName}
                          </p>
                        ) : null}
                        <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                          {formatBookingDisplay(row.bookingId)}
                        </p>
                        <p className='mt-1 text-[11px] text-blue-600 dark:text-blue-300'>
                          {row.id}
                        </p>
                      </div>
                      <span className='inline-flex rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200'>
                        {row.status}
                      </span>
                    </div>
                  </button>
                    )
                  })()
                ))}
              </div>

              {/* Desktop table */}
              <table className='hidden w-full divide-y divide-gray-200 dark:divide-gray-800 sm:table'>
                <thead className='bg-gray-50 dark:bg-gray-800/95'>
                  <tr>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      ID
                    </th>
                    <th className='px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Booking
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Issue
                    </th>
                    <th className='px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500'>
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {displayRows.map(row => {
                    const bookingMeta = bookingMetaById[row.bookingId || '']
                    const bookingLabel =
                      bookingMeta?.bookingNumber || row.bookingId || '-'
                    return (
                    <tr
                      key={row.id}
                      onClick={() => navigate(`/complaints/${row.id}`)}
                      className='cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors'
                    >
                      <td className='px-5 py-4 text-xs font-medium text-blue-600 dark:text-blue-300'>
                        {row.id}
                      </td>
                      <td className='px-3 py-4 text-xs text-gray-700 dark:text-gray-200'>
                        {bookingMeta?.customerName ? (
                          <div className='leading-tight'>
                            <p className='font-medium text-gray-900 dark:text-gray-100'>
                              {bookingMeta.customerName}
                            </p>
                            <p className='mt-1 text-[11px] text-gray-500 dark:text-gray-400'>
                              {bookingLabel}
                            </p>
                          </div>
                        ) : (
                          <span>{formatBookingDisplay(row.bookingId)}</span>
                        )}
                      </td>
                      <td className='px-5 py-4 text-xs text-gray-700 dark:text-gray-200'>
                        {row.issueType}
                      </td>
                      <td className='px-5 py-4 text-xs text-gray-700 dark:text-gray-200'>
                        {row.status}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
              {showAllRows ? (
                <div className='flex items-center justify-between px-5 py-4 border-t border-gray-200 dark:border-gray-800'>
                  <p className='text-xs text-gray-500'>
                    Showing {Math.min(rows.length, (page - 1) * pageSize + 1)}-
                    {Math.min(rows.length, page * pageSize)} of {rows.length}
                  </p>
                  <div className='flex items-center gap-2'>
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className='p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40'
                    >
                      &lt;
                    </button>
                    <span className='px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium'>
                      {page}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className='p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40'
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <h2 className='mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Latest Activity
          </h2>
          <Timeline
            items={[
              {
                id: 'act-1',
                title: 'Complaint created',
                meta: 'Operations',
                time: 'Today, 10:10 AM',
                description: 'Issue tagged and assigned to support queue.'
              },
              {
                id: 'act-2',
                title: 'Customer called',
                meta: 'Support Agent',
                time: 'Today, 11:30 AM',
                description:
                  'Explained resolution timeline and requested invoice copy.'
              }
            ]}
          />
        </SurfaceCard>
      </div>
    </div>
  )
}

export default ComplaintsPage
