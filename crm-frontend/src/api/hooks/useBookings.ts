import { useState, useCallback } from 'react';
import { bookingsService } from '../services/bookings.service';
import type { CreateBookingPayload } from '../endpoints/bookings.api';

export const useBookings = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: any) => {
    setLoading(true);
    setError(null);
    try {
      return await bookingsService.list(params);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: CreateBookingPayload) => {
    setLoading(true);
    setError(null);
    try {
      return await bookingsService.create(payload);
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
      return await bookingsService.getById(id);
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
      await bookingsService.changeStatus(id, status, reason);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const recordPayment = useCallback(async (id: string, amount: number, method: string, reference?: string) => {
    setLoading(true);
    setError(null);
    try {
      await bookingsService.recordPayment(id, amount, method, reference);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const uploadDocument = useCallback(async (id: string, file: File, type: string) => {
    setLoading(true);
    setError(null);
    try {
      await bookingsService.uploadDocument(id, file, type);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const cancel = useCallback(async (id: string, reason: string) => {
    setLoading(true);
    setError(null);
    try {
      await bookingsService.cancel(id, reason);
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
    changeStatus,
    recordPayment,
    uploadDocument,
    cancel,
    loading,
    error,
    calculateBalance: bookingsService.calculateBalance,
    getPaymentStatus: bookingsService.getPaymentStatus,
    getStatusColor: bookingsService.getStatusColor,
  };
};
