import type { BookingStatus, LeadStatus, QuoteStatus, VisaStatus } from "../types";

export const validateLeadTransition = (status: LeadStatus, closedReason?: string) => {
  if (status === "LOST" && !closedReason?.trim()) return "closedReason is required for LOST leads.";
  return "";
};

export const validateQuoteTransition = (status: QuoteStatus, reason?: string) => {
  if (status === "REJECTED" && !reason?.trim()) return "reason is required for REJECTED quotations.";
  return "";
};

export const validateBookingTransition = (status: BookingStatus, cancellationReason?: string) => {
  if (status === "CANCELLED" && !cancellationReason?.trim()) return "cancellationReason is required for CANCELLED bookings.";
  return "";
};

export const validateVisaTransition = (status: VisaStatus, rejectionReason?: string, visaValidUntil?: string) => {
  if (status === "REJECTED" && !rejectionReason?.trim()) return "rejectionReason is required for REJECTED visa cases.";
  if (status === "APPROVED" && !visaValidUntil?.trim()) return "visaValidUntil is required for APPROVED visa cases.";
  return "";
};
