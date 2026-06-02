import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  FaCheck,
  FaCopy,
  FaFacebook,
  FaLock,
  FaPencil,
  FaPlus,
  FaRotate,
  FaTrash
} from 'react-icons/fa6'
import { toast } from 'sonner'
import { getApiErrorMessage } from '../../api/apiClient'
import {
  metaConnectionApi,
  type MetaPageConfig,
  type SecretFieldStatus
} from '../../api/metaConnection'
import { useAuth } from '../../context/AuthContext'
import { canManageMetaConfiguration } from '../../utils/roles'

type PageFormState = {
  pageId: string
  pageName: string
  accountName: string
  accessToken: string
  appSecret: string
  verifyToken: string
  graphVersion: string
  isActive: boolean
}

function copyText(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success('Copied to clipboard'))
    .catch(() => toast.error('Copy failed'))
}

function SecretBadge({ status }: { status?: SecretFieldStatus }) {
  if (!status?.configured) {
    return <span className="text-xs text-slate-400">Not set</span>
  }

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
            status?.configured ? 'Saved value (leave blank to keep)' : 'Paste value'
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
  accountName: '',
  accessToken: '',
  appSecret: '',
  verifyToken: '',
  graphVersion: 'v20.0',
  isActive: true
})

function PageCard({
  page,
  active,
  onEdit,
  onDelete,
  deleting
}: {
  page: MetaPageConfig
  active: boolean
  onEdit: () => void
  onDelete: () => void
  deleting: boolean
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
            {page.accountName || 'No account'}
          </p>
          <p className="text-xs text-slate-500">
            ID: {page.pageId}
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
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
          title="Delete account"
        >
          {deleting ? (
            <FaRotate className="animate-spin text-xs" />
          ) : (
            <FaTrash className="text-xs" />
          )}
        </button>
      </div>
    </div>
  )
}

const MetaConnectionPanel: React.FC = () => {
  const { user } = useAuth()
  const canManage = canManageMetaConfiguration(user?.role)
  const mountedRef = useRef(true)

  const [bootstrapping, setBootstrapping] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [savingPage, setSavingPage] = useState(false)
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null)
  const [pages, setPages] = useState<MetaPageConfig[]>([])
  const [editingPageId, setEditingPageId] = useState<string | null>(null)
  const [isNewPage, setIsNewPage] = useState(false)
  const [pageForm, setPageForm] = useState<PageFormState>(emptyPage())

  const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const webhookUrl = `${apiBase}/webhook/meta`

  const editingPage = useMemo(
    () => (editingPageId ? pages.find((p) => p.id === editingPageId) ?? null : null),
    [editingPageId, pages]
  )

  const accountGroups = useMemo(() => {
    const groups = new Map<string, MetaPageConfig[]>()
    pages.forEach((page) => {
      const accountName = page.accountName?.trim() || 'Unassigned account'
      groups.set(accountName, [...(groups.get(accountName) ?? []), page])
    })
    return Array.from(groups.entries()).map(([accountName, accountPages]) => ({
      accountName,
      pages: accountPages
    }))
  }, [pages])

  const formOpen = isNewPage || editingPageId !== null

  const loadPages = useCallback(async () => {
    const pageList = await metaConnectionApi.listPages()
    if (mountedRef.current) {
      setPages(pageList)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    const init = async () => {
      try {
        await loadPages()
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
  }, [canManage, loadPages])

  const setPF = useCallback(
    <K extends keyof PageFormState>(key: K, value: PageFormState[K]) =>
      setPageForm((f) => ({ ...f, [key]: value })),
    []
  )

  const openAdd = () => {
    setEditingPageId(null)
    setIsNewPage(true)
    setPageForm(emptyPage())
  }

  const openEdit = (page: MetaPageConfig) => {
    setIsNewPage(false)
    setEditingPageId(page.id)
    setPageForm({
      pageId: page.pageId,
      pageName: page.pageName ?? '',
      accountName: page.accountName ?? '',
      accessToken: '',
      appSecret: '',
      verifyToken: '',
      graphVersion: page.graphVersion ?? 'v20.0',
      isActive: page.isActive
    })
  }

  const closeForm = () => {
    setEditingPageId(null)
    setIsNewPage(false)
  }

  const handleSavePage = async () => {
    if (!pageForm.accountName.trim()) return toast.error('Account name is required')
    if (!pageForm.pageId.trim()) return toast.error('Page ID is required')

    setSavingPage(true)
    try {
      const pageName = pageForm.pageName.trim()
      const accountName = pageForm.accountName.trim()
      const sourceLabel = pageName || accountName
      const body: Record<string, unknown> = {
        accountName,
        pageName: pageName || null,
        sourceLabel,
        countryCode: null,
        countryName: null,
        countryId: null,
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
          sourceLabel,
          ...body
        } as Parameters<typeof metaConnectionApi.createPage>[0])
        setPages((prev) => [...prev, created])
        setEditingPageId(created.id)
        setIsNewPage(false)
        setPageForm((f) => ({ ...f, accessToken: '', appSecret: '', verifyToken: '' }))
        toast.success('Meta account saved')
      } else if (editingPageId) {
        const updated = await metaConnectionApi.updatePage(editingPageId, body)
        setPages((prev) =>
          prev.map((p) => (p.id === editingPageId ? updated : p))
        )
        setPageForm((f) => ({ ...f, accessToken: '', appSecret: '', verifyToken: '' }))
        toast.success('Meta account updated')
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save Meta account'))
    } finally {
      setSavingPage(false)
    }
  }

  const handleDeletePage = async (page: MetaPageConfig) => {
    const label = page.pageName || page.pageId
    if (!window.confirm(`Delete ${label}? This removes saved tokens for this page.`)) {
      return
    }

    setDeletingPageId(page.id)
    try {
      await metaConnectionApi.deletePage(page.id)
      setPages((prev) => prev.filter((item) => item.id !== page.id))
      if (editingPageId === page.id) {
        closeForm()
      }
      toast.success('Meta account deleted')
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete Meta account'))
    } finally {
      setDeletingPageId(null)
    }
  }

  if (!canManage) {
    return (
      <p className="text-sm text-slate-500">
        Admin or super admin access required.
      </p>
    )
  }

  if (bootstrapping) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <FaRotate className="animate-spin" /> Loading...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {error}
        <button
          className="ml-3 underline"
          onClick={() => {
            setError(null)
            setBootstrapping(true)
            loadPages()
              .catch(() => {})
              .finally(() => setBootstrapping(false))
          }}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl space-y-6">
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              1
            </span>
            <h2 className="text-base font-semibold text-slate-900">
              Meta accounts and pages
            </h2>
          </div>
          {!formOpen && (
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              <FaPlus /> Add account
            </button>
          )}
        </div>

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
            Use this same callback URL in Meta. Save each account with its own app secret, verify token, and page token.
          </p>
        </div>

        <p className="text-xs text-slate-500">
          Each token is encrypted and never shown again after save.
        </p>

        {pages.length === 0 && !formOpen ? (
          <div className="rounded-xl border border-dashed border-slate-300 py-10 text-center text-sm text-slate-400">
            No accounts yet. Click <strong>Add account</strong>.
          </div>
        ) : (
          <div className="space-y-4">
            {accountGroups.map((group) => (
              <div key={group.accountName} className="space-y-2">
                <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-sm font-semibold text-slate-800">
                    {group.accountName}
                  </p>
                  <span className="text-xs text-slate-500">
                    {group.pages.length} page{group.pages.length === 1 ? '' : 's'}
                  </span>
                </div>
                {group.pages.map((p) => (
                  <PageCard
                    key={p.id}
                    page={p}
                    active={editingPageId === p.id}
                    onEdit={() =>
                      editingPageId === p.id ? closeForm() : openEdit(p)
                    }
                    onDelete={() => void handleDeletePage(p)}
                    deleting={deletingPageId === p.id}
                  />
                ))}
              </div>
            ))}
          </div>
        )}

        {formOpen && (
          <div className="space-y-5 rounded-xl border border-blue-200 bg-blue-50/40 p-5">
            <p className="text-sm font-semibold text-slate-800">
              {isNewPage
                ? 'New Meta account'
                : `Edit: ${editingPage?.pageName || editingPage?.pageId}`}
            </p>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldBlock
                label="Meta account name *"
                hint="Business/app account label for grouping connected pages."
              >
                <TextInput
                  value={pageForm.accountName}
                  onChange={(v) => setPF('accountName', v)}
                  placeholder="e.g. India Ads Account"
                />
              </FieldBlock>

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

            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tokens
              </p>
              <SecretField
                label="Page access token *"
                hint="Long-lived token with leads_retrieval and pages_read_engagement."
                status={editingPage?.secrets.accessToken}
                value={pageForm.accessToken}
                onChange={(v) => setPF('accessToken', v)}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <SecretField
                  label="App secret *"
                  hint="Meta App settings secret for this account."
                  status={editingPage?.secrets.appSecret}
                  value={pageForm.appSecret}
                  onChange={(v) => setPF('appSecret', v)}
                />
                <SecretField
                  label="Verify token *"
                  hint="Paste same value in Meta Webhooks for this account."
                  status={editingPage?.secrets.verifyToken}
                  value={pageForm.verifyToken}
                  onChange={(v) => setPF('verifyToken', v)}
                />
              </div>
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
                {isNewPage ? 'Save account' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default MetaConnectionPanel
