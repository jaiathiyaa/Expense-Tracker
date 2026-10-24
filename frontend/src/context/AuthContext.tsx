import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, LoginPayload, RegisterPayload } from '../api/types';
import { authService } from '../services/authService';
import { authStorage } from '../services/authStorage';

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

      // Verify stored token with backend
      const response = await authService.getMe(storedToken);
      if (response && response.user) {
        setUser(response.user);
        setToken(storedToken);
      } else {
        await authStorage.clearToken();
        setUser(null);
        setToken(null);
      }
    } catch {
      // Token invalid or expired, clear it
      await authStorage.clearToken();
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
      setUser(null);
      setToken(null);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
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
