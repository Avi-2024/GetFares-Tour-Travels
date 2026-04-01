import { useState, useCallback } from 'react';
import { usersService } from '../services/users.service';
import type { CreateUserPayload, UpdateUserPayload } from '../endpoints/users.api';

export const useUsers = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useCallback(async (params?: any) => {
    setLoading(true);
    setError(null);
    try {
      return await usersService.list(params);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const create = useCallback(async (payload: CreateUserPayload) => {
    setLoading(true);
    setError(null);
    try {
      return await usersService.create(payload);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const update = useCallback(async (id: string, payload: UpdateUserPayload) => {
    setLoading(true);
    setError(null);
    try {
      return await usersService.update(id, payload);
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
      return await usersService.getById(id);
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleActive = useCallback(async (id: string, active: boolean) => {
    setLoading(true);
    setError(null);
    try {
      await usersService.toggleActive(id, active);
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
    update,
    getById,
    toggleActive,
    loading,
    error,
    getStatusBadge: usersService.getStatusBadge,
    getRoleColor: usersService.getRoleColor,
    formatUserName: usersService.formatUserName,
    getUserInitials: usersService.getUserInitials,
    filterByRole: usersService.filterByRole,
    filterActive: usersService.filterActive,
    sortByName: usersService.sortByName,
  };
};
