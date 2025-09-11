import React, { useState } from 'react';
import { Phone, X, Eye, EyeOff, CheckCircle, UserPlus, LogIn } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { userApi } from '../services/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const { login } = useUser();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'form' | 'loading' | 'success'>('form');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    phone: '',
    password: '',
    confirmPassword: '',
    nickname: ''
  });

  if (!isOpen) return null;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // 清除错误信息
    if (error) setError(null);
  };

  const validateForm = () => {
    if (!formData.phone.trim()) {
      setError('请输入手机号');
      return false;
    }
    
    if (!/^1[3-9]\d{9}$/.test(formData.phone)) {
      setError('请输入正确的手机号');
      return false;
    }

    if (!formData.password.trim()) {
      setError('请输入密码');
      return false;
    }

    if (formData.password.length < 6) {
      setError('密码至少6位');
      return false;
    }

    if (mode === 'register' && formData.password !== formData.confirmPassword) {
      setError('两次输入的密码不一致');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      setError(null);
      setAuthStep('loading');

      let response;
      if (mode === 'login') {
        response = await userApi.loginWithPhone(formData.phone, formData.password);
      } else {
        response = await userApi.registerWithPhone(
          formData.phone, 
          formData.password, 
          formData.nickname
        );
      }

      if (response.success && response.data) {
        // 调用UserContext的login方法，它会处理新的token格式
        login(response.data);
        setAuthStep('success');
        
        setTimeout(() => {
          onAuthSuccess();
          onClose();
          resetForm();
        }, 1000);
      } else {
        throw new Error(response.error || `${mode === 'login' ? '登录' : '注册'}失败`);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : `${mode === 'login' ? '登录' : '注册'}失败，请重试`);
      setAuthStep('form');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      phone: '',
      password: '',
      confirmPassword: '',
      nickname: ''
    });
    setError(null);
    setAuthStep('form');
    setShowPassword(false);
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    resetForm();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* 表单阶段 */}
        {authStep === 'form' && (
          <>
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                {mode === 'login' ? '登录账号' : '注册账号'}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {mode === 'login' 
                  ? '使用手机号和密码登录您的账号'
                  : '创建新账号，享受个性化旅行服务'
                }
              </p>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* 登录/注册表单 */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 手机号输入 */}
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="请输入手机号"
                  disabled={isLoading}
                  className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  maxLength={11}
                />
              </div>

              {/* 昵称输入（仅注册时显示） */}
              {mode === 'register' && (
                <div className="relative">
                  <UserPlus className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nickname}
                    onChange={(e) => handleInputChange('nickname', e.target.value)}
                    placeholder="请输入昵称（可选）"
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                    maxLength={20}
                  />
                </div>
              )}

              {/* 密码输入 */}
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <circle cx="12" cy="16" r="1"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={mode === 'login' ? '请输入密码' : '请设置密码（至少6位）'}
                  disabled={isLoading}
                  className="w-full pl-11 pr-12 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* 确认密码输入（仅注册时显示） */}
              {mode === 'register' && (
                <div className="relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <circle cx="12" cy="16" r="1"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    placeholder="请确认密码"
                    disabled={isLoading}
                    className="w-full pl-11 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              )}

              {/* 提交按钮 */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {mode === 'login' ? '登录' : '注册'}
              </button>
            </form>

            {/* 切换模式 */}
            <div className="text-center mt-4">
              <button
                onClick={switchMode}
                disabled={isLoading}
                className="text-purple-500 hover:text-purple-600 transition-colors text-sm disabled:opacity-50"
              >
                {mode === 'login' ? '还没有账号？立即注册' : '已有账号？立即登录'}
              </button>
            </div>
          </>
        )}

        {/* 加载中阶段 */}
        {authStep === 'loading' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {mode === 'login' ? '登录中' : '注册中'}
            </h3>
            <p className="text-gray-600 text-sm">
              {mode === 'login' ? '正在验证您的账号...' : '正在创建您的账号...'}
            </p>
          </div>
        )}

        {/* 成功阶段 */}
        {authStep === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              {mode === 'login' ? '登录成功' : '注册成功'}
            </h3>
            <p className="text-gray-600 text-sm">
              欢迎使用AI赛博旅伴！
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginModal;