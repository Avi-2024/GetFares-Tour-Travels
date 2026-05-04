import { apiClient } from '../core/api-client';
import { withQuery } from '../core/query-builder';

export type WhatsappConversationMessage = {
  id: string
  leadId: string
  direction: 'inbound' | 'outbound'
  body: string | null
  waMessageId?: string | null
  phoneNumberId?: string | null
  displayPhoneNumber?: string | null
  peerPhone: string
  waTimestampMs?: number | null
  createdAt?: string
}

export type WhatsappConversationPayload = {
  lead: Record<string, unknown>
  messages: WhatsappConversationMessage[]
  region: string
}

export type WhatsappThreadSummary = {
  leadId: string
  lastMessageAt?: string | null
  lastSortMs?: number | null
  lastBody?: string | null
  fullName?: string | null
  phone?: string | null
  leadCode?: string | null
}

export type WhatsappThreadsPayload = {
  items: WhatsappThreadSummary[]
  page: number
  limit: number
  total: number
  region: string
}

export async function fetchWhatsappConversationMessages (
  leadId: string,
  region?: string
): Promise<WhatsappConversationPayload> {
  const r =
    region != null && String(region).trim() !== ''
      ? String(region).trim().toLowerCase()
      : 'all'
  const url = withQuery(`/api/whatsapp/conversations/${leadId}/messages`, {
    region: r
  })
  const body = await apiClient.get<{ data: WhatsappConversationPayload }>(url)
  return body.data
}

export async function fetchWhatsappThreads (params: {
  page?: number
  limit?: number
  q?: string
  region?: string
}): Promise<WhatsappThreadsPayload> {
  const r =
    params.region != null && String(params.region).trim() !== ''
      ? String(params.region).trim().toLowerCase()
      : 'all'
  const url = withQuery('/api/whatsapp/threads', {
    page: params.page ?? 1,
    limit: params.limit ?? 50,
    q: params.q?.trim() || undefined,
    region: r
  })
  const body = await apiClient.get<{ data: WhatsappThreadsPayload }>(url)
  return body.data
}

export async function sendWhatsappText (payload: {
  to: string
  text: string
  leadId: string
  countryCode?: string
  phoneNumberId?: string
}): Promise<unknown> {
  const body = await apiClient.post<{ data: unknown }>('/api/whatsapp/send', payload)
  return body.data
}
