// API服务配置
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// API响应类型定义
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender_type: 'user' | 'ai';
  created_at: string;
  timestamp: string;
}

export interface ChatResponse {
  conversation_id: string;
  user_message: ChatMessage;
  ai_message: ChatMessage;
  attractions?: Attraction[];
}

export interface Attraction {
  id: string;
  name: string;
  address: string;
  image: string;
  type: string;
}

export interface LocationInfo {
  id: string;
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  type: 'coordinate' | 'address';
}

export interface NavigationLinks {
  amap: string;
  baidu: string;
  tencent: string;
  apple: string;
  google: string;
}

export interface NavigationResponse {
  destination: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  navigationLinks: NavigationLinks;
  timestamp: string;
}

export interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date: string;
  end_date: string;
  budget?: number;
  status: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  cover_image?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface TripActivity {
  id: string;
  trip_id: string;
  day_number: number;
  title: string;
  description?: string;
  location?: string;
  start_time?: string;
  end_time?: string;
  estimated_cost?: number;
  activity_type: 'sightseeing' | 'dining' | 'shopping' | 'entertainment' | 'transportation' | 'accommodation' | 'other';
  created_at: string;
}

export interface TripDetails extends Trip {
  activities?: TripActivity[];
}

// 通用请求函数
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    
    // 获取认证token
    const token = localStorage.getItem('access_token');
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    // 如果有token，添加到请求头
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      headers,
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error(`API请求失败 [${endpoint}]:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败',
      code: 'NETWORK_ERROR'
    };
  }
}

// 聊天API
export const chatApi = {
  // 发送消息
  async sendMessage(message: string, conversationId?: string): Promise<ApiResponse<ChatResponse>> {
    return request<ChatResponse>('/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        message,
        conversation_id: conversationId
      })
    });
  },

  // 检查AI服务状态
  async checkStatus(): Promise<ApiResponse<{ status: string; message: string; timestamp: string }>> {
    return request('/health');
  },

  // 获取对话历史
  async getConversations(): Promise<ApiResponse<any[]>> {
    return request('/conversations');
  },

  // 获取对话消息
  async getMessages(conversationId: string): Promise<ApiResponse<any>> {
    return request(`/conversations/${conversationId}/messages`);
  },

  // 创建新对话
  async createConversation(title?: string): Promise<ApiResponse<any>> {
    return request('/conversations', {
      method: 'POST',
      body: JSON.stringify({ title })
    });
  },

  // 删除对话
  async deleteConversation(conversationId: string): Promise<ApiResponse<any>> {
    return request(`/conversations/${conversationId}`, {
      method: 'DELETE'
    });
  }
};

// 位置API
export const locationApi = {
  // 地理编码
  async geocode(address: string): Promise<ApiResponse<{ address: string; coordinates: { latitude: number; longitude: number }; source: string; timestamp: string }>> {
    return request('/location/geocode', {
      method: 'POST',
      body: JSON.stringify({ address })
    });
  },

  // 逆地理编码
  async reverseGeocode(latitude: number, longitude: number): Promise<ApiResponse<{ coordinates: { latitude: number; longitude: number }; address: string; source: string; timestamp: string }>> {
    return request('/location/reverse-geocode', {
      method: 'POST',
      body: JSON.stringify({ latitude, longitude })
    });
  },

  // 获取导航链接
  async getNavigation(address: string): Promise<ApiResponse<{ address: string; navigation_links: NavigationLinks }>> {
    return request('/locations/navigation', {
      method: 'POST',
      body: JSON.stringify({ address })
    });
  }
};

// 健康检查API
export const healthApi = {
  async check(): Promise<ApiResponse<{ status: string; message: string; timestamp: string }>> {
    return request('/health');
  }
};

// 用户认证API
export const userApi = {
  // 微信网页授权手机号 - 已注释，后续启用时解除注释
  // async wechatPhoneAuth(authCode: string): Promise<ApiResponse<{ token: string; user_id: string; phone: string; nickname: string; avatar: string; created_at: string }>> {
  //   return request('/auth/wechat/phone', {
  //     method: 'POST',
  //     body: JSON.stringify({ auth_code: authCode })
  //   });
  // },

  // 微信小程序手机号授权 - 已注释，后续启用时解除注释
  // async miniProgramPhoneAuth(encryptedData: { encryptedData: string; iv: string; sessionKey: string }): Promise<ApiResponse<{ token: string; user_id: string; phone: string; nickname: string; avatar: string; created_at: string }>> {
  //   return request('/auth/miniprogram/phone', {
  //     method: 'POST',
  //     body: JSON.stringify(encryptedData)
  //   });
  // },

  // 手机号密码登录
  async loginWithPhone(phone: string, password: string): Promise<ApiResponse<{ user: any; access_token: string; refresh_token: string; expires_in: number }>> {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password })
    });
  },

  // 手机号密码注册
  async registerWithPhone(phone: string, password: string, nickname?: string): Promise<ApiResponse<{ user: any; access_token: string; refresh_token: string; expires_in: number }>> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, nickname })
    });
  },

  // 验证用户认证状态
  async verifyAuth(): Promise<ApiResponse<{ user_id: string; phone: string; nickname: string; avatar: string }>> {
    return request('/auth/verify', {
      method: 'GET'
    });
  },

  // 用户登出
  async logout(): Promise<ApiResponse<{ message: string }>> {
    return request('/auth/logout', {
      method: 'POST'
    });
  },

  // 更新用户信息
  async updateProfile(userData: { nickname?: string; avatar?: string }): Promise<ApiResponse<{ user_id: string; phone: string; nickname: string; avatar: string }>> {
    return request('/user/profile', {
      method: 'PUT',
      body: JSON.stringify(userData)
    });
  },

  // 获取用户信息
  async getProfile(): Promise<ApiResponse<{ user_id: string; phone: string; nickname: string; avatar: string; created_at: string }>> {
    return request('/user/profile', {
      method: 'GET'
    });
  },

  // 刷新访问令牌
  async refreshToken(refreshToken: string): Promise<ApiResponse<{ access_token: string; refresh_token: string; expires_in: number }>> {
    return request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken })
    });
  }
};

// 行程管理API
export const tripApi = {
  // 获取用户行程列表
  async getUserTrips(): Promise<ApiResponse<Trip[]>> {
    return request('/trips');
  },

  // 创建新行程
  async createTrip(tripData: {
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    budget?: number;
    cover_image?: string;
    description?: string;
  }): Promise<ApiResponse<Trip>> {
    return request('/trips', {
      method: 'POST',
      body: JSON.stringify(tripData)
    });
  },

  // 获取行程详情
  async getTripDetails(tripId: string): Promise<ApiResponse<TripDetails>> {
    return request(`/trips/${tripId}`);
  },

  // 更新行程信息
  async updateTrip(tripId: string, updates: {
    title?: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
    budget?: number;
    cover_image?: string;
    description?: string;
    status?: 'planned' | 'ongoing' | 'completed' | 'cancelled';
  }): Promise<ApiResponse<Trip>> {
    return request(`/trips/${tripId}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  },

  // 删除行程
  async deleteTrip(tripId: string): Promise<ApiResponse<{ message: string }>> {
    return request(`/trips/${tripId}`, {
      method: 'DELETE'
    });
  },

  // 添加行程活动
  async addTripActivity(tripId: string, activityData: {
    day_number: number;
    title: string;
    description?: string;
    location?: string;
    start_time?: string;
    end_time?: string;
    estimated_cost?: number;
    activity_type?: 'sightseeing' | 'dining' | 'shopping' | 'entertainment' | 'transportation' | 'accommodation' | 'other';
  }): Promise<ApiResponse<TripActivity>> {
    return request(`/trips/${tripId}/activities`, {
      method: 'POST',
      body: JSON.stringify(activityData)
    });
  }
};

export default {
  chatApi,
  locationApi,
  healthApi,
  userApi,
  tripApi
};
