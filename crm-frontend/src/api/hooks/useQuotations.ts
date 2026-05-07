import { useState, useCallback } from 'react';
import { quotationsService } from '../services/quotations.service';
import type { CreateQuotationPayload } from '../endpoints/quotations.api';

export const useQuotations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: any) => {
    setLoading(true);
    setError(null);
    try {
      return await quotationsService.list(params);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: CreateQuotationPayload) => {
    setLoading(true);
    setError(null);
    try {
      return await quotationsService.create(payload);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getById = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await quotationsService.getById(id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: Partial<CreateQuotationPayload>) => {
    setLoading(true);
    setError(null);
    try {
      return await quotationsService.update(id, payload);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const generatePdf = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await quotationsService.generatePdf(id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const send = useCallback(async (id: string, email?: string, whatsapp?: string) => {
    setLoading(true);
    setError(null);
    try {
      await quotationsService.send(id, email, whatsapp);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const changeStatus = useCallback(async (id: string, status: string, reason?: string) => {
    setLoading(true);
    setError(null);
    try {
      await quotationsService.changeStatus(id, status, reason);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const duplicate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      return await quotationsService.duplicate(id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    list,
    create,
    getById,
    update,
    generatePdf,
    send,
    changeStatus,
    duplicate,
    loading,
    error,
    calculateMargin: quotationsService.calculateMargin,
    calculateProfit: quotationsService.calculateProfit,
    isMarginValid: quotationsService.isMarginValid,
    getStatusColor: quotationsService.getStatusColor,
    isExpired: quotationsService.isExpired,
    formatCurrency: quotationsService.formatCurrency,
  };
};
