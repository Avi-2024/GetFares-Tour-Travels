import React, { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle, FaClock } from 'react-icons/fa'
import SurfaceCard from '../../components/ui/SurfaceCard'
import StatusBadge from '../../components/ui/StatusBadge'
import SearchableDropdown from '../../components/ui/SearchableDropdown'
import { getApiErrorMessage } from '../../api/apiClient'
import { useLeadsService } from '../../hooks/useLeadsService'
import { useAuth } from '../../context/AuthContext'
import {
  SOP_STATUS_LABELS,
  STATUS_REQUIRING_QUALIFICATION,
  deriveSopStatusLabel,
  sopLabelToCanonical,
  toStatusLabelText,
  type SopStatusLabel
} from '../../utils/leadStatus'

type QualificationForm = {
  panNumber: string
  addressLine: string
  clientCurrency: string
  destinationName: string
  travelDate: string
  adultsCount: string
  childrenCount: string
  budget: string
  visaRequired: 'YES' | 'NO' | ''
  preferredHotelCategory: '3_STAR' | '4_STAR' | '5_STAR' | 'ANY' | ''
  travelPurpose: string
}

const emptyQualification: QualificationForm = {
  panNumber: '',
  addressLine: '',
  clientCurrency: 'INR',
  destinationName: '',
  travelDate: '',
  adultsCount: '2',
  childrenCount: '0',
  budget: '',
  visaRequired: '',
  preferredHotelCategory: '',
  travelPurpose: ''
}

const REQUIRED_COMPLIANCE = {
  calls: 6,
  whatsapp: 7,
  finalReminders: 1
}

const LeadDetails: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const leadsService = useLeadsService()
  const { hasPermission } = useAuth()

  const [lead, setLead] = useState<any>(null)
  const [followups, setFollowups] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingFollowups, setLoadingFollowups] = useState(false)
  const [error, setError] = useState('')
  const [statusError, setStatusError] = useState('')
  const [statusSaving, setStatusSaving] = useState(false)
  const [selectedStatusLabel, setSelectedStatusLabel] =
    useState<SopStatusLabel>('NEW')
  const [closedReason, setClosedReason] = useState('')
  const [qualification, setQualification] =
    useState<QualificationForm>(emptyQualification)
  const [followupDraft, setFollowupDraft] = useState({
    followupType: 'CALL',
    followupDate: '',
    cadenceCode: '',
    notes: ''
  })
  const [followupSaving, setFollowupSaving] = useState(false)
  const [opsRunning, setOpsRunning] = useState(false)
  const [callsButtonDisabled, setCallsButtonDisabled] = useState(false)
  const [showDisablePopup, setShowDisablePopup] = useState(false)

  const createdAtLabel = useMemo(() => {
    const raw =
      lead?.createdAt ??
      lead?.created_at ??
      lead?.createdOn ??
      lead?.created_on ??
      lead?.createdDate ??
      null
    if (!raw) return 'N/A'
    const parsed = new Date(raw)
    if (Number.isNaN(parsed.getTime())) return String(raw)
    return parsed.toLocaleString()
  }, [lead])

  const firstFollowupLabel = useMemo(() => {
    if (!followups.length) return 'N/A'
    const dates = followups
      .map(item => item?.followupDate || item?.followup_date || null)
      .filter(Boolean)
      .map(value => new Date(value as string))
      .filter(value => !Number.isNaN(value.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())
    if (!dates.length) return 'N/A'
    return dates[0].toLocaleString()
  }, [followups])

  const hydrateQualification = useCallback((item: any) => {
    setQualification({
      panNumber: item?.panNumber ?? item?.pan_number ?? '',
      addressLine: item?.addressLine ?? item?.address_line ?? '',
      clientCurrency: item?.clientCurrency ?? item?.client_currency ?? 'INR',
      destinationName:
        (typeof item?.destination === 'object'
          ? item?.destination?.name
          : item?.destination) ??
        item?.destinationName ??
        '',
      travelDate: item?.travelDate?.slice?.(0, 10) || '',
      adultsCount: String(item?.adultsCount ?? 2),
      childrenCount: String(item?.childrenCount ?? 0),
      budget:
        item?.budget !== undefined && item?.budget !== null
          ? String(item.budget)
          : '',
      visaRequired:
        typeof item?.visaRequired === 'boolean'
          ? item.visaRequired
            ? 'YES'
            : 'NO'
          : '',
      preferredHotelCategory: item?.preferredHotelCategory ?? '',
      travelPurpose: item?.travelPurpose ?? ''
    })
  }, [])

  const loadLead = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const response = await leadsService.getLeadById(id)
      const data =
        (response as any)?.data?.data ?? (response as any)?.data ?? response
      setLead(data)
      setSelectedStatusLabel(
        deriveSopStatusLabel(data?.status, data?.subStatus, data?.statusLabel)
      )
      hydrateQualification(data)
    } catch (err) {
      setError(getApiErrorMessage(err, 'Failed to load lead details.'))
      setLead(null)
    } finally {
      setLoading(false)
    }
  }, [hydrateQualification, id, leadsService])

  const loadFollowups = useCallback(async () => {
    if (!id) return
    setLoadingFollowups(true)
    try {
      const rows = await leadsService.getFollowups(id)
      setFollowups(rows)
    } catch (_error) {
      setFollowups([])
    } finally {
      setLoadingFollowups(false)
    }
  }, [id, leadsService])

  React.useEffect(() => {
    void loadLead()
    void loadFollowups()
  }, [loadFollowups, loadLead])

  const compliance = useMemo(() => {
    const summary = {
      total: followups.length,
      calls: 0,
      whatsapp: 0,
      finalReminders: 0
    }
    followups.forEach(item => {
      const type = String(item?.followupType || '').toUpperCase()
      if (type === 'CALL') summary.calls += 1
      if (type === 'WHATSAPP') summary.whatsapp += 1
      if (type === 'FINAL_REMINDER') summary.finalReminders += 1
    })
    return summary
  }, [followups])

  const statusOptions = useMemo(
    () =>
      SOP_STATUS_LABELS.map(label => ({
        value: label,
        label: toStatusLabelText(label)
      })),
    []
  )

  const currencyOptions = useMemo(
    () => [
      { value: 'INR', label: 'INR' },
      { value: 'USD', label: 'USD' },
      { value: 'EUR', label: 'EUR' },
      { value: 'GBP', label: 'GBP' },
      { value: 'AED', label: 'AED' }
    ],
    []
  )

  const visaOptions = useMemo(
    () => [
      { value: '', label: 'Visa Required' },
      { value: 'YES', label: 'Yes' },
      { value: 'NO', label: 'No' }
    ],
    []
  )

  const hotelCategoryOptions = useMemo(
    () => [
      { value: '', label: 'Hotel Category' },
      { value: '3_STAR', label: '3 Star' },
      { value: '4_STAR', label: '4 Star' },
      { value: '5_STAR', label: '5 Star' },
      { value: 'ANY', label: 'Any' }
    ],
    []
  )

  const isCallsDisabled = lead?.callsDisabled || lead?.calls_disabled || callsButtonDisabled

  const followupTypeOptions = useMemo(() => {
    const all = [
      { value: 'CALL', label: 'Call' },
      { value: 'WHATSAPP', label: 'WhatsApp' },
      { value: 'EMAIL', label: 'Email' },
      { value: 'FINAL_REMINDER', label: 'Final Reminder' }
    ]
    if (isCallsDisabled) {
      return all.filter(opt => opt.value !== 'CALL')
    }
    return all
  }, [isCallsDisabled])

  const qualificationMissing = useMemo(() => {
    const missing: string[] = []
    if (!qualification.clientCurrency.trim()) missing.push('clientCurrency')
    if (!qualification.destinationName.trim()) missing.push('destination')
    if (!qualification.travelDate) missing.push('travelDate')
    if (!qualification.budget || Number(qualification.budget) <= 0)
      missing.push('budget')
    if (qualification.visaRequired === '') missing.push('visaRequired')
    if (!qualification.preferredHotelCategory)
      missing.push('preferredHotelCategory')
    if (!qualification.travelPurpose.trim()) missing.push('travelPurpose')

    const adults = Number(qualification.adultsCount)
    const children = Number(qualification.childrenCount)
    if (
      !Number.isFinite(adults) ||
      adults < 1 ||
      !Number.isFinite(children) ||
      children < 0
    ) {
      missing.push('paxSplit')
    }
    return missing
  }, [qualification])

  const isComplianceComplete =
    compliance.calls >= REQUIRED_COMPLIANCE.calls &&
    compliance.whatsapp >= REQUIRED_COMPLIANCE.whatsapp &&
    compliance.finalReminders >= REQUIRED_COMPLIANCE.finalReminders

  const saveQualification = async () => {
    if (!id || !lead) return
    setStatusError('')
    if (qualificationMissing.length) {
      setStatusError(
        `Missing required fields: ${qualificationMissing.join(', ')}`
      )
      return
    }

    try {
      await leadsService.updateLead(id, {
        panNumber: qualification.panNumber.trim() || undefined,
        addressLine: qualification.addressLine.trim() || undefined,
        clientCurrency: qualification.clientCurrency.trim() || undefined,
        destinationName: qualification.destinationName.trim(),
        travelDate: qualification.travelDate,
        adultsCount: Number(qualification.adultsCount),
        childrenCount: Number(qualification.childrenCount),
        budget: Number(qualification.budget),
        visaRequired: qualification.visaRequired === 'YES',
        preferredHotelCategory: qualification.preferredHotelCategory,
        travelPurpose: qualification.travelPurpose.trim(),
        qualificationCompleted: true
      })
      await loadLead()
    } catch (err) {
      setStatusError(getApiErrorMessage(err, 'Could not update qualification.'))
    }
  }

  const updateStatus = async () => {
    if (!id || !lead) return
    setStatusSaving(true)
    setStatusError('')
    const conversion = sopLabelToCanonical(selectedStatusLabel)

    if (
      STATUS_REQUIRING_QUALIFICATION.has(conversion.canonical) &&
      qualificationMissing.length
    ) {
      setStatusSaving(false)
      setStatusError(
        `Missing required fields: ${qualificationMissing.join(', ')}`
      )
      return
    }
    if (
      (conversion.canonical === 'LOST' ||
        conversion.canonical === 'NON_RESPONSIVE') &&
      !isComplianceComplete
    ) {
      setStatusSaving(false)
      setStatusError(
        'Follow-up compliance is incomplete. Required: 6 calls + 7 WhatsApp + 1 final reminder.'
      )
      return
    }
    if (conversion.canonical === 'LOST' && !closedReason.trim()) {
      setStatusSaving(false)
      setStatusError('closedReason is required for LOST.')
      return
    }

    try {
      await leadsService.updateLead(id, {
        status: conversion.canonical,
        subStatus: conversion.subStatus,
        closedReason: closedReason.trim() || undefined,
        panNumber: qualification.panNumber.trim() || undefined,
        addressLine: qualification.addressLine.trim() || undefined,
        clientCurrency: qualification.clientCurrency.trim() || undefined,
        destinationName: qualification.destinationName.trim(),
        travelDate: qualification.travelDate,
        adultsCount: Number(qualification.adultsCount),
        childrenCount: Number(qualification.childrenCount),
        budget: Number(qualification.budget),
        visaRequired: qualification.visaRequired === 'YES',
        preferredHotelCategory: qualification.preferredHotelCategory,
        travelPurpose: qualification.travelPurpose.trim(),
        qualificationCompleted: STATUS_REQUIRING_QUALIFICATION.has(
          conversion.canonical
        )
          ? true
          : undefined
      })
      await loadLead()
    } catch (err) {
      setStatusError(getApiErrorMessage(err, 'Could not update lead status.'))
    } finally {
      setStatusSaving(false)
    }
  }

  const scheduleFollowup = async () => {
    if (!id) return
    if (!followupDraft.followupDate) {
      setStatusError('Please select follow-up date/time.')
      return
    }
    setFollowupSaving(true)
    setStatusError('')
    try {
      await leadsService.addFollowup(id, {
        followupType: followupDraft.followupType,
        followupDate: new Date(followupDraft.followupDate).toISOString(),
        cadenceCode: followupDraft.cadenceCode || undefined,
        notes: followupDraft.notes || undefined
      })
      setFollowupDraft({
        followupType: 'CALL',
        followupDate: '',
        cadenceCode: '',
        notes: ''
      })
      await loadLead()
      await loadFollowups()
    } catch (err) {
      setStatusError(getApiErrorMessage(err, 'Could not schedule follow-up.'))
    } finally {
      setFollowupSaving(false)
    }
  }

  const runAutomation = async (
    fn:
      | 'processSlaBreaches'
      | 'processCadenceAutomation'
      | 'processNonResponsive'
  ) => {
    setOpsRunning(true)
    setStatusError('')
    try {
      if (fn === 'processSlaBreaches') {
        await leadsService.processSlaBreaches()
      } else if (fn === 'processCadenceAutomation') {
        await leadsService.processCadenceAutomation()
      } else {
        await leadsService.processNonResponsive()
      }
      await loadLead()
      await loadFollowups()
    } catch (err) {
      setStatusError(getApiErrorMessage(err, 'Automation action failed.'))
    } finally {
      setOpsRunning(false)
    }
  }

  const canRunOps = hasPermission('leads:update')

  const handleDisableCalls = async () => {
    if (!id) return
    const newState = !isCallsDisabled
    try {
      await leadsService.disableCalls(id, newState)
      setCallsButtonDisabled(newState)
      setLead((prev: any) => prev ? { ...prev, callsDisabled: newState } : prev)
      setShowDisablePopup(true)
      window.setTimeout(() => setShowDisablePopup(false), 2500)
    } catch {
      setShowDisablePopup(false)
    }
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-3'>
        <button
          onClick={() => navigate('/leads')}
          className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800'
        >
          <FaArrowLeft className='text-sm' />
        </button>
        <div>
          <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100'>
            Lead Details
          </h1>
          <p className='text-sm text-gray-500'>
            SOP workflow with compliance and SLA tracking.
          </p>
        </div>
      </div>

      {error ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
          {error}
        </div>
      ) : null}
      {statusError ? (
        <div className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-200'>
          {statusError}
        </div>
      ) : null}

      <div className='grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]'>
        <SurfaceCard>
          {loading ? (
            <p className='text-sm text-gray-500'>Loading lead...</p>
          ) : !lead ? (
            <p className='text-sm text-gray-500'>Lead not found.</p>
          ) : (
            <div className='space-y-4'>
              <div className='flex items-start justify-between'>
                <div>
                  <h2 className='text-xl font-semibold text-gray-900 dark:text-gray-100'>
                    {lead.fullName || lead.name || 'Lead'}
                  </h2>
                  <p className='text-sm text-gray-500'>
                    {lead.email || 'N/A'} | {lead.phone || 'N/A'}
                  </p>
                  {lead.leadCountry || lead.country ? (
                    <p className='mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400'>
                      {lead.leadCountry || lead.country}
                    </p>
                  ) : null}
                </div>
                <StatusBadge
                  status={deriveSopStatusLabel(
                    lead.status,
                    lead.subStatus,
                    lead.statusLabel
                  )}
                />
              </div>

              <div className='rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700'>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  SLA
                </p>
                <p
                  className={
                    lead.slaBreached
                      ? 'text-red-600'
                      : 'text-gray-600 dark:text-gray-300'
                  }
                >
                  {lead.slaBreached
                    ? 'First response was late (15-minute target missed)'
                    : 'Within 15-minute first-contact target'}
                </p>
                {lead.responseAt ? (
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    {`First contact logged at ${new Date(
                      lead.responseAt
                    ).toLocaleString()}.`}
                  </p>
                ) : null}
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  Date of creation: {createdAtLabel}
                </p>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  First follow-up: {firstFollowupLabel}
                </p>
                {lead.responseDeadline ? (
                  <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                    First-contact deadline:{' '}
                    {new Date(lead.responseDeadline).toLocaleString()}
                  </p>
                ) : null}
              </div>

              <div className='rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700'>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  Finance Capture
                </p>
                <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                  PAN is optional at lead stage. Capture it later after payment
                  or finance onboarding.
                </p>
                <div className='mt-2 grid grid-cols-1 gap-2 md:grid-cols-3'>
                  <p className='text-xs text-gray-600 dark:text-gray-300'>
                    PAN:{' '}
                    <span className='font-semibold'>
                      {qualification.panNumber || 'Not captured'}
                    </span>
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-300'>
                    Client Currency:{' '}
                    <span className='font-semibold'>
                      {qualification.clientCurrency || 'Not captured'}
                    </span>
                  </p>
                  <p className='text-xs text-gray-600 dark:text-gray-300 md:col-span-3'>
                    Address:{' '}
                    <span className='font-semibold'>
                      {qualification.addressLine || 'Not captured'}
                    </span>
                  </p>
                </div>
              </div>

              <div className='rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
                <p className='font-medium text-gray-900 dark:text-gray-100'>
                  Qualification Capture
                </p>
                <div className='mt-3 grid grid-cols-1 gap-2 md:grid-cols-2'>
                  <div>
                    <label className='field-label'>PAN Number (optional)</label>
                    <input
                      className='field-input'
                      placeholder='Enter PAN number'
                      value={qualification.panNumber}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          panNumber: event.target.value.toUpperCase()
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Client Currency</label>
                    <SearchableDropdown
                      value={qualification.clientCurrency}
                      options={currencyOptions}
                      searchPlaceholder='Search currency...'
                      onChange={value =>
                        setQualification(prev => ({
                          ...prev,
                          clientCurrency: value
                        }))
                      }
                    />
                  </div>
                  <div className='md:col-span-2'>
                    <label className='field-label'>Address / Location</label>
                    <textarea
                      className='field-input'
                      rows={2}
                      placeholder='Enter address or location'
                      value={qualification.addressLine}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          addressLine: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Destination</label>
                    <input
                      className='field-input'
                      placeholder='Enter destination'
                      value={qualification.destinationName}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          destinationName: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Travel Date</label>
                    <input
                      type='date'
                      className='field-input'
                      value={qualification.travelDate}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          travelDate: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Adults</label>
                    <input
                      type='number'
                      min={1}
                      className='field-input no-spinner'
                      placeholder='Adults'
                      value={qualification.adultsCount}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          adultsCount: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Children</label>
                    <input
                      type='number'
                      min={0}
                      className='field-input no-spinner'
                      placeholder='Children'
                      value={qualification.childrenCount}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          childrenCount: event.target.value
                        }))
                      }
                    />
                  </div>
                  {(lead?.childAges?.length > 0 || lead?.child_ages?.length > 0) ? (
                    <div className='md:col-span-2'>
                      <label className='field-label'>Child Ages</label>
                      <div className='flex flex-wrap gap-2'>
                        {(lead.childAges || lead.child_ages || []).map((age: number, idx: number) => (
                          <span
                            key={`age-${idx}`}
                            className='inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                          >
                            Child {idx + 1}: {age} yrs
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <label className='field-label'>Budget</label>
                    <input
                      type='number'
                      min={0}
                      className='field-input no-spinner'
                      placeholder='Budget'
                      value={qualification.budget}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          budget: event.target.value
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>Visa Requirement</label>
                    <SearchableDropdown
                      value={qualification.visaRequired}
                      options={visaOptions}
                      searchPlaceholder='Search visa requirement...'
                      onChange={value =>
                        setQualification(prev => ({
                          ...prev,
                          visaRequired: value as 'YES' | 'NO' | ''
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className='field-label'>
                      Preferred Hotel Category
                    </label>
                    <SearchableDropdown
                      value={qualification.preferredHotelCategory}
                      options={hotelCategoryOptions}
                      searchPlaceholder='Search hotel category...'
                      onChange={value =>
                        setQualification(prev => ({
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
                    <label className='field-label'>Travel Purpose</label>
                    <input
                      className='field-input'
                      placeholder='Travel purpose'
                      value={qualification.travelPurpose}
                      onChange={event =>
                        setQualification(prev => ({
                          ...prev,
                          travelPurpose: event.target.value
                        }))
                      }
                    />
                  </div>
                </div>
                <div className='mt-2 flex items-center justify-between'>
                  <p className='text-xs text-gray-500'>
                    {qualificationMissing.length
                      ? `Missing: ${qualificationMissing.join(', ')}`
                      : 'All mandatory lead-stage qualification fields captured. PAN can be added later.'}
                  </p>
                  <button
                    onClick={() => void saveQualification()}
                    className='rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700'
                  >
                    Save Qualification
                  </button>
                </div>
              </div>
            </div>
          )}
        </SurfaceCard>

        <SurfaceCard>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Workflow Actions
          </h3>

          <div className='mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              Status Transition
            </p>
            <SearchableDropdown
              className='mt-2'
              value={selectedStatusLabel}
              options={statusOptions}
              searchPlaceholder='Search status...'
              onChange={value =>
                setSelectedStatusLabel(value as SopStatusLabel)
              }
            />
            <textarea
              className='field-input mt-2'
              rows={2}
              placeholder='Closed reason (required for LOST)'
              value={closedReason}
              onChange={event => setClosedReason(event.target.value)}
            />
            <button
              onClick={() => void updateStatus()}
              disabled={statusSaving}
              className='mt-2 inline-flex items-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60'
            >
              {statusSaving ? 'Updating...' : 'Update Status'}
              <FaCheckCircle />
            </button>
          </div>

          <div className='mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              Follow-up Compliance
            </p>
            <div className='mt-2 space-y-1 text-sm text-gray-700 dark:text-gray-300'>
              <div className='flex items-center justify-between gap-2'>
                <p>
                  Calls: {compliance.calls} / {REQUIRED_COMPLIANCE.calls}
                </p>
                <div className='relative'>
                  {showDisablePopup ? (
                    <div className='pointer-events-none absolute bottom-full right-0 z-10 mb-1 min-w-[180px] rounded-md bg-gray-900 px-3 py-1.5 text-center text-[10px] font-medium whitespace-nowrap text-white shadow-lg dark:bg-gray-800'>
                      {isCallsDisabled ? 'Calls disabled — WhatsApp only' : 'Calls re-enabled'}
                    </div>
                  ) : null}
                  <button
                    type='button'
                    onClick={() => void handleDisableCalls()}
                    className={`rounded-md px-2 py-0.5 text-[11px] font-medium text-white ${
                      isCallsDisabled
                        ? 'bg-green-700 hover:bg-green-800 dark:bg-green-600'
                        : 'bg-red-800 hover:bg-red-900 dark:bg-red-700 dark:hover:bg-red-800'
                    }`}
                  >
                    {isCallsDisabled ? 'Re-enable' : 'Disable'}
                  </button>
                </div>
              </div>
              <p>
                WhatsApp: {compliance.whatsapp} / {REQUIRED_COMPLIANCE.whatsapp}
              </p>
              <p>Final Reminder: {compliance.finalReminders} / 1</p>
              <p
                className={
                  isComplianceComplete ? 'text-green-600' : 'text-amber-600'
                }
              >
                {isComplianceComplete
                  ? 'Compliance complete'
                  : 'Compliance pending'}
              </p>
            </div>
          </div>

          {isCallsDisabled ? (
            <div className='mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200'>
              Client has opted out of calls. Only WhatsApp messages are allowed.
            </div>
          ) : null}

          <div className='mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
            <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
              Schedule Follow-up
            </p>
            <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
              Use this for the next action only. If the customer already
              answered your first call, also update the lead status so the
              first-response SLA is closed.
            </p>
            <div className='mt-2 grid grid-cols-1 gap-2'>
              <SearchableDropdown
                value={followupDraft.followupType}
                options={followupTypeOptions}
                searchPlaceholder='Search follow-up type...'
                onChange={value =>
                  setFollowupDraft(prev => ({ ...prev, followupType: value }))
                }
              />
              <input
                type='datetime-local'
                className='field-input'
                value={followupDraft.followupDate}
                onChange={event =>
                  setFollowupDraft(prev => ({
                    ...prev,
                    followupDate: event.target.value
                  }))
                }
              />
              <input
                className='field-input'
                placeholder='Cadence code (optional)'
                value={followupDraft.cadenceCode}
                onChange={event =>
                  setFollowupDraft(prev => ({
                    ...prev,
                    cadenceCode: event.target.value
                  }))
                }
              />
              <textarea
                className='field-input'
                rows={2}
                placeholder='Notes'
                value={followupDraft.notes}
                onChange={event =>
                  setFollowupDraft(prev => ({
                    ...prev,
                    notes: event.target.value
                  }))
                }
              />
              <button
                onClick={() => void scheduleFollowup()}
                disabled={followupSaving}
                className='inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60'
              >
                {followupSaving ? 'Submitting...' : 'Submit'}
              </button>
            </div>
          </div>

          {canRunOps ? (
            <div className='mt-4 rounded-xl border border-gray-200 p-3 dark:border-gray-700'>
              <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                Automation Actions
              </p>
              <p className='mt-1 text-xs text-gray-500 dark:text-gray-400'>
                Scheduler automation is enabled. Use these buttons only for
                manual replay/troubleshooting.
              </p>
              <div className='mt-2 space-y-2'>
                <div>
                  <button
                    disabled={opsRunning}
                    onClick={() => void runAutomation('processSlaBreaches')}
                    className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                  >
                    Run Late Response Check
                  </button>
                  <p className='mt-0.5 text-[10px] text-gray-400 dark:text-gray-500'>
                    Flags leads where assigned agents have not responded within the SLA deadline.
                  </p>
                </div>
                <div>
                  <button
                    disabled={opsRunning}
                    onClick={() => void runAutomation('processCadenceAutomation')}
                    className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                  >
                    Run Cadence Automation
                  </button>
                  <p className='mt-0.5 text-[10px] text-gray-400 dark:text-gray-500'>
                    Triggers the next scheduled follow-up (call / WhatsApp) based on the SOP cadence timeline.
                  </p>
                </div>
                <div>
                  <button
                    disabled={opsRunning}
                    onClick={() => void runAutomation('processNonResponsive')}
                    className='rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800'
                  >
                    Run Non-Responsive Check
                  </button>
                  <p className='mt-0.5 text-[10px] text-gray-400 dark:text-gray-500'>
                    Marks leads as NON_RESPONSIVE if all follow-up attempts (6 calls + 7 WhatsApp + 1 final reminder) are exhausted.
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </SurfaceCard>
      </div>

      <SurfaceCard>
        <div className='flex items-center justify-between'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-gray-100'>
            Follow-up History
          </h3>
          <span className='text-xs text-gray-500'>
            {followups.length} item(s)
          </span>
        </div>
        {loadingFollowups ? (
          <p className='mt-3 text-sm text-gray-500'>Loading follow-ups...</p>
        ) : followups.length === 0 ? (
          <p className='mt-3 text-sm text-gray-500'>No follow-ups yet.</p>
        ) : (
          <div className='mt-3 space-y-2'>
            {followups
              .slice()
              .sort(
                (a, b) =>
                  Date.parse(b.followupDate || '') -
                  Date.parse(a.followupDate || '')
              )
              .map(item => (
                <div
                  key={item.id}
                  className='rounded-xl border border-gray-200 p-3 text-sm dark:border-gray-700'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2'>
                    <div className='inline-flex items-center gap-2'>
                      <StatusBadge
                        status={String(item.followupType || 'CALL')}
                      />
                      {item.cadenceCode ? (
                        <span className='rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300'>
                          {item.cadenceCode}
                        </span>
                      ) : null}
                    </div>
                    <span className='inline-flex items-center gap-1 text-xs text-gray-500'>
                      <FaClock />
                      {item.followupDate
                        ? new Date(item.followupDate).toLocaleString()
                        : 'No date'}
                    </span>
                  </div>
                  <p className='mt-2 text-xs text-gray-600 dark:text-gray-300'>
                    {item.notes || 'No notes'}
                  </p>
                </div>
              ))}
          </div>
        )}
      </SurfaceCard>

      <style>{`
        .no-spinner::-webkit-outer-spin-button,
        .no-spinner::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .no-spinner[type='number'] {
          -moz-appearance: textfield;
          appearance: textfield;
        }
      `}</style>
    </div>
  )
}

export default LeadDetails
