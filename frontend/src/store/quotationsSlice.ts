import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import axios from 'axios'

export type QuotationStatus = 'pending' | 'accepted' | 'expired' | 'rejected' | 'draft'

export interface QuotationItem {
  id: string
  quoteNumber: string
  customer: string
  email: string
  destination: string
  details: string
  total: number
  margin: number
  status: QuotationStatus
  lastSent: string | null
  sentDate: string | null
}

type QuotationsState = {
  items: QuotationItem[]
  loading: boolean
  error: string
}

const initialState: QuotationsState = {
  items: [],
  loading: false,
  error: ''
}

export const fetchQuotations = createAsyncThunk<
  QuotationItem[],
  void,
  { rejectValue: string }
>('quotations/fetch', async (_, { rejectWithValue }) => {
  try {
    const base = import.meta.env.VITE_API_BASE_URL ?? ''
    const token = localStorage.getItem('auth_token') ?? ''
    // Backend enum allows: DRAFT | SENT | VIEWED | APPROVED | REJECTED | EXPIRED
    // Use SENT to approximate “pending” list.
    const url = `${base}/api/quotations?page=1&limit=10&status=SENT`
    const res = await axios.get(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
    const raw =
      res.data?.data?.data ??
      res.data?.data?.items ??
      res.data?.data ??
      res.data ??
      []
    const statusMap: Record<string, QuotationStatus> = {
      DRAFT: 'draft',
      SENT: 'pending',
      VIEWED: 'pending',
      APPROVED: 'accepted',
      REJECTED: 'rejected',
      EXPIRED: 'expired'
    }
    const mapped: QuotationItem[] = (Array.isArray(raw) ? raw : []).map(
      (q: any, idx: number) => ({
        id: String(q.id ?? idx),
        quoteNumber: q.quoteNumber ?? q.code ?? `QT-${idx + 1}`,
        customer: q.customer ?? q.customerName ?? q.clientName ?? 'Unknown',
        email: q.email ?? q.clientEmail ?? 'N/A',
        destination: q.destination ?? q.tripDestination ?? q.leadId ?? 'N/A',
        details: q.details ?? q.tripName ?? q.templateId ?? '-',
        total: Number(
          q.finalPrice ??
            q.totalSaleValue ??
            q.total ??
            q.amount ??
            q.totalCost ??
            0
        ),
        margin: Number(q.marginPercent ?? q.margin ?? q.profitMargin ?? 0),
        status: statusMap[String(q.status).toUpperCase()] ?? 'pending',
        lastSent: q.lastSent ?? (q.sentAt ? 'Sent' : null),
        sentDate: q.sentDate ?? q.sentAt ?? q.updatedAt ?? null
      })
    )
    return mapped
  } catch (err: any) {
    return rejectWithValue(err?.message || 'Failed to load quotations')
  }
})

const quotationsSlice = createSlice({
  name: 'quotations',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchQuotations.pending, state => {
        state.loading = true
        state.error = ''
      })
      .addCase(
        fetchQuotations.fulfilled,
        (state, action: PayloadAction<QuotationItem[]>) => {
          state.loading = false
          state.items = action.payload
        }
      )
      .addCase(
        fetchQuotations.rejected,
        (state, action: PayloadAction<any, string, any, string>) => {
          state.loading = false
          state.error = action.payload || 'Failed to load quotations'
        }
      )
  }
})

export default quotationsSlice.reducer
