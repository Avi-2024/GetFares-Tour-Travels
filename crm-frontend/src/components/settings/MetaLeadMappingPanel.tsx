import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Country } from 'country-state-city'
import {
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaPlus,
  FaRotate,
  FaTrash
} from 'react-icons/fa6'
import { toast } from 'sonner'
import { getApiErrorMessage } from '../../api/apiClient'
import { useAuth } from '../../context/AuthContext'
import { getCurrencyOptions } from '../../utils/currency'
import { metaConnectionApi, type MetaPageConfig } from '../../api/metaConnection'
import {
  metaLeadMappingsApi,
  type MetaLeadMappingMetadata,
  type MetaLeadProfile,
  type MetaLeadScopeType
} from '../../api/metaLeadMappings'
import { canManageMetaConfiguration } from '../../utils/roles'
import SearchableDropdown from '../ui/SearchableDropdown'

/* ─── constants ─────────────────────────────────────────────── */
const SCOPE_ORDER: MetaLeadScopeType[] = ['ad', 'form', 'campaign', 'page', 'default']

const SCOPE_INFO: Record<
  MetaLeadScopeType,
  { label: string; idLabel: string; placeholder: string; hint: string }
> = {
  ad: {
    label: 'Specific ad',
    idLabel: 'Ad ID',
    placeholder: 'Paste Meta ad ID',
    hint: 'Best match — one ad creative.'
  },
  form: {
    label: 'Lead form',
    idLabel: 'Form ID',
    placeholder: 'Paste Meta form ID',
    hint: 'Use when same form runs on multiple ads.'
  },
  campaign: {
    label: 'Campaign',
    idLabel: 'Campaign ID',
    placeholder: 'Paste Meta campaign ID',
    hint: 'Matches all ads in this campaign.'
  },
  page: {
    label: 'Facebook page',
    idLabel: 'Page ID',
    placeholder: 'Paste Meta page ID',
    hint: 'Every lead from this Facebook page.'
  },
  default: {
    label: 'Fallback (all others)',
    idLabel: '',
    placeholder: '',
    hint: 'Used when no other rule matches.'
  }
}

const LEAD_TYPES = [
  { value: 'HOLIDAY', label: 'Holidays' },
  { value: 'VISA', label: 'Visa' }
]

const SAMPLE_JSON = `[
  {"name":"full_name","values":["Test User"]},
  {"name":"email","values":["test@example.com"]},
  {"name":"phone_number","values":["+971501234567"]},
  {"name":"field_key","values":["Sample value"]}
]`

function formatQuestionLabel(key: string) {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function readSampleQuestionKeys(sampleJson: string) {
  try {
    const parsed = JSON.parse(sampleJson)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => String(item?.name || '').trim())
      .filter(Boolean)
  } catch {
    return []
  }
}

function normalizeMetaQuestionKey(input: string) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['"`]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
}

/* ─── tiny components ───────────────────────────────────────── */
function Label({ children }: { children: React.ReactNode }) {
  return <p className="mb-1 text-sm font-medium text-slate-700">{children}</p>
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-xs text-slate-400">{children}</p>
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  mono
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  mono?: boolean
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={`w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 ${mono ? 'font-mono' : ''}`}
    />
  )
}

function RuleCard({
  profile,
  active,
  onClick
}: {
  profile: MetaLeadProfile
  active: boolean
  onClick: () => void
}) {
  const info = SCOPE_INFO[profile.scopeType]
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-xl border px-4 py-3 text-left transition-colors ${
        active
          ? 'border-blue-300 bg-blue-50'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <p className="text-sm font-semibold text-slate-800">{profile.name}</p>
      <p className="mt-0.5 text-xs text-slate-500">
        {info.label}
        {profile.scopeId ? (
          <span className="ml-1 font-mono text-slate-400">· {profile.scopeId}</span>
        ) : null}
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {profile.leadType && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700">
            {profile.leadType === 'HOLIDAY' ? 'Holidays' : 'Visa'}
          </span>
        )}
        {profile.clientCurrency && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            {profile.clientCurrency}
          </span>
        )}
        {profile.leadCountry && (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            {profile.leadCountry}
          </span>
        )}
      </div>
    </button>
  )
}

/* ─── rule form state ────────────────────────────────────────── */
type RuleForm = {
  name: string
  scopeType: MetaLeadScopeType
  scopeId: string
  leadType: string
  leadCountry: string
  currency: string
  sourceLabel: string
}

const emptyForm = (): RuleForm => ({
  name: '',
  scopeType: 'form',
  scopeId: '',
  leadType: '',
  leadCountry: '',
  currency: '',
  sourceLabel: ''
})

function formFromProfile(p: MetaLeadProfile): RuleForm {
  return {
    name: p.name,
    scopeType: p.scopeType,
    scopeId: p.scopeId || '',
    leadType: p.leadType || '',
    leadCountry: p.leadCountry || '',
    currency: p.clientCurrency || '',
    sourceLabel: p.sourceLabel || ''
  }
}

/* ─── main ───────────────────────────────────────────────────── */
const MetaLeadMappingPanel: React.FC = () => {
  const { user } = useAuth()
  const canManage = canManageMetaConfiguration(user?.role)
  const mountedRef = useRef(true)

  /* data */
  const [metadata, setMetadata] = useState<MetaLeadMappingMetadata | null>(null)
  const [profiles, setProfiles] = useState<MetaLeadProfile[]>([])
  const [metaPages, setMetaPages] = useState<MetaPageConfig[]>([])
  const [sourceLabelNames, setSourceLabelNames] = useState<string[]>([])
  const [bootstrapping, setBootstrapping] = useState(true)
  const [hasConnection, setHasConnection] = useState(false)

  /* ui states */
  const [saving, setSaving] = useState(false)
  const [addingMap, setAddingMap] = useState(false)
  const [removingMapId, setRemovingMapId] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)
  const [creatingTestLead, setCreatingTestLead] = useState(false)

  /* rule form */
  const [selectedId, setSelectedId] = useState('')
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState<RuleForm>(emptyForm())

  /* section toggles */
  const [showMaps, setShowMaps] = useState(false)
  const [showTest, setShowTest] = useState(false)

  /* question map form */
  const [mapQuestion, setMapQuestion] = useState('')
  const [mapColumn, setMapColumn] = useState('')

  /* test */
  const [testJson, setTestJson] = useState(SAMPLE_JSON)
  const [testPageId, setTestPageId] = useState('')
  const [testFormId, setTestFormId] = useState('')
  const [testAdId, setTestAdId] = useState('')
  const [testCampaignId, setTestCampaignId] = useState('')
  const [testResult, setTestResult] = useState('')

  /* ── derived ── */
  const selected = useMemo(
    () => profiles.find((p) => p.id === selectedId) ?? null,
    [profiles, selectedId]
  )

  const selectedFieldMaps = useMemo(
    () => (selected?.fieldMaps ?? []).filter((map) => map.isActive !== false),
    [selected]
  )

  const formOpen = isNew || selectedId !== ''

  const countryOptions = useMemo(
    () => [
      { value: '', label: 'Select country' },
      ...Country.getAllCountries()
        .map((c) => ({ value: c.name, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label))
    ],
    []
  )

  const currencyOptions = useMemo(() => getCurrencyOptions(false), [])

  const columnOptions = useMemo(
    () =>
      (metadata?.mappableColumns ?? []).map((c) => ({
        value: c.column,
        label: c.label
      })),
    [metadata]
  )

  const pageOptions = useMemo(
    () => [
      { value: '', label: 'Select Meta page' },
      ...metaPages
        .filter((page) => page.isActive !== false && page.pageId)
        .map((page) => ({
          value: page.pageId,
          label: page.pageName || page.pageId,
          selectedLabel: page.pageName || page.pageId,
          rightLabel: page.pageId,
          searchText: `${page.pageName || ''} ${page.pageId}`
        }))
    ],
    [metaPages]
  )

  const applyPageRuleDefaults = useCallback(
    (pageId: string) => {
      const page = metaPages.find((item) => item.pageId === pageId)
      setForm((current) => ({
        ...current,
        scopeId: pageId,
        ...(page ?
          {
            name: current.name.trim() ?
              current.name
            : `${page.pageName || 'Meta page'} rule`,
            sourceLabel:
              current.sourceLabel.trim() ?
                current.sourceLabel
              : page.sourceLabel || page.pageName || '',
            leadCountry: current.leadCountry || page.countryName || ''
          }
        : {})
      }))
    },
    [metaPages]
  )

  const questionOptions = useMemo(() => {
    const keys = new Set<string>()
    ;(metadata?.formQuestionFields ?? []).forEach((key) => {
      const trimmed = key.trim()
      if (trimmed) keys.add(trimmed)
    })
    readSampleQuestionKeys(testJson).forEach((key) => keys.add(key))
    profiles.forEach((profile) => {
      const maps = profile.fieldMaps ?? []
      maps.forEach((map) => {
        if (map.isActive === false) return
        map.metaFieldKeys.forEach((key) => {
          const trimmed = key.trim()
          if (trimmed) keys.add(trimmed)
        })
      })
    })
    const customKey = mapQuestion.trim()
    if (customKey) keys.add(customKey)
    return [
      { value: '', label: 'Pick question' },
      ...Array.from(keys)
        .sort((a, b) => a.localeCompare(b))
        .map((key) => ({
          value: key,
          label: formatQuestionLabel(key),
          rightLabel: key
        }))
    ]
  }, [mapQuestion, metadata, profiles, testJson])

  const sourceLabelOptions = useMemo(() => {
    const labels = Array.from(
      new Set(
        [...sourceLabelNames, form.sourceLabel]
          .map((label) => label.trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b))
    return [
      { value: '', label: 'Select source label' },
      ...labels.map((label) => ({ value: label, label }))
    ]
  }, [form.sourceLabel, sourceLabelNames])

  const buildDynamicSampleJson = useCallback(() => {
    const keys = new Set<string>(['full_name', 'email', 'phone_number'])
    if (mapQuestion.trim()) keys.add(normalizeMetaQuestionKey(mapQuestion))
    selectedFieldMaps.forEach((map) => {
      map.metaFieldKeys.forEach((key) => {
        const normalized = normalizeMetaQuestionKey(key)
        if (normalized) keys.add(normalized)
      })
    })

    const values: Record<string, string> = {
      full_name: 'Test User',
      email: 'test@example.com',
      phone_number: '+971501234567',
      nationality: 'Indian',
      city: 'Dubai',
      budget: '200000',
      travel_to: 'Dubai',
      travel_date: '2026-06-15',
      visa_required: 'Yes'
    }

    return JSON.stringify(
      Array.from(keys).map((key) => ({
        name: key,
        values: [values[key] || 'Sample value']
      })),
      null,
      2
    )
  }, [mapQuestion, selectedFieldMaps])

  /* ── initial load (once) ── */
  useEffect(() => {
    mountedRef.current = true
    const init = async () => {
      try {
        const [meta, pageList, list] = await Promise.all([
          metaLeadMappingsApi.getMetadata(),
          metaConnectionApi.listPages({ isActive: true }),
          metaLeadMappingsApi.listProfiles()
        ])
        if (!mountedRef.current) return
        const connected = pageList.some((page) => page.isActive !== false)
        const labels = pageList
          .map((page) => String(page.sourceLabel || '').trim())
          .filter(Boolean)
        setMetadata(meta)
        setMetaPages(pageList)
        setSourceLabelNames(labels)
        setHasConnection(connected)
        setProfiles(connected ? list : [])
        setTestPageId(pageList.find((page) => page.isActive !== false)?.pageId || '')
      } catch (err) {
        if (!mountedRef.current) return
        toast.error(getApiErrorMessage(err, 'Failed to load rules'))
      } finally {
        if (mountedRef.current) setBootstrapping(false)
      }
    }
    void init()
    return () => {
      mountedRef.current = false
    }
  }, [])

  /* ── form helpers ── */
  const setF = useCallback(
    <K extends keyof RuleForm>(key: K, value: RuleForm[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    []
  )

  const openNew = () => {
    setSelectedId('')
    setIsNew(true)
    setForm(emptyForm())
    setShowMaps(false)
    setTestResult('')
  }

  const selectRule = (id: string) => {
    const p = profiles.find((x) => x.id === id)
    if (!p) return
    setIsNew(false)
    setSelectedId(id)
    setForm(formFromProfile(p))
    setShowMaps(false)
    setTestResult('')
    setTestJson(SAMPLE_JSON)
    if (p.scopeType === 'form') setTestFormId(p.scopeId || '')
    else if (p.scopeType === 'ad') setTestAdId(p.scopeId || '')
    else if (p.scopeType === 'campaign') setTestCampaignId(p.scopeId || '')
    else if (p.scopeType === 'page') setTestPageId(p.scopeId || testPageId)
  }

  const closeForm = () => {
    setSelectedId('')
    setIsNew(false)
    setShowMaps(false)
    setTestResult('')
  }

  /* helper: replace one profile in list */
  const patchProfile = useCallback(
    (updated: MetaLeadProfile) =>
      setProfiles((prev) =>
        prev.map((p) => (p.id === updated.id ? updated : p))
      ),
    []
  )

  /* ── save rule ── */
  const saveRule = async () => {
    if (!form.name.trim()) return toast.error('Rule name is required')
    if (form.scopeType !== 'default' && !form.scopeId.trim())
      return toast.error(`${SCOPE_INFO[form.scopeType].idLabel} is required`)
    if (!form.leadType) return toast.error('Select lead type')
    if (!form.currency) return toast.error('Select currency')

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        scopeType: form.scopeType,
        scopeId: form.scopeType === 'default' ? '' : form.scopeId.trim(),
        priority: selected?.priority ?? 100,
        leadType: form.leadType || null,
        leadCountry: form.leadCountry || null,
        clientCurrency: form.currency || null,
        sourceLabel: form.sourceLabel.trim() || null,
        isActive: true
      }

      if (selected) {
        const updated = await metaLeadMappingsApi.updateProfile(selected.id, payload)
        /* update in list, preserve fieldMaps */
        patchProfile({ ...updated, fieldMaps: selected.fieldMaps })
        toast.success('Rule saved')
      } else {
        const created = await metaLeadMappingsApi.createProfile(payload)
        setProfiles((prev) => [...prev, { ...created, fieldMaps: [] }])
        setIsNew(false)
        setSelectedId(created.id)
        toast.success('Rule created')
      }
      /* fire-and-forget cache reload */
      metaLeadMappingsApi.reloadCache().catch(() => {})
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Save failed'))
    } finally {
      setSaving(false)
    }
  }

  /* ── add question map ── */
  const addMap = async () => {
    if (!selected) return toast.error('Save rule first')
    if (!mapQuestion.trim()) return toast.error('Pick a question')
    if (!mapColumn) return toast.error('Pick a CRM field')

    setAddingMap(true)
    try {
      const newMap = await metaLeadMappingsApi.createFieldMap(selected.id, {
        metaFieldKeys: [mapQuestion.trim()],
        targetColumn: mapColumn,
        transform: 'none'
      })
      /* append map to profile in list */
      patchProfile({
        ...selected,
        fieldMaps: [...(selected.fieldMaps || []), newMap]
      })
      setMapQuestion('')
      setMapColumn('')
      metaLeadMappingsApi.reloadCache().catch(() => {})
      toast.success('Mapping added')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to add mapping'))
    } finally {
      setAddingMap(false)
    }
  }

  /* ── remove question map ── */
  const removeMap = async (mapId: string) => {
    if (!selected) return
    setRemovingMapId(mapId)
    try {
      await metaLeadMappingsApi.deleteFieldMap(mapId)
      patchProfile({
        ...selected,
        fieldMaps: (selected.fieldMaps || []).filter((m) => m.id !== mapId)
      })
      metaLeadMappingsApi.reloadCache().catch(() => {})
      toast.success('Mapping removed')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to remove'))
    } finally {
      setRemovingMapId(null)
    }
  }

  /* ── test ── */
  const runTest = async () => {
    setTesting(true)
    setTestResult('')
    try {
      let fieldData: unknown
      try {
        fieldData = JSON.parse(testJson)
      } catch {
        toast.error('Invalid JSON in sample')
        return
      }
      const result = await metaLeadMappingsApi.testMapping({
        fieldData: fieldData as Parameters<typeof metaLeadMappingsApi.testMapping>[0]['fieldData'],
        metaFormId: testFormId.trim() || undefined,
        metaAdId: testAdId.trim() || undefined,
        metaCampaignId: testCampaignId.trim() || undefined
      })
      setTestResult(JSON.stringify(result, null, 2))
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Test failed'))
    } finally {
      setTesting(false)
    }
  }

  const createTestLead = async () => {
    if (!testPageId.trim()) return toast.error('Select Facebook page')
    setCreatingTestLead(true)
    setTestResult('')
    try {
      let fieldData: unknown
      try {
        fieldData = JSON.parse(testJson)
      } catch {
        toast.error('Invalid JSON in sample')
        return
      }
      const result = await metaLeadMappingsApi.createTestLead({
        fieldData: fieldData as Parameters<typeof metaLeadMappingsApi.createTestLead>[0]['fieldData'],
        metaPageId: testPageId.trim(),
        metaFormId: testFormId.trim() || undefined,
        metaAdId: testAdId.trim() || undefined,
        metaCampaignId: testCampaignId.trim() || undefined,
        leadgenId: `crm_ui_test_${Date.now()}`
      })
      setTestResult(JSON.stringify(result, null, 2))
      toast.success(result.duplicate ? 'Existing lead matched' : 'Test lead created')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Test lead failed'))
    } finally {
      setCreatingTestLead(false)
    }
  }

  /* ── guards ── */
  if (!canManage)
    return (
      <p className="text-sm text-slate-500">Admin or super admin access required.</p>
    )

  if (bootstrapping)
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <FaRotate className="animate-spin" /> Loading rules…
      </div>
    )

  if (!hasConnection)
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-sm text-slate-500">
        Create Meta connection first.
      </div>
    )

  const info = SCOPE_INFO[form.scopeType]

  /* ─── render ─────────────────────────────────────────────────── */
  return (
    <div className="flex gap-6 max-w-5xl">

      {/* ── Left: rule list ── */}
      <div className="w-64 shrink-0 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">Rules</p>
          <button
            type="button"
            onClick={openNew}
            disabled={saving}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs hover:bg-slate-50 disabled:opacity-40"
          >
            <FaPlus /> New
          </button>
        </div>

        {profiles.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-8 text-center text-xs text-slate-400">
            No rules yet
          </div>
        ) : (
          profiles.map((p) => (
            <RuleCard
              key={p.id}
              profile={p}
              active={selectedId === p.id && !isNew}
              onClick={() => selectRule(p.id)}
            />
          ))
        )}

        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 leading-5">
          <strong className="text-slate-700">Priority order:</strong>
          <br />
          Ad → Form → Campaign → Page → Fallback
        </div>
      </div>

      {/* ── Right: detail ── */}
      {formOpen ? (
        <div className="flex-1 min-w-0 space-y-4">

          {/* ── Rule identity + lead defaults ── */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
            <p className="text-sm font-semibold text-slate-800">
              {isNew ? 'New rule' : 'Edit rule'}
            </p>

            <div>
              <Label>Rule name</Label>
              <TextInput
                value={form.name}
                onChange={(v) => setF('name', v)}
                placeholder="e.g. India Holidays Form"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
	              <div>
	                <Label>When lead comes from</Label>
                <select
                  value={form.scopeType}
                  onChange={(e) => {
                    const nextScope = e.target.value as MetaLeadScopeType
                    setF('scopeType', nextScope)
                    setF('scopeId', '')
                    if (nextScope === 'page' && !form.name.trim()) {
                      setF('name', 'Facebook page rule')
                    }
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SCOPE_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {SCOPE_INFO[s].label}
                    </option>
                  ))}
                </select>
                <Hint>{info.hint}</Hint>
              </div>

              {form.scopeType === 'page' && (
                <div>
                  <Label>Facebook page</Label>
                  <SearchableDropdown
                    value={form.scopeId}
                    options={pageOptions}
                    searchPlaceholder="Search Meta page..."
                    onChange={applyPageRuleDefaults}
                  />
                  <Hint>Uses Page ID from Meta connection.</Hint>
                </div>
              )}

              {form.scopeType !== 'default' && form.scopeType !== 'page' && (
                <div>
                  <Label>{info.idLabel}</Label>
                  <TextInput
                    value={form.scopeId}
                    onChange={(v) => setF('scopeId', v)}
                    placeholder={info.placeholder}
                    mono
                  />
                  <Hint>Copy from Meta Ads Manager → ID column.</Hint>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Save this lead as…
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Lead type</Label>
                  <SearchableDropdown
                    value={form.leadType}
                    options={LEAD_TYPES}
                    onChange={(v) => setF('leadType', v)}
                  />
                </div>
                <div>
                  <Label>Currency</Label>
                  <SearchableDropdown
                    value={form.currency}
                    options={currencyOptions}
                    searchPlaceholder="Search currency…"
                    onChange={(v) => setF('currency', v)}
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <SearchableDropdown
                    value={form.leadCountry}
                    options={countryOptions}
                    searchPlaceholder="Search country…"
                    onChange={(v) => setF('leadCountry', v)}
                  />
                </div>
                <div>
                  <Label>Source label</Label>
                  <SearchableDropdown
                    value={form.sourceLabel}
                    options={sourceLabelOptions}
                    onChange={(v) => setF('sourceLabel', v)}
                    placeholder="Meta Ads India"
                    searchPlaceholder="Search source label..."
                    creatable
                    onCreatePick={(v) => setF('sourceLabel', v)}
                    createPrompt="Use source"
                  />
                  <Hint>Shown as "Lead source" on the lead card.</Hint>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={closeForm}
                disabled={saving}
                className="text-sm text-slate-400 hover:text-slate-700 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveRule()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {saving ? <FaRotate className="animate-spin" /> : <FaCheck />}
                {isNew ? 'Create rule' : 'Save rule'}
              </button>
            </div>
          </div>

          {/* ── Question mapping ── */}
          {selected && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-visible">
              <button
                type="button"
                onClick={() => setShowMaps((s) => !s)}
                className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <span>
                  Question → CRM field mapping
                  <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                    {selectedFieldMaps.length} mapped
                  </span>
                </span>
                {showMaps ? (
                  <FaChevronUp className="text-slate-400" />
                ) : (
                  <FaChevronDown className="text-slate-400" />
                )}
              </button>

              {showMaps && (
                <div className="border-t border-slate-100 p-5 space-y-4">
                  <p className="text-xs text-slate-500">
                    Map a Meta form question to a CRM field so the answer is saved
                    automatically. E.g. nationality question → Nationality field.
                  </p>

                  {/* existing maps */}
                  {selectedFieldMaps.length > 0 && (
                    <div className="space-y-2">
                      {selectedFieldMaps.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
                        >
                          <span className="font-mono text-slate-600 truncate">
                            {m.metaFieldKeys.join(', ')}
                            <span className="mx-2 text-slate-400">→</span>
                            {columnOptions.find((c) => c.value === m.targetColumn)
                              ?.label ?? m.targetColumn}
                          </span>
                          <button
                            type="button"
                            disabled={removingMapId === m.id}
                            onClick={() => void removeMap(m.id)}
                            className="ml-3 shrink-0 text-red-400 hover:text-red-600 disabled:opacity-40"
                            title="Remove mapping"
                          >
                            {removingMapId === m.id ? (
                              <FaRotate className="animate-spin" />
                            ) : (
                              <FaTrash />
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* add new */}
                  <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] items-end">
                    <div>
                      <Label>Form question</Label>
                      <input
                        list="meta-question-suggestions"
                        value={mapQuestion}
                        onChange={(event) => setMapQuestion(event.target.value)}
                        placeholder="Paste exact Meta question"
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                      />
                      <datalist id="meta-question-suggestions">
                        {questionOptions
                          .filter((option) => option.value)
                          .map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                      </datalist>
                      {mapQuestion.trim() ? (
                        <Hint>Saved key: {normalizeMetaQuestionKey(mapQuestion)}</Hint>
                      ) : (
                        <Hint>Paste the same question text used in Meta form.</Hint>
                      )}
                    </div>
                    <div>
                      <Label>Save into CRM field</Label>
                      <SearchableDropdown
                        value={mapColumn}
                        options={[
                          { value: '', label: 'Pick CRM field' },
                          ...columnOptions
                        ]}
                        onChange={setMapColumn}
                        searchPlaceholder="Search field…"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={addingMap || !mapQuestion || !mapColumn}
                      onClick={() => void addMap()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-40"
                    >
                      {addingMap ? <FaRotate className="animate-spin" /> : <FaPlus />}
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Test rule ── */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-visible">
            <button
              type="button"
              onClick={() => setShowTest((s) => !s)}
              className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <span>
                Test rule
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-normal text-slate-500">
                  optional
                </span>
              </span>
              {showTest ? (
                <FaChevronUp className="text-slate-400" />
              ) : (
                <FaChevronDown className="text-slate-400" />
              )}
            </button>

            {showTest && (
              <div className="border-t border-slate-100 p-5 space-y-3">
                <p className="text-xs text-slate-500">
                  Paste IDs and a sample form response to see which rule fires.
                </p>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setTestJson(buildDynamicSampleJson())}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
                  >
                    <FaRotate /> Generate from mappings
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div>
                    <Label>Facebook page</Label>
                    <SearchableDropdown
                      value={testPageId}
                      options={pageOptions}
                      searchPlaceholder="Search Meta page..."
                      onChange={setTestPageId}
                    />
                  </div>
                  <div>
                    <Label>Form ID</Label>
                    <TextInput
                      value={testFormId}
                      onChange={setTestFormId}
                      placeholder="optional"
                      mono
                    />
                  </div>
                  <div>
                    <Label>Ad ID</Label>
                    <TextInput
                      value={testAdId}
                      onChange={setTestAdId}
                      placeholder="optional"
                      mono
                    />
                  </div>
                  <div>
                    <Label>Campaign ID</Label>
                    <TextInput
                      value={testCampaignId}
                      onChange={setTestCampaignId}
                      placeholder="optional"
                      mono
                    />
                  </div>
                </div>

                <div>
                  <Label>Sample lead JSON</Label>
                  <textarea
                    rows={5}
                    value={testJson}
                    onChange={(e) => setTestJson(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={testing}
                    onClick={() => void runTest()}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    {testing ? <FaRotate className="animate-spin" /> : null}
                    Test mapping only
                  </button>
                  <button
                    type="button"
                    disabled={creatingTestLead}
                    onClick={() => void createTestLead()}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    {creatingTestLead ? <FaRotate className="animate-spin" /> : <FaPlus />}
                    Create lead in CRM
                  </button>
                </div>

                {testResult && (
                  <pre className="max-h-56 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-emerald-300">
                    {testResult}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm text-slate-400">
          Select a rule to edit, or click{' '}
          <strong className="mx-1">New</strong> to create one.
        </div>
      )}
    </div>
  )
}

export default MetaLeadMappingPanel
