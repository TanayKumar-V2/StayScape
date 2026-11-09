'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type {
  AuthContextType,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
  User,
} from '@/types/auth';
import { authApi, usersApi } from '@/lib/api';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync user profile on mount using HTTP-only cookie session
  const refreshUser = useCallback(async () => {
    try {
      const response = await authApi.getMe();
      if (response.data) {
        setUser(response.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (input: LoginInput) => {
    const response = await authApi.login(input);
    if (response.data) {
      setUser(response.data);
      return { success: true };
    }
    return { success: false, error: response.error ?? 'Invalid email or password' };
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    const response = await authApi.register(input);
    if (response.data) {
      setUser(response.data);
      return { success: true };
    }
    return { success: false, error: response.error ?? 'Registration failed. Please try again.' };
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
    }
  }, []);

  const logoutAll = useCallback(async () => {
    try {
      await authApi.logoutAll();
    } finally {
      setUser(null);
    }
  }, []);

  const updateProfile = useCallback(async (input: UpdateProfileInput) => {
    const response = await usersApi.updateMe(input);
    if (response.data) {
      setUser(response.data);
      return { success: true };
    }
    return { success: false, error: response.error ?? 'Profile update failed' };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      logoutAll,
      updateProfile,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, logoutAll, updateProfile, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
