export type UUID = string;

export type LeadStatus =
  | "OPEN"
  | "CONTACTED"
  | "WIP"
  | "QUOTED"
  | "FOLLOW_UP"
  | "CONVERTED"
  | "LOST"
  | "NON_RESPONSIVE";
export type QuoteStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED";
export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED";
export type VisaStatus = "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED";

export interface ApiListResponse<T> {
  data: T[];
  page?: number;
  limit?: number;
  total?: number;
}

export interface PermissionItem {
  key: string;
}

export type NotificationStatus = "PENDING" | "DELIVERED" | "READ" | "FAILED";

export interface NotificationItem {
  id: UUID;
  eventName: string;
  channel: string;
  entityType: string | null;
  entityId: string | null;
  title: string | null;
  message: string | null;
  payload: Record<string, unknown>;
  recipientUserId: string | null;
  recipientRole: string | null;
  recipientTeamId: string | null;
  status: NotificationStatus;
  deliveryAttempts: number;
  deliveredAt: string | null;
  readAt: string | null;
  lastError: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}
