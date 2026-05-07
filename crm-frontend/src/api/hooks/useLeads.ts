import { useState, useCallback } from 'react';
import { leadsService } from '../services/leads.service';
import type { CreateLeadPayload, UpdateLeadPayload } from '../endpoints/leads.api';

export const useLeads = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: any) => {
    setLoading(true);
    setError(null);
    try {
      return await leadsService.list(params);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: CreateLeadPayload) => {
    setLoading(true);
    setError(null);
    try {
      return await leadsService.create(payload);
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
      return await leadsService.getById(id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: UpdateLeadPayload) => {
    setLoading(true);
    setError(null);
    try {
      return await leadsService.update(id, payload);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const assign = useCallback(async (id: string, assignedTo: string, reason?: string) => {
    setLoading(true);
    setError(null);
    try {
      await leadsService.assign(id, assignedTo, reason);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const addFollowup = useCallback(async (id: string, notes: string, nextFollowupDate?: string) => {
    setLoading(true);
    setError(null);
    try {
      await leadsService.addFollowup(id, notes, nextFollowupDate);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const markAsLost = useCallback(async (id: string, reason: string, notes?: string) => {
    setLoading(true);
    setError(null);
    try {
      await leadsService.markAsLost(id, reason, notes);
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
    assign,
    addFollowup,
    markAsLost,
    loading,
    error,
    getStatusColor: leadsService.getStatusColor,
    getTemperatureColor: leadsService.getTemperatureColor,
  };
};
