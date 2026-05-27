import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaCheck,
  FaChevronDown,
  FaChevronUp,
  FaCopy,
  FaFacebook,
  FaFloppyDisk,
  FaLock,
  FaPencil,
  FaPlus,
  FaRotate
} from 'react-icons/fa6'
import { toast } from 'sonner'
import { getApiErrorMessage } from '../../api/apiClient'
import {
  metaConnectionApi,
  type MetaIntegrationSettings,
  type MetaPageConfig,
  type SecretFieldStatus
} from '../../api/metaConnection'
import { useAuth } from '../../context/AuthContext'
import { canManageMetaConfiguration } from '../../utils/roles'

/* ─── types ─────────────────────────────────────────────────── */
type PageFormState = {
  pageId: string
  pageName: string
  countryCode: string
  countryName: string
  countryId: string
  sourceLabel: string
  accessToken: string
  appSecret: string
  verifyToken: string
  graphVersion: string
  isActive: boolean
}

/* ─── helpers ────────────────────────────────────────────────── */
function copyText(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success('Copied to clipboard'))
    .catch(() => toast.error('Copy failed'))
}

function SecretBadge({ status }: { status?: SecretFieldStatus }) {
  if (!status?.configured)
    return <span className="text-xs text-slate-400">Not set</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
      <FaLock className="text-[9px]" /> Saved
    </span>
  )
}

function FieldBlock({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      {children}
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
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

function SecretField({
  label,
  hint,
  status,
  value,
  onChange
}: {
  label: string
  hint?: string
  status?: SecretFieldStatus
  value: string
  onChange: (v: string) => void
}) {
  return (
    <FieldBlock label={label} hint={hint}>
      <div className="flex items-center gap-2">
        <input
          type="password"
          autoComplete="new-password"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            status?.configured ? '••••••  (leave blank to keep)' : 'Paste value'
          }
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <SecretBadge status={status} />
      </div>
    </FieldBlock>
  )
}

const emptyPage = (): PageFormState => ({
  pageId: '',
  pageName: '',
  countryCode: '',
  countryName: '',
  countryId: '',
  sourceLabel: '',
  accessToken: '',
  appSecret: '',
  verifyToken: '',
  graphVersion: 'v20.0',
  isActive: true
})

/* ─── PageCard ────────────────────────────────────────────────── */
function PageCard({
  page,
  active,
  onEdit
}: {
  page: MetaPageConfig
  active: boolean
  onEdit: () => void
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
        active
          ? 'border-blue-300 bg-blue-50'
          : 'border-slate-200 bg-white hover:bg-slate-50'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">
          <FaFacebook className="text-blue-600" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {page.pageName || page.pageId}
          </p>
          <p className="text-xs text-slate-500">
            {page.countryCode || '—'} · ID: {page.pageId}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <SecretBadge status={page.secrets.accessToken} />
        <button
          type="button"
          onClick={onEdit}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Edit page"
        >
          <FaPencil className="text-xs" />
        </button>
      </div>
    </div>
  )
}

/* ─── MetaConnectionPanel ─────────────────────────────────────── */
const MetaConnectionPanel: React.FC = () => {
  const { user } = useAuth()
  const canManage = canManageMetaConfiguration(user?.role)
  const mountedRef = useRef(true)

  const [bootstrapping, setBootstrapping] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingWebhook, setSavingWebhook] = useState(false)
  const [savingPage, setSavingPage] = useState(false)

  const [integration, setIntegration] = useState<MetaIntegrationSettings | null>(null)
  const [pages, setPages] = useState<MetaPageConfig[]>([])

  /* webhook form (secrets only — never pre-filled) */
  const [appSecret, setAppSecret] = useState('')
  const [verifyToken, setVerifyToken] = useState('')

  /* page form */
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [isNewPage, setIsNewPage] = useState(false)
  const [pageForm, setPageForm] = useState<PageFormState>(emptyPage())
  const [showAdvanced, setShowAdvanced] = useState(false)

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const webhookUrl = `${apiBase}/webhook/meta`

  const editingPage = useMemo(
    () => (editingPageId ? pages.find((p) => p.id === editingPageId) ?? null : null),
    [editingPageId, pages]
  )

  const formOpen = isNewPage || editingPageId !== null

  /* ── initial load (once) ── */
  useEffect(() => {
    mountedRef.current = true
    const init = async () => {
      try {
        const [integ, pageList] = await Promise.all([
          metaConnectionApi.getIntegration(),
          metaConnectionApi.listPages()
        ])
        if (!mountedRef.current) return
        setIntegration(integ)
        setPages(pageList)
      } catch (err) {
        if (!mountedRef.current) return
        setError(getApiErrorMessage(err, 'Failed to load Meta connection'))
      } finally {
        if (mountedRef.current) setBootstrapping(false)
      }
    }
    if (canManage) void init()
    else setBootstrapping(false)
    return () => {
      mountedRef.current = false
    }
  }, [canManage])

  /* ── page form helpers ── */
  const setPF = useCallback(
    <K extends keyof PageFormState>(key: K, value: PageFormState[K]) =>
      setPageForm((f) => ({ ...f, [key]: value })),
    []
  )

  const openAdd = () => {
    setEditingPageId(null)
    setIsNewPage(true)
    setPageForm(emptyPage())
    setShowAdvanced(false)
  }

  const openEdit = (page: MetaPageConfig) => {
    setIsNewPage(false)
    setEditingPageId(page.id)
    setPageForm({
      pageId: page.pageId,
      pageName: page.pageName ?? '',
      countryCode: page.countryCode ?? '',
      countryName: page.countryName ?? '',
      countryId: page.countryId ?? '',
      sourceLabel: page.sourceLabel,
      accessToken: '',
      appSecret: '',
      verifyToken: '',
      graphVersion: page.graphVersion ?? 'v20.0',
      isActive: page.isActive
    })
    setShowAdvanced(false)
  }

  const closeForm = () => {
    setEditingPageId(null)
    setIsNewPage(false)
  }

  /* ── save webhook ── */
  const saveWebhook = async () => {
    if (!appSecret.trim() && !verifyToken.trim()) {
      toast.error('Enter at least one value to save')
      return
    }
    setSavingWebhook(true)
    try {
      const body: Record<string, unknown> = { confirmSecrets: true }
      if (verifyToken.trim()) body.verifyToken = verifyToken.trim()
      if (appSecret.trim()) body.appSecret = appSecret.trim()
      const updated = await metaConnectionApi.updateIntegration(body)
      setIntegration(updated)
      setAppSecret('')
      setVerifyToken('')
      toast.success('Webhook settings saved')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save webhook settings'))
    } finally {
      setSavingWebhook(false)
    }
  }

  /* ── save page ── */
  const handleSavePage = async () => {
    if (!pageForm.pageId.trim()) return toast.error('Page ID is required')
    if (!pageForm.sourceLabel.trim()) return toast.error('Source label is required')

    setSavingPage(true)
    try {
      const body: Record<string, unknown> = {
        pageName: pageForm.pageName.trim() || null,
        sourceLabel: pageForm.sourceLabel.trim(),
        countryCode: pageForm.countryCode.trim() || null,
        countryName: pageForm.countryName.trim() || null,
        countryId: pageForm.countryId || null,
        graphVersion: pageForm.graphVersion.trim() || null,
        isActive: pageForm.isActive,
        confirmSecrets: true
      }
      if (pageForm.accessToken.trim()) body.accessToken = pageForm.accessToken.trim()
      if (pageForm.appSecret.trim()) body.appSecret = pageForm.appSecret.trim()
      if (pageForm.verifyToken.trim()) body.verifyToken = pageForm.verifyToken.trim()

      if (isNewPage) {
        const created = await metaConnectionApi.createPage({
          pageId: pageForm.pageId.trim(),
          sourceLabel: pageForm.sourceLabel.trim(),
          ...body
        } as Parameters<typeof metaConnectionApi.createPage>[0])
        /* append to list — no reload */
        setPages((prev) => [...prev, created])
        setEditingPageId(created.id)
        setIsNewPage(false)
        setPageForm((f) => ({ ...f, accessToken: '', appSecret: '', verifyToken: '' }))
        toast.success('Page added')
      } else if (editingPageId) {
        const updated = await metaConnectionApi.updatePage(editingPageId, body)
        /* patch in list — no reload */
        setPages((prev) =>
          prev.map((p) => (p.id === editingPageId ? updated : p))
        )
        setPageForm((f) => ({ ...f, accessToken: '', appSecret: '', verifyToken: '' }))
        toast.success('Page updated')
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save page'))
    } finally {
      setSavingPage(false)
    }
  }

  /* ─── guards ── */
  if (!canManage)
    return (
      <p className="text-sm text-slate-500">
        Admin or super admin access required.
      </p>
    )

  if (bootstrapping)
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <FaRotate className="animate-spin" /> Loading…
      </div>
    )

  if (error)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
        <button
          className="ml-3 underline"
          onClick={() => {
            setError(null)
            setBootstrapping(true)
            metaConnectionApi.getIntegration().then(setIntegration).catch(() => {})
            metaConnectionApi.listPages().then(setPages).catch(() => {})
            setBootstrapping(false)
          }}
        >
          Retry
        </button>
      </div>
    )

  /* ─── render ─────────────────────────────────────────────────── */
  return (
    <div className="max-w-3xl space-y-8">

      {/* ── Step 1: Webhook ── */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
            1
          </span>
          <h2 className="text-base font-semibold text-slate-900">Webhook setup</h2>
        </div>

        {/* webhook URL */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Your webhook URL
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-mono text-slate-800">
              {webhookUrl || (
                <span className="text-slate-400">Set VITE_API_BASE_URL in .env</span>
              )}
            </code>
            <button
              type="button"
              onClick={() => copyText(webhookUrl)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700"
            >
              <FaCopy /> Copy
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Paste in Meta App → Webhooks → Callback URL. Subscribe to{' '}
            <strong>leadgen</strong>.
          </p>
        </div>

        {/* secrets */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <SecretField
              label="Verify token"
              hint="Any string you choose — paste same value in Meta Webhooks."
              status={integration?.secrets.verifyToken}
              value={verifyToken}
              onChange={setVerifyToken}
            />
            <SecretField
              label="App secret"
              hint="Meta App → Settings → Basic → App secret."
              status={integration?.secrets.appSecret}
              value={appSecret}
              onChange={setAppSecret}
            />
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            {integration?.secretsConfirmedAt && (
              <p className="text-xs text-slate-400">
                Last saved:{' '}
                {new Date(integration.secretsConfirmedAt).toLocaleString()}
              </p>
            )}
            <button
              type="button"
              disabled={savingWebhook}
              onClick={() => void saveWebhook()}
              className="ml-auto inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {savingWebhook ? (
                <FaRotate className="animate-spin" />
              ) : (
                <FaFloppyDisk />
              )}
              Save webhook settings
            </button>
          </div>
        </div>
      </section>

      {/* ── Step 2: Pages ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              2
            </span>
            <h2 className="text-base font-semibold text-slate-900">Facebook pages</h2>
          </div>
          {!formOpen && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              <FaPlus /> Add page
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          One row per Facebook page. Each token is encrypted and never shown again
          after save.
        </p>

        {/* page list */}
        {pages.length === 0 && !formOpen ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
            No pages yet — click <strong>Add page</strong>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((p) => (
              <PageCard
                key={p.id}
                page={p}
                active={editingPageId === p.id}
                onEdit={() =>
                  editingPageId === p.id ? closeForm() : openEdit(p)
                }
              />
            ))}
          </div>
        )}

        {/* inline form */}
        {formOpen && (
          <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-5 space-y-5">
            <p className="text-sm font-semibold text-slate-800">
              {isNewPage
                ? 'New Facebook page'
                : `Edit: ${editingPage?.pageName || editingPage?.pageId}`}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock label="Page ID *" hint="Numeric ID from Facebook page / About.">
                <TextInput
                  value={pageForm.pageId}
                  onChange={(v) => setPF('pageId', v)}
                  placeholder="Paste Meta page ID"
                  disabled={!isNewPage}
                  mono
                />
              </FieldBlock>

              <FieldBlock label="Page name">
                <TextInput
                  value={pageForm.pageName}
                  onChange={(v) => setPF('pageName', v)}
                  placeholder="e.g. India Page"
                />
              </FieldBlock>

              <FieldBlock label="Country code" hint="2-letter ISO e.g. IN, AE, GB">
                <TextInput
                  value={pageForm.countryCode}
                  onChange={(v) => setPF('countryCode', v.toUpperCase())}
                  placeholder="IN"
                />
              </FieldBlock>

              <FieldBlock label="Country name">
                <TextInput
                  value={pageForm.countryName}
                  onChange={(v) => setPF('countryName', v)}
                  placeholder="India"
                />
              </FieldBlock>

              <FieldBlock
                label="Source label *"
                hint="Appears as 'Lead source' in CRM."
              >
                <TextInput
                  value={pageForm.sourceLabel}
                  onChange={(v) => setPF('sourceLabel', v)}
                  placeholder="Lead source label"
                />
              </FieldBlock>

              <FieldBlock
                label="Graph API version"
                hint="Leave v20.0 unless Meta instructs otherwise."
              >
                <TextInput
                  value={pageForm.graphVersion}
                  onChange={(v) => setPF('graphVersion', v)}
                  placeholder="v20.0"
                />
              </FieldBlock>
            </div>

            {/* access token */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tokens
              </p>
              <SecretField
                label="Page access token *"
                hint="Long-lived token with leads_retrieval + pages_read_engagement."
                status={editingPage?.secrets.accessToken}
                value={pageForm.accessToken}
                onChange={(v) => setPF('accessToken', v)}
              />

              <button
                type="button"
                onClick={() => setShowAdvanced((s) => !s)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
              >
                {showAdvanced ? <FaChevronUp /> : <FaChevronDown />}
                {showAdvanced ? 'Hide' : 'Show'} per-page app secret & verify token
                (optional)
              </button>

              {showAdvanced && (
                <div className="grid gap-4 sm:grid-cols-2 pt-1">
                  <SecretField
                    label="App secret (per page)"
                    hint="Only if different from global app secret."
                    status={editingPage?.secrets.appSecret}
                    value={pageForm.appSecret}
                    onChange={(v) => setPF('appSecret', v)}
                  />
                  <SecretField
                    label="Verify token (per page)"
                    hint="Only if different from global verify token."
                    status={editingPage?.secrets.verifyToken}
                    value={pageForm.verifyToken}
                    onChange={(v) => setPF('verifyToken', v)}
                  />
                </div>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={pageForm.isActive}
                onChange={(e) => setPF('isActive', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              Active (receives webhook leads)
            </label>

            <div className="flex items-center justify-between border-t border-blue-100 pt-4">
              <button
                type="button"
                onClick={closeForm}
                disabled={savingPage}
                className="text-sm text-slate-500 hover:text-slate-800 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingPage}
                onClick={() => void handleSavePage()}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {savingPage ? (
                  <FaRotate className="animate-spin" />
                ) : (
                  <FaCheck />
                )}
                {isNewPage ? 'Add page' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default MetaConnectionPanel
