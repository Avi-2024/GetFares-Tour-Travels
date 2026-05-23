import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Country } from 'country-state-city'
import { toast } from 'sonner'
import SurfaceCard from '../ui/SurfaceCard'
import SearchableDropdown from '../ui/SearchableDropdown'
import { getApiErrorMessage } from '../../api/apiClient'
import { useAuth } from '../../context/AuthContext'
import { getCurrencyOptions } from '../../utils/currency'
import {
  metaLeadMappingsApi,
  type MetaLeadMappingMetadata,
  type MetaLeadProfile,
  type MetaLeadScopeType
} from '../../api/metaLeadMappings'

const SCOPE_LABELS: Record<MetaLeadScopeType, string> = {
  ad: 'Ad ID',
  form: 'Form ID',
  campaign: 'Campaign ID',
  page: 'Page ID',
  default: 'Default (fallback)'
}

const LEAD_TYPE_OPTIONS = [
  { value: '', label: 'Inherit (from page fallback)' },
  { value: 'HOLIDAY', label: 'Holidays' },
  { value: 'VISA', label: 'Visa' },
  { value: 'BOTH', label: 'Both' }
]

const COMMON_QUESTION_KEYS = [
  { value: 'what_is_your_nationality', label: 'Nationality' },
  { value: 'which_destination_would_you_like_to_visit', label: 'Destination' },
  {
    value: 'which_destinations_are_you_interested_in',
    label: 'Destinations (multi)'
  },
  { value: 'what_is_your_budget_per_person', label: 'Budget per person' },
  { value: 'which_visa_assistance_are_you_looking_for', label: 'Visa type' },
  { value: 'what_is_the_purpose_of_travel', label: 'Travel purpose' },
  {
    value: 'which_maldives_resort_are_you_interested_in',
    label: 'Maldives resort'
  },
  {
    value: 'which_uae_city_will_you_be_travelling_from',
    label: 'UAE city'
  },
  { value: 'city', label: 'City' }
]

const SAMPLE_JSON = `[
  {"name":"full_name","values":["Test User"]},
  {"name":"email","values":["test@example.com"]},
  {"name":"phone_number","values":["+971501234567"]},
  {"name":"what_is_your_nationality?","values":["Bangladesh"]}
]`

function isSuperAdminRole(role?: string) {
  const normalized = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  return normalized === 'super_admin' || normalized === 'superadmin'
}

const MetaLeadMappingPanel: React.FC = () => {
  const { user } = useAuth()
  const isSuperAdmin = isSuperAdminRole(user?.role)
  const [metadata, setMetadata] = useState<MetaLeadMappingMetadata | null>(null)
  const [profiles, setProfiles] = useState<MetaLeadProfile[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [scopeType, setScopeType] = useState<MetaLeadScopeType>('form')
  const [scopeId, setScopeId] = useState('')
  const [priority, setPriority] = useState('100')
  const [leadType, setLeadType] = useState('')
  const [leadCountry, setLeadCountry] = useState('')
  const [clientCurrency, setClientCurrency] = useState('INR')
  const [sourceLabel, setSourceLabel] = useState('')
  const [questionPreset, setQuestionPreset] = useState('')
  const [mapKeys, setMapKeys] = useState('')
  const [mapColumn, setMapColumn] = useState('')
  const [mapTransform, setMapTransform] = useState('none')
  const [testFormId, setTestFormId] = useState('')
  const [testAdId, setTestAdId] = useState('')
  const [testJson, setTestJson] = useState(SAMPLE_JSON)
  const [testResult, setTestResult] = useState('')

  const selected = useMemo(
    () => profiles.find(p => p.id === selectedId) ?? null,
    [profiles, selectedId]
  )

  const columnOptions = useMemo(
    () =>
      (metadata?.mappableColumns ?? []).map(c => ({
        value: c.column,
        label: `${c.label} (${c.column})`
      })),
    [metadata]
  )

  const scopeOptions = useMemo(
    () =>
      (metadata?.scopeTypes ?? ['form']).map(t => ({
        value: t,
        label: SCOPE_LABELS[t as MetaLeadScopeType] ?? t
      })),
    [metadata]
  )

  const transformOptions = useMemo(
    () => (metadata?.transforms ?? ['none']).map(t => ({ value: t, label: t })),
    [metadata]
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [meta, list] = await Promise.all([
        metaLeadMappingsApi.getMetadata(),
        metaLeadMappingsApi.listProfiles()
      ])
      setMetadata(meta)
      setProfiles(list)
      setSelectedId(prev => prev || list[0]?.id || '')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Load failed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!selected) {
      setName('')
      setScopeType('form')
      setScopeId('')
      return
    }
    setName(selected.name)
    setScopeType(selected.scopeType)
    setScopeId(selected.scopeId || '')
    setPriority(String(selected.priority ?? 100))
    setLeadType(selected.leadType || '')
    setLeadCountry(selected.leadCountry || '')
    setClientCurrency(selected.clientCurrency || '')
    setSourceLabel(selected.sourceLabel || '')
    if (selected.scopeType === 'form') setTestFormId(selected.scopeId)
  }, [selected])

  const profilePayload = () => ({
    name: name.trim(),
    scopeType,
    scopeId: scopeType === 'default' ? '' : scopeId.trim(),
    priority: Number(priority) || 100,
    leadType: leadType || null,
    leadCountry: leadCountry.trim() || null,
    clientCurrency: clientCurrency.trim() || null,
    sourceLabel: sourceLabel.trim() || null,
    isActive: true
  })

  const saveProfile = async () => {
    if (!name.trim()) return toast.error('Name required')
    setSaving(true)
    try {
      if (selected) {
        await metaLeadMappingsApi.updateProfile(selected.id, profilePayload())
        await metaLeadMappingsApi.reloadCache()
        toast.success('Saved')
      } else {
        const created = await metaLeadMappingsApi.createProfile(profilePayload())
        setSelectedId(created.id)
        toast.success('Created')
      }
      await load()
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  const addMap = async () => {
    if (!selected) return toast.error('Select profile')
    const keys = mapKeys.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
    if (!keys.length || !mapColumn) return toast.error('Keys and column required')
    setSaving(true)
    try {
      await metaLeadMappingsApi.createFieldMap(selected.id, {
        metaFieldKeys: keys,
        targetColumn: mapColumn,
        transform: mapTransform
      })
      setMapKeys('')
      await metaLeadMappingsApi.reloadCache()
      await load()
      toast.success('Map added')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Add map failed'))
    } finally {
      setSaving(false)
    }
  }

  const removeMap = async (mapId: string) => {
    setSaving(true)
    try {
      await metaLeadMappingsApi.deleteFieldMap(mapId)
      await metaLeadMappingsApi.reloadCache()
      await load()
      toast.success('Map removed')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Remove failed'))
    } finally {
      setSaving(false)
    }
  }

  if (!isSuperAdmin) {
    return (
      <SurfaceCard className='p-4'>
        <p className='text-sm text-gray-600 dark:text-gray-300'>
          Meta Lead Mapping is only available to super admin users.
        </p>
      </SurfaceCard>
    )
  }

  if (loading && !profiles.length) {
    return <p className='text-sm text-gray-500'>Loading…</p>
  }

  return (
    <div className='space-y-4'>
      <SurfaceCard className='p-4'>
        <div className='flex flex-wrap justify-between gap-2'>
          <div>
            <h2 className='text-lg font-semibold'>Meta Lead Mapping</h2>
            <p className='text-sm text-gray-500'>
              Configure per ad / form / page in database — not in .env. Secrets
              (tokens) stay in server env only.
            </p>
            {metadata?.configSource ? (
              <p className='mt-1 text-xs text-gray-400'>{metadata.configSource}</p>
            ) : null}
          </div>
          <button
            type='button'
            className='btn-secondary text-sm'
            onClick={() =>
              metaLeadMappingsApi.reloadCache().then(r =>
                toast.success(`Cache: ${r.profileCount} profiles`)
              )
            }
          >
            Reload cache
          </button>
        </div>
      </SurfaceCard>

      <div className='grid gap-4 xl:grid-cols-[260px_1fr]'>
        <SurfaceCard className='p-3'>
          <button
            type='button'
            className='btn-secondary mb-2 w-full text-sm'
            onClick={() => {
              setSelectedId('')
              setName('')
            }}
          >
            New profile
          </button>
          {profiles.map(p => (
            <button
              key={p.id}
              type='button'
              className={`mb-1 w-full rounded-lg px-2 py-2 text-left text-sm ${
                p.id === selectedId ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'
              }`}
              onClick={() => setSelectedId(p.id)}
            >
              {p.name}
              <span className='block text-xs text-gray-500'>
                {p.scopeType} {p.scopeId}
              </span>
            </button>
          ))}
        </SurfaceCard>

        <div className='space-y-4'>
          <SurfaceCard className='p-4 space-y-3'>
            <h3 className='font-medium'>{selected ? 'Edit' : 'Create'} profile</h3>
            <p className='text-xs text-gray-500'>
              Scope: which ad / form / page this rule applies to (paste ID from
              Meta Ads Manager).
            </p>
            <input className='field-input' placeholder='Profile name' value={name} onChange={e => setName(e.target.value)} />
            <SearchableDropdown value={scopeType} options={scopeOptions} onChange={v => setScopeType(v as MetaLeadScopeType)} />
            <input className='field-input font-mono text-xs' placeholder='Scope ID (Meta)' value={scopeId} disabled={scopeType === 'default'} onChange={e => setScopeId(e.target.value)} />
            <input className='field-input' type='number' placeholder='Priority (lower = wins)' value={priority} onChange={e => setPriority(e.target.value)} />

            <div className='border-t border-gray-200 pt-3 dark:border-gray-700'>
              <p className='mb-2 text-sm font-medium text-gray-800 dark:text-gray-100'>
                Fixed defaults (dropdowns)
              </p>
              <label className='field-label'>Lead type</label>
              <SearchableDropdown value={leadType} options={LEAD_TYPE_OPTIONS} onChange={setLeadType} />
              <label className='field-label mt-2'>Lead country</label>
              <SearchableDropdown value={leadCountry} options={countryOptions} searchPlaceholder='Search country…' onChange={setLeadCountry} />
              <label className='field-label mt-2'>Client currency</label>
              <SearchableDropdown value={clientCurrency} options={currencyOptions} searchPlaceholder='Search currency…' onChange={setClientCurrency} />
              <label className='field-label mt-2'>Lead source label</label>
              <input className='field-input' placeholder='e.g. Getfares, Meta India Page' value={sourceLabel} onChange={e => setSourceLabel(e.target.value)} />
            </div>

            <button type='button' className='btn-primary text-sm' disabled={saving} onClick={() => void saveProfile()}>
              {selected ? 'Save profile' : 'Create profile'}
            </button>
          </SurfaceCard>

          {selected ? (
            <SurfaceCard className='p-4 space-y-2'>
              <h3 className='font-medium'>Map form questions → lead fields</h3>
              <p className='text-xs text-gray-500'>
                Nationality, destination, budget, etc. come from the ad form
                answers — pick CRM field and Meta question key(s).
              </p>
              {(selected.fieldMaps || []).map(m => (
                <div key={m.id} className='flex items-center justify-between rounded border p-2 text-xs'>
                  <span className='font-mono'>{m.metaFieldKeys.join(', ')} → {m.targetColumn}</span>
                  <button
                    type='button'
                    className='text-red-600 disabled:opacity-50'
                    disabled={saving}
                    onClick={() => void removeMap(m.id)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              <label className='field-label'>Common question (optional)</label>
              <SearchableDropdown
                value={questionPreset}
                options={[
                  { value: '', label: 'Pick preset or type keys below' },
                  ...COMMON_QUESTION_KEYS
                ]}
                onChange={v => {
                  setQuestionPreset(v)
                  if (v) setMapKeys(v)
                }}
              />
              <label className='field-label'>Meta question keys (comma or newline)</label>
              <textarea className='field-input font-mono text-xs' rows={2} placeholder='what_is_your_nationality' value={mapKeys} onChange={e => setMapKeys(e.target.value)} />
              <label className='field-label'>CRM field</label>
              <SearchableDropdown value={mapColumn} options={formColumnOptions} searchPlaceholder='Nationality, Destination…' onChange={setMapColumn} />
              <SearchableDropdown value={mapTransform} options={transformOptions} onChange={setMapTransform} />
              <button type='button' className='btn-secondary text-sm' disabled={saving} onClick={() => void addMap()}>
                Add map
              </button>
            </SurfaceCard>
          ) : null}

          <SurfaceCard className='p-4 space-y-2'>
            <h3 className='font-medium'>Test</h3>
            <input
              className='field-input font-mono text-xs'
              placeholder='metaFormId'
              value={testFormId}
              onChange={e => setTestFormId(e.target.value)}
            />
            <input
              className='field-input font-mono text-xs'
              placeholder='metaAdId (optional)'
              value={testAdId}
              onChange={e => setTestAdId(e.target.value)}
            />
            <textarea className='field-input font-mono text-xs' rows={5} value={testJson} onChange={e => setTestJson(e.target.value)} />
            <button
              type='button'
              className='btn-primary text-sm'
              onClick={() => {
                try {
                  const fieldData = JSON.parse(testJson)
                  metaLeadMappingsApi
                    .testMapping({
                      fieldData,
                      metaFormId: testFormId.trim() || undefined,
                      metaAdId: testAdId.trim() || undefined
                    })
                    .then(r => setTestResult(JSON.stringify(r, null, 2)))
                    .catch(e => toast.error(getApiErrorMessage(e, 'Test failed')))
                } catch {
                  toast.error('Invalid JSON')
                }
              }}
            >
              Run test
            </button>
            {testResult ? <pre className='max-h-40 overflow-auto rounded bg-gray-900 p-2 text-xs text-green-200'>{testResult}</pre> : null}
          </SurfaceCard>
        </div>
      </div>
    </div>
  )
}

export default MetaLeadMappingPanel
