import { useState, useCallback } from 'react';
import { customersService } from '../services/customers.service';

export const useCustomers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: any) => {
    setLoading(true);
    setError(null);
    try {
      return await customersService.list(params);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: any) => {
    setLoading(true);
    setError(null);
    try {
      return await customersService.create(payload);
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
      return await customersService.getById(id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: any) => {
    setLoading(true);
    setError(null);
    try {
      return await customersService.update(id, payload);
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
    loading,
    error,
    getSegmentColor: customersService.getSegmentColor,
    getSegmentBadge: customersService.getSegmentBadge,
  };
};
