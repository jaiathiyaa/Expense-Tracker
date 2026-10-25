import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginPayload, RegisterPayload } from '../api/types';
import { authService } from '../services/authService';
import { authStorage } from '../services/authStorage';

import { offlineStorage } from '../services/offlineStorage';
import { syncService } from '../services/syncService';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => Promise<void>;
  checkSession: (showGlobalLoading?: boolean) => Promise<void>;
  updateUser: (updatedUser: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Restore authenticated session on app launch
  useEffect(() => {
    checkSession(true);
  }, []);

  // Update syncService session whenever token or user changes
  useEffect(() => {
    syncService.setSession(token, user?.id || null);
  }, [token, user?.id]);

  const checkSession = async (showGlobalLoading: boolean = false) => {
    try {
      if (showGlobalLoading) {
        setIsLoading(true);
      }
      const storedToken = await authStorage.getToken();

      if (!storedToken) {
        setUser(null);
        setToken(null);
        return;
      }

      try {
        // Verify stored token with backend
        const response = await authService.getMe(storedToken);
        if (response && response.user) {
          setUser(response.user);
          setToken(storedToken);
          await offlineStorage.cacheUserProfile(response.user);
        } else {
          await authStorage.clearToken();
          setUser(null);
          setToken(null);
        }
      } catch (networkErr: any) {
        // If error is 401 Unauthorized, token is expired/invalid -> clear session
        if (networkErr?.status === 401) {
          await authStorage.clearToken();
          setUser(null);
          setToken(null);
        } else {
          // Device is offline or server unreachable -> preserve session using cached user profile!
          const cachedUser = await offlineStorage.getCachedUserProfile();
          if (cachedUser) {
            setUser(cachedUser);
            setToken(storedToken);
          } else {
            // No cached user profile available
            setUser(null);
            setToken(storedToken);
          }
        }
      }
    } catch {
      setUser(null);
      setToken(null);
    } finally {
      if (showGlobalLoading) {
        setIsLoading(false);
      }
    }
  };

  const login = async (payload: LoginPayload): Promise<User> => {
    const response = await authService.login(payload);
    await authStorage.saveToken(response.token);
    await offlineStorage.cacheUserProfile(response.user);
    setToken(response.token);
    setUser(response.user);
    return response.user;
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    const response = await authService.register(payload);
    // Registration returns user only (not token); user will sign in on Login screen
    return response.user;
  };

  const logout = async () => {
    try {
      await authStorage.clearToken();
    } finally {
      syncService.setSession(null, null);
      setUser(null);
      setToken(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
    offlineStorage.cacheUserProfile(updatedUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token && !!user,
        login,
        register,
        logout,
        checkSession,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
