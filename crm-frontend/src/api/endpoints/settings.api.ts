/**
 * Settings API
 * Handles system settings and configuration
 */

import { apiClient } from '../core';

export interface SystemSettings {
  id: string;
  key: string;
  value: any;
  category: string;
  description?: string;
  updatedAt: string;
}

export interface UpdateSettingPayload {
  value: any;
}

export const settingsEndpoints = {
  // General Settings
  getAll: () =>
    apiClient.get<{ data: SystemSettings[] }>('/api/settings'),

  getByCategory: (category: string) =>
    apiClient.get<{ data: SystemSettings[] }>(`/api/settings/category/${category}`),

  getByKey: (key: string) =>
    apiClient.get<{ data: SystemSettings }>(`/api/settings/${key}`),

  update: (key: string, payload: UpdateSettingPayload) =>
    apiClient.patch<{ data: SystemSettings }>(`/api/settings/${key}`, payload),

  // Company Settings
  getCompanyInfo: () =>
    apiClient.get<{ data: any }>('/api/settings/company'),

  updateCompanyInfo: (payload: any) =>
    apiClient.patch<{ data: any }>('/api/settings/company', payload),

  // Email Settings
  getEmailConfig: () =>
    apiClient.get<{ data: any }>('/api/settings/email'),

  updateEmailConfig: (payload: any) =>
    apiClient.patch<{ data: any }>('/api/settings/email', payload),

  testEmailConfig: () =>
    apiClient.post('/api/settings/email/test'),

  // WhatsApp Settings
  getWhatsAppConfig: () =>
    apiClient.get<{ data: any }>('/api/settings/whatsapp'),

  updateWhatsAppConfig: (payload: any) =>
    apiClient.patch<{ data: any }>('/api/settings/whatsapp', payload),

  testWhatsAppConfig: () =>
    apiClient.post('/api/settings/whatsapp/test'),

  // Payment Gateway Settings
  getPaymentGateways: () =>
    apiClient.get<{ data: any[] }>('/api/settings/payment-gateways'),

  updatePaymentGateway: (gatewayId: string, payload: any) =>
    apiClient.patch(`/api/settings/payment-gateways/${gatewayId}`, payload),

  // Notification Settings
  getNotificationPreferences: () =>
    apiClient.get<{ data: any }>('/api/settings/notifications'),

  updateNotificationPreferences: (payload: any) =>
    apiClient.patch<{ data: any }>('/api/settings/notifications', payload),

  // Lead Assignment Rules
  getLeadAssignmentRules: () =>
    apiClient.get<{ data: any }>('/api/settings/lead-assignment'),

  updateLeadAssignmentRules: (payload: any) =>
    apiClient.patch<{ data: any }>('/api/settings/lead-assignment', payload),
};
