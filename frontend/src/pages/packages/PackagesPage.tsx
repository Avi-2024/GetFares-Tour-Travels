import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { FaBoxOpen, FaGlobe, FaPlus, FaSave } from 'react-icons/fa'
import SurfaceCard from '../../components/ui/SurfaceCard'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { getApiErrorMessage } from '../../api/apiClient'
import { usePackagesService } from '../../hooks/usePackagesService'
import type {
  PackageCategory,
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

type PackageFormState = {
  name: string
  destination: string
  duration: string
  baseCost: string
  markupPercent: string
  startingPrice: string
  packageCategory: PackageCategory | ''
  status: PackageStatus
  validFrom: string
  validTo: string
  publishToWebsite: boolean
  isSoldOut: boolean
}

const emptyForm: PackageFormState = {
  name: '',
  destination: '',
  duration: '',
  baseCost: '',
  markupPercent: '',
  startingPrice: '',
  packageCategory: '',
  status: 'DRAFT',
  validFrom: '',
  validTo: '',
  publishToWebsite: false,
  isSoldOut: false
}

const toNumberOrUndefined = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : undefined
}

const PackagesPage: React.FC = () => {
  const packagesService = usePackagesService()
  const [items, setItems] = useState<PackageRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState<PackageFormState>(emptyForm)
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
      setEnquiries([])
      return
    }
    setForm({
      name: selectedPackage.name || '',
      destination: selectedPackage.destination || '',
      duration: selectedPackage.duration || '',
      baseCost: String(selectedPackage.baseCost ?? ''),
      markupPercent: String(selectedPackage.markupPercent ?? ''),
      startingPrice: String(selectedPackage.startingPrice ?? ''),
      packageCategory: selectedPackage.packageCategory ?? '',
      status: selectedPackage.status ?? 'DRAFT',
      validFrom: selectedPackage.validFrom?.slice(0, 10) || '',
      validTo: selectedPackage.validTo?.slice(0, 10) || '',
      publishToWebsite: selectedPackage.publishToWebsite,
      isSoldOut: selectedPackage.isSoldOut
    })
    void loadEnquiries(selectedPackage.id)
  }, [loadEnquiries, selectedPackage])

  const handleNew = () => {
    setSelectedId('')
    setForm(emptyForm)
    setEnquiries([])
    setEnquiryError('')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.destination.trim()) {
      setError('Package name and destination are required.')
      return
    }
    setSaving(true)
    setError('')
    const payload = {
      name: form.name.trim(),
      destination: form.destination.trim(),
      duration: form.duration.trim() || undefined,
      baseCost: toNumberOrUndefined(form.baseCost),
      markupPercent: toNumberOrUndefined(form.markupPercent),
      startingPrice: toNumberOrUndefined(form.startingPrice),
      packageCategory: form.packageCategory || undefined,
      status: form.status,
      validFrom: form.validFrom || undefined,
      validTo: form.validTo || undefined,
      publishToWebsite: form.publishToWebsite,
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
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not save package.'))
    } finally {
      setSaving(false)
    }
  }

  const handleTogglePublish = async (item: PackageRecord) => {
    try {
      await packagesService.publish(item.id, {
        publishToWebsite: !item.publishToWebsite
      })
      await loadPackages()
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not update publish status.'))
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
          <p className='text-sm text-gray-500'>
            Manage package pricing, validity, category, status, and website
            publish policy.
          </p>
        </div>
        <button
          onClick={handleNew}
          className='inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700'
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
                      onClick={() => setSelectedId(item.id)}
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
                      <button
                        onClick={() => void handleTogglePublish(item)}
                        className='inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                      >
                        <FaGlobe />
                        {item.publishToWebsite ? 'Unpublish' : 'Publish'}
                      </button>
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
          <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            {selectedId ? 'Edit Package' : 'Create Package'}
          </h2>
          <div className='mt-4 grid grid-cols-1 gap-3'>
            <input
              className='field-input'
              placeholder='Package name'
              value={form.name}
              onChange={event =>
                setForm(prev => ({ ...prev, name: event.target.value }))
              }
            />
            <input
              className='field-input'
              placeholder='Destination'
              value={form.destination}
              onChange={event =>
                setForm(prev => ({ ...prev, destination: event.target.value }))
              }
            />
            <input
              className='field-input'
              placeholder='Duration (e.g. 4N/5D)'
              value={form.duration}
              onChange={event =>
                setForm(prev => ({ ...prev, duration: event.target.value }))
              }
            />
            <div className='grid grid-cols-3 gap-2'>
              <input
                className='field-input'
                placeholder='Base cost'
                value={form.baseCost}
                onChange={event =>
                  setForm(prev => ({ ...prev, baseCost: event.target.value }))
                }
              />
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
              <input
                className='field-input'
                placeholder='Starting price'
                value={form.startingPrice}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    startingPrice: event.target.value
                  }))
                }
              />
            </div>
            <div className='grid grid-cols-2 gap-2'>
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
            <div className='grid grid-cols-2 gap-2'>
              <input
                type='date'
                className='field-input'
                value={form.validFrom}
                onChange={event =>
                  setForm(prev => ({ ...prev, validFrom: event.target.value }))
                }
              />
              <input
                type='date'
                className='field-input'
                value={form.validTo}
                onChange={event =>
                  setForm(prev => ({ ...prev, validTo: event.target.value }))
                }
              />
            </div>
            <label className='inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300'>
              <input
                type='checkbox'
                checked={form.publishToWebsite}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    publishToWebsite: event.target.checked
                  }))
                }
              />
              Publish to website
            </label>
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
            <button
              disabled={saving}
              onClick={() => void handleSave()}
              className='inline-flex items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60'
            >
              {saving ? 'Saving...' : 'Save Package'}
              <FaSave />
            </button>
          </div>
        </SurfaceCard>
      </div>

      <SurfaceCard>
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
      </SurfaceCard>
    </div>
  )
}

export default PackagesPage
