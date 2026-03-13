export type UUID = string;

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "LOST";
export type QuoteStatus = "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "EXPIRED";
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

export interface NotificationItem {
  id: UUID;
  title: string;
  module: string;
  time: string;
  isRead: boolean;
}
