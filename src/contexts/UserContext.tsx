import React, { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { userApi } from '../services/api';

export interface User {
  id: string;
  phone: string;
  nickname: string;
  avatar?: string;
  createdAt: string;
  isLoggedIn: boolean;
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (userData: any) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuthStatus: () => Promise<boolean>;
  refreshToken: () => Promise<boolean>;
  isTokenValid: () => boolean;
  setShowLoginModal: (show: boolean) => void;
  showLoginModal: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const refreshTimer = useRef<NodeJS.Timeout | null>(null);

  const isAuthenticated = !!user && user.isLoggedIn;

  // 检查本地存储的用户信息
  const checkLocalAuth = (): User | null => {
    try {
      const token = localStorage.getItem('access_token');
      const userData = localStorage.getItem('user_data');
      const rememberMe = localStorage.getItem('remember_me') !== 'false'; // 默认记住登录
      
      if (token && userData && rememberMe) {
        const parsedUser = JSON.parse(userData);
        return { ...parsedUser, isLoggedIn: true };
      }
    } catch (error) {
      console.error('检查本地认证失败:', error);
      clearTokens();
    }
    return null;
  };

  // 清除所有token和相关设置
  const clearTokens = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_data');
    localStorage.removeItem('token_expires_at');
    localStorage.removeItem('remember_me');
  }, []);

  // Token有效性检查 - 更宽松的过期时间判断
  const isTokenValid = useCallback((): boolean => {
    const token = localStorage.getItem('access_token');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const exp = payload.exp * 1000; // 转换为毫秒
      // 只有真正过期才返回false，不再提前1分钟
      return Date.now() < exp;
    } catch {
      // 如果token解析失败，但存在token，可能是格式问题，先尝试保持登录状态
      return true;
    }
  }, []);

  // 自动刷新Token - 失败时不立即登出
  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const refreshTokenValue = localStorage.getItem('refresh_token');
      if (!refreshTokenValue) return false;

      const response = await userApi.refreshToken(refreshTokenValue);
      if (response.success && response.data) {
        // 保存新的token
        localStorage.setItem('access_token', response.data.access_token);
        localStorage.setItem('refresh_token', response.data.refresh_token);
        localStorage.setItem('token_expires_at', 
          (Date.now() + response.data.expires_in * 1000).toString()
        );
        return true;
      } else {
        console.warn('Token刷新失败，但保持登录状态:', response.error);
        return false;
      }
    } catch (error) {
      console.warn('Token刷新网络错误，保持登录状态:', error);
      return false;
    }
  }, []);

  // 检查认证状态 - 优化为更依赖本地存储，减少网络请求
  const checkAuthStatus = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const localUser = checkLocalAuth();
      if (!localUser) {
        setUser(null);
        setIsLoading(false);
        return false;
      }

      // 如果有本地用户数据且token仍然有效，直接使用
      if (isTokenValid()) {
        setUser(localUser);
        setIsLoading(false);
        return true;
      }

      // 如果token即将过期，尝试刷新
      const refreshed = await refreshToken();
      if (refreshed) {
        setUser(localUser);
        setIsLoading(false);
        return true;
      }

      // 只有在token完全无效且刷新失败时才尝试验证
      // 这样减少了不必要的网络请求
      try {
        const response = await userApi.verifyAuth();
        if (response.success && response.data) {
          const updatedUser = { 
            ...localUser, 
            ...response.data,
            isLoggedIn: true 
          };
          setUser(updatedUser);
          localStorage.setItem('user_data', JSON.stringify(updatedUser));
          setIsLoading(false);
          return true;
        }
      } catch (error) {
        // 网络错误时仍然保持登录状态，但使用本地数据
        console.warn('网络验证失败，使用本地用户数据:', error);
        setUser(localUser);
        setIsLoading(false);
        return true;
      }

      // 只有在确实验证失败时才登出
      logout();
      setIsLoading(false);
      return false;
    } catch (error) {
      console.error('验证认证状态失败:', error);
      // 即使出错也尝试使用本地数据
      const localUser = checkLocalAuth();
      if (localUser) {
        setUser(localUser);
        setIsLoading(false);
        return true;
      }
      
      logout();
      setIsLoading(false);
      return false;
    }
  };

  // 用户登录 - 更新为支持新的token格式，默认记住登录
  const login = (loginData: any, rememberMe: boolean = true) => {
    const { user, access_token, refresh_token, expires_in } = loginData;
    
    // 保存tokens
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('refresh_token', refresh_token);
    localStorage.setItem('token_expires_at', 
      (Date.now() + expires_in * 1000).toString()
    );
    // 保存记住登录的设置，默认为true
    localStorage.setItem('remember_me', rememberMe.toString());
    
    // 保存用户信息
    const userWithAuth = { ...user, isLoggedIn: true };
    setUser(userWithAuth);
    localStorage.setItem('user_data', JSON.stringify(userWithAuth));
  };

  // 用户登出
  const logout = useCallback(() => {
    setUser(null);
    clearTokens();
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
    }
  }, [clearTokens]);

  // 更新用户信息
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
    }
  };

  // 初始化时检查认证状态
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const contextValue: UserContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    checkAuthStatus,
    refreshToken,
    isTokenValid,
    setShowLoginModal,
    showLoginModal,
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Hook to use the user context
export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

export default UserContext;