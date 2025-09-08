import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  login: (user: User) => void;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
  checkAuthStatus: () => Promise<boolean>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user && user.isLoggedIn;

  // 检查本地存储的用户信息
  const checkLocalAuth = (): User | null => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('user_data');
      
      if (token && userData) {
        const parsedUser = JSON.parse(userData);
        return { ...parsedUser, isLoggedIn: true };
      }
    } catch (error) {
      console.error('检查本地认证失败:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user_data');
    }
    return null;
  };

  // 检查认证状态
  const checkAuthStatus = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const localUser = checkLocalAuth();
      if (!localUser) {
        setUser(null);
        setIsLoading(false);
        return false;
      }

      // 验证token是否有效
      const response = await userApi.verifyAuth();
      if (response.success && response.data) {
        const updatedUser = { ...localUser, ...response.data };
        setUser(updatedUser);
        // 更新本地存储
        localStorage.setItem('user_data', JSON.stringify(updatedUser));
        setIsLoading(false);
        return true;
      } else {
        // Token无效，清除本地数据
        logout();
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error('验证认证状态失败:', error);
      logout();
      setIsLoading(false);
      return false;
    }
  };

  // 用户登录
  const login = (userData: User) => {
    const userWithAuth = { ...userData, isLoggedIn: true };
    setUser(userWithAuth);
    // 保存到本地存储 (实际项目中token应该在登录接口返回)
    localStorage.setItem('user_data', JSON.stringify(userWithAuth));
    // 这里应该保存从后端返回的JWT token
    localStorage.setItem('auth_token', `user_${userData.id}_${Date.now()}`);
  };

  // 用户登出
  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
  };

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