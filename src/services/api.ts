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

// 通用请求函数
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
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

export default {
  chatApi,
  locationApi,
  healthApi
};
