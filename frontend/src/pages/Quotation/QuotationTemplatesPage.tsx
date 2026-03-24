import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  FaChevronLeft,
  FaChevronRight,
  FaMagnifyingGlass,
  FaPlus
} from 'react-icons/fa6'
import SurfaceCard from '../../components/ui/SurfaceCard'
import EmptyState from '../../components/ui/EmptyState'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import TextInput from '../../components/form/TextInput'
import NumberInput from '../../components/form/NumberInput'
import { quotationsApi } from '../../api/quotations'
import { getApiErrorMessage } from '../../api/apiClient'

type TemplateType = 'READY_PACKAGE' | 'VISA' | 'CUSTOM_ITINERARY'

type TemplateRow = {
  id: string
  code: string
  name: string
  templateType: TemplateType
  minMarginPercent: number
  isActive: boolean
  updatedAt: string
  headerBranding?: string
  inclusions?: string
  exclusions?: string
  paymentTerms?: string
  cancellationPolicy?: string
  footerDisclaimer?: string
}

const QuotationTemplatesPage: React.FC = () => {
  const [rows, setRows] = useState<TemplateRow[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [form, setForm] = useState({
    code: '',
    name: '',
    templateType: 'READY_PACKAGE' as TemplateType,
    minMarginPercent: 0,
    isActive: true,
    headerBranding: '',
    inclusions: '',
    exclusions: '',
    paymentTerms: '',
    cancellationPolicy: '',
    footerDisclaimer: ''
  })
  const pageSize = 15

  const unwrapList = (response: unknown): any[] => {
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

  const mapTemplate = (raw: any): TemplateRow => ({
    id: String(raw?.id ?? ''),
    code: raw?.code ?? '',
    name: raw?.name ?? '',
    templateType: (raw?.templateType ??
      raw?.template_type ??
      'READY_PACKAGE') as TemplateType,
    minMarginPercent: Number(
      raw?.minMarginPercent ?? raw?.min_margin_percent ?? 0
    ),
    isActive: raw?.isActive ?? raw?.is_active ?? true,
    updatedAt: String(
      raw?.updatedAt ??
        raw?.updated_at ??
        raw?.createdAt ??
        raw?.created_at ??
        ''
    ),
    headerBranding: raw?.headerBranding ?? raw?.header_branding ?? '',
    inclusions: raw?.inclusions ?? '',
    exclusions: raw?.exclusions ?? '',
    paymentTerms: raw?.paymentTerms ?? raw?.payment_terms ?? '',
    cancellationPolicy:
      raw?.cancellationPolicy ?? raw?.cancellation_policy ?? '',
    footerDisclaimer: raw?.footerDisclaimer ?? raw?.footer_disclaimer ?? ''
  })

  const loadTemplates = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await quotationsApi.listTemplates()
      setRows(unwrapList(response).map(mapTemplate))
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load quotation templates'))
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTemplates()
  }, [loadTemplates])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(''), 1000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const filtered = useMemo(
    () =>
      rows.filter(row =>
        `${row.code} ${row.name} ${row.templateType}`
          .toLowerCase()
          .includes(search.toLowerCase())
      ),
    [rows, search]
  )

  const toTimestamp = (value?: string | null) => {
    if (!value) return 0
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }

  const ordered = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const left = toTimestamp(a.updatedAt)
        const right = toTimestamp(b.updatedAt)
        return right - left
      }),
    [filtered]
  )

  const totalPages = Math.max(1, Math.ceil(ordered.length / pageSize))
  const pageRows = ordered.slice((page - 1) * pageSize, page * pageSize)

  const templateTypeOptions = useMemo(
    () => [
      { value: 'READY_PACKAGE', label: 'READY_PACKAGE' },
      { value: 'VISA', label: 'VISA' },
      { value: 'CUSTOM_ITINERARY', label: 'CUSTOM_ITINERARY' }
    ],
    []
  )

  const openCreate = () => {
    setEditingId(null)
    setForm({
      code: '',
      name: '',
      templateType: 'READY_PACKAGE',
      minMarginPercent: 0,
      isActive: true,
      headerBranding: '',
      inclusions: '',
      exclusions: '',
      paymentTerms: '',
      cancellationPolicy: '',
      footerDisclaimer: ''
    })
    setShowForm(true)
  }

  const openEdit = (row: TemplateRow) => {
    setEditingId(row.id)
    setForm({
      code: row.code,
      name: row.name,
      templateType: row.templateType,
      minMarginPercent: row.minMarginPercent,
      isActive: row.isActive,
      headerBranding: row.headerBranding || '',
      inclusions: row.inclusions || '',
      exclusions: row.exclusions || '',
      paymentTerms: row.paymentTerms || '',
      cancellationPolicy: row.cancellationPolicy || '',
      footerDisclaimer: row.footerDisclaimer || ''
    })
    setShowForm(true)
  }

  const saveTemplate = async () => {
    if (!form.code.trim() || !form.name.trim()) {
      setError('Template code and name are required')
      return
    }

    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        templateType: form.templateType,
        minMarginPercent: Number(form.minMarginPercent || 0),
        isActive: form.isActive,
        headerBranding: form.headerBranding.trim() || undefined,
        inclusions: form.inclusions.trim() || undefined,
        exclusions: form.exclusions.trim() || undefined,
        paymentTerms: form.paymentTerms.trim() || undefined,
        cancellationPolicy: form.cancellationPolicy.trim() || undefined,
        footerDisclaimer: form.footerDisclaimer.trim() || undefined
      }

      if (editingId) {
        await quotationsApi.updateTemplate(editingId, payload)
        setNotice('Template updated')
      } else {
        await quotationsApi.createTemplate(payload)
        setNotice('Template created')
      }

      setShowForm(false)
      await loadTemplates()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to save template'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex flex-col justify-between gap-3 sm:flex-row sm:items-center'>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Quotation Templates
          </h1>
          <p className='text-sm text-gray-500'>
            Manage reusable quotation templates and default margin guardrails.
          </p>
        </div>
        <button
          onClick={openCreate}
          disabled={saving}
          className='inline-flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
        >
          <FaPlus className='mr-2' /> New Template
        </button>
      </div>

      <SurfaceCard className='p-4 border border-blue-200 bg-blue-50/60 dark:border-blue-800 dark:bg-blue-900/20'>
        <p className='text-sm text-blue-800 dark:text-blue-200'>
          How Template Works: Create/update template here, select it in
          Quotation Builder, then save quote with `templateId`. A template
          snapshot is stored on each quotation for audit-safe rendering.
        </p>
      </SurfaceCard>

      {notice ? (
        <div className='rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-200'>
          {notice}
        </div>
      ) : null}
      {error ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
          {error}
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {[
          {
            title: 'Total Templates',
            value: rows.length.toString(),
            chip: 'All'
          },
          {
            title: 'Active',
            value: rows.filter(row => row.isActive).length.toString(),
            chip: 'Live'
          },
          {
            title: 'Inactive',
            value: rows.filter(row => !row.isActive).length.toString(),
            chip: 'Disabled'
          },
          {
            title: 'Avg Min Margin',
            value: rows.length
              ? `${Math.round(
                  rows.reduce((sum, row) => sum + row.minMarginPercent, 0) /
                    rows.length
                )}%`
              : '0%',
            chip: 'Policy'
          }
        ].map(card => (
          <SurfaceCard key={card.title} hoverable className='p-5'>
            <div className='mb-2 flex justify-between'>
              <p className='text-xs uppercase tracking-wide text-gray-500'>
                {card.title}
              </p>
              <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700'>
                {card.chip}
              </span>
            </div>
            <p className='text-2xl font-semibold text-gray-900 dark:text-gray-100'>
              {card.value}
            </p>
          </SurfaceCard>
        ))}
      </div>

      {showForm ? (
        <SurfaceCard>
          <div className='mb-4 flex items-center justify-between'>
            <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
              {editingId ? 'Edit Template' : 'Create Template'}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className='rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:text-gray-200'
            >
              Close
            </button>
          </div>
          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <TextInput
              label='Template Code'
              value={form.code}
              onChange={value =>
                setForm(current => ({ ...current, code: value }))
              }
              required
            />
            <TextInput
              label='Template Name'
              value={form.name}
              onChange={value =>
                setForm(current => ({ ...current, name: value }))
              }
              required
            />
            <div>
              <label className='field-label'>Template Type</label>
              <SearchableDropdown
                value={form.templateType}
                options={templateTypeOptions}
                searchPlaceholder='Search template type...'
                onChange={value =>
                  setForm(current => ({
                    ...current,
                    templateType: value as TemplateType
                  }))
                }
              />
            </div>
            <NumberInput
              label='Min Margin %'
              value={form.minMarginPercent}
              onChange={value =>
                setForm(current => ({
                  ...current,
                  minMarginPercent: Number(value || 0)
                }))
              }
              min={0}
              step={1}
            />
            <div className='md:col-span-2'>
              <label className='field-label'>Header Branding</label>
              <textarea
                rows={2}
                className='field-input'
                value={form.headerBranding}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    headerBranding: event.target.value
                  }))
                }
                placeholder='Brand header text used in generated quotation'
              />
            </div>
            <div className='md:col-span-2'>
              <label className='field-label'>Inclusions</label>
              <textarea
                rows={3}
                className='field-input'
                value={form.inclusions}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    inclusions: event.target.value
                  }))
                }
                placeholder='Included services and terms'
              />
            </div>
            <div className='md:col-span-2'>
              <label className='field-label'>Exclusions</label>
              <textarea
                rows={3}
                className='field-input'
                value={form.exclusions}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    exclusions: event.target.value
                  }))
                }
                placeholder='Excluded services and terms'
              />
            </div>
            <div className='md:col-span-2'>
              <label className='field-label'>Payment Terms</label>
              <textarea
                rows={2}
                className='field-input'
                value={form.paymentTerms}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    paymentTerms: event.target.value
                  }))
                }
                placeholder='Payment schedule and terms'
              />
            </div>
            <div className='md:col-span-2'>
              <label className='field-label'>Cancellation Policy</label>
              <textarea
                rows={2}
                className='field-input'
                value={form.cancellationPolicy}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    cancellationPolicy: event.target.value
                  }))
                }
                placeholder='Cancellation rules and charges'
              />
            </div>
            <div className='md:col-span-2'>
              <label className='field-label'>Footer Disclaimer</label>
              <textarea
                rows={2}
                className='field-input'
                value={form.footerDisclaimer}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    footerDisclaimer: event.target.value
                  }))
                }
                placeholder='Legal / compliance footer text'
              />
            </div>
          </div>
          <div className='mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
            <label className='inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
              <input
                type='checkbox'
                checked={form.isActive}
                onChange={event =>
                  setForm(current => ({
                    ...current,
                    isActive: event.target.checked
                  }))
                }
              />
              Active Template
            </label>
            <button
              onClick={() => void saveTemplate()}
              disabled={saving}
              className='w-full rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 sm:w-auto'
            >
              {saving ? 'Saving...' : 'Save Template'}
            </button>
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard className='p-0 overflow-hidden'>
        <div className='border-b border-gray-100 p-4 dark:border-gray-800'>
          <div className='relative w-full md:w-96'>
            <FaMagnifyingGlass className='pointer-events-none absolute left-3 top-3 text-xs text-gray-400' />
            <input
              value={search}
              onChange={event => {
                setSearch(event.target.value)
                setPage(1)
              }}
              className='field-input pl-9'
              placeholder='Search code, template name, type'
            />
          </div>
        </div>

        {loading ? (
          <div className='p-4 text-sm text-gray-500'>Loading templates...</div>
        ) : pageRows.length === 0 ? (
          <div className='p-4'>
            <EmptyState
              title='No templates found'
              description='Try another search or create a new template.'
            />
          </div>
        ) : (
          <>
            <div className='overflow-x-auto'>
              <table className='w-full divide-y divide-gray-200 dark:divide-gray-800'>
                <thead className='sticky top-0 z-10 bg-gray-50 dark:bg-gray-800/95'>
                  <tr>
                    <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-5'>
                      Code
                    </th>
                    <th className='px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-5'>
                      Template Name
                    </th>
                    <th className='hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:table-cell sm:px-5'>
                      Type
                    </th>
                    <th className='hidden px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell md:px-5'>
                      Min Margin %
                    </th>
                    <th className='hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:table-cell sm:px-5'>
                      Status
                    </th>
                    <th className='hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 md:table-cell md:px-5'>
                      Updated At
                    </th>
                    <th className='px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-5'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 dark:divide-gray-800'>
                  {pageRows.map(row => (
                    <tr
                      key={row.id}
                      className='hover:bg-blue-50/30 dark:hover:bg-gray-800/40'
                    >
                      <td className='px-4 py-4 text-sm font-medium text-blue-600 dark:text-blue-300 sm:px-5'>
                        {row.code}
                      </td>
                      <td className='px-4 py-4 text-sm text-gray-800 dark:text-gray-100 sm:px-5'>
                        <div className='max-w-xs truncate'>{row.name}</div>
                      </td>
                      <td className='hidden px-4 py-4 text-sm text-gray-700 dark:text-gray-200 sm:table-cell sm:px-5'>
                        <span className='inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-700 dark:text-gray-200'>
                          {row.templateType}
                        </span>
                      </td>
                      <td className='hidden px-4 py-4 text-right text-sm font-medium text-gray-700 dark:text-gray-200 md:table-cell md:px-5'>
                        {row.minMarginPercent}%
                      </td>
                      <td className='hidden px-4 py-4 sm:table-cell sm:px-5'>
                        <StatusBadge
                          status={row.isActive ? 'Approved' : 'Draft'}
                        />
                      </td>
                      <td className='hidden px-4 py-4 text-xs text-gray-500 md:table-cell md:px-5'>
                        {row.updatedAt}
                      </td>
                      <td className='px-4 py-4 sm:px-5'>
                        <div className='flex justify-end gap-2'>
                          <button
                            onClick={() => openEdit(row)}
                            className='rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50'
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className='flex items-center justify-between border-t border-gray-100 p-4 dark:border-gray-800'>
              <p className='text-sm text-gray-500'>
                Showing {Math.min(filtered.length, (page - 1) * pageSize + 1)}-
                {Math.min(filtered.length, page * pageSize)} of{' '}
                {filtered.length}
              </p>
              <div className='flex gap-2'>
                <button
                  onClick={() => setPage(current => Math.max(1, current - 1))}
                  disabled={page === 1}
                  className='rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700'
                >
                  <FaChevronLeft />
                </button>
                <span className='rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'>
                  {page}
                </span>
                <button
                  onClick={() =>
                    setPage(current => Math.min(totalPages, current + 1))
                  }
                  disabled={page === totalPages}
                  className='rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:opacity-40 dark:border-gray-700'
                >
                  <FaChevronRight />
                </button>
              </div>
            </div>
          </>
        )}
      </SurfaceCard>
    </div>
  )
}

export default QuotationTemplatesPage
