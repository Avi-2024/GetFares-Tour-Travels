import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle } from 'react-icons/fa'
import SurfaceCard from '../../components/ui/SurfaceCard'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { getApiErrorMessage } from '../../api/apiClient'
import { useLeadsService } from '../../hooks/useLeadsService'
import { useCampaignsService } from '../../hooks/useCampaignsService'

type FormState = {
  firstName: string
  lastName: string
  email: string
  phone: string
  leadCountry: string
  clientCurrency: string
  location: string
  destinationName: string
  travelDate: string
  adultsCount: string
  childrenCount: string
  budget: string
  visaRequired: 'YES' | 'NO' | ''
  preferredHotelCategory: '3_STAR' | '4_STAR' | '5_STAR' | 'ANY' | ''
  travelPurpose: string
  leadSource: string
  campaignId: string
  notes: string
}

const initialForm: FormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  leadCountry: '',
  clientCurrency: 'INR',
  location: '',
  destinationName: '',
  travelDate: '',
  adultsCount: '2',
  childrenCount: '0',
  budget: '',
  visaRequired: '',
  preferredHotelCategory: '',
  travelPurpose: '',
  leadSource: 'Website',
  campaignId: '',
  notes: ''
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const CreateLead: React.FC = () => {
  const navigate = useNavigate()
  const leadsService = useLeadsService()
  const campaignsService = useCampaignsService()
  const [form, setForm] = useState<FormState>(initialForm)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [destinations, setDestinations] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [showErrors, setShowErrors] = useState(false)
  const [childAges, setChildAges] = useState<string[]>([])

  useEffect(() => {
    const loadData = async () => {
      const [campaignsRes, destinationsRes] = await Promise.allSettled([
        campaignsService.list({ status: 'ACTIVE' }),
        leadsService.getDestinations()
      ])

      if (campaignsRes.status === 'fulfilled') {
        setCampaigns((campaignsRes.value as any).data || [])
      } else {
        setCampaigns([])
      }

      if (destinationsRes.status === 'fulfilled') {
        const list = destinationsRes.value
        setDestinations(Array.isArray(list) ? list : [])
      } else {
        setDestinations([])
      }
    }
    void loadData()
  }, [campaignsService, leadsService])

  useEffect(() => {
    const checkDuplicates = async () => {
      const email = form.email.trim()
      const phone = form.phone.replace(/\D/g, '')
      if (!email && !phone) {
        setDuplicateWarning('')
        return
      }
      try {
        const result = await leadsService.checkDuplicate(
          email || undefined,
          phone || undefined
        )
        setDuplicateWarning(
          (result as any).data.isDuplicate
            ? (result as any).data.message ?? 'Similar lead already exists'
            : ''
        )
      } catch {
        setDuplicateWarning('')
      }
    }

    const timer = setTimeout(() => {
      void checkDuplicates()
    }, 500)
    return () => clearTimeout(timer)
  }, [form.email, form.phone, leadsService])

  const validation = useMemo(() => {
    const email = form.email.trim()
    const phoneDigits = form.phone.replace(/\D/g, '')

    const adultsCountValue = Number(form.adultsCount || 0)
    const childrenCountValue = Number(form.childrenCount || 0)
    const adultsCountSafe = Number.isFinite(adultsCountValue) ? adultsCountValue : 0
    const childrenCountSafe = Number.isFinite(childrenCountValue) ? childrenCountValue : 0

    return {
      firstName: !form.firstName.trim(),
      lastName: !form.lastName.trim(),
      email: !email || !EMAIL_PATTERN.test(email),
      phone: phoneDigits.length < 10,
      leadCountry: !form.leadCountry,
      clientCurrency: !form.clientCurrency.trim(),
      destinationName: !form.destinationName.trim(),
      travelDate: !form.travelDate,
      adultsChildren:
        adultsCountSafe < 0 || childrenCountSafe < 0 || adultsCountSafe < 1,
      childrenAges:
        childrenCountSafe > 0 &&
        (childAges.length !== childrenCountSafe ||
          childAges.some(age => {
            const numericAge = Number(age)
            return (
              age.trim() === '' ||
              !Number.isFinite(numericAge) ||
              numericAge < 0 ||
              numericAge > 18
            )
          })),
      budget: false,
      visaRequired: false,
      preferredHotelCategory: form.preferredHotelCategory === '',
      travelPurpose: !form.travelPurpose.trim()
    }
  }, [form, childAges])

  const hasError = useMemo(
    () => Object.values(validation).some(Boolean),
    [validation]
  )

  const currencyOptions = useMemo(
    () => [
      { value: '', label: 'Select currency' },
      { value: 'INR', label: 'INR' },
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' },
      { value: 'GBP', label: 'GBP' },
      { value: 'AED', label: 'AED' }
    ],
    []
  )

  const destinationOptions = useMemo(
    () => [
      { value: '', label: 'Select destination' },
      ...destinations.map(destination => ({
        value: destination.name,
        label: destination.name
      }))
    ],
    [destinations]
  )

  const visaOptions = useMemo(
    () => [
      { value: '', label: 'Select visa requirement' },
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' }
    ],
    []
  )

  const hotelCategoryOptions = useMemo(
    () => [
      { value: '', label: 'Select hotel category' },
      { value: '3_STAR', label: '3 Star' },
      { value: '4_STAR', label: '4 Star' },
      { value: '5_STAR', label: '5 Star' },
      { value: 'ANY', label: 'Any' }
    ],
    []
  )

  const travelPurposeOptions = useMemo(
    () => [
      { value: '', label: 'Select purpose' },
      { value: 'LEISURE', label: 'Leisure' },
      { value: 'BUSINESS', label: 'Business' },
      { value: 'HONEYMOON', label: 'Honeymoon' },
      { value: 'FAMILY', label: 'Family' },
      { value: 'ADVENTURE', label: 'Adventure' }
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

  const campaignOptions = useMemo(
    () => [
      { value: '', label: 'Select campaign (optional)' },
      ...campaigns.map(campaign => ({
        value: String(campaign.id),
        label: campaign.name
      }))
    ],
    [campaigns]
  )

  const handleSubmit = async () => {
    setShowErrors(true)
    if (hasError) return

    setLoading(true)
    setApiError('')
    const fullName = [form.firstName, form.lastName]
      .map(value => value.trim())
      .filter(Boolean)
      .join(' ')
    const normalizedPhone = form.phone.replace(/\D/g, '')
    const adultsCountNumber = Number(form.adultsCount || 0)
    const childrenCountNumber = Number(form.childrenCount || 0)
    const cleanChildAges = childAges
      .map(age => age.trim())
      .filter(age => age !== '')
      .map(age => Number(age))
      .filter(age => Number.isFinite(age) && age >= 0 && age <= 18)

    const childAgesNote =
      childrenCountNumber > 0
        ? `Child Ages: ${cleanChildAges.map(age => String(age)).join(', ')}`
        : ''

    const mergedNotes = [form.notes.trim(), childAgesNote]
      .filter(Boolean)
      .join('\n')

    try {
      await leadsService.createLead({
        fullName,
        email: form.email.trim(),
        phone: normalizedPhone,
        leadCountry: form.leadCountry,
        addressLine: form.location.trim() || undefined,
        clientCurrency: form.clientCurrency.trim().toUpperCase(),
        destinationName: form.destinationName.trim(),
        travelDate: form.travelDate,
        adultsCount: adultsCountNumber,
        childrenCount: childrenCountNumber,
        childAges: cleanChildAges.length > 0 ? cleanChildAges : undefined,
        budget: form.budget.trim() ? Number(form.budget) : undefined,
        visaRequired: form.visaRequired ? form.visaRequired === 'YES' : undefined,
        preferredHotelCategory: form.preferredHotelCategory,
        travelPurpose: form.travelPurpose.trim(),
        source: form.leadSource.trim() || 'Website',
        campaignId: form.campaignId || undefined,
        notes: mergedNotes || undefined,
        leadType: 'HOLIDAY',
        status: 'OPEN',
        qualificationCompleted: true
      })
      navigate('/leads')
    } catch (error) {
      setApiError(getApiErrorMessage(error, 'Could not create lead.'))
      setLoading(false)
    }
  }

  const fieldError = (key: keyof typeof validation) =>
    showErrors && validation[key]

  return (
    <div className='mx-auto max-w-9xl space-y-6'>
      <div className='flex items-center gap-3'>
        <button
          onClick={() => navigate('/leads')}
          className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
          aria-label='Back to leads'
        >
          <FaArrowLeft className='text-sm' />
        </button>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Create New Lead
          </h1>
          <p className='text-sm text-gray-500'>
            SOP qualification capture for first response. PAN can be collected
            later after payment or finance onboarding.
          </p>
        </div>
      </div>

      {duplicateWarning ? (
        <div className='rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-200'>
          {duplicateWarning}
        </div>
      ) : null}

      {apiError ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
          {apiError}
        </div>
      ) : null}

      <SurfaceCard>
        <h2 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
          Customer & Qualification Details
        </h2>
        <div className='mt-4 grid grid-cols-1 gap-4 md:grid-cols-2'>
          <Field
            label='First Name *'
            value={form.firstName}
            onChange={value => setForm(prev => ({ ...prev, firstName: value }))}
            error={fieldError('firstName')}
          />
          <Field
            label='Last Name *'
            value={form.lastName}
            onChange={value => setForm(prev => ({ ...prev, lastName: value }))}
            error={fieldError('lastName')}
          />
          <Field
            label='Email *'
            value={form.email}
            onChange={value => setForm(prev => ({ ...prev, email: value }))}
            error={fieldError('email')}
            type='email'
          />
          <Field
            label='Phone *'
            value={form.phone}
            onChange={value => setForm(prev => ({ ...prev, phone: value }))}
            error={fieldError('phone')}
            type='tel'
          />
          <div>
            <label className='field-label'>Lead Country *</label>
            <SearchableDropdown
              value={form.leadCountry}
              options={[
                { value: '', label: 'Select country' },
                { value: 'India', label: 'India' },
                { value: 'UAE', label: 'UAE' }
              ]}
              hasError={fieldError('leadCountry')}
              searchPlaceholder='Search country...'
              onChange={value =>
                setForm(prev => ({ ...prev, leadCountry: value }))
              }
            />
          </div>
          <div>
            <label className='field-label'>Client Currency *</label>
            <SearchableDropdown
              value={form.clientCurrency}
              options={currencyOptions}
              hasError={fieldError('clientCurrency')}
              searchPlaceholder='Search currency...'
              onChange={value =>
                setForm(prev => ({ ...prev, clientCurrency: value }))
              }
            />
          </div>
          <Field
            label='Address / Location'
            value={form.location}
            onChange={value => setForm(prev => ({ ...prev, location: value }))}
          />
          <div>
            <label className='field-label'>Destination *</label>
            <SearchableDropdown
              value={form.destinationName}
              options={destinationOptions}
              hasError={fieldError('destinationName')}
              searchPlaceholder='Search destination...'
              onChange={value =>
                setForm(prev => ({ ...prev, destinationName: value }))
              }
            />
          </div>
          <div>
            <label className='field-label'>Travel Date *</label>
            <input
              type='date'
              className={`field-input ${
                fieldError('travelDate') ? 'border-red-500' : ''
              }`}
              value={form.travelDate}
              onChange={event =>
                setForm(prev => ({ ...prev, travelDate: event.target.value }))
              }
            />
          </div>
          <div className='grid grid-cols-2 gap-2'>
            <div>
              <label className='field-label'>Adults *</label>
              <input
                type='number'
                min={1}
                className={`field-input ${
                  fieldError('adultsChildren') ? 'border-red-500' : ''
                }`}
                value={form.adultsCount}
                onChange={event =>
                  setForm(prev => ({
                    ...prev,
                    adultsCount: event.target.value
                  }))
                }
              />
            </div>
            <div>
              <label className='field-label'>Children *</label>
              <input
                type='number'
                min={0}
                className={`field-input ${
                  fieldError('adultsChildren') ? 'border-red-500' : ''
                }`}
                value={form.childrenCount}
                onChange={event => {
                  const rawValue = event.target.value
                  const nextCount = Math.max(
                    0,
                    Math.floor(Number(rawValue || 0))
                  )
                  setForm(prev => ({
                    ...prev,
                    childrenCount: rawValue
                  }))
                  setChildAges(prev => {
                    if (nextCount === prev.length) return prev
                    if (nextCount < prev.length) return prev.slice(0, nextCount)
                    return [
                      ...prev,
                      ...Array.from(
                        { length: nextCount - prev.length },
                        () => ''
                      )
                    ]
                  })
                }}
              />
            </div>
          </div>
          {Number(form.childrenCount || 0) > 0 ? (
            <div className='md:col-span-2'>
              <label className='field-label'>Children Ages *</label>
              <div className='grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3'>
                {Array.from({ length: Number(form.childrenCount || 0) }).map((_, index) => (
                  <input
                    key={`child-age-${index}`}
                    type='number'
                    min={0}
                    max={18}
                    step='1'
                    placeholder={`Child ${index + 1} age`}
                    className={`field-input ${
                      fieldError('childrenAges') ? 'border-red-500' : ''
                    }`}
                    value={childAges[index] ?? ''}
                    onChange={event =>
                      setChildAges(prev => {
                        const next = [...prev]
                        next[index] = event.target.value
                        return next
                      })
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}
          <div>
            <label className='field-label'>Budget</label>
            <input
              type='number'
              min={1}
              className={`field-input ${
                fieldError('budget') ? 'border-red-500' : ''
              }`}
              value={form.budget}
              onChange={event =>
                setForm(prev => ({ ...prev, budget: event.target.value }))
              }
            />
          </div>
          <div>
            <label className='field-label'>Visa Required</label>
            <SearchableDropdown
              value={form.visaRequired}
              options={visaOptions}
              hasError={fieldError('visaRequired')}
              searchPlaceholder='Search visa requirement...'
              onChange={value =>
                setForm(prev => ({
                  ...prev,
                  visaRequired: value as 'YES' | 'NO' | ''
                }))
              }
            />
          </div>
          <div>
            <label className='field-label'>Preferred Hotel Category *</label>
            <SearchableDropdown
              value={form.preferredHotelCategory}
              options={hotelCategoryOptions}
              hasError={fieldError('preferredHotelCategory')}
              searchPlaceholder='Search hotel category...'
              onChange={value =>
                setForm(prev => ({
                  ...prev,
                  preferredHotelCategory: value as
                    | '3_STAR'
                    | '4_STAR'
                    | '5_STAR'
                    | 'ANY'
                    | ''
                }))
              }
            />
          </div>
          <div>
            <label className='field-label'>Purpose of Travel *</label>
            <SearchableDropdown
              value={form.travelPurpose}
              options={travelPurposeOptions}
              hasError={fieldError('travelPurpose')}
              searchPlaceholder='Search purpose...'
              onChange={value =>
                setForm(prev => ({ ...prev, travelPurpose: value }))
              }
            />
          </div>
          <div>
            <label className='field-label'>Lead Source</label>
            <SearchableDropdown
              value={form.leadSource}
              options={leadSourceOptions}
              searchPlaceholder='Search lead source...'
              onChange={value =>
                setForm(prev => ({ ...prev, leadSource: value }))
              }
            />
          </div>
          <div className='md:col-span-2'>
            <label className='field-label'>Campaign</label>
            <SearchableDropdown
              value={form.campaignId}
              options={campaignOptions}
              searchPlaceholder='Search campaign...'
              onChange={value =>
                setForm(prev => ({ ...prev, campaignId: value }))
              }
            />
          </div>
          <div className='md:col-span-2'>
            <label className='field-label'>Notes</label>
            <textarea
              rows={4}
              className='field-input'
              value={form.notes}
              onChange={event =>
                setForm(prev => ({ ...prev, notes: event.target.value }))
              }
            />
          </div>
        </div>
      </SurfaceCard>

      <div className='flex justify-end'>
        <button
          onClick={() => void handleSubmit()}
          disabled={loading}
          className='inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60'
        >
          {loading ? 'Creating...' : 'Create Lead'}
          <FaCheckCircle />
        </button>
      </div>
    </div>
  )
}

const Field = ({
  label,
  value,
  onChange,
  error,
  type = 'text'
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: boolean
  type?: 'text' | 'email' | 'tel'
}) => (
  <div>
    <label className='field-label'>
      {label}
      {label.includes('*') ? '' : null}
    </label>
    <input
      type={type}
      className={`field-input ${error ? 'border-red-500' : ''}`}
      value={value}
      onChange={event => onChange(event.target.value)}
    />
  </div>
)

export default CreateLead
