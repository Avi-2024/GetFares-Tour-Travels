/**
 * Settings Service
 * Business logic layer for system settings management
 */

import { settingsEndpoints } from '../endpoints/settings.api';

export class SettingsService {
  async getAll() {
    const response = await settingsEndpoints.getAll();
    return response.data;
  }

  async getByCategory(category: string) {
    const response = await settingsEndpoints.getByCategory(category);
    return response.data;
  }

  async getByKey(key: string) {
    const response = await settingsEndpoints.getByKey(key);
    return response.data;
  }

  async update(key: string, value: any) {
    const response = await settingsEndpoints.update(key, { value });
    return response.data;
  }

  // Company Settings
  async getCompanyInfo() {
    const response = await settingsEndpoints.getCompanyInfo();
    return response.data;
  }

  async updateCompanyInfo(payload: any) {
    const response = await settingsEndpoints.updateCompanyInfo(payload);
    return response.data;
  }

  // Email Settings
  async getEmailConfig() {
    const response = await settingsEndpoints.getEmailConfig();
    return response.data;
  }

  async updateEmailConfig(payload: any) {
    const response = await settingsEndpoints.updateEmailConfig(payload);
    return response.data;
  }

  async testEmailConfig() {
    await settingsEndpoints.testEmailConfig();
  }

  // WhatsApp Settings
  async getWhatsAppConfig() {
    const response = await settingsEndpoints.getWhatsAppConfig();
    return response.data;
  }

  async updateWhatsAppConfig(payload: any) {
    const response = await settingsEndpoints.updateWhatsAppConfig(payload);
    return response.data;
  }

  async testWhatsAppConfig() {
    await settingsEndpoints.testWhatsAppConfig();
  }

  // Payment Gateway Settings
  async getPaymentGateways() {
    const response = await settingsEndpoints.getPaymentGateways();
    return response.data;
  }

  async updatePaymentGateway(gatewayId: string, payload: any) {
    await settingsEndpoints.updatePaymentGateway(gatewayId, payload);
  }

  // Notification Settings
  async getNotificationPreferences() {
    const response = await settingsEndpoints.getNotificationPreferences();
    return response.data;
  }

  async updateNotificationPreferences(payload: any) {
    const response = await settingsEndpoints.updateNotificationPreferences(payload);
    return response.data;
  }

  // Lead Assignment Rules
  async getLeadAssignmentRules() {
    const response = await settingsEndpoints.getLeadAssignmentRules();
    return response.data;
  }

  async updateLeadAssignmentRules(payload: any) {
    const response = await settingsEndpoints.updateLeadAssignmentRules(payload);
    return response.data;
  }

  // Helper methods
  getCategoryIcon(category: string): string {
    const iconMap: Record<string, string> = {
      COMPANY: '🏢',
      EMAIL: '📧',
      WHATSAPP: '💬',
      PAYMENT: '💳',
      NOTIFICATION: '🔔',
      LEAD_ASSIGNMENT: '👥',
      SYSTEM: '⚙️',
    };
    return iconMap[category.toUpperCase()] || '⚙️';
  }

  getCategoryColor(category: string): string {
    const colorMap: Record<string, string> = {
      COMPANY: 'blue',
      EMAIL: 'purple',
      WHATSAPP: 'green',
      PAYMENT: 'yellow',
      NOTIFICATION: 'orange',
      LEAD_ASSIGNMENT: 'red',
      SYSTEM: 'gray',
    };
    return colorMap[category.toUpperCase()] || 'gray';
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePhone(phone: string): boolean {
    return phone.length >= 10;
  }

  validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  maskApiKey(key: string): string {
    if (key.length <= 8) return '****';
    return key.substring(0, 4) + '****' + key.substring(key.length - 4);
  }

  getSettingCategories(): { value: string; label: string }[] {
    return [
      { value: 'COMPANY', label: 'Company' },
      { value: 'EMAIL', label: 'Email' },
      { value: 'WHATSAPP', label: 'WhatsApp' },
      { value: 'PAYMENT', label: 'Payment' },
      { value: 'NOTIFICATION', label: 'Notification' },
      { value: 'LEAD_ASSIGNMENT', label: 'Lead Assignment' },
      { value: 'SYSTEM', label: 'System' },
    ];
  }
}

export const settingsService = new SettingsService();
