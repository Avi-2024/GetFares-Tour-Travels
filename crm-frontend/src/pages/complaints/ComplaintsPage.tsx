import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaDownload, FaPlus } from 'react-icons/fa6'
import { FaSearch } from "react-icons/fa";
import { TextInput } from '../../components/form'
import SurfaceCard from '../../components/ui/SurfaceCard'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import Timeline from '../../components/ui/Timeline'
import EmptyState from '../../components/ui/EmptyState'
import { complaintsApi } from '../../api/complaints'
import { bookingsApi } from '../../api/bookings'
import { quotationsApi } from '../../api/quotations'
import { reportApiError } from '../../lib/notify'
import { useUsersService } from '../../hooks/useUsersService'
import { useLeadsService } from '../../hooks/useLeadsService'

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const DESKTOP_ROW_HEIGHT = 68
const DESKTOP_VIEWPORT_HEIGHT = 408
const DESKTOP_OVERSCAN = 4

type ComplaintStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'

type ComplaintRow = {
  id: string
  bookingId?: string
  bookingNumber?: string
  assignedTo?: string
  assignedToName?: string
  assignedToEmail?: string
  issueType?: string
  description?: string
  status?: ComplaintStatus | string
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  createdAt?: string
  updatedAt?: string
}

type ComplaintPagination = {
  page: number
  limit: number
  totalItems: number
  totalPages: number
}

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

const PAGE_SIZE_OPTIONS = [
  { value: '10', label: '10 rows' },
  { value: '25', label: '25 rows' },
  { value: '50', label: '50 rows' }
]

const isUuid = (value: string) => UUID_PATTERN.test(value.trim())

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

const formatStatusLabel = (value?: string) =>
  String(value || 'OPEN')
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase())

const ComplaintsPage = () => {
  const navigate = useNavigate()
  const usersService = useUsersService()
  const leadsService = useLeadsService()

  const [rows, setRows] = useState<ComplaintRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [createLoading, setCreateLoading] = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [assigneeFilter, setAssigneeFilter] = useState<string>('all')
  const [createdFrom, setCreatedFrom] = useState('')
  const [createdTo, setCreatedTo] = useState('')
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [tableScrollTop, setTableScrollTop] = useState(0)
  const [pagination, setPagination] = useState<ComplaintPagination>({
    page: 1,
    limit: 10,
    totalItems: 0,
    totalPages: 1
  })
  const [form, setForm] = useState({
    bookingId: '',
    assignedTo: '',
    issueType: '',
    description: '',
    status: 'OPEN'
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
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

  const assigneeFilterOptions = [
    { value: 'all', label: 'All Assignees' },
    ...assigneeOptions
  ]

  const fallbackBookingOptions = Array.from(
    new Set(rows.map(row => row.bookingId).filter(id => id && isUuid(id)))
  )
    .filter(id => !bookingOptions.some(option => option.value === id))
    .map(id => ({
      value: id!,
      label: shortId(id!)
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

  const statusFilterOptions = [
    { value: 'all', label: 'All Statuses' },
    ...complaintStatusOptions
  ]

  const sortOptions = [
    { value: 'createdAt', label: 'Sort by Created' },
    { value: 'status', label: 'Sort by Status' },
    { value: 'issueType', label: 'Sort by Issue' }
  ]

  const getAssigneeLabel = (userId?: string) => {
    if (!userId) return 'Unassigned'
    const user = assigneeUsers.find(item => item.id === userId)
    if (!user) return shortId(userId)
    if (user.fullName && user.email) return `${user.fullName} (${user.email})`
    return user.fullName || user.email || shortId(userId)
  }

  const getComplaintBookingLabel = (row: ComplaintRow) => {
    const meta = row.bookingId ? bookingMetaById[row.bookingId] : undefined
    const customerName = row.customerName || meta?.customerName
    const bookingNumber = row.bookingNumber || meta?.bookingNumber
    const bookingLabel = bookingNumber || (row.bookingId ? shortId(row.bookingId) : '-')
    return customerName ? `${customerName} - ${bookingLabel}` : bookingLabel
  }

  const getComplaintAssigneeLabel = (row: ComplaintRow) => {
    if (row.assignedToName && row.assignedToEmail) {
      return `${row.assignedToName} (${row.assignedToEmail})`
    }
    if (row.assignedToName) {
      return row.assignedToName
    }
    return getAssigneeLabel(row.assignedTo)
  }

  const normalizeListResponse = (
    response: unknown
  ): {
    items: ComplaintRow[]
    pagination: ComplaintPagination
  } => {
    const envelope = (response ?? {}) as {
      data?: unknown
      pagination?: Partial<ComplaintPagination>
    }
    const payload = envelope.data ?? response ?? []
    const rowsPayload =
      ((payload as { data?: unknown }).data as unknown[]) ??
      ((payload as { items?: unknown }).items as unknown[]) ??
      (Array.isArray(payload) ? payload : [])

    const items = (Array.isArray(rowsPayload) ? rowsPayload : [])
      .map(raw => {
        const item = (raw ?? {}) as Record<string, unknown>
        const id = String(item.id ?? '').trim()
        if (!id) return null
        return {
          id,
          bookingId: String(item.bookingId ?? item.booking_id ?? '') || undefined,
          bookingNumber:
            String(item.bookingNumber ?? item.booking_number ?? '') || undefined,
          assignedTo:
            String(item.assignedTo ?? item.assigned_to ?? '') || undefined,
          assignedToName:
            String(item.assignedToName ?? item.assigned_to_name ?? '') || undefined,
          assignedToEmail:
            String(item.assignedToEmail ?? item.assigned_to_email ?? '') || undefined,
          issueType:
            String(item.issueType ?? item.issue_type ?? '') || undefined,
          description: String(item.description ?? '') || undefined,
          status: String(item.status ?? '') || undefined,
          customerName:
            String(item.customerName ?? item.customer_name ?? '') || undefined,
          customerEmail:
            String(item.customerEmail ?? item.customer_email ?? '') || undefined,
          customerPhone:
            String(item.customerPhone ?? item.customer_phone ?? '') || undefined,
          createdAt: String(item.createdAt ?? item.created_at ?? '') || undefined,
          updatedAt: String(item.updatedAt ?? item.updated_at ?? '') || undefined
        } as ComplaintRow
      })
      .filter(Boolean) as ComplaintRow[]

    const payloadObject =
      typeof payload === 'object' && payload !== null
        ? (payload as { pagination?: Partial<ComplaintPagination> })
        : {}
    const parsedPagination =
      envelope.pagination ?? payloadObject.pagination ?? {}

    return {
      items,
      pagination: {
        page: Number(parsedPagination.page ?? page),
        limit: Number(parsedPagination.limit ?? pageSize),
        totalItems: Number(parsedPagination.totalItems ?? items.length),
        totalPages: Number(
          parsedPagination.totalPages ??
            Math.max(1, Math.ceil(items.length / pageSize))
        )
      }
    }
  }

  const visibleDesktopRows = useMemo(() => {
    const startIndex = Math.max(
      0,
      Math.floor(tableScrollTop / DESKTOP_ROW_HEIGHT) - DESKTOP_OVERSCAN
    )
    const endIndex = Math.min(
      rows.length,
      Math.ceil((tableScrollTop + DESKTOP_VIEWPORT_HEIGHT) / DESKTOP_ROW_HEIGHT) +
        DESKTOP_OVERSCAN
    )
    return {
      startIndex,
      items: rows.slice(startIndex, endIndex)
    }
  }, [rows, tableScrollTop])

  const timelineItems = useMemo(
    () =>
      rows.slice(0, 5).map(row => ({
        id: `timeline-${row.id}`,
        title:
          row.customerName ||
          bookingMetaById[row.bookingId || '']?.customerName ||
          row.issueType ||
          'Complaint created',
        meta: `${formatStatusLabel(row.status)}${row.assignedTo || row.assignedToName ? ` | ${getComplaintAssigneeLabel(row)}` : ''}`,
        time: row.createdAt
          ? new Date(row.createdAt).toLocaleString()
          : 'Recently',
        description:
          row.description?.slice(0, 120) ||
          `${row.issueType || 'Complaint'} | ${getComplaintBookingLabel(row)}`
      })),
    [rows, bookingMetaById, assigneeUsers]
  )

  const loadComplaints = useCallback(async () => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      setRows([])
      setPagination({
        page: 1,
        limit: pageSize,
        totalItems: 0,
        totalPages: 1
      })
      return
    }

    try {
      setListLoading(true)
      setError('')
      const response = await complaintsApi.list({
        page,
        limit: pageSize,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
        ...(assigneeFilter !== 'all' ? { assignedTo: assigneeFilter } : {}),
        ...(createdFrom ? { createdFrom } : {}),
        ...(createdTo ? { createdTo } : {}),
        sortBy,
        sortOrder
      })
      const normalized = normalizeListResponse(response)
      setRows(normalized.items)
      setPagination(normalized.pagination)
    } catch (err) {
      reportApiError(err, 'Unable to load complaints', setError)
    } finally {
      setListLoading(false)
    }
  }, [
    assigneeFilter,
    createdFrom,
    createdTo,
    debouncedSearch,
    page,
    pageSize,
    sortBy,
    sortOrder,
    statusFilter
  ])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchTerm.trim())
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    void loadComplaints()
  }, [loadComplaints])

  useEffect(() => {
    setTableScrollTop(0)
  }, [rows, page, pageSize])

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
          const phone = (lead as Record<string, unknown>)?.phone || (lead as Record<string, unknown>)?.mobile
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
      } catch (_err) {
        // keep page usable
      } finally {
        setLoadingBookings(false)
      }
    }

    void loadBookingOptions()
  }, [leadsService])

  useEffect(() => {
    const loadAssignees = async () => {
      if (!localStorage.getItem('auth_token')) return
      try {
        setLoadingUsers(true)
        const response = await usersService.list()
        const list = ((response as { data?: AssignableUser[] }).data ?? [])
          .filter(user => user?.id)
          .filter(user => user.isActive !== false)
        setAssigneeUsers(list)
      } catch (_err) {
        // keep page usable
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

    if (!localStorage.getItem('auth_token')) {
      setError('Authentication required. Please login to create complaints.')
      return
    }

    try {
      setCreateLoading(true)
      setError('')
      setSuccess('')

      await complaintsApi.create({
        bookingId: bookingId || undefined,
        assignedTo: assignedTo || undefined,
        issueType,
        description,
        status: form.status
      })

      setForm({
        bookingId: '',
        assignedTo: '',
        issueType: '',
        description: '',
        status: 'OPEN'
      })
      setSuccess('Complaint created successfully!')
      if (page === 1) {
        await loadComplaints()
      } else {
        setPage(1)
      }
    } catch (err) {
      reportApiError(err, 'Failed to create complaint. Please try again.', setError)
    } finally {
      setCreateLoading(false)
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
          onClick={() => {
            if (!rows.length) return
            const headers = ['ID', 'Booking', 'Issue', 'Status']
            const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`
            const dataRows = rows.map(row => [
              row.id ?? '',
              getComplaintBookingLabel(row),
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
          }}
          disabled={!rows.length}
          className='inline-flex items-center justify-center rounded-xl border border-green-500 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed disabled:opacity-50 dark:border-green-400 dark:text-gray-200 dark:hover:bg-gray-800'
        >
          <FaDownload className='mr-2' /> Export
        </button>
      </div>

      {!localStorage.getItem('auth_token') ? (
        <div className='p-4 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg'>
          <p className='text-sm text-yellow-800 dark:text-yellow-300'>
            Login required for complaints data.
          </p>
        </div>
      ) : null}

      <SurfaceCard>
        <h2 className='mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100'>
          Raise Complaint
        </h2>
        <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
          <div>
            <label className='field-label'>Booking</label>
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
        {error ? (
          <div className='mt-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between'>
            <p className='text-sm text-red-600 dark:text-red-400'>{error}</p>
            <button
              onClick={() => setError('')}
              className='text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 ml-2'
            >
              x
            </button>
          </div>
        ) : null}
        {success ? (
          <div className='mt-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg flex items-center justify-between'>
            <p className='text-sm text-green-600 dark:text-green-400'>
              {success}
            </p>
            <button
              onClick={() => setSuccess('')}
              className='text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 ml-2'
            >
              x
            </button>
          </div>
        ) : null}
        <button
          onClick={createComplaint}
          disabled={createLoading}
          className='mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          <FaPlus className='mr-2 inline' />{' '}
          {createLoading ? 'Creating...' : 'Create Complaint'}
        </button>
      </SurfaceCard>

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-2'>
        <SurfaceCard className='p-0 overflow-hidden'>
          <div className='border-b border-gray-100 px-5 py-4 dark:border-gray-800 space-y-3'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
              <h3 className='text-sm font-semibold text-gray-900 dark:text-gray-100'>
                Complaints
              </h3>
              <div className='relative w-full sm:max-w-xs'>
                <FaSearch className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-400' />
                <input
                  value={searchTerm}
                  onChange={event => {
                    setPage(1)
                    setSearchTerm(event.target.value)
                  }}
                  placeholder='Search complaints...'
                  className='w-full rounded-lg border border-gray-200 bg-white px-3 py-2 pl-9 text-xs text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3'>
              <SearchableDropdown
                value={statusFilter}
                options={statusFilterOptions}
                onChange={value => {
                  setPage(1)
                  setStatusFilter(value)
                }}
                searchPlaceholder='Search status...'
              />
              <SearchableDropdown
                value={assigneeFilter}
                options={assigneeFilterOptions}
                onChange={value => {
                  setPage(1)
                  setAssigneeFilter(value)
                }}
                searchPlaceholder='Search assignee...'
              />
              <SearchableDropdown
                value={sortBy}
                options={sortOptions}
                onChange={value => {
                  setPage(1)
                  setSortBy(value)
                }}
                searchPlaceholder='Search sort...'
              />
              <input
                type='date'
                value={createdFrom}
                onChange={event => {
                  setPage(1)
                  setCreatedFrom(event.target.value)
                }}
                className='w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              />
              <input
                type='date'
                value={createdTo}
                onChange={event => {
                  setPage(1)
                  setCreatedTo(event.target.value)
                }}
                className='w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200'
              />
              <button
                onClick={() => {
                  setPage(1)
                  setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
                }}
                className='rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
              >
                {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
          </div>

          {listLoading && rows.length === 0 ? (
            <div className='px-5 py-5 space-y-3'>
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className='h-14 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse'
                />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title='No complaints found'
              description='Try another search or filter.'
              className='py-12'
            />
          ) : (
            <>
              <div className='sm:hidden divide-y divide-gray-100 dark:divide-gray-800'>
                {rows.map(row => {
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
                          {row.customerName || bookingMetaById[row.bookingId || '']?.customerName ? (
                            <p className='mt-1 text-xs font-medium text-gray-700 dark:text-gray-200 truncate'>
                              {row.customerName || bookingMetaById[row.bookingId || '']?.customerName}
                            </p>
                          ) : null}
                          <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                            {getComplaintBookingLabel(row)}
                          </p>
                        <p className='mt-1 text-[11px] text-blue-600 dark:text-blue-300'>
                            Complaint {shortId(row.id)}
                        </p>
                        <p className='mt-1 text-[11px] text-gray-500 dark:text-gray-400'>
                          {getComplaintAssigneeLabel(row)}
                        </p>
                        </div>
                        <span className='inline-flex rounded-full bg-gray-100 px-2 py-1 text-[10px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200'>
                          {row.status}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>

              <div className='hidden sm:block'>
                <div className='grid grid-cols-[1.35fr_1.6fr_1.1fr_1.2fr_0.9fr] gap-3 border-b border-gray-200 bg-gray-50 px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:border-gray-800 dark:bg-gray-800/95'>
                  <div>Complaint</div>
                  <div>Booking</div>
                  <div>Issue</div>
                  <div>Assignee</div>
                  <div>Status</div>
                </div>
                <div
                  className='overflow-y-auto'
                  style={{ maxHeight: `${DESKTOP_VIEWPORT_HEIGHT}px` }}
                  onScroll={event => setTableScrollTop(event.currentTarget.scrollTop)}
                >
                  <div
                    className='relative'
                    style={{ height: `${rows.length * DESKTOP_ROW_HEIGHT}px` }}
                  >
                    {visibleDesktopRows.items.map((row, index) => {
                      const absoluteIndex = visibleDesktopRows.startIndex + index
                      return (
                        <div
                          key={row.id}
                          role='button'
                          tabIndex={0}
                          onClick={() => navigate(`/complaints/${row.id}`)}
                          onKeyDown={event => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              navigate(`/complaints/${row.id}`)
                            }
                          }}
                          className='absolute inset-x-0 grid grid-cols-[1.35fr_1.6fr_1.1fr_1.2fr_0.9fr] gap-3 border-b border-gray-100 px-5 py-4 text-xs cursor-pointer hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50'
                          style={{
                            top: `${absoluteIndex * DESKTOP_ROW_HEIGHT}px`,
                            height: `${DESKTOP_ROW_HEIGHT}px`
                          }}
                        >
                          <div className='min-w-0'>
                            <p className='font-medium text-gray-900 dark:text-gray-100 truncate'>
                              {row.issueType || 'Complaint'}
                            </p>
                            <p className='mt-1 text-[11px] text-blue-600 dark:text-blue-300 truncate'>
                              {shortId(row.id)}
                            </p>
                          </div>
                          <div className='text-gray-700 dark:text-gray-200'>
                            {row.customerName || bookingMetaById[row.bookingId || '']?.customerName ? (
                              <div className='leading-tight'>
                                <p className='font-medium text-gray-900 dark:text-gray-100'>
                                  {row.customerName || bookingMetaById[row.bookingId || '']?.customerName}
                                </p>
                                <p className='mt-1 text-[11px] text-gray-500 dark:text-gray-400'>
                                  {row.bookingNumber || row.bookingId || '-'}
                                </p>
                              </div>
                            ) : (
                              <span>{getComplaintBookingLabel(row)}</span>
                            )}
                          </div>
                          <div className='text-gray-700 dark:text-gray-200 truncate'>
                            {row.issueType}
                          </div>
                          <div className='text-gray-700 dark:text-gray-200 truncate'>
                            {getComplaintAssigneeLabel(row)}
                          </div>
                          <div className='text-gray-700 dark:text-gray-200'>
                            {formatStatusLabel(row.status)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          <div className='flex flex-col gap-3 border-t border-gray-200 px-5 py-4 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between'>
            <p className='text-xs text-gray-500'>
              Showing{' '}
              {pagination.totalItems === 0
                ? 0
                : Math.min(
                    pagination.totalItems,
                    (pagination.page - 1) * pagination.limit + 1
                  )}
              -
              {Math.min(
                pagination.totalItems,
                pagination.page * pagination.limit
              )}{' '}
              of {pagination.totalItems}
            </p>
            <div className='flex flex-col gap-2 sm:flex-row sm:items-center'>
              <SearchableDropdown
                value={String(pageSize)}
                options={PAGE_SIZE_OPTIONS}
                onChange={value => {
                  setPage(1)
                  setPageSize(Number(value))
                }}
                className='min-w-[120px]'
                searchPlaceholder='Rows...'
              />
              <div className='flex items-center gap-2'>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                  className='p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40'
                >
                  &lt;
                </button>
                <span className='px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 text-sm font-medium'>
                  {pagination.page}
                </span>
                <button
                  onClick={() =>
                    setPage(p => Math.min(pagination.totalPages, p + 1))
                  }
                  disabled={pagination.page >= pagination.totalPages}
                  className='p-2 rounded-lg border border-gray-200 text-gray-600 disabled:opacity-40'
                >
                  &gt;
                </button>
              </div>
            </div>
          </div>
        </SurfaceCard>

        <SurfaceCard>
          <h2 className='mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Recent Complaint Activity
          </h2>
          {timelineItems.length ? (
            <Timeline items={timelineItems} />
          ) : (
            <EmptyState
              title='No recent activity'
              description='Complaint activity appears here after records load.'
              className='py-8'
            />
          )}
        </SurfaceCard>
      </div>
    </div>
  )
}

export default ComplaintsPage
