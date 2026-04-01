import { useState, useCallback } from 'react';
import { authService } from '../services/auth.service';

export const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const login = useCallback(async (email: string, password: string, rememberMe = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.login(email, password, rememberMe);
      return result;
    } catch (err: any) {
      setError(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await authService.logout();
    } finally {
      setLoading(false);
    }
  }, []);

  const getProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const profile = await authService.getProfile();
      return profile;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch profile');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleActive = useCallback(async (active: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authService.toggleActive(active);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to toggle status');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    login,
    logout,
    getProfile,
    toggleActive,
    loading,
    error,
    currentUser: authService.getCurrentUser(),
    isAuthenticated: authService.isAuthenticated(),
  };
};
