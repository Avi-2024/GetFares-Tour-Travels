import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { FaArrowLeft, FaPaperPlane, FaSearch, FaWhatsapp } from 'react-icons/fa'
import { useLeadsService } from '../../hooks/useLeadsService'
import { useAuth } from '../../context/AuthContext'
import { toast } from 'sonner'
import { reportApiError } from '../../lib/notify'
import {
  fetchWhatsappConfigStatus,
  fetchWhatsappConversationMessages,
  fetchWhatsappThreads,
  sendWhatsappText,
  type WhatsappConfigStatus,
  type WhatsappConversationMessage,
  type WhatsappThreadSummary
} from '../../api/endpoints/whatsapp.api'
import type { LeadFollowupRecord } from '../../datasource/leadsDatasource'

type LineFilter = 'all' | 'in' | 'uae'

const PAGE_SIZE = 45

function digitsOnly (value: unknown): string {
  return String(value ?? '').replace(/\D/g, '')
}

function messageSortTime (m: WhatsappConversationMessage): number {
  if (m.waTimestampMs != null && Number.isFinite(m.waTimestampMs)) {
    return m.waTimestampMs
  }
  const t = m.createdAt ? Date.parse(m.createdAt) : NaN
  return Number.isFinite(t) ? t : 0
}

function followupSortTime (f: LeadFollowupRecord): number {
  const raw =
    f.followupLocalAt ??
    f.followup_local_at ??
    f.followupDate ??
    f.createdAt ??
    ''
  const t = raw ? Date.parse(String(raw)) : NaN
  return Number.isFinite(t) ? t : 0
}

type TimelineEntry =
  | { kind: 'wa'; ts: number; msg: WhatsappConversationMessage }
  | { kind: 'fu'; ts: number; fu: LeadFollowupRecord }

function initials (name: string, phone?: string): string {
  const n = name.trim()
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return n.slice(0, 2).toUpperCase()
  }
  const d = digitsOnly(phone)
  return d.slice(-2) || '?'
}

function formatListTime (iso?: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const now = new Date()
  const sameDay =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit'
    })
  }
  const yest = new Date(now)
  yest.setDate(yest.getDate() - 1)
  if (
    d.getDate() === yest.getDate() &&
    d.getMonth() === yest.getMonth() &&
    d.getFullYear() === yest.getFullYear()
  ) {
    return 'Yesterday'
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function bubbleTimeFromMsg (m: WhatsappConversationMessage): string {
  if (!m?.createdAt) return ''
  const d = new Date(m.createdAt)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      })
}

function bubbleTimeFromFu (fu: LeadFollowupRecord): string {
  const raw =
    fu.followupLocalAt ??
    fu.followup_local_at ??
    fu.followupDate ??
    fu.createdAt
  if (!raw) return ''
  const d = new Date(String(raw))
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit'
      })
}

/** WhatsApp Web-style inbox for many clients — Meta webhook + CRM send. */
export default function WhatsAppInboxPage (): React.ReactElement {
  const { id: pathLeadId } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const leadsService = useLeadsService()
  const { hasPermission } = useAuth()

  const queryLeadId = String(searchParams.get('leadId') || '').trim()
  const resolvedLeadFromRoute = String(pathLeadId || queryLeadId || '').trim()

  const initialLine = useMemo((): LineFilter => {
    const r = String(searchParams.get('region') || 'all').toLowerCase()
    if (r === 'in' || r === 'india') return 'in'
    if (r === 'uae' || r === 'ae') return 'uae'
    return 'all'
  }, [searchParams])

  const [line, setLine] = useState<LineFilter>(initialLine)
  const [searchInput, setSearchInput] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [threads, setThreads] = useState<WhatsappThreadSummary[]>([])
  const [threadsTotal, setThreadsTotal] = useState(0)
  const [threadsPage, setThreadsPage] = useState(1)
  const [threadsLoading, setThreadsLoading] = useState(true)
  const [configStatus, setConfigStatus] = useState<WhatsappConfigStatus | null>(null)
  const [configError, setConfigError] = useState('')

  const [selectedLeadId, setSelectedLeadId] = useState(resolvedLeadFromRoute)
  const [syntheticLead, setSyntheticLead] =
    useState<WhatsappThreadSummary | null>(null)

  const [lead, setLead] = useState<Record<string, unknown> | null>(null)
  const [messages, setMessages] = useState<WhatsappConversationMessage[]>([])
  const [followups, setFollowups] = useState<LeadFollowupRecord[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [draft, setDraft] = useState('')
  const [sidebarOpenMobile, setSidebarOpenMobile] = useState(true)

  const canSend = hasPermission('notifications:update')

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQ(searchInput.trim()), 350)
    return () => window.clearTimeout(id)
  }, [searchInput])

  useEffect(() => {
    setLine(initialLine)
  }, [initialLine])

  useEffect(() => {
    const next = resolvedLeadFromRoute
    if (next) setSelectedLeadId(next)
  }, [resolvedLeadFromRoute])

  const lineRegionParam = line === 'all' ? 'all' : line === 'in' ? 'in' : 'uae'

  const patchUrl = useCallback(
    (leadId: string | null, lineFilter: LineFilter) => {
      const p = new URLSearchParams(searchParams.toString())
      if (leadId) p.set('leadId', leadId)
      else p.delete('leadId')
      if (lineFilter === 'all') p.delete('region')
      else p.set('region', lineFilter === 'in' ? 'in' : 'uae')
      setSearchParams(p, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const selectLead = useCallback(
    (leadId: string) => {
      const id = String(leadId).trim()
      if (!id) return
      setSelectedLeadId(id)
      patchUrl(id, line)
      setSidebarOpenMobile(false)
      if (pathLeadId) {
        navigate(`/whatsapp?leadId=${encodeURIComponent(id)}${line !== 'all' ? `&region=${line === 'in' ? 'in' : 'uae'}` : ''}`, {
          replace: true
        })
      }
    },
    [line, navigate, patchUrl, pathLeadId]
  )

  const reloadThreadsFirstPage = useCallback(async () => {
    setThreadsLoading(true)
    try {
      const data = await fetchWhatsappThreads({
        page: 1,
        limit: PAGE_SIZE,
        q: debouncedQ || undefined,
        region: lineRegionParam
      })
      setThreadsTotal(data.total)
      setThreadsPage(1)
      setThreads(data.items)
    } catch (e) {
      reportApiError(e, 'Could not load chats.')
    } finally {
      setThreadsLoading(false)
    }
  }, [debouncedQ, lineRegionParam])

  useEffect(() => {
    void reloadThreadsFirstPage()
  }, [reloadThreadsFirstPage])

  useEffect(() => {
    let cancelled = false

    async function loadConfigStatus () {
      try {
        const data = await fetchWhatsappConfigStatus()
        if (cancelled) return
        setConfigStatus(data)
        setConfigError('')
      } catch (e) {
        if (cancelled) return
        setConfigStatus(null)
        setConfigError('Could not read WhatsApp setup status.')
      }
    }

    void loadConfigStatus()
    return () => {
      cancelled = true
    }
  }, [])

  const loadMoreThreads = useCallback(async () => {
    const next = threadsPage + 1
    setThreadsLoading(true)
    try {
      const data = await fetchWhatsappThreads({
        page: next,
        limit: PAGE_SIZE,
        q: debouncedQ || undefined,
        region: lineRegionParam
      })
      setThreadsTotal(data.total)
      setThreads(prev => [...prev, ...data.items])
      setThreadsPage(next)
    } catch (e) {
      reportApiError(e, 'Could not load more chats.')
    } finally {
      setThreadsLoading(false)
    }
  }, [debouncedQ, lineRegionParam, threadsPage])

  useEffect(() => {
    let cancelled = false
    async function loadChat () {
      if (!selectedLeadId) {
        setLead(null)
        setMessages([])
        setFollowups([])
        setSyntheticLead(null)
        return
      }
      setChatLoading(true)
      try {
        const [conv, fus, leadResponse] = await Promise.all([
          fetchWhatsappConversationMessages(
            selectedLeadId,
            line === 'all' ? 'all' : line === 'in' ? 'in' : 'uae'
          ),
          leadsService.getFollowups(selectedLeadId),
          leadsService.getLeadById(selectedLeadId)
        ])
        if (cancelled) return
        const raw =
          (leadResponse as { data?: { data?: unknown } })?.data?.data ??
          (leadResponse as { data?: unknown })?.data ??
          leadResponse
        const merged =
          raw && typeof raw === 'object' ?
            (raw as Record<string, unknown>)
          : conv.lead && typeof conv.lead === 'object' ?
            (conv.lead as Record<string, unknown>)
          : null
        setLead(merged)
        setMessages(conv.messages || [])
        setFollowups(Array.isArray(fus) ? fus : [])

        if (merged && (conv.messages?.length ?? 0) === 0) {
          setSyntheticLead({
            leadId: selectedLeadId,
            fullName: String(
              merged.fullName ?? merged.name ?? 'Lead'
            ),
            phone: merged.phone ? String(merged.phone) : null,
            leadCode: merged.leadCode
              ? String(merged.leadCode)
              : merged.lead_code
                ? String(merged.lead_code)
                : null,
            lastBody: 'No WhatsApp messages yet — send below.',
            lastMessageAt: null
          })
        } else {
          setSyntheticLead(null)
        }
      } catch (e) {
        if (!cancelled) reportApiError(e, 'Could not load chat.')
      } finally {
        if (!cancelled) setChatLoading(false)
      }
    }
    void loadChat()
    return () => {
      cancelled = true
    }
  }, [leadsService, line, selectedLeadId])

  const peerPhone = useMemo(() => {
    const p = digitsOnly(lead?.phone as string | undefined)
    return p
  }, [lead])

  const timeline = useMemo(() => {
    const wa: TimelineEntry[] = messages.map(msg => ({
      kind: 'wa' as const,
      ts: messageSortTime(msg),
      msg
    }))
    const fu: TimelineEntry[] = followups
      .filter(f => String(f.followupType || '').toUpperCase() === 'WHATSAPP')
      .map(f => ({ kind: 'fu' as const, ts: followupSortTime(f), fu: f }))
    return [...wa, ...fu].sort((a, b) => a.ts - b.ts)
  }, [messages, followups])

  const displayName =
    String(lead?.fullName ?? lead?.name ?? 'Lead').trim() || 'Lead'

  const waMeHref =
    peerPhone ?
      `https://wa.me/${peerPhone}?text=${encodeURIComponent(draft.trim() || 'Hi, this is Get2Vacations regarding your enquiry.')}`
    : null

  const sidebarRows = useMemo(() => {
    const rows: WhatsappThreadSummary[] = [...threads]
    if (
      syntheticLead &&
      syntheticLead.leadId &&
      !rows.some(r => r.leadId === syntheticLead.leadId)
    ) {
      return [syntheticLead, ...rows]
    }
    return rows
  }, [threads, syntheticLead])

  const configuredLines = useMemo(() => {
    return (configStatus?.channels || [])
      .map(channel => {
        const label =
          String(
            channel.sourceLabel ||
              channel.countryName ||
              channel.countryCode ||
              channel.displayPhoneNumber ||
              'WhatsApp line'
          ).trim() || 'WhatsApp line'
        const phone = String(channel.displayPhoneNumber || '').trim()
        const phoneId = String(channel.phoneNumberId || '').trim()
        return phone ? `${label} (${phone})` : phoneId ? `${label} [${phoneId}]` : label
      })
      .filter(Boolean)
  }, [configStatus])

  const handleSend = async () => {
    if (!selectedLeadId || !peerPhone) {
      toast.error('Lead phone missing.')
      return
    }
    const text = draft.trim()
    if (!text) {
      toast.error('Enter a message.')
      return
    }
    if (!canSend) {
      toast.error('No permission to send WhatsApp from CRM.')
      return
    }
    setSending(true)
    try {
      await sendWhatsappText({
        to: peerPhone,
        text,
        leadId: selectedLeadId,
        countryCode:
          line === 'in' ? 'IN' : line === 'uae' ? 'AE' : undefined
      })
      setDraft('')
      toast.success('Queued via Meta.')
      await Promise.all([
        fetchWhatsappConversationMessages(
          selectedLeadId,
          line === 'all' ? 'all' : line === 'in' ? 'in' : 'uae'
        ).then(conv => setMessages(conv.messages || [])),
        reloadThreadsFirstPage()
      ])
    } catch (e) {
      reportApiError(e, 'WhatsApp send failed.')
    } finally {
      setSending(false)
    }
  }

  const handleBack = () => {
    if (pathLeadId) {
      navigate(`/leads/${pathLeadId}`)
    } else if (selectedLeadId) {
      navigate(`/leads/${selectedLeadId}`)
    } else {
      navigate('/leads')
    }
  }

  const hasMoreThreads = threads.length < threadsTotal
  const onLineChange = (next: LineFilter) => {
    setLine(next)
    patchUrl(selectedLeadId || null, next)
  }

  return (
    <div className='flex flex-col gap-0 -m-2 sm:-m-0 min-h-[calc(100vh-5rem)]'>
      <div className='flex md:hidden items-center justify-between gap-2 px-2 py-2 border-b border-[#2a3942] bg-[#202c33] text-[#e9edef]'>
        <button
          type='button'
          onClick={() => setSidebarOpenMobile(o => !o)}
          className='text-xs font-semibold uppercase tracking-wide text-teal-200'
        >
          {sidebarOpenMobile ? 'Chat' : 'Chats'}
        </button>
        <span className='text-xs text-[#8696a0]'>WhatsApp</span>
      </div>

      <div
        className={`flex rounded-none sm:rounded-xl overflow-hidden border border-[#2a3942] bg-[#111b21] shadow-lg min-h-[min(560px,calc(100vh-7rem))] max-h-[calc(100vh-5rem)] ${
          sidebarOpenMobile ? '' : '[&>*:first-child]:hidden md:[&>*:first-child]:flex'
        } md:flex`}
      >
        {/* Left — chat list */}
        <aside className='flex w-full md:w-[min(380px,100%)] shrink-0 flex-col border-[#2a3942] md:border-r bg-[#111b21] max-h-[calc(100vh-5rem)] md:max-h-[calc(100vh-7rem)]'>
          <div className='flex items-center gap-2 bg-[#202c33] px-3 py-3'>
            <button
              type='button'
              onClick={handleBack}
              className='inline-flex h-9 w-9 items-center justify-center rounded-full text-[#aebac1] hover:bg-[#2a3942]'
              title='Back'
            >
              <FaArrowLeft />
            </button>
            <div className='min-w-0 flex-1'>
              <p className='flex items-center gap-2 text-[17px] font-semibold text-[#e9edef]'>
                <FaWhatsapp className='text-[#25d366]' /> Chats
              </p>
              <p className='truncate text-[11px] text-[#8696a0]'>
                Business lines + Meta webhook
              </p>
            </div>
          </div>
          <div className='border-b border-[#2a3942] px-2 py-2 space-y-2'>
            {configError ? (
              <div className='rounded-lg border border-amber-600/30 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100'>
                {configError}
              </div>
            ) : configStatus ? (
              <div
                className={`rounded-lg border px-3 py-2 text-[11px] ${
                  configStatus.ready
                    ? 'border-emerald-600/30 bg-emerald-500/10 text-emerald-100'
                    : 'border-amber-600/30 bg-amber-500/10 text-amber-100'
                }`}
              >
                <p className='font-semibold'>
                  {configStatus.ready ? 'WhatsApp setup ready.' : 'WhatsApp setup incomplete.'}
                </p>
                <p className='mt-1 text-[#cfd8dc]'>
                  Inbox reads webhook and outbound logs.
                </p>
                <p className='mt-1 text-[#cfd8dc]'>
                  System user assignment is not used here.
                </p>
                {configuredLines.length > 0 ? (
                  <p className='mt-1 text-[#cfd8dc]'>
                    Lines: {configuredLines.join(', ')}
                  </p>
                ) : null}
                {!configStatus.ready && configStatus.missing.length > 0 ? (
                  <p className='mt-1 text-[#ffd9a8]'>
                    Missing: {configStatus.missing.join(', ')}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div className='relative'>
              <FaSearch className='pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#8696a0] text-sm' />
              <input
                className='w-full rounded-lg bg-[#202c33] py-2 pl-9 pr-3 text-sm text-[#e9edef] placeholder:text-[#8696a0] outline-none focus:ring-1 focus:ring-[#25d366]'
                placeholder='Search name, phone, code…'
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
              />
            </div>
            <select
              className='w-full rounded-lg border border-[#2a3942] bg-[#202c33] px-2 py-1.5 text-xs font-medium text-[#e9edef]'
              value={line}
              onChange={e => onLineChange(e.target.value as LineFilter)}
            >
              <option value='all'>All numbers</option>
              <option value='in'>India number</option>
              <option value='uae'>UAE number</option>
            </select>
          </div>
          <div className='flex-1 overflow-y-auto'>
            {threadsLoading && threads.length === 0 ? (
              <p className='p-4 text-sm text-[#8696a0]'>Loading chats…</p>
            ) : sidebarRows.length === 0 ? (
              <p className='p-4 text-sm text-[#8696a0]'>
                No threads yet. Inbound messages appear after Meta webhook is
                connected. Outbound sends also create rows here.
              </p>
            ) : (
              sidebarRows.map(row => {
                const active = row.leadId === selectedLeadId
                const title =
                  String(row.fullName || row.phone || row.leadId || 'Lead')
                const preview = String(row.lastBody || '').replace(/\s+/g, ' ')
                return (
                  <button
                    key={row.leadId}
                    type='button'
                    onClick={() => selectLead(row.leadId)}
                    className={`flex w-full gap-3 border-b border-[#2a3942] px-3 py-2.5 text-left transition hover:bg-[#2a3942]/60 ${
                      active ? 'bg-[#2a3942]' : ''
                    }`}
                  >
                    <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#6b7c85] text-sm font-semibold text-white'>
                      {initials(title, row.phone || undefined)}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-baseline justify-between gap-2'>
                        <span className='truncate font-medium text-[#e9edef]'>
                          {title}
                        </span>
                        <span className='shrink-0 text-[11px] text-[#8696a0]'>
                          {formatListTime(row.lastMessageAt)}
                        </span>
                      </div>
                      <p className='truncate text-[13px] text-[#8696a0]'>
                        {preview || '—'}
                      </p>
                    </div>
                  </button>
                )
              })
            )}
            {hasMoreThreads && !threadsLoading ? (
              <div className='p-2'>
                <button
                  type='button'
                  className='w-full rounded-lg bg-[#202c33] py-2 text-xs font-semibold text-[#25d366]'
                  onClick={() => void loadMoreThreads()}
                >
                  Load more ({threads.length} / {threadsTotal})
                </button>
              </div>
            ) : null}
          </div>
        </aside>

        {/* Right — active thread */}
        <main className='flex min-w-0 flex-1 flex-col bg-[#0b141a] max-h-[calc(100vh-5rem)] md:max-h-[calc(100vh-7rem)]'>
          {!selectedLeadId ? (
            <div className='flex flex-1 flex-col items-center justify-center p-8 text-center text-[#8696a0]'>
              <FaWhatsapp className='mb-3 text-5xl text-[#25d366]/40' />
              <p className='text-lg text-[#e9edef]'>Select a chat</p>
              <p className='mt-1 max-w-sm text-sm'>
                Pick a client on the left. Sending uses Meta Cloud API with the
                line you chose (India / UAE / default).
              </p>
            </div>
          ) : (
            <>
              <header className='flex items-center gap-3 border-b border-[#2a3942] bg-[#202c33] px-3 py-2'>
                <button
                  type='button'
                  className='md:hidden inline-flex h-9 w-9 items-center justify-center rounded-full text-[#aebac1] hover:bg-[#2a3942]'
                  onClick={() => setSidebarOpenMobile(true)}
                >
                  <FaArrowLeft />
                </button>
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6b7c85] text-sm font-semibold text-white'>
                  {initials(displayName, peerPhone)}
                </div>
                <div className='min-w-0 flex-1'>
                  <p className='truncate font-semibold text-[#e9edef]'>
                    {displayName}
                  </p>
                  <p className='truncate text-xs text-[#8696a0] font-mono'>
                    {peerPhone || 'No phone'}
                  </p>
                </div>
                {waMeHref ? (
                  <a
                    href={waMeHref}
                    target='_blank'
                    rel='noreferrer'
                    className='shrink-0 rounded-lg border border-[#25d366]/40 px-2 py-1 text-[11px] font-semibold text-[#25d366]'
                  >
                    wa.me
                  </a>
                ) : null}
              </header>

              <div
                className='flex-1 overflow-y-auto px-4 py-3 space-y-1'
                style={{
                  backgroundColor: '#0b141a',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%231c2721' fill-opacity='0.35'%3E%3Ccircle cx='6' cy='6' r='1'/%3E%3Ccircle cx='36' cy='24' r='1'/%3E%3Ccircle cx='18' cy='42' r='1'/%3E%3Ccircle cx='48' cy='48' r='1'/%3E%3C/g%3E%3C/svg%3E")`
                }}
              >
                {chatLoading ? (
                  <p className='text-sm text-[#8696a0]'>Loading messages…</p>
                ) : timeline.length === 0 ? (
                  <p className='text-sm text-[#8696a0]'>
                    No messages in this thread for the selected line filter.
                  </p>
                ) : (
                  timeline.map((entry, idx) => {
                    if (entry.kind === 'fu') {
                      const n = entry.fu.notes || '(no notes)'
                      return (
                        <div key={`fu-${entry.fu.id ?? idx}`} className='flex justify-center'>
                          <div className='max-w-[92%] rounded-lg border border-amber-900/60 bg-[#182229] px-3 py-2 text-xs text-[#e9eda3]'>
                            <span className='font-semibold text-[#ebb347]'>
                              CRM log — WhatsApp
                            </span>
                            <span className='text-[#8696a0]'>
                              {' '}
                              · {bubbleTimeFromFu(entry.fu)}
                            </span>
                            <p className='mt-1 whitespace-pre-wrap text-[#d1d7db]'>
                              {n}
                            </p>
                          </div>
                        </div>
                      )
                    }
                    const m = entry.msg
                    const outbound = m.direction === 'outbound'
                    return (
                      <div
                        key={m.id}
                        className={`flex ${outbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`relative max-w-[min(560px,88%)] rounded-lg px-2 py-1.5 text-[14.5px] leading-snug shadow-md ${
                            outbound
                              ? 'rounded-br-none bg-[#005c4b] text-[#e9edef]'
                              : 'rounded-bl-none bg-[#202c33] text-[#e9edef]'
                          }`}
                        >
                          <p className='whitespace-pre-wrap break-words pr-14'>
                            {m.body || '—'}
                          </p>
                          <span
                            className={`absolute bottom-1 right-2 text-[10px] tabular-nums ${
                              outbound ? 'text-[#a8caba]' : 'text-[#8696a0]'
                            }`}
                          >
                            {bubbleTimeFromMsg(m)}
                          </span>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <footer className='border-t border-[#2a3942] bg-[#202c33] px-3 py-2'>
                {!canSend ? (
                  <p className='mb-1 text-[11px] text-amber-200/90'>
                    Read-only — need <span className='font-mono'>notifications:update</span>.
                  </p>
                ) : null}
                <div className='flex gap-2'>
                  <textarea
                    className='min-h-[44px] max-h-36 flex-1 resize-none rounded-lg border border-transparent bg-[#2a3942] px-3 py-2 text-sm text-[#e9edef] placeholder:text-[#8696a0] outline-none focus:border-[#25d366]/50'
                    rows={1}
                    placeholder='Type a message'
                    value={draft}
                    disabled={!peerPhone || !canSend}
                    onChange={e => setDraft(e.target.value)}
                  />
                  <button
                    type='button'
                    onClick={() => void handleSend()}
                    disabled={!peerPhone || !canSend || sending || !draft.trim()}
                    className='inline-flex h-[44px] w-[44px] shrink-0 items-center justify-center self-end rounded-full bg-[#00a884] text-white hover:bg-[#008f6f] disabled:opacity-30'
                  >
                    <FaPaperPlane />
                  </button>
                </div>
              </footer>
            </>
          )}
        </main>
      </div>

      <p className='mt-2 hidden sm:block px-1 text-[11px] text-gray-500 dark:text-gray-400'>
        Threads list only leads with rows in{' '}
        <code className='font-mono text-[10px]'>whatsapp_conversation_messages</code>
        . New clients appear after webhook capture or first outbound send.
      </p>
    </div>
  )
}
