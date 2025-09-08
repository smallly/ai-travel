import React, { useState } from 'react';
import { Phone, X, Shield, CheckCircle } from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { userApi } from '../services/api';

interface PhoneAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: () => void;
}

// 微信相关类型定义 - 已注释，后续启用时解除注释
// declare global {
//   interface Window {
//     wx?: {
//       miniProgram?: {
//         getEnv: (callback: (res: { miniprogram: boolean }) => void) => void;
//         navigateBack: () => void;
//       };
//     };
//     WeixinJSBridge?: any;
//   }
// }

const PhoneAuthModal: React.FC<PhoneAuthModalProps> = ({
  isOpen,
  onClose,
  onAuthSuccess,
}) => {
  const { login } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authStep, setAuthStep] = useState<'prompt' | 'authorizing' | 'success'>('prompt');

  if (!isOpen) return null;

  // 微信环境检测 - 已注释，后续启用时解除注释
  // const isWeChatEnv = (): boolean => {
  //   const ua = window.navigator.userAgent.toLowerCase();
  //   return ua.includes('micromessenger');
  // };

  // const isWeChatMiniProgram = (): Promise<boolean> => {
  //   return new Promise((resolve) => {
  //     if (window.wx && window.wx.miniProgram) {
  //       window.wx.miniProgram.getEnv((res) => {
  //         resolve(res.miniprogram);
  //       });
  //     } else {
  //       resolve(false);
  //     }
  //   });
  // };

  // 微信网页授权获取手机号 - 已注释，后续启用时解除注释
  // const handleWeChatWebAuth = async () => {
  //   try {
  //     setIsLoading(true);
  //     setError(null);
  //     setAuthStep('authorizing');

  //     // 这里应该调用微信网页授权
  //     // 实际项目中需要配置微信公众号和网页授权域名
      
  //     // 模拟授权流程
  //     setTimeout(async () => {
  //       try {
  //         // 模拟获取到授权码后调用后端换取用户信息
  //         const mockAuthCode = 'mock_auth_code_' + Date.now();
  //         const response = await userApi.wechatPhoneAuth(mockAuthCode);
          
  //         if (response.success && response.data) {
  //           // 存储token
  //           localStorage.setItem('auth_token', response.data.token);
            
  //           const userData = {
  //             id: response.data.user_id,
  //             phone: response.data.phone,
  //             nickname: response.data.nickname || '微信用户',
  //             avatar: response.data.avatar || '',
  //             createdAt: response.data.created_at || new Date().toISOString(),
  //             isLoggedIn: true
  //           };
            
  //           login(userData);
  //           setAuthStep('success');
            
  //           setTimeout(() => {
  //             onAuthSuccess();
  //             onClose();
  //             setAuthStep('prompt');
  //           }, 2000);
  //         } else {
  //           throw new Error(response.error || '授权失败');
  //         }
  //       } catch (error) {
  //         setError(error instanceof Error ? error.message : '授权失败，请重试');
  //         setAuthStep('prompt');
  //       } finally {
  //         setIsLoading(false);
  //       }
  //     }, 2000);
  //   } catch (error) {
  //     setError('启动授权失败，请稍后重试');
  //     setIsLoading(false);
  //     setAuthStep('prompt');
  //   }
  // };

  // 微信小程序手机号授权 - 已注释，后续启用时解除注释
  // const handleMiniProgramAuth = async () => {
  //   try {
  //     setIsLoading(true);
  //     setError(null);
  //     setAuthStep('authorizing');

  //     // 在微信小程序环境中调用获取手机号API
  //     // 这需要在小程序的button组件上绑定open-type="getPhoneNumber"
  //     // 这里模拟小程序授权流程
      
  //     setTimeout(async () => {
  //       try {
  //         // 模拟小程序返回的加密数据
  //         const mockEncryptedData = {
  //           encryptedData: 'mock_encrypted_data',
  //           iv: 'mock_iv',
  //           sessionKey: 'mock_session_key'
  //         };
          
  //         const response = await userApi.miniProgramPhoneAuth(mockEncryptedData);
          
  //         if (response.success && response.data) {
  //           // 存储token
  //           localStorage.setItem('auth_token', response.data.token);
            
  //           const userData = {
  //             id: response.data.user_id,
  //             phone: response.data.phone,
  //             nickname: response.data.nickname || '微信用户',
  //             avatar: response.data.avatar || '',
  //             createdAt: response.data.created_at || new Date().toISOString(),
  //             isLoggedIn: true
  //           };
            
  //           login(userData);
  //           setAuthStep('success');
            
  //           setTimeout(() => {
  //             onAuthSuccess();
  //             onClose();
  //             setAuthStep('prompt');
  //           }, 2000);
  //         } else {
  //           throw new Error(response.error || '授权失败');
  //         }
  //       } catch (error) {
  //         setError(error instanceof Error ? error.message : '授权失败，请重试');
  //         setAuthStep('prompt');
  //       } finally {
  //         setIsLoading(false);
  //       }
  //     }, 2000);
  //   } catch (error) {
  //     setError('启动授权失败，请稍后重试');
  //     setIsLoading(false);
  //     setAuthStep('prompt');
  //   }
  // };

  // 处理授权点击 - 已注释，后续启用时解除注释
  // const handleAuthClick = async () => {
  //   const isMiniProgram = await isWeChatMiniProgram();
    
  //   if (isMiniProgram) {
  //     handleMiniProgramAuth();
  //   } else if (isWeChatEnv()) {
  //     handleWeChatWebAuth();
  //   } else {
  //     // 非微信环境，提示用户
  //     setError('请在微信中打开此页面进行手机号授权');
  //   }
  // };

  // 临时处理函数，直接关闭弹窗
  const handleAuthClick = async () => {
    setError('手机号登录功能开发中，请稍后再试');
    setTimeout(() => {
      onClose();
    }, 1500);
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

        {/* 授权提示阶段 */}
        {authStep === 'prompt' && (
          <>
            <div className="text-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">手机号授权</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                为了提供个性化服务和保存您的旅行规划，需要获取您的手机号进行身份验证
              </p>
            </div>

            {/* 授权说明 */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium text-gray-800">隐私保护</span>
              </div>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 仅用于账号识别和数据同步</li>
                <li>• 不会发送任何营销短信</li>
                <li>• 严格保护您的隐私安全</li>
              </ul>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* 授权按钮 */}
            <div className="space-y-3">
              <button
                onClick={handleAuthClick}
                disabled={isLoading}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
手机号登录
              </button>
            </div>
          </>
        )}

        {/* 授权中阶段 */}
        {authStep === 'authorizing' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">授权中</h3>
            <p className="text-gray-600 text-sm">
              正在获取您的手机号，请稍候...
            </p>
          </div>
        )}

        {/* 授权成功阶段 */}
        {authStep === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-100 to-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">授权成功</h3>
            <p className="text-gray-600 text-sm">
              欢迎使用AI赛博旅伴！
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhoneAuthModal;