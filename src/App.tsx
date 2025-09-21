import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { chatApi, tripApi, Trip } from './services/api';
import TripDetailPage from './components/TripDetailPage';
import ConversationHistory from './components/ConversationHistory';
import { UserProvider, useUser } from './contexts/UserContext';
import LoginModal from './components/LoginModal';
import {
  MessageCircle,
  Map,
  User,
  Send,
  ArrowLeft,
  Calendar,
  Edit3,
  Camera,
  Check,
  PlusCircle,
  Menu,
  Plus,
  Trash2
} from 'lucide-react';

// 类型定义
interface Message {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
  attractions?: Attraction[];
  isWelcome?: boolean;
  sourceLink?: string;
}

interface Attraction {
  id: string;
  name: string;
  address: string;
  image: string;
  type: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface TravelPlan {
  id: string;
  title: string;
  duration: string;
  locations: number;
  image: string;
  status: 'planning' | 'upcoming' | 'completed';
  province?: string;
  centerCoordinates?: {
    lat: number;
    lng: number;
  };
  destination?: string;
  attractionList?: {
    id: string;
    name: string;
    address: string;
    image: string;
    description: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  }[];
  createdAt?: string;
  startDate?: string;
  endDate?: string;
  sourceLink?: string; // 原文链接
}

type Screen = 'main' | 'editProfile' | 'tripDetail' | 'locationDetail';
type Tab = 'chat' | 'itinerary' | 'profile';

// 最简单的FormInput，暂时不用ref，只测试不失焦功能
const FormInput = React.memo<{
  type?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}>(({ type = 'text', placeholder, className, disabled }) => {
  const [inputValue, setInputValue] = useState('');

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  return (
    <input
      type={type}
      value={inputValue}
      onChange={handleChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      autoComplete="off"
    />
  );
}, (prevProps, nextProps) => {
  return prevProps.disabled === nextProps.disabled;
});

// 简单的输入框组件
const ChatInput: React.FC<{
  onSendMessage: (message: string) => void;
  disabled: boolean;
  isAuthenticated?: boolean; // 添加登录状态参数
}> = ({ onSendMessage, disabled, isAuthenticated }) => {
  const [message, setMessage] = useState(() => {
    // 初始化时从localStorage恢复保存的输入
    const savedInput = localStorage.getItem('chatInput');
    console.log('🔄 ChatInput组件初始化，localStorage内容:', savedInput);
    return savedInput || '';
  });

  // 标记组件是否已经初始化完成
  const [isInitialized, setIsInitialized] = useState(false);

  // 组件初始化完成标记
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // 监听message状态的所有变化
  useEffect(() => {
    console.log('📄 message状态变化:', message, '长度:', message.length);
  }, [message]);

  // 监听登录状态变化，登录后恢复保存的内容
  useEffect(() => {
    console.log('📝 登录状态变化检查 - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      const savedInput = localStorage.getItem('chatInput');
      console.log('🔍 登录后检查localStorage:', savedInput, '当前输入:', message);
      if (savedInput) {
        if (savedInput !== message) {
          console.log('✅ 恢复保存的输入内容:', savedInput);
          setMessage(savedInput);
        } else {
          console.log('ℹ️ 输入框内容已经与localStorage一致，无需恢复');
        }
      } else {
        console.log('⚠️ localStorage中没有保存的输入内容');
      }
    }
  }, [isAuthenticated]); // 只依赖登录状态，避免无限循环

  // 实时同步输入内容到localStorage，支持用户编辑
  useEffect(() => {
    // 只有在组件初始化完成后才进行同步，避免初始化时误清空localStorage
    if (!isInitialized) return;

    // 只有当内容有变化时才更新localStorage
    const savedInput = localStorage.getItem('chatInput');
    if (message !== savedInput) {
      if (message.trim() === '') {
        // 用户手动清空了输入框，清理localStorage
        console.log('🗑️ 用户清空输入框，清理localStorage');
        localStorage.removeItem('chatInput');
      } else {
        // 用户正在编辑，保存到localStorage
        console.log('💾 保存用户编辑内容到localStorage:', message);
        localStorage.setItem('chatInput', message);
      }
    }
  }, [message, isInitialized]);

  const handleSubmit = () => {
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
      // 清理localStorage，避免重复恢复
      localStorage.removeItem('chatInput');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-3 items-end">
      <div className="flex-1 relative">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="发送链接或咨询旅行问题..."
          disabled={disabled}
          className="w-full px-4 py-3 bg-white rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          autoComplete="off"
        />
      </div>
      <button
        type="button"
        onClick={handleSubmit}
        disabled={!message.trim() || disabled}
        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-2xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
};


// 城市坐标映射表
const CITY_COORDINATES: { [key: string]: { lat: number; lng: number; radius: number } } = {
  '北京': { lat: 39.9042, lng: 116.4074, radius: 0.2 },
  '上海': { lat: 31.2304, lng: 121.4737, radius: 0.15 },
  '广州': { lat: 23.1291, lng: 113.2644, radius: 0.15 },
  '深圳': { lat: 22.3193, lng: 114.1694, radius: 0.15 },
  '杭州': { lat: 30.2741, lng: 120.1551, radius: 0.12 },
  '南京': { lat: 32.0603, lng: 118.7969, radius: 0.12 },
  '武汉': { lat: 30.5928, lng: 114.3055, radius: 0.15 },
  '成都': { lat: 30.5728, lng: 104.0668, radius: 0.15 },
  '重庆': { lat: 29.4316, lng: 108.8506, radius: 0.2 },
  '西安': { lat: 34.3416, lng: 108.9398, radius: 0.15 },
  '天津': { lat: 39.3434, lng: 117.3616, radius: 0.12 },
  '苏州': { lat: 31.2989, lng: 120.5853, radius: 0.1 },
  '青岛': { lat: 36.0986, lng: 120.3719, radius: 0.12 },
  '长沙': { lat: 28.2040, lng: 112.9823, radius: 0.12 },
  '昆明': { lat: 25.0389, lng: 102.7183, radius: 0.12 },
  '厦门': { lat: 24.4798, lng: 118.0894, radius: 0.08 },
  '大连': { lat: 38.9140, lng: 121.6147, radius: 0.1 },
  '沈阳': { lat: 41.8057, lng: 123.4315, radius: 0.12 },
  '济南': { lat: 36.6512, lng: 117.1201, radius: 0.1 },
  '哈尔滨': { lat: 45.8038, lng: 126.5349, radius: 0.12 },
  '石家庄': { lat: 38.0428, lng: 114.5149, radius: 0.1 },
  '郑州': { lat: 34.7466, lng: 113.6253, radius: 0.1 },
  '太原': { lat: 37.8570, lng: 112.5487, radius: 0.1 },
  '合肥': { lat: 31.8206, lng: 117.2272, radius: 0.1 },
  '南昌': { lat: 28.6820, lng: 115.8579, radius: 0.1 },
  '福州': { lat: 26.0745, lng: 119.2965, radius: 0.1 },
  '海口': { lat: 20.0444, lng: 110.1999, radius: 0.08 },
  '三亚': { lat: 18.2479, lng: 109.5146, radius: 0.05 },
  '桂林': { lat: 25.2342, lng: 110.1993, radius: 0.08 },
  '丽江': { lat: 26.8721, lng: 100.2319, radius: 0.05 },
  '拉萨': { lat: 29.6625, lng: 91.1146, radius: 0.08 }
};

// 根据目的地生成坐标的函数
function generateCoordinatesForDestination(destination: string, index: number): { lat: number; lng: number } {
  console.log('🗺️ 生成坐标 - 目的地:', destination, '索引:', index);

  // 尝试从目的地字符串中匹配城市名
  for (const city in CITY_COORDINATES) {
    if (destination.includes(city)) {
      const cityData = CITY_COORDINATES[city];
      console.log('🗺️ 匹配到城市:', city, '基础坐标:', cityData);

      // 在城市范围内生成随机坐标，确保每个景点有不同的位置
      const angle = (index * 72) % 360; // 每个景点间隔72度
      const radius = cityData.radius * (0.3 + (index % 3) * 0.35); // 不同半径层级
      const latOffset = radius * Math.sin(angle * Math.PI / 180);
      const lngOffset = radius * Math.cos(angle * Math.PI / 180);

      const result = {
        lat: cityData.lat + latOffset,
        lng: cityData.lng + lngOffset
      };

      console.log('🗺️ 生成的坐标:', result);
      return result;
    }
  }

  // 特殊地名处理 - 一些景点可能没有明确的城市名称
  console.log('🗺️ 未直接匹配到城市，尝试特殊地名匹配');

  // 检查是否包含特定区域名称，推断城市
  const specialMappings: { [key: string]: string } = {
    '江汉路': '武汉',
    '户部巷': '武汉',
    '黄鹤楼': '武汉',
    '东湖': '武汉',
    '汉阳': '武汉',
    '武昌': '武汉',
    '汉口': '武汉',
    '外滩': '上海',
    '陆家嘴': '上海',
    '天安门': '北京',
    '故宫': '北京',
    '长城': '北京'
  };

  for (const landmark in specialMappings) {
    if (destination.includes(landmark)) {
      const city = specialMappings[landmark];
      const cityData = CITY_COORDINATES[city];
      console.log('🗺️ 通过地标匹配到城市:', landmark, '->', city, '基础坐标:', cityData);

      const angle = (index * 72) % 360;
      const radius = cityData.radius * (0.3 + (index % 3) * 0.35);
      const latOffset = radius * Math.sin(angle * Math.PI / 180);
      const lngOffset = radius * Math.cos(angle * Math.PI / 180);

      const result = {
        lat: cityData.lat + latOffset,
        lng: cityData.lng + lngOffset
      };

      console.log('🗺️ 生成的坐标:', result);
      return result;
    }
  }

  // 如果都没有匹配，使用北京作为默认坐标（确保在中国境内）
  const defaultLat = 39.9042;  // 北京纬度
  const defaultLng = 116.4074; // 北京经度
  const offset = 0.1; // 更小的偏移，确保在中国境内

  const result = {
    lat: defaultLat + (Math.random() - 0.5) * offset,
    lng: defaultLng + (Math.random() - 0.5) * offset
  };

  console.log('🗺️ 完全未匹配，使用北京默认坐标:', result);
  return result;
}

// 主应用组件（包含认证逻辑）
function AppContent() {
  const { user, isLoading, isAuthenticated, setShowLoginModal, showLoginModal, updateUser, logout } = useUser();
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');
  const [currentTab, setCurrentTab] = useState<Tab>('chat');
  // const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  // const [registerForm, setRegisterForm] = useState({ 
  //   email: '', 
  //   password: '', 
  //   confirmPassword: '',
  //   verificationCode: ''
  // });
  const [userProfile, setUserProfile] = useState({
    nickname: '用户',
    email: 'user@example.com',
    avatar: ''
  });
  const [editProfile, setEditProfile] = useState({
    nickname: '',
    avatar: ''
  });
  const [showAbout, setShowAbout] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TravelPlan | null>(null);
  // 用户行程状态
  const [userTrips, setUserTrips] = useState<Trip[]>([]);
  const [isLoadingTrips, setIsLoadingTrips] = useState(false);
  
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ 
    message: '', 
    visible: false 
  });
  // 登录弹窗状态由UserContext管理
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    locationId: string;
    locationName: string;
  }>({ visible: false, locationId: '', locationName: '' });

  // 行程创建成功弹窗状态
  const [tripSuccessModal, setTripSuccessModal] = useState<{
    visible: boolean;
    trip: TravelPlan | null;
  }>({ visible: false, trip: null });
  
  // 默认欢迎消息
  const getWelcomeMessage = (): Message => ({
    id: 'welcome',
    text: '👋 你好！我是你的AI旅行助手\n\n✨ 我能帮你：\n🔗 解析旅行链接，提取地点信息\n📍 制定个性化旅行计划\n🗺️ 推荐当地特色和美食\n🚗 提供交通住宿建议\n\n发送旅行链接或告诉我你想去哪里吧！',
    isAI: true,
    timestamp: new Date(),
    isWelcome: true
  });

  // 获取用户对话历史的存储key
  const getChatStorageKey = (userId: string): string => {
    return `chat_history_${userId}`;
  };

  // 保存对话历史到本地存储
  const saveChatHistory = useCallback((userId: string, messages: Message[]) => {
    try {
      const storageKey = getChatStorageKey(userId);
      // 过滤掉欢迎消息，只保存真实对话
      const chatMessages = messages.filter(msg => !msg.isWelcome);
      localStorage.setItem(storageKey, JSON.stringify(chatMessages));
    } catch (error) {
      console.warn('保存对话历史失败:', error);
    }
  }, []);

  // 从本地存储恢复对话历史
  const loadChatHistory = useCallback((userId: string): Message[] => {
    try {
      const storageKey = getChatStorageKey(userId);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const chatMessages: Message[] = JSON.parse(stored);
        // 将时间戳字符串转换回Date对象
        const messagesWithDates = chatMessages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        // 返回欢迎消息 + 历史对话
        return [getWelcomeMessage(), ...messagesWithDates];
      }
    } catch (error) {
      console.warn('加载对话历史失败:', error);
    }
    // 如果没有历史记录或加载失败，返回默认欢迎消息
    return [getWelcomeMessage()];
  }, []);

  // 清理用户对话历史
  const clearChatHistory = useCallback((userId: string) => {
    try {
      const storageKey = getChatStorageKey(userId);
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.warn('清理对话历史失败:', error);
    }
  }, []);

  // 聊天相关状态
  const [messages, setMessages] = useState<Message[]>([getWelcomeMessage()]);
  const [isTyping, setIsTyping] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState('新对话');
  const [showConversationHistory, setShowConversationHistory] = useState(false);
  // 保存登录前的输入内容
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [conversations, setConversations] = useState<unknown[]>([]);
  // 已添加至行程的消息ID集合（仅在当前会话有效）
  const [addedToTrips, setAddedToTrips] = useState<Set<string>>(new Set());
  
  // 聊天滚动容器引用
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // 滚动位置保护状态
  const savedScrollPosition = useRef<number>(0);
  const isPreservingScroll = useRef<boolean>(false);
  const userScrolledUp = useRef<boolean>(false); // 用户是否手动向上滚动
  const lastScrollTop = useRef<number>(0);
  
  
  // 平滑滚动到底部
  const scrollToBottom = useCallback((force: boolean = false, smooth: boolean = true) => {
    if (chatScrollRef.current && !isPreservingScroll.current) {
      const scrollElement = chatScrollRef.current;
      
      if (force) {
        // 强制滚动到底部（用于新消息），使用平滑滚动
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      } else {
        // 只有在接近底部时才自动滚动到底部，否则保持用户当前位置
        const isNearBottom = scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 150;
        if (isNearBottom) {
          scrollElement.scrollTo({
            top: scrollElement.scrollHeight,
            behavior: smooth ? 'smooth' : 'auto'
          });
        }
      }
    }
  }, []);
  
  // 监听滚动位置变化
  useLayoutEffect(() => {
    const scrollElement = chatScrollRef.current;
    if (!scrollElement) return;
    
    const handleScroll = () => {
      const currentScrollTop = scrollElement.scrollTop;
      const isAtBottom = scrollElement.scrollTop + scrollElement.clientHeight >= scrollElement.scrollHeight - 50;
      
      // 检测用户是否手动向上滚动
      if (currentScrollTop < lastScrollTop.current && !isPreservingScroll.current) {
        userScrolledUp.current = true;
      }
      
      // 如果用户滚动到底部附近，恢复自动滚动
      if (isAtBottom) {
        userScrolledUp.current = false;
      }
      
      lastScrollTop.current = currentScrollTop;
      
      // 滚动保护逻辑
      if (isPreservingScroll.current) {
        // 如果当前滚动位置不是我们想要的，强制恢复
        if (scrollElement.scrollTop !== savedScrollPosition.current) {
          scrollElement.scrollTop = savedScrollPosition.current;
        }
      }
    };
    
    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, []);
  
  // 监听消息变化，智能滚动
  useEffect(() => {
    // 只有在不处于滚动保护状态且用户没有手动向上滚动时才自动滚动
    if (!isPreservingScroll.current && !userScrolledUp.current) {
      if (isTyping) {
        // AI正在输出时，使用平滑滚动，延迟更短
        setTimeout(() => {
          scrollToBottom(true, true);
        }, 50);
      } else {
        // 新消息完成时，使用平滑滚动
        setTimeout(() => {
          scrollToBottom(true, true);
        }, 150);
      }
    }
  }, [messages.length, isTyping, scrollToBottom]);
  

  // 显示toast提示
  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 2000);
  }, []);

  // 显示带操作按钮的Toast
  const showToastWithAction = useCallback((message: string, actionText: string, onAction: () => void) => {
    setToast({ message: `${message} ${actionText}`, visible: true });
    
    // 创建一个临时的点击事件监听器
    const handleToastClick = () => {
      onAction();
      setToast({ message: '', visible: false });
      document.removeEventListener('click', handleToastClick);
    };
    
    setTimeout(() => {
      document.addEventListener('click', handleToastClick);
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
      setToast({ message: '', visible: false });
      document.removeEventListener('click', handleToastClick);
    }, 5000);
  }, []);

  // 服务可用性状态
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);

  // 获取用户行程数据
  const fetchUserTrips = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;

    // 检查是否有有效的认证token
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    // 如果已知服务不可用，直接设置空数组，避免重复请求
    if (serviceAvailable === false) {
      setUserTrips([]);
      setIsLoadingTrips(false);
      return;
    }

    setIsLoadingTrips(true);
    try {
      const response = await tripApi.getUserTrips();
      if (response.success && response.data) {
        setUserTrips(response.data);
        setServiceAvailable(true); // 标记服务可用
      } else {
        // 静默处理获取失败，不记录任何日志
        setUserTrips([]); // 设置为空数组
        if (response.code === 'NETWORK_ERROR') {
          setServiceAvailable(false); // 标记服务不可用
        }
      }
    } catch (error) {
      // 静默处理网络错误，不记录任何日志
      setUserTrips([]); // 设置为空数组
      setServiceAvailable(false); // 标记服务不可用
    } finally {
      setIsLoadingTrips(false);
    }
  }, [isAuthenticated, serviceAvailable]);

  // 页面初始化 - 恢复对话历史和用户数据
  useEffect(() => {
    if (isAuthenticated && user?.id && localStorage.getItem('auth_token')) {
      fetchUserTrips();
      // 恢复登录用户的对话历史
      const chatHistory = loadChatHistory(user.id);
      setMessages(chatHistory);

      // 如果有历史对话，延迟滚动到底部确保DOM已渲染
      if (chatHistory.length > 1) { // 大于1是因为总是包含欢迎消息
        setTimeout(() => {
          scrollToBottom(true, true); // 使用平滑滚动，提升用户体验
        }, 300); // 增加延迟时间，确保DOM完全渲染和登录状态稳定
      }
    } else if (!isAuthenticated) {
      // 非登录用户也恢复匿名对话历史
      const anonymousHistory = loadChatHistory('anonymous');
      setMessages(anonymousHistory);

      // 如果有历史对话，延迟滚动到底部
      if (anonymousHistory.length > 1) {
        setTimeout(() => {
          scrollToBottom(true, true); // 使用平滑滚动，提升用户体验
        }, 100);
      }
    }
  }, [isAuthenticated, user?.id, fetchUserTrips, loadChatHistory, scrollToBottom]);

  // 自动保存对话历史（登录用户和非登录用户都保存）
  useEffect(() => {
    if (messages.length > 0) {
      // 防抖保存，避免频繁写入
      const timeoutId = setTimeout(() => {
        const userId = isAuthenticated && user?.id ? user.id : 'anonymous';
        saveChatHistory(userId, messages);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [messages, isAuthenticated, user?.id, saveChatHistory]);

  // 从AI描述中解析景点信息的函数
  const parseAttractionsFromDescription = useCallback((description: string): Array<{
    id: string;
    name: string;
    address: string;
    image: string;
    description: string;
    coordinates?: { lat: number; lng: number };
  }> => {
    if (!description) return [];

    const attractions: Array<{
      id: string;
      name: string;
      address: string;
      image: string;
      description: string;
      coordinates?: { lat: number; lng: number };
    }> = [];

    // 默认景点图片
    const defaultImages = [
      'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1707310/pexels-photo-1707310.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/2376997/pexels-photo-2376997.jpeg?auto=compress&cs=tinysrgb&w=400',
      'https://images.pexels.com/photos/1486222/pexels-photo-1486222.jpeg?auto=compress&cs=tinysrgb&w=400',
    ];

    // 按行分割描述文本
    const lines = description.split('\n').filter(line => line.trim());

    let currentAttraction: any = null;
    let attractionIndex = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // 匹配景点名称行（数字开头）
      const nameMatch = trimmedLine.match(/^(\d+)\.\s*(.+)$/);
      if (nameMatch) {
        // 如果之前有景点信息，先保存
        if (currentAttraction) {
          attractions.push({
            id: `attraction-${attractionIndex}`,
            name: currentAttraction.name,
            address: currentAttraction.address || `${currentAttraction.name}地址`,
            image: defaultImages[attractionIndex % defaultImages.length],
            description: currentAttraction.description || `${currentAttraction.name}是一个值得游览的景点`,
            // 根据目的地生成合理的坐标区域
            coordinates: generateCoordinatesForDestination(currentAttraction.address || currentAttraction.name, attractionIndex)
          });
          attractionIndex++;
        }

        // 开始新的景点
        currentAttraction = {
          name: nameMatch[2].trim(),
          address: '',
          description: ''
        };
        continue;
      }

      // 如果当前有景点正在处理
      if (currentAttraction) {
        // 匹配地址行
        if (trimmedLine.startsWith('地址：')) {
          currentAttraction.address = trimmedLine.replace('地址：', '').trim();
        }
        // 匹配推荐理由行
        else if (trimmedLine.startsWith('推荐理由：')) {
          currentAttraction.description = trimmedLine.replace('推荐理由：', '').trim();
        }
      }
    }

    // 处理最后一个景点
    if (currentAttraction) {
      attractions.push({
        id: `attraction-${attractionIndex}`,
        name: currentAttraction.name,
        address: currentAttraction.address || `${currentAttraction.name}地址`,
        image: defaultImages[attractionIndex % defaultImages.length],
        description: currentAttraction.description || `${currentAttraction.name}是一个值得游览的景点`,
        coordinates: {
          lat: 39.9 + Math.random() * 0.1,
          lng: 116.4 + Math.random() * 0.1
        }
      });
    }

    return attractions;
  }, []);

  // 将Trip数据转换为TravelPlan格式的函数
  const convertTripToTravelPlan = useCallback((trip: Trip): TravelPlan => {
    const daysCount = Math.ceil((new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // 从AI生成的描述中解析景点信息
    const attractionList = parseAttractionsFromDescription(trip.description || '');


    return {
      id: trip.id,
      title: trip.title,
      duration: `${daysCount}天${daysCount-1}晚`,
      locations: attractionList.length, // 实际景点数量
      image: trip.cover_image || '/trip-cover.png',
      status: trip.status === 'completed' ? 'completed' as const :
              trip.status === 'ongoing' ? 'upcoming' as const : 'planning' as const,
      province: '', // 从destination提取
      centerCoordinates: { lat: 0, lng: 0 }, // 默认坐标
      destination: trip.destination,
      startDate: trip.start_date,
      endDate: trip.end_date,
      createdAt: new Date(trip.created_at).toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(/\//g, '-'),
      attractionList: attractionList, // 从AI描述解析的景点列表
      sourceLink: trip.source_link // 原文链接
    };
  }, []);

  // 将用户行程转换为TravelPlan格式
  const travelPlansFromUser = userTrips.map(convertTripToTravelPlan);


  // 只使用真实用户数据，不显示示例数据
  const travelPlans = travelPlansFromUser;


  // 取消删除
  const cancelDelete = () => {
    setDeleteConfirm({ visible: false, locationId: '', locationName: '' });
  };

  // 确认删除
  const confirmDelete = () => {
    const { locationId } = deleteConfirm;
    setMyLocations(prev => prev.filter(loc => loc.id !== locationId));
    setDeleteConfirm({ visible: false, locationId: '', locationName: '' });
    showToast('已删除景点！');
  };



  // 导航功能 - 支持调用手机地图App
  const navigateToLocation = (address: string, coordinates?: { lat: number; lng: number }) => {
    const destinationName = encodeURIComponent(address);
    
    if (coordinates) {
      // 有经纬度时，优先使用经纬度导航（更精确）
      const { lat, lng } = coordinates;
      
      // 检测设备类型和尝试调用不同地图App
      const userAgent = navigator.userAgent.toLowerCase();
      const isIOS = /iphone|ipad|ipod/.test(userAgent);
      const isAndroid = /android/.test(userAgent);
      
      if (isIOS) {
        // iOS设备：尝试调用高德地图 -> 百度地图 -> Apple地图
        const amapURL = `iosamap://navi?sourceApplication=webapp&backScheme=webapp&lat=${lat}&lon=${lng}&dev=0&style=2&appname=旅行助手`;
        const baidumapURL = `baidumap://map/direction?destination=name:${destinationName}|latlng:${lat},${lng}&mode=driving&src=webapp`;
        const applemapURL = `http://maps.apple.com/?daddr=${lat},${lng}&dirflg=d&t=m`;
        
        // 尝试调用高德地图App
        window.location.href = amapURL;
        
        // 如果高德地图没有安装，500ms后尝试百度地图
        setTimeout(() => {
          window.location.href = baidumapURL;
        }, 500);
        
        // 如果都没有安装，1秒后调用Apple地图
        setTimeout(() => {
          window.location.href = applemapURL;
        }, 1000);
        
      } else if (isAndroid) {
        // Android设备：尝试调用高德地图 -> 百度地图 -> 腾讯地图
        const amapURL = `amapuri://route/plan/?dlat=${lat}&dlon=${lng}&dname=${destinationName}&dev=0&t=0`;
        const baidumapURL = `intent://map/direction?destination=name:${destinationName}|latlng:${lat},${lng}&mode=driving&src=webapp#Intent;scheme=baidumap;package=com.baidu.BaiduMap;end`;
        const tencentURL = `qqmap://map/routeplan?type=drive&tocoord=${lat},${lng}&to=${destinationName}`;
        
        // 尝试调用高德地图App
        window.location.href = amapURL;
        
        // 如果高德地图没有安装，500ms后尝试百度地图
        setTimeout(() => {
          window.location.href = baidumapURL;
        }, 500);
        
        // 如果都没有安装，1秒后尝试腾讯地图
        setTimeout(() => {
          window.location.href = tencentURL;
        }, 1000);
        
      } else {
        // 桌面端：使用最简单的百度地图URL（国内最稳定）
        const baiduURL = `https://map.baidu.com/?newmap=1&ie=utf-8&s=con%26wd%3D${encodeURIComponent(destinationName)}%26c%3D1%26all%3D0&from=webapi&tn=B_NORMAL_MAP&pn=0&da_src=searchBox.button&on_gel=1&src=0&gr=3&l=15&lat=${lat}&lng=${lng}`;
        window.open(baiduURL, '_blank');
      }
      
    } else {
      // 没有经纬度时，使用地址导航（Web版）
      const webURL = `https://uri.amap.com/navigation?to=${destinationName}&src=webapp`;
      window.open(webURL, '_blank');
    }
  };

  // 登录处理 - 已移除，现在使用弹窗形式
  // const handleLogin = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setCurrentScreen('main');
  // };

  // 注册处理 - 已移除，现在使用弹窗形式
  // const handleRegister = (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setCurrentScreen('main');
  // };

  // 清理AI文本，移除经纬度等技术信息
  const cleanAIText = useCallback((text: string): string => {
    console.log('原始AI文本:', text);
    let cleanedText = text;
    
    // 移除经纬度信息的各种格式
    const coordinatePatterns = [
      // 中文标识的坐标
      /经纬度[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
      /纬度[：:]?\s*[0-9.-]+/g,
      /经度[：:]?\s*[0-9.-]+/g,
      /坐标[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
      // 括号内的坐标信息
      /\([^)]*经度[^)]*\)/g,
      /\([^)]*纬度[^)]*\)/g,
      /\([^)]*坐标[^)]*\)/g,
      // 纯数字坐标格式（较精确的格式）
      /\b[0-9]{1,3}\.[0-9]{5,8}\s*[,，]\s*[0-9]{1,3}\.[0-9]{5,8}\b/g,
      // GPS坐标格式
      /GPS[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
      // 位置坐标格式
      /位置[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
      // 地理坐标
      /地理坐标[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+/g,
    ];
    
    coordinatePatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern, '');
    });
    
    // 清理因移除坐标信息而产生的多余格式
    cleanedText = cleanedText
      // 移除空的冒号行
      .replace(/^[：:]\s*$/gm, '')
      // 移除连续的换行符
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      // 移除行首行尾的冒号和空格
      .replace(/^\s*[：:]\s*/gm, '')
      .replace(/\s*[：:]\s*$/gm, '')
      // 清理首尾空格
      .replace(/^\s+|\s+$/g, '')
      // 清理行首行尾空格
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n');
    
    console.log('清理后AI文本:', cleanedText);
    return cleanedText;
  }, []);

  // 检测是否为链接
  const isValidUrl = useCallback((text: string): boolean => {
    const urlPattern = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/;
    return urlPattern.test(text.trim());
  }, []);

  // 检测是否为行程相关内容
  const isItineraryContent = useCallback((message: Message): boolean => {
    if (message.isWelcome) return false;

    // 只有当存在景点信息时，才显示"添加至行程"按钮
    if (message.attractions && message.attractions.length > 0) return true;

    // 如果没有景点信息，不显示按钮
    return false;
  }, []);

  // 对话管理功能
  const handleNewConversation = useCallback(() => {
    setMessages([getWelcomeMessage()]);
    setCurrentConversationId(null);
    setConversationTitle('新对话');
    // 清除已添加的行程标记
    setAddedToTrips(new Set());
  }, []);

  const handleSelectConversation = useCallback(async (conversationId: string | null, title: string) => {
    if (!conversationId) {
      handleNewConversation();
      return;
    }

    try {
      // 加载对话消息
      const response = await chatApi.getMessages(conversationId);
      if (response.success && response.data) {
        const loadedMessages = response.data.messages.map((msg: any) => ({
          id: msg.id,
          text: msg.content,
          isAI: msg.sender_type === 'ai',
          timestamp: new Date(msg.timestamp || msg.created_at)
        }));

        setMessages([getWelcomeMessage(), ...loadedMessages]);
        setCurrentConversationId(conversationId);
        setConversationTitle(title);
        // 清除已添加的行程标记
        setAddedToTrips(new Set());
      }
    } catch (error) {
      console.error('加载对话消息失败:', error);
    }
  }, []);

  const generateConversationTitle = useCallback((message: string) => {
    // 智能生成对话标题
    const cleanMessage = message.replace(/[^\w\u4e00-\u9fa5\s]/g, '').trim();
    if (cleanMessage.length > 20) {
      return cleanMessage.substring(0, 20) + '...';
    }
    return cleanMessage || '新对话';
  }, []);

  // 发送消息 - 使用 useRef 来避免闭包问题
  const handleSendMessage = useCallback(async (messageText: string) => {
    // 检查用户是否已登录
    if (!isAuthenticated) {
      // 保存用户输入的内容，等登录后可以继续使用
      console.log('💾 保存用户输入到localStorage:', messageText);
      localStorage.setItem('chatInput', messageText);
      setShowLoginModal(true);
      return;
    }

    // 移除离线模式检查，让后端处理所有情况（包括使用本地模拟回复）

    // 清空保存的消息内容，因为现在要发送了
    localStorage.removeItem('chatInput');

    // 检测是否为链接
    const sourceLink = isValidUrl(messageText) ? messageText : undefined;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      isAI: false,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // 发送消息到后端，包含用户ID
      const response = await chatApi.sendMessage(messageText, conversationIdRef.current || undefined);

      if (response.success && response.data) {
        // 标记服务可用
        if (serviceAvailable !== true) {
          setServiceAvailable(true);
        }
        
        // 更新对话ID
        if (!conversationIdRef.current) {
          setCurrentConversationId(response.data.conversation_id);
          // 为新对话生成标题
          const newTitle = generateConversationTitle(messageText);
          setConversationTitle(newTitle);
        }

        // 添加AI回复
        const aiMessage: Message = {
          id: response.data.ai_message.id,
          text: cleanAIText(response.data.ai_message.content),
          isAI: true,
          timestamp: new Date(response.data.ai_message.timestamp),
          attractions: response.data.attractions || [],
          sourceLink: sourceLink
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        // 对于网络错误，仍然尝试标记服务不可用，但对于其他错误则显示后端返回的消息
        if (response.code === 'NETWORK_ERROR') {
          setServiceAvailable(false);
        }

        // 显示后端返回的消息（可能包含智能模拟回复）
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.error || '服务暂时不可用，请稍后重试',
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: unknown) {
      // 对于真正的网络错误才标记服务不可用
      console.error('Network error:', error);
      setServiceAvailable(false);

      // 网络错误处理
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: '网络连接失败，请检查您的网络连接或稍后重试。',
        isAI: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }, [isAuthenticated, cleanAIText, isValidUrl, setShowLoginModal, serviceAvailable, generateConversationTitle]);

  // 初始化用户认证状态 - 仅在首次加载时设置默认标签
  useEffect(() => {
    if (!isLoading && currentTab === 'chat') {
      // 仅在初始状态为chat时才可能需要调整
      // 其他情况下保持用户当前的标签选择
    }
  }, [isLoading]); // 移除isAuthenticated依赖，避免登出时强制跳转

  // 监听标签切换，切换到对话页面时自动滚动到最新消息
  useEffect(() => {
    if (currentTab === 'chat' && messages.length > 0) {
      // 延迟一下确保DOM已渲染
      setTimeout(() => {
        scrollToBottom(true, false); // 强制滚动到底部，不使用平滑滚动避免卡顿
      }, 50);
    }
  }, [currentTab, scrollToBottom, messages.length]);

  // 使用 useRef 来保持最新的状态引用
  const conversationIdRef = useRef(currentConversationId);
  conversationIdRef.current = currentConversationId;

  // 编辑个人信息
  const handleEditProfile = () => {
    const currentNickname = isAuthenticated ? (user?.nickname || userProfile.nickname) : userProfile.nickname;
    setEditProfile({
      nickname: currentNickname,
      avatar: userProfile.avatar
    });
    setCurrentScreen('editProfile');
  };

  // 保存个人信息
  const handleSaveProfile = useCallback(async () => {
    const newNickname = editProfile.nickname.trim() || userProfile.nickname;

    // 更新本地用户资料状态
    setUserProfile({
      ...userProfile,
      nickname: newNickname,
      avatar: editProfile.avatar || userProfile.avatar
    });

    // 如果用户已登录，同时更新 UserContext 中的用户信息
    if (isAuthenticated && user) {
      await updateUser({ nickname: newNickname });
    }

    setCurrentScreen('main');
    showToast('个人信息已保存');
  }, [editProfile.nickname, editProfile.avatar, userProfile, isAuthenticated, user, updateUser, showToast]);

  // 查看行程详情
  const handleViewTripDetail = useCallback((trip: TravelPlan) => {
    setSelectedTrip(trip);
    setCurrentScreen('tripDetail');
    setCurrentTab('itinerary'); // 同时切换到行程标签页
  }, []);

  // 关闭行程详情
  const handleCloseTripDetail = () => {
    setCurrentScreen('main');
    setSelectedTrip(null);
  };

  // 删除行程
  const handleDeleteTrip = useCallback(async (tripId: string) => {
    try {
      const response = await tripApi.deleteTrip(tripId);
      if (response.success) {
        showToast('行程删除成功！');
        // 刷新行程列表
        await fetchUserTrips();
        // 如果当前正在查看这个行程详情，返回列表页
        if (selectedTrip?.id === tripId) {
          handleCloseTripDetail();
        }
      } else {
        showToast(`删除失败：${response.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('删除行程失败:', error);
      showToast('删除失败，请重试');
    }
  }, [selectedTrip?.id, fetchUserTrips, showToast]);

  // 退出登录处理
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      // 调用后端登出接口
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch('http://127.0.0.1:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('登出请求失败:', error);
    }
    
    // 在登出前保存当前用户的对话历史
    if (user?.id && messages.length > 0) {
      saveChatHistory(user.id, messages);
    }
    
    // 重置用户状态 - 直接调用context的logout来清理所有存储
    logout();

    // 重置本地用户资料状态
    setUserProfile({
      nickname: '用户',
      email: 'user@example.com',
      avatar: ''
    });

    // 重置对话记录为默认欢迎消息
    setMessages([getWelcomeMessage()]);

    // 清空用户行程数据
    setUserTrips([]);

    setShowLogoutConfirm(false);
    // 不改变当前页面，用户退出登录后停留在原页面
    showToast('已退出登录');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // 提取目的地和计算天数的辅助函数
  const extractDestinationAndDays = useCallback((message: Message): { destination: string; days: number } => {
    let destination = '未知目的地';
    let days = 1;
    
    // 从景点信息中提取目的地
    if (message.attractions && message.attractions.length > 0) {
      const firstAttraction = message.attractions[0];
      if (firstAttraction.address) {
        // 提取城市名称，去掉区县信息
        if (firstAttraction.address.includes('市')) {
          // 提取到"市"为止的部分，如"北京市东城区" -> "北京"
          destination = firstAttraction.address.split('市')[0];
        } else if (firstAttraction.address.includes('省')) {
          // 处理如"山东省青岛市"的情况
          const afterProvince = firstAttraction.address.split('省')[1];
          if (afterProvince && afterProvince.includes('市')) {
            destination = afterProvince.split('市')[0];
          } else {
            destination = firstAttraction.address.split('省')[0];
          }
        } else {
          // 其他情况，取前几个字符作为城市名
          destination = firstAttraction.address.substring(0, 2);
        }
      } else if (firstAttraction.name) {
        destination = firstAttraction.name;
      }
    }
    
    // 从文本内容中提取天数
    const text = message.text;
    const dayMatches = text.match(/(\d+)[天日]/g);
    if (dayMatches && dayMatches.length > 0) {
      const dayNumbers = dayMatches.map(match => parseInt(match.replace(/[天日]/g, '')));
      days = Math.max(...dayNumbers);
    } else {
      // 检测Day1, Day2等格式
      const dayPatterns = text.match(/Day\s?(\d+)|第([一二三四五六七八九十\d]+)[天日]/gi);
      if (dayPatterns && dayPatterns.length > 0) {
        days = dayPatterns.length;
      }
    }
    
    return { destination, days };
  }, []);

  // 处理添加至行程
  const handleAddToTrip = useCallback(async (message: Message) => {
    if (addedToTrips.has(message.id)) return;

    // 保存当前滚动位置
    const currentScrollTop = chatScrollRef.current?.scrollTop || 0;
    savedScrollPosition.current = currentScrollTop;
    isPreservingScroll.current = true;

    try {
      const { destination, days } = extractDestinationAndDays(message);
      const title = `${destination} ${days}日游`;

      const tripData = {
        title,
        destination,
        start_date: new Date().toISOString().split('T')[0],
        end_date: new Date(Date.now() + (days - 1) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        description: message.text,
        cover_image: '/trip-cover.png', // 使用本地封面图
        source_link: message.sourceLink, // 保存原文链接
        attractions: message.attractions || [] // 添加景点数据
      };

      const response = await tripApi.createTrip(tripData);

      if (response.success && response.data) {
        // 标记已添加（仅在当前会话有效）
        setAddedToTrips(prev => new Set([...prev, message.id]));

        // 刷新行程列表
        await fetchUserTrips();

        // 显示行程创建成功弹窗
        const trip = convertTripToTravelPlan(response.data);
        setTripSuccessModal({ visible: true, trip });
      } else {
        showToast(`创建失败：${response.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('创建行程失败:', error);
      showToast('网络错误，请稍后重试');
    } finally {
      // 恢复滚动位置并解除保护
      setTimeout(() => {
        if (chatScrollRef.current) {
          chatScrollRef.current.scrollTop = savedScrollPosition.current;
        }
        isPreservingScroll.current = false;
      }, 100);
    }
  }, [addedToTrips, extractDestinationAndDays, fetchUserTrips, convertTripToTravelPlan, handleViewTripDetail, showToast, showToastWithAction]);

  // 登录和注册页面组件已移除，现在使用弹窗形式

  // 返回主页面处理函数
  const handleBackToMain = useCallback(() => {
    setCurrentScreen('main');
  }, []);

  // 编辑个人信息页面
  const EditProfileScreen = () => {
    // 获取当前昵称（优先使用用户登录信息的昵称）
    const getCurrentNickname = () => {
      if (isAuthenticated && user?.nickname) {
        return user.nickname;
      }
      return userProfile.nickname;
    };

    // 使用当前昵称初始化本地状态
    const [localNickname, setLocalNickname] = useState(getCurrentNickname());
    // 头像预览状态
    const [avatarPreview, setAvatarPreview] = useState<string>('');
    
    // 文件选择器引用
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 本地昵称输入处理
    const handleLocalNicknameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setLocalNickname(newValue);
    };

    // 头像点击处理
    const handleAvatarClick = () => {
      fileInputRef.current?.click();
    };

    // 文件选择处理
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // 检查文件类型
      const allowedTypes = ['image/png', 'image/jpg', 'image/jpeg'];
      if (!allowedTypes.includes(file.type)) {
        showToast('请选择 PNG 或 JPG 格式的图片');
        return;
      }

      // 检查文件大小（限制为5MB）
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        showToast('图片大小不能超过 5MB');
        return;
      }

      // 创建预览URL
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        setAvatarPreview(result);
      };
      reader.readAsDataURL(file);
    };

    // 重新定义保存函数，使用本地状态
    const handleSaveWithLocalState = async () => {
      const newNickname = localNickname.trim() || getCurrentNickname();
      const newAvatar = avatarPreview || userProfile.avatar;

      // 更新本地用户资料状态
      setUserProfile({
        ...userProfile,
        nickname: newNickname,
        avatar: newAvatar
      });

      // 如果用户已登录，同时更新 UserContext 中的用户信息
      if (isAuthenticated && user) {
        await updateUser({
          nickname: newNickname,
          avatar: newAvatar // 使用 newAvatar 而不是条件性的 avatarPreview
        });
      }

      setCurrentScreen('main');
      showToast('个人信息已保存');
    };

    return (
      <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
        {/* 头部 */}
        <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-center relative">
          <button
            onClick={handleBackToMain}
            className="absolute left-4 text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">编辑资料</h2>
          <button
            onClick={handleSaveWithLocalState}
            className="absolute right-4 text-purple-500 font-medium px-4 py-2 hover:bg-purple-50 rounded-lg transition-colors"
          >
            保存
          </button>
        </div>

        <div className="flex-1 p-6">
          {/* 头像编辑 */}
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <img 
                src={avatarPreview || userProfile.avatar || "./默认头像-1.png"} 
                alt="用户头像" 
                className="w-24 h-24 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity"
                onClick={handleAvatarClick}
              />
              <button 
                onClick={handleAvatarClick}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-purple-600 transition-colors"
              >
                <Camera className="w-4 h-4" />
              </button>
              
              {/* 隐藏的文件输入框 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpg,image/jpeg"
                onChange={handleFileChange}
                className="hidden"
                capture="environment" // 在移动设备上优先使用后置摄像头
              />
            </div>
            <p className="text-gray-500 text-sm mt-2">点击更换头像</p>
            {avatarPreview && (
              <p className="text-purple-500 text-xs mt-1">已选择新头像，保存后生效</p>
            )}
          </div>

          {/* 昵称编辑 */}
          <div className="space-y-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">昵称</label>
              <input
                type="text"
                value={localNickname}
                onChange={handleLocalNicknameChange}
                placeholder="请输入昵称"
                className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-gray-700 font-medium mb-2">手机号</label>
              <input
                type="tel"
                value={user?.phone || '未设置'}
                disabled
                className="w-full px-4 py-4 bg-gray-100 border border-gray-200 rounded-2xl text-gray-500 text-lg"
              />
              <p className="text-gray-400 text-sm mt-1">手机号不可修改</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 关于我们页面
  const AboutScreen = () => (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-center relative">
        <button
          onClick={() => setShowAbout(false)}
          className="absolute left-4 text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">关于我们</h2>
      </div>

      <div className="flex-1 p-6">
        <div className="bg-gray-50 rounded-2xl p-4 mb-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <img
                src="/logo.png"
                alt="AI赛博旅伴"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h3 className="text-lg font-bold text-gray-800 mb-2">AI赛博旅伴</h3>
            <p className="text-gray-500">您的智能旅行助手</p>
          </div>

          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              AI赛博旅伴是一款专为旅行爱好者打造的智能助手应用。我们致力于为用户提供最便捷、最智能的旅行规划服务。
            </p>
            
            <div className="bg-white rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-2">🎯 核心功能</h4>
              <ul className="space-y-1 text-sm">
                <li>• 🔗 智能解析旅行链接，提取景点信息</li>
                <li>• 📍 个性化旅行路线规划</li>
                <li>• 🗺️ 可视化地图展示和导航</li>
                <li>• 💡 当地特色推荐和隐藏美食发现</li>
              </ul>
            </div>

            <div className="bg-white rounded-xl p-4">
              <h4 className="font-semibold text-gray-800 mb-2">✨ 产品特色</h4>
              <ul className="space-y-1 text-sm">
                <li>• 🤖 AI智能对话，理解您的旅行需求</li>
                <li>• 📱 移动端优化，随时随地使用</li>
                <li>• 🎨 简洁美观的界面设计</li>
                <li>• 🔄 实时同步，多设备无缝切换</li>
              </ul>
            </div>

            <p className="text-center text-gray-500 text-sm mt-6">
              让AI成为您最贴心的旅行伙伴
            </p>
          </div>
        </div>
      </div>
    </div>
  );


  // 聊天页面
  const ChatScreen = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white max-w-md mx-auto">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4 flex items-center justify-between relative">
        {/* 历史对话按钮 */}
        <button
          onClick={() => setShowConversationHistory(true)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          title="对话历史"
        >
          <Menu className="w-5 h-5 text-gray-600" />
        </button>

        {/* 标题 */}
        <div className="flex items-center gap-2 flex-1 justify-center">
          <img src="/logo.png" alt="Logo" className="w-6 h-6" />
          <h2 className="font-semibold text-gray-800 text-lg truncate max-w-32">
            对话
          </h2>
        </div>

        {/* 新对话按钮 */}
        <button
          onClick={handleNewConversation}
          className="p-2 hover:bg-purple-50 rounded-full transition-colors"
          title="新建对话"
        >
          <PlusCircle className="w-5 h-5 text-purple-600" />
        </button>
      </div>

      {/* 消息列表 */}
      <div 
        ref={chatScrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4 custom-scrollbar"
      >
        {messages.map((message) => (
          <div key={message.id} className="space-y-2">
            {!message.isWelcome && (
              <div className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}>
                <p className="text-xs text-gray-400">
                  {message.timestamp.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
            <div className={`flex ${message.isAI ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] min-w-0 ${
                message.isAI 
                  ? message.isWelcome
                    ? 'bg-white border border-gray-200 shadow-sm'
                    : 'bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-md'
                  : 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
              } rounded-2xl px-4 py-3`}>
                <p className={`text-sm whitespace-pre-line leading-relaxed break-words overflow-wrap-anywhere ${
                  message.isAI 
                    ? message.isWelcome 
                      ? 'text-gray-700' 
                      : 'text-gray-700' 
                    : 'text-left'
                }`}>{message.text}</p>
              </div>
            </div>
            {message.isAI && isItineraryContent(message) && (
              <div className="ml-4">
                <button
                  onClick={() => handleAddToTrip(message)}
                  disabled={addedToTrips.has(message.id)}
                  className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                    addedToTrips.has(message.id)
                      ? 'text-gray-400 bg-gray-100 cursor-not-allowed'
                      : 'text-purple-500 bg-purple-50 hover:bg-purple-100 border border-purple-200'
                  }`}
                >
                  {addedToTrips.has(message.id) ? <Check className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
                  {addedToTrips.has(message.id) ? '已添加' : '添加至行程'}
                </button>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md border border-gray-200/50">
              <div className="flex flex-col items-start gap-2">
                <div className="text-sm text-gray-600 font-medium">
                  主人，我正在快速转动我的大脑
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200/50 p-4 safe-area-bottom">
        <ChatInput
          key="chat-input-persistent"
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </div>
  );

  // 行程页面（原地图页面）
  const ItineraryScreen = () => {
    // 滑动删除状态
    const [swipeStates, setSwipeStates] = useState<{ [key: string]: { offset: number; isDeleting: boolean } }>({});
    const touchStartX = useRef<number>(0);
    const touchStartY = useRef<number>(0);
    const currentTouchX = useRef<number>(0);
    const isDragging = useRef<boolean>(false);
    const dragDirection = useRef<'horizontal' | 'vertical' | null>(null);

    // 处理触摸开始
    const handleTouchStart = (e: React.TouchEvent, tripId: string) => {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      currentTouchX.current = e.touches[0].clientX;
      isDragging.current = false;
      dragDirection.current = null;
    };

    // 处理触摸移动
    const handleTouchMove = (e: React.TouchEvent, tripId: string) => {
      if (!touchStartX.current) return;

      const deltaX = e.touches[0].clientX - touchStartX.current;
      const deltaY = e.touches[0].clientY - touchStartY.current;
      currentTouchX.current = e.touches[0].clientX;

      // 确定拖拽方向
      if (!isDragging.current && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
        isDragging.current = true;
        dragDirection.current = Math.abs(deltaX) > Math.abs(deltaY) ? 'horizontal' : 'vertical';
      }

      // 只处理水平滑动
      if (dragDirection.current === 'horizontal') {
        e.preventDefault(); // 阻止页面滚动

        // 只允许向左滑动
        const offset = Math.min(0, deltaX);
        setSwipeStates(prev => ({
          ...prev,
          [tripId]: { offset, isDeleting: false }
        }));
      }
    };

    // 处理触摸结束
    const handleTouchEnd = (tripId: string) => {
      if (!isDragging.current || dragDirection.current !== 'horizontal') {
        // 重置状态
        setSwipeStates(prev => ({
          ...prev,
          [tripId]: { offset: 0, isDeleting: false }
        }));
        return;
      }

      const currentState = swipeStates[tripId];
      const offset = currentState?.offset || 0;

      if (offset < -80) {
        // 滑动距离超过80px，显示删除按钮
        setSwipeStates(prev => ({
          ...prev,
          [tripId]: { offset: -100, isDeleting: false }
        }));
      } else {
        // 否则回弹
        setSwipeStates(prev => ({
          ...prev,
          [tripId]: { offset: 0, isDeleting: false }
        }));
      }

      touchStartX.current = 0;
      isDragging.current = false;
      dragDirection.current = null;
    };

    // 处理删除操作
    const handleDelete = async (tripId: string) => {
      setSwipeStates(prev => ({
        ...prev,
        [tripId]: { ...prev[tripId], isDeleting: true }
      }));

      try {
        await handleDeleteTrip(tripId);
        // 删除成功后清除状态
        setSwipeStates(prev => {
          const newState = { ...prev };
          delete newState[tripId];
          return newState;
        });
      } catch (error) {
        // 删除失败，恢复状态
        setSwipeStates(prev => ({
          ...prev,
          [tripId]: { offset: 0, isDeleting: false }
        }));
      }
    };

    // 处理点击行程项
    const handleTripClick = (plan: TravelPlan) => {
      const currentState = swipeStates[plan.id];
      if (currentState?.offset !== 0) {
        // 如果当前有滑动偏移，先重置
        setSwipeStates(prev => ({
          ...prev,
          [plan.id]: { offset: 0, isDeleting: false }
        }));
      } else {
        // 否则打开详情页
        handleViewTripDetail(plan);
      }
    };

    return (
      <div className="flex flex-col h-full bg-white max-w-md mx-auto">
        {/* 头部 */}
        <div className="bg-white border-b border-gray-100 px-4 py-4">
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/logo.png" alt="Logo" className="w-6 h-6" />
            <h2 className="font-semibold text-gray-800 text-lg">行程</h2>
          </div>
        </div>

        {/* 规划中页面 - 添加登录状态检查 */}
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            {isAuthenticated && travelPlans
              .filter(plan => plan.status === 'planning')
              .map((plan) => {
                const swipeState = swipeStates[plan.id] || { offset: 0, isDeleting: false };

                return (
                  <div
                    key={plan.id}
                    className="relative overflow-hidden rounded-2xl"
                  >
                    {/* 删除按钮背景 */}
                    <div className="absolute right-0 top-0 h-full flex items-center justify-center bg-red-500 text-white font-medium px-6 rounded-2xl">
                      <Trash2 className="w-5 h-5" />
                    </div>

                    {/* 行程项 */}
                    <div
                      className="bg-gray-50 rounded-2xl p-4 shadow-sm cursor-pointer hover:bg-gray-100 transition-all duration-200 relative"
                      style={{
                        transform: `translateX(${swipeState.offset}px)`,
                        opacity: swipeState.isDeleting ? 0.5 : 1
                      }}
                      onTouchStart={(e) => handleTouchStart(e, plan.id)}
                      onTouchMove={(e) => handleTouchMove(e, plan.id)}
                      onTouchEnd={() => handleTouchEnd(plan.id)}
                      onClick={() => handleTripClick(plan)}
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={plan.image}
                          alt={plan.title}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-800">{plan.title}</h4>
                          <p className="text-sm text-gray-500">{plan.duration} · {plan.locations}个地点</p>
                          <p className="text-xs text-gray-400 mt-1">创建于 {plan.createdAt}</p>
                        </div>
                      </div>
                    </div>

                    {/* 删除按钮 */}
                    {swipeState.offset < -50 && (
                      <button
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-red-500 text-white p-3 rounded-xl font-medium hover:bg-red-600 transition-colors z-10 flex items-center justify-center"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(plan.id);
                        }}
                        disabled={swipeState.isDeleting}
                      >
                        {swipeState.isDeleting ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}

            {(!isAuthenticated || travelPlans.filter(plan => plan.status === 'planning').length === 0) && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 mb-4">
                  {isAuthenticated
                    ? (isLoadingTrips ? '正在加载行程数据...' : '暂无规划中的行程')
                    : '请登录查看您的行程'
                  }
                </p>
                {!isAuthenticated && (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="px-6 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
                  >
                    立即登录
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 我的页面
  const ProfileScreen = () => (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <img src="/logo.png" alt="Logo" className="w-6 h-6" />
          <h2 className="font-semibold text-gray-800 text-lg">我的</h2>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
        {/* 用户信息 */}
        <div 
          className={`bg-gray-50 rounded-2xl p-4 mb-6 ${
            !isAuthenticated ? 'cursor-pointer hover:bg-gray-100 transition-colors' : ''
          }`}
          onClick={() => {
            if (!isAuthenticated) {
              setShowLoginModal(true);
            }
          }}
        >
          <div className="flex items-center gap-4">
            <img
              src={(isAuthenticated && user?.avatar) || userProfile.avatar || "./默认头像-1.png"}
              alt="用户头像"
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-lg">
                {isAuthenticated && user ? (user.nickname || userProfile.nickname) : '未登录用户'}
              </h3>
              <p className="text-gray-500 text-sm">
                {isAuthenticated && user ? user.phone : '点击登录以享受完整服务'}
              </p>
            </div>
            {isAuthenticated ? (
              <button 
                onClick={(e) => {
                  e.stopPropagation(); // 防止触发父元素的点击事件
                  handleEditProfile();
                }}
                className="text-gray-400 p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Edit3 className="w-5 h-5" />
              </button>
            ) : (
              <div className="text-purple-500 text-sm font-medium">
                点击登录
              </div>
            )}
          </div>
        </div>

        {/* 设置选项 */}
        <div className="bg-gray-50 rounded-2xl p-2 mb-6">
          <div className="space-y-1">
            <button 
              onClick={() => setShowAbout(true)}
              className="w-full flex items-center gap-3 p-3 hover:bg-white rounded-xl transition-colors"
            >
              <span className="text-gray-500 text-base">ℹ️</span>
              <span className="text-gray-800">关于我们</span>
              <div className="ml-auto text-gray-400">›</div>
            </button>
          </div>
        </div>

        {/* 退出登录 - 仅登录状态下显示 */}
        {isAuthenticated && (
          <div className="text-center mb-8">
            <button
              onClick={handleLogout}
              className="text-red-500 font-medium text-lg"
            >
              退出登录
            </button>
          </div>
        )}

        {/* 版本号 */}
        <div className="text-center text-gray-400 text-sm">
          <p>版本 V1.0.0</p>
        </div>
      </div>
    </div>
  );


  // 主应用界面
  const MainScreen = () => (
    <div className="h-screen flex flex-col bg-white max-w-md mx-auto">
      {/* 内容区域 */}
      <div className="flex-1 overflow-hidden">
        {currentTab === 'chat' && <ChatScreen />}
        {currentTab === 'itinerary' && <ItineraryScreen />}
        {currentTab === 'profile' && <ProfileScreen />}
      </div>

      {/* 底部导航 */}
      <div className="bg-white border-t border-gray-100 px-4 py-2 safe-area-bottom">
        <div className="flex justify-around">
          <button
            onClick={() => setCurrentTab('chat')}
            className={`nav-item flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200 ${
              currentTab === 'chat'
                ? 'text-purple-600 bg-purple-50 active'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <MessageCircle className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">对话</span>
          </button>
          <button
            onClick={() => setCurrentTab('itinerary')}
            className={`nav-item flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200 ${
              currentTab === 'itinerary'
                ? 'text-purple-600 bg-purple-50 active'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Map className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">行程</span>
          </button>
          <button
            onClick={() => setCurrentTab('profile')}
            className={`nav-item flex flex-col items-center py-2 px-4 rounded-xl transition-all duration-200 ${
              currentTab === 'profile'
                ? 'text-purple-600 bg-purple-50 active'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <User className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium">我的</span>
          </button>
        </div>
      </div>
    </div>
  );

  // 删除确认弹窗
  const DeleteConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">确认删除</h3>
        <p className="text-gray-600 mb-6 text-center">
          确定要删除「{deleteConfirm.locationName}」吗？
        </p>
        <div className="flex gap-3">
          <button
            onClick={cancelDelete}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmDelete}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  );

  // 根据当前屏幕渲染对应组件
  const LogoutConfirmModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">确认退出</h3>
        <p className="text-gray-600 mb-6 text-center">确定要退出登录吗？</p>
        <div className="flex gap-3">
          <button
            onClick={cancelLogout}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={confirmLogout}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 transition-colors"
          >
            确认退出
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container min-h-screen bg-white">
      {/* 编辑个人信息页面 */}
      {currentScreen === 'editProfile' && <EditProfileScreen />}
      
      {/* 关于我们页面 */}
      {showAbout && <AboutScreen />}
      
      {/* 行程详情页面 */}
      {currentScreen === 'tripDetail' && selectedTrip && (
        <TripDetailPage
          trip={selectedTrip}
          onBack={handleCloseTripDetail}
          onNavigate={navigateToLocation}
          onDelete={handleDeleteTrip}
        />
      )}

      
      {/* 主应用界面 - 默认显示 */}
      {currentScreen === 'main' && !showAbout && <MainScreen />}
      
      {/* 退出确认弹窗 */}
      {showLogoutConfirm && <LogoutConfirmModal />}
      
      {/* 删除确认弹窗 */}
      {deleteConfirm.visible && <DeleteConfirmModal />}
      
      {/* Toast 提示 */}
      {toast.visible && (
        <div 
          className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg text-sm z-[9999] animate-fade-in cursor-pointer hover:bg-opacity-90 transition-colors"
          onClick={() => {
            if (toast.message.includes('查看行程')) {
              // Toast点击事件在showToastWithAction中处理
            }
          }}
        >
          {toast.message}
        </div>
      )}

      {/* 行程创建成功弹窗 */}
      {tripSuccessModal.visible && tripSuccessModal.trip && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">行程创建成功！</h3>
              <p className="text-gray-600 mb-6">
                「{tripSuccessModal.trip.title}」已成功添加到您的行程列表中。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setTripSuccessModal({ visible: false, trip: null })}
                  className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                >
                  继续对话
                </button>
                <button
                  onClick={() => {
                    setTripSuccessModal({ visible: false, trip: null });
                    handleViewTripDetail(tripSuccessModal.trip!);
                  }}
                  className="flex-1 py-3 px-4 bg-purple-500 text-white rounded-xl font-medium hover:bg-purple-600 transition-colors"
                >
                  查看详情
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 登录弹窗 */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onAuthSuccess={() => {
          setShowLoginModal(false);
          showToast('登录成功！');

          // 登录成功后，确保在对话页面并滚动到最后一条消息
          setCurrentTab('chat');

          // 延迟滚动，确保登录状态已更新和DOM已渲染
          setTimeout(() => {
            scrollToBottom(true, true); // 强制滚动到底部，使用平滑滚动
          }, 200);
        }}
      />

      {/* 对话历史 */}
      <ConversationHistory
        isOpen={showConversationHistory}
        onClose={() => setShowConversationHistory(false)}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        currentConversationId={currentConversationId}
      />
    </div>
  );
}

// 包装后的主应用组件
function App() {
  return (
    <UserProvider>
      <AppContent />
    </UserProvider>
  );
}

export default App;