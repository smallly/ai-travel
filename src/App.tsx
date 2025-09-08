import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import { chatApi } from './services/api';
import RealMap from './components/RealMap';
import TripDetailPage from './components/TripDetailPage';
import PlanningTripDetail from './components/PlanningTripDetail';
import CompletedTripDetail from './components/CompletedTripDetail';
import { UserProvider, useUser } from './contexts/UserContext';
import LoginModal from './components/LoginModal';
import { 
  MessageCircle, 
  Map, 
  User, 
  Send, 
  ArrowLeft,
  MapPin,
  Calendar,
  Clock,
  Plus,
  Eye,
  EyeOff,
  Mail,
  Trash2,
  Edit3,
  Camera,
  Check,
  Maximize,
  Minimize,
  Lock,
  PlusCircle,
  Phone
} from 'lucide-react';

// 类型定义
interface Message {
  id: string;
  text: string;
  isAI: boolean;
  timestamp: Date;
  attractions?: Attraction[];
  isWelcome?: boolean;
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
}

type Screen = 'login' | 'register' | 'main' | 'editProfile' | 'tripDetail';
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

// 独立的输入框组件，完全隔离在主组件外部
const ChatInput = React.memo<{
  onSendMessage: (message: string) => void;
  disabled: boolean;
}>(({ onSendMessage, disabled }) => {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (inputValue.trim()) {
      onSendMessage(inputValue);
      setInputValue('');
      // 保持焦点
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [inputValue, onSendMessage]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  }, []);

  return (
    <div className="flex gap-3 items-end">
      <div className="flex-1 relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
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
        disabled={!inputValue.trim() || disabled}
        className="bg-gradient-to-r from-purple-500 to-blue-500 text-white p-3 rounded-2xl hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        <Send className="w-5 h-5" />
      </button>
    </div>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数，确保只有真正变化时才重新渲染
  return prevProps.disabled === nextProps.disabled;
});

// 主应用组件（包含认证逻辑）
function AppContent() {
  const { user, isLoading, isAuthenticated } = useUser();
  const [currentScreen, setCurrentScreen] = useState<Screen>('login');
  const [currentTab, setCurrentTab] = useState<Tab>('chat');
  const [currentItineraryTab, setCurrentItineraryTab] = useState<'pending' | 'planning' | 'completed'>('pending');
  const [showPassword, setShowPassword] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
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
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ 
    message: '', 
    visible: false 
  });
  // 登录弹窗状态
  const [showLogin, setShowLogin] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    visible: boolean;
    locationId: string;
    locationName: string;
  }>({ visible: false, locationId: '', locationName: '' });
  
  // 聊天相关状态
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '👋 你好！我是你的AI旅行助手\n\n✨ 我能帮你：\n🔗 解析旅行链接，提取地点信息\n📍 制定个性化旅行计划\n🗺️ 推荐当地特色和美食\n🚗 提供交通住宿建议\n\n发送旅行链接或告诉我你想去哪里吧！',
      isAI: true,
      timestamp: new Date(),
      isWelcome: true
    }
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [addedAttractions, setAddedAttractions] = useState<Set<string>>(new Set());
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [conversations, setConversations] = useState<unknown[]>([]);
  
  // 聊天滚动容器引用
  const chatScrollRef = useRef<HTMLDivElement>(null);
  
  // 滚动位置保护状态
  const savedScrollPosition = useRef<number>(0);
  const isPreservingScroll = useRef<boolean>(false);
  const userScrolledUp = useRef<boolean>(false); // 用户是否手动向上滚动
  const lastScrollTop = useRef<number>(0);
  
  // 保存滚动位置
  const saveScrollPosition = useCallback(() => {
    if (chatScrollRef.current) {
      savedScrollPosition.current = chatScrollRef.current.scrollTop;
      isPreservingScroll.current = true;
    }
  }, []);
  
  // 恢复滚动位置
  const restoreScrollPosition = useCallback(() => {
    if (isPreservingScroll.current && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = savedScrollPosition.current;
    }
  }, []);
  
  // 停止滚动保护
  const stopScrollProtection = useCallback(() => {
    setTimeout(() => {
      isPreservingScroll.current = false;
    }, 1000); // 1秒后停止保护
  }, []);
  
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
  
  const [myLocations, setMyLocations] = useState([
    {
      id: '1',
      name: '北京故宫',
      address: '北京市东城区景山前街4号',
      savedDate: '今天',
      savedTime: Date.now() - 86400000, // 1天前
      coordinates: { x: 30, y: 25 },
      realCoordinates: { lat: 39.9163, lng: 116.3972 }, // 真实经纬度
      color: 'bg-red-500'
    },
    {
      id: '2',
      name: '天安门广场',
      address: '北京市东城区东长安街',
      savedDate: '昨天',
      savedTime: Date.now() - 172800000, // 2天前
      coordinates: { x: 70, y: 50 },
      realCoordinates: { lat: 39.9042, lng: 116.4074 }, // 真实经纬度
      color: 'bg-blue-500'
    },
    {
      id: '3',
      name: '颐和园',
      address: '北京市海淀区新建宫门路19号',
      savedDate: '2天前',
      savedTime: Date.now() - 259200000, // 3天前
      coordinates: { x: 50, y: 75 },
      realCoordinates: { lat: 39.9999, lng: 116.2649 }, // 真实经纬度
      color: 'bg-green-500'
    }
  ]);

  // 示例数据 - 更新包含更多状态和详细信息
  const travelPlans: TravelPlan[] = [
    {
      id: '1',
      title: '青岛三天旅游计划',
      duration: '3天2晚',
      locations: 8,
      image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'upcoming',
      province: '山东省',
      centerCoordinates: { lat: 36.0661, lng: 120.3694 },
      destination: '青岛市',
      startDate: '2024-03-15',
      endDate: '2024-03-17',
      createdAt: '2024-03-01',
      attractionList: [
        {
          id: '1-1',
          name: '青岛栈桥',
          address: '山东省青岛市市南区太平路12号',
          image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
          description: '青岛标志性景点，百年历史的海上桥梁',
          coordinates: { lat: 36.0581, lng: 120.3203 }
        },
        {
          id: '1-2',
          name: '八大关风景区',
          address: '山东省青岛市市南区山海关路',
          image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
          description: '欧式建筑群，青岛最美的地方',
          coordinates: { lat: 36.0458, lng: 120.3331 }
        },
        {
          id: '1-3',
          name: '青岛啤酒博物馆',
          address: '山东省青岛市市北区登州路56-1号',
          image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
          description: '了解青岛啤酒历史，品尝新鲜啤酒',
          coordinates: { lat: 36.0785, lng: 120.3661 }
        }
      ]
    },
    {
      id: '2',
      title: '北京故宫深度游',
      duration: '2天1晚',
      locations: 5,
      image: 'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'completed',
      centerCoordinates: { lat: 39.9163, lng: 116.3972 },
      destination: '北京故宫',
      startDate: '2024-02-10',
      endDate: '2024-02-11',
      createdAt: '2024-02-01',
      attractionList: [
        {
          id: '2-1',
          name: '故宫博物院',
          address: '北京市东城区景山前街4号',
          image: 'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=400',
          description: '明清两代的皇家宫殿，世界文化遗产',
          coordinates: { lat: 39.9163, lng: 116.3972 }
        },
        {
          id: '2-2',
          name: '天安门广场',
          address: '北京市东城区东长安街',
          image: 'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=400',
          description: '世界最大的城市广场，中国象征',
          coordinates: { lat: 39.9042, lng: 116.4074 }
        }
      ]
    },
    {
      id: '3',
      title: '杭州西湖游',
      duration: '1天',
      locations: 6,
      image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'planning',
      province: '浙江省',
      centerCoordinates: { lat: 30.2741, lng: 120.1551 },
      destination: '杭州西湖',
      createdAt: '2024-03-10',
      attractionList: [
        {
          id: '3-1',
          name: '西湖断桥残雪',
          address: '浙江省杭州市西湖区白堤',
          image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
          description: '西湖十景之一，白娘子传说发生地',
          coordinates: { lat: 30.2634, lng: 120.1439 }
        },
        {
          id: '3-2',
          name: '雷峰塔',
          address: '浙江省杭州市西湖区南山路15号',
          image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
          description: '西湖标志性古塔，白娘子传说经典场景',
          coordinates: { lat: 30.2319, lng: 120.1477 }
        }
      ]
    },
    {
      id: '4',
      title: '成都美食之旅',
      duration: '4天3晚',
      locations: 12,
      image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
      status: 'planning',
      province: '四川省',
      centerCoordinates: { lat: 30.5728, lng: 104.0668 },
      destination: '成都市',
      createdAt: '2024-03-12',
      attractionList: [
        {
          id: '4-1',
          name: '宽窄巷子',
          address: '四川省成都市青羊区同仁路以东长顺街以西',
          image: 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
          description: '成都历史文化街区，体验老成都风情',
          coordinates: { lat: 30.6759, lng: 104.0570 }
        }
      ]
    }
  ];

  // 显示toast提示
  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => {
      setToast({ message: '', visible: false });
    }, 2000);
  }, []);

  // 显示删除确认
  const showDeleteConfirm = (locationId: string, locationName: string) => {
    setDeleteConfirm({ visible: true, locationId, locationName });
  };

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

  // 添加景点到行程
  const addToItinerary = useCallback((attraction: Attraction) => {
    // 启动滚动位置保护
    saveScrollPosition();
    
    // 检查是否已经添加过
    if (addedAttractions.has(attraction.id)) {
      showToast('该景点已添加过！');
      stopScrollProtection();
      return;
    }
    
    const newLocation = {
      id: Date.now().toString(),
      name: attraction.name,
      address: attraction.address,
      savedDate: '刚刚',
      savedTime: Date.now(),
      coordinates: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
      realCoordinates: attraction.coordinates // 保存真实坐标
    };
    
    setMyLocations(prev => [...prev, newLocation]);
    setAddedAttractions(prev => new Set([...prev, attraction.id]));
    
    // 显示成功提示
    showToast('已添加到行程！');
    
    // 强制恢复滚动位置并启动保护
    restoreScrollPosition();
    stopScrollProtection();
  }, [addedAttractions, showToast, saveScrollPosition, restoreScrollPosition, stopScrollProtection]);

  // 批量添加到行程
  const addAllToItinerary = useCallback((attractions: Attraction[]) => {
    // 启动滚动位置保护
    saveScrollPosition();
    
    const newAttractions = attractions.filter(attraction => !addedAttractions.has(attraction.id));
    
    if (newAttractions.length === 0) {
      showToast('所有景点都已添加过！');
      stopScrollProtection();
      return;
    }
    
    const newLocations = newAttractions.map((attraction, index) => ({
      id: (Date.now() + index).toString(),
      name: attraction.name,
      address: attraction.address,
      savedDate: '刚刚',
      savedTime: Date.now() + index,
      coordinates: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
      realCoordinates: attraction.coordinates // 保存真实坐标
    }));
    
    setMyLocations(prev => [...prev, ...newLocations]);
    setAddedAttractions(prev => {
      const newSet = new Set(prev);
      newAttractions.forEach(attraction => newSet.add(attraction.id));
      return newSet;
    });
    
    // 显示成功提示
    showToast(`已添加 ${newAttractions.length} 个景点到行程！`);
    
    // 强制恢复滚动位置并启动保护
    restoreScrollPosition();
    stopScrollProtection();
  }, [addedAttractions, showToast, saveScrollPosition, restoreScrollPosition, stopScrollProtection]);

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

  // 登录处理
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentScreen('main');
  };

  // 注册处理
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentScreen('main');
  };

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

  // 发送消息 - 使用 useRef 来避免闭包问题
  const handleSendMessage = useCallback(async (messageText: string) => {
    // 检查用户是否已登录
    if (!isAuthenticated) {
      setShowLogin(true);
      return;
    }

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
        // 更新对话ID
        if (!conversationIdRef.current) {
          setCurrentConversationId(response.data.conversation_id);
        }

        // 添加AI回复
        const aiMessage: Message = {
          id: response.data.ai_message.id,
          text: cleanAIText(response.data.ai_message.content),
          isAI: true,
          timestamp: new Date(response.data.ai_message.timestamp),
          attractions: response.data.attractions || []
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        // 显示错误消息
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: `抱歉，服务暂时不可用：${response.error || '未知错误'}`,
          isAI: true,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error: unknown) {
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
  }, [isAuthenticated, cleanAIText]);

  // 初始化用户认证状态
  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        setCurrentScreen('main');
        setCurrentTab('chat');
      } else {
        setCurrentScreen('main'); // 直接进入主界面，但需要在发送消息时检查登录状态
        setCurrentTab('chat');
      }
    }
  }, [isLoading, isAuthenticated]);

  // 使用 useRef 来保持最新的状态引用
  const conversationIdRef = useRef(currentConversationId);
  conversationIdRef.current = currentConversationId;

  // 编辑个人信息
  const handleEditProfile = () => {
    setEditProfile({
      nickname: userProfile.nickname,
      avatar: userProfile.avatar
    });
    setCurrentScreen('editProfile');
  };

  // 保存个人信息
  const handleSaveProfile = () => {
    setUserProfile({
      ...userProfile,
      nickname: editProfile.nickname || userProfile.nickname,
      avatar: editProfile.avatar || userProfile.avatar
    });
    setCurrentScreen('main');
  };

  // 查看行程详情
  const handleViewTripDetail = (trip: TravelPlan) => {
    setSelectedTrip(trip);
    setCurrentScreen('tripDetail');
  };

  // 关闭行程详情
  const handleCloseTripDetail = () => {
    setCurrentScreen('main');
    setSelectedTrip(null);
  };

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
    
    // 清理本地存储
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user_data');
    
    // 重置用户状态
    if (user?.logout) {
      user.logout();
    }
    
    setShowLogoutConfirm(false);
    setCurrentScreen('main'); // 返回主界面，但用户将处于未登录状态
    showToast('已退出登录');
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // 登录页面
  const LoginScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col relative overflow-hidden max-w-md mx-auto">
      {/* 背景装饰 */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-purple-400 to-purple-600 opacity-10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-16 w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 opacity-10 rounded-full blur-lg"></div>
        <div className="absolute bottom-32 left-20 w-40 h-40 bg-gradient-to-r from-blue-400 to-purple-400 opacity-5 rounded-full blur-2xl"></div>
      </div>
      
      <div className="flex-1 flex flex-col justify-center px-8 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-800 mb-3 tracking-tight">AI赛博旅伴</h1>
          <p className="text-gray-600 text-lg">您的智能旅行助手</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <FormInput
              type="tel"
              placeholder="请输入手机号"
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800 placeholder-gray-400"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <FormInput
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              className="w-full pl-12 pr-14 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95"
          >
            登录
          </button>
        </form>

        <div className="text-center mt-8">
          <button
            onClick={() => setCurrentScreen('register')}
            className="text-purple-500 hover:text-purple-600 transition-colors"
          >
            还没有账号？立即注册
          </button>
        </div>
      </div>
    </div>
  );

  // 注册页面
  const RegisterScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex flex-col relative overflow-hidden max-w-md mx-auto">
      {/* 背景装饰 */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-32 h-32 bg-gradient-to-r from-purple-400 to-purple-600 opacity-10 rounded-full blur-xl"></div>
        <div className="absolute top-40 right-16 w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 opacity-10 rounded-full blur-lg"></div>
        <div className="absolute bottom-32 left-20 w-40 h-40 bg-gradient-to-r from-blue-400 to-purple-400 opacity-5 rounded-full blur-2xl"></div>
      </div>

      <div className="flex items-center justify-center p-6 relative z-10">
        <button
          onClick={() => setCurrentScreen('login')}
          className="absolute left-6 text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold text-gray-800">注册账号</h2>
      </div>

      <div className="flex-1 px-8 py-4 relative z-10">
        <form onSubmit={handleRegister} className="space-y-5">
          <div className="relative">
            <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <FormInput
              type="tel"
              placeholder="请输入手机号"
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800 placeholder-gray-400"
            />
          </div>

          <div className="flex gap-3">
            <div className="flex-1 relative">
              <div className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"/>
                  <path d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"/>
                </svg>
              </div>
              <FormInput
                type="text"
                placeholder="验证码"
                className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800 placeholder-gray-400"
              />
            </div>
            <button
              type="button"
              className="px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl hover:shadow-lg transition-all font-medium"
            >
              获取验证码
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <FormInput
              type={showPassword ? 'text' : 'password'}
              placeholder="请设置密码"
              className="w-full pl-12 pr-14 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800 placeholder-gray-400"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <FormInput
              type="password"
              placeholder="确认密码"
              className="w-full pl-12 pr-4 py-3 bg-white rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-gray-800 placeholder-gray-400"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 mt-8"
          >
            注册
          </button>
        </form>
      </div>
    </div>
  );

  // 编辑个人信息页面
  const EditProfileScreen = () => (
    <div className="min-h-screen bg-white flex flex-col max-w-md mx-auto">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-center relative">
        <button
          onClick={() => setCurrentScreen('main')}
          className="absolute left-4 text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-semibold text-gray-800">编辑资料</h2>
        <button
          onClick={handleSaveProfile}
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
              src="./默认头像-1.png" 
              alt="用户头像" 
              className="w-24 h-24 rounded-full object-cover"
            />
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center shadow-lg">
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-2">点击更换头像</p>
        </div>

        {/* 昵称编辑 */}
        <div className="space-y-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">昵称</label>
            <FormInput
              type="text"
              placeholder={userProfile.nickname}
              className="w-full px-4 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
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
            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🤖</span>
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

  // 景点卡片组件
  const AttractionCard = ({ attraction, onAddToItinerary, isAdded }: { attraction: Attraction; onAddToItinerary?: (attraction: Attraction) => void; isAdded?: boolean }) => {
    // 添加调试日志
    console.log('AttractionCard 接收到的数据:', attraction);
    
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-3">
        <div className="flex gap-3">
          <img
            src={attraction.image}
            alt={attraction.name || '景点图片'}
            className="w-16 h-16 rounded-xl object-cover"
          />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-1">{attraction.name || '未知地点'}</h4>
            <p className="text-sm text-gray-500 mb-2">{attraction.address}</p>
            <div className="flex items-center justify-between gap-2">
              <div></div>
              <div className="flex gap-2">
                <button 
                  onClick={() => navigateToLocation(attraction.address, attraction.coordinates)}
                  className="text-green-500 text-sm font-medium px-2 py-1 bg-green-50 rounded-lg hover:bg-green-100 transition-colors flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" />
                  导航
                </button>
                {onAddToItinerary && (
                  <button 
                    onClick={() => !isAdded && onAddToItinerary(attraction)}
                    disabled={isAdded}
                    className={`text-sm font-medium px-2 py-1 rounded-lg transition-colors flex items-center gap-1 ${
                      isAdded 
                        ? 'text-gray-400 bg-gray-100 cursor-not-allowed' 
                        : 'text-purple-500 bg-purple-50 hover:bg-purple-100'
                    }`}
                  >
                    {isAdded ? <Check className="w-3 h-3" /> : <PlusCircle className="w-3 h-3" />}
                    {isAdded ? '已添加' : '添加至行程'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 聊天页面
  const ChatScreen = () => (
    <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white max-w-md mx-auto">
      {/* 头部 */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4 flex items-center justify-center relative">
        <h2 className="font-semibold text-gray-800 text-lg">对话</h2>
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
            {message.attractions && message.attractions.length > 0 && (
              <div className="ml-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">发现 {message.attractions.length} 个景点</span>
                  <button 
                    onClick={() => addAllToItinerary(message.attractions!)}
                    className="text-purple-500 text-sm font-medium px-3 py-1 bg-white/80 backdrop-blur-sm rounded-lg hover:bg-purple-50 transition-colors flex items-center gap-1 shadow-sm border border-purple-100"
                  >
                    <Plus className="w-3 h-3" />
                    批量添加
                  </button>
                </div>
                <div className="space-y-2">
                  {message.attractions.map((attraction) => (
                    <AttractionCard 
                      key={attraction.id} 
                      attraction={attraction} 
                      onAddToItinerary={addToItinerary}
                      isAdded={addedAttractions.has(attraction.id)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3 shadow-md border border-gray-200/50">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 输入区域 */}
      <div className="bg-white/90 backdrop-blur-sm border-t border-gray-200/50 p-4 safe-area-bottom">
        <ChatInput onSendMessage={handleSendMessage} disabled={isTyping} />
      </div>
    </div>
  );

  // 行程页面（原地图页面）
  const ItineraryScreen = () => (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <h2 className="font-semibold text-gray-800 text-lg">行程</h2>
        </div>
        
        {/* Tab切换 */}
        <div className="flex bg-purple-50 rounded-xl p-1">
          <button
            onClick={() => setCurrentItineraryTab('pending')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              currentItineraryTab === 'pending' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600'
            }`}
          >
            待出行
          </button>
          <button
            onClick={() => setCurrentItineraryTab('planning')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              currentItineraryTab === 'planning' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600'
            }`}
          >
            规划中
          </button>
          <button
            onClick={() => setCurrentItineraryTab('completed')}
            className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
              currentItineraryTab === 'completed' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-600'
            }`}
          >
            已出行
          </button>
        </div>
      </div>

      {/* 待出行页面 */}
      {currentItineraryTab === 'pending' && (
        <>
          {/* 地图区域 */}
          <div className={`relative ${isMapFullscreen ? 'fixed inset-0 z-50' : 'h-64'} overflow-hidden transition-all duration-300`}>
            {/* 真实地图组件 */}
            <RealMap 
              locations={myLocations}
              className="absolute inset-0 w-full h-full"
              onLocationClick={(location) => {
                // 点击地点标记时的处理
                console.log('点击了地点:', location.name);
              }}
            />
            
            {/* 地图控制按钮 */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
              <button 
                onClick={() => setIsMapFullscreen(!isMapFullscreen)}
                className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                {isMapFullscreen ? <Minimize className="w-5 h-5 text-gray-600" /> : <Maximize className="w-5 h-5 text-gray-600" />}
              </button>
            </div>
            
            {/* 全屏状态下的返回按钮 */}
            {isMapFullscreen && (
              <div className="absolute top-4 left-4 z-10">
                <button 
                  onClick={() => setIsMapFullscreen(false)}
                  className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}

            {/* 查看地图按钮 */}
            <div className="absolute bottom-4 left-4 z-10">
              <button 
                onClick={() => {
                  // 如果有地点，导航到第一个地点或所有地点的中心
                  if (myLocations.length > 0) {
                    const firstLocation = myLocations[0];
                    navigateToLocation(firstLocation.address, firstLocation.realCoordinates);
                  } else {
                    // 没有地点时，全屏显示地图
                    setIsMapFullscreen(true);
                  }
                }}
                className="bg-white text-purple-600 px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium shadow-md border border-purple-200 hover:bg-purple-50 transition-colors"
                title={myLocations.length > 0 ? "导航到地点" : "查看地图"}
              >
                <Map className="w-4 h-4" />
                {myLocations.length > 0 ? "导航" : "查看地图"}
              </button>
            </div>
          </div>
          {/* 地点列表 */}
          {!isMapFullscreen && (
            <div className="flex-1 bg-white rounded-t-3xl -mt-4 p-4 relative z-10 overflow-y-auto custom-scrollbar">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-purple-500" />
                <h3 className="font-semibold text-gray-800 text-lg">我的旅行地点</h3>
                <div className="ml-auto text-sm text-gray-500">{myLocations.length}个地点</div>
              </div>

              <div className="space-y-3">
                {myLocations
                  .sort((a, b) => b.savedTime - a.savedTime) // 按保存时间倒序排列
                  .map((location) => (
                  <div key={location.id} className="bg-gray-50 rounded-2xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <img
                        src="https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=400"
                        alt={location.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-800 mb-1">{location.name}</h4>
                        <p className="text-sm text-gray-500 mb-1">{location.address}</p>
                        <p className="text-xs text-gray-400">保存于 {location.savedDate}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => navigateToLocation(location.address, location.realCoordinates)}
                          className="text-green-500 p-2 hover:bg-green-50 rounded-full transition-colors"
                          title="导航到此地点"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => showDeleteConfirm(location.id, location.name)}
                          className="text-red-500 p-2 hover:bg-red-50 rounded-full transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 规划中页面 */}
      {currentItineraryTab === 'planning' && (
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            {travelPlans
              .filter(plan => plan.status === 'planning')
              .map((plan) => (
                <div 
                  key={plan.id} 
                  className="bg-gray-50 rounded-2xl p-4 shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleViewTripDetail(plan)}
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
              ))}
            
            {travelPlans.filter(plan => plan.status === 'planning').length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500">暂无规划中的行程</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 已出行页面 */}
      {currentItineraryTab === 'completed' && (
        <div className="flex-1 p-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-3">
            {travelPlans
              .filter(plan => plan.status === 'completed')
              .map((plan) => (
                <div 
                  key={plan.id} 
                  className="bg-gray-50 rounded-2xl p-4 shadow-sm cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => handleViewTripDetail(plan)}
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
                      <p className="text-xs text-gray-400 mt-1">{plan.startDate} - {plan.endDate}</p>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  // 我的页面
  const ProfileScreen = () => (
    <div className="flex flex-col h-full bg-white max-w-md mx-auto">
      {/* 头部 */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-center gap-3 mb-4">
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
              setShowLogin(true);
            }
          }}
        >
          <div className="flex items-center gap-4">
            <img 
              src="./默认头像-1.png" 
              alt="用户头像" 
              className="w-16 h-16 rounded-full object-cover"
            />
            <div className="flex-1">
              <h3 className="font-semibold text-gray-800 text-lg">
                {isAuthenticated ? user?.nickname : '未登录用户'}
              </h3>
              <p className="text-gray-500 text-sm">
                {isAuthenticated ? user?.phone : '点击登录以享受完整服务'}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
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
      {/* 登录页面 */}
      {currentScreen === 'login' && <LoginScreen />}
      
      {/* 注册页面 */}
      {currentScreen === 'register' && <RegisterScreen />}
      
      {/* 编辑个人信息页面 */}
      {currentScreen === 'editProfile' && <EditProfileScreen />}
      
      {/* 关于我们页面 */}
      {showAbout && <AboutScreen />}
      
      {/* 主应用界面 */}
      {currentScreen === 'main' && !showAbout && <MainScreen />}
      
      {/* 退出确认弹窗 */}
      {showLogoutConfirm && <LogoutConfirmModal />}
      
      {/* 删除确认弹窗 */}
      {deleteConfirm.visible && <DeleteConfirmModal />}
      
      {/* Toast 提示 */}
      {toast.visible && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg text-sm z-50 animate-fade-in">
          {toast.message}
        </div>
      )}

      {/* 登录弹窗 */}
      <LoginModal
        isOpen={showLogin}
        onClose={() => setShowLogin(false)}
        onAuthSuccess={() => {
          setShowLogin(false);
          showToast('登录成功！');
        }}
      />
      
      {/* 行程详情页面 */}
      {currentScreen === 'tripDetail' && selectedTrip && (
        <TripDetailPage 
          trip={selectedTrip}
          onBack={handleCloseTripDetail}
          onNavigate={navigateToLocation}
        />
      )}
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