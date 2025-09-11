#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase数据库配置
为AI旅行助手项目提供Supabase数据库连接和操作配置
"""

import os
from typing import Dict, Any, Optional
from dataclasses import dataclass
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

@dataclass
class SupabaseConfig:
    """Supabase配置类"""
    
    # Supabase连接配置
    PROJECT_URL: str = os.getenv('SUPABASE_URL', '')
    PROJECT_KEY: str = os.getenv('SUPABASE_ANON_KEY', '')
    SERVICE_KEY: str = os.getenv('SUPABASE_SERVICE_KEY', '')
    
    # 数据库表配置
    USERS_TABLE: str = 'users'
    CONVERSATIONS_TABLE: str = 'conversations'
    MESSAGES_TABLE: str = 'messages'
    
    # 连接池配置
    MAX_CONNECTIONS: int = 10
    CONNECTION_TIMEOUT: int = 30
    
    # 安全配置
    RLS_ENABLED: bool = True  # Row Level Security
    JWT_SECRET: str = os.getenv('SUPABASE_JWT_SECRET', '')
    
    # 存储配置
    STORAGE_BUCKET: str = 'avatars'
    MAX_FILE_SIZE: int = 5 * 1024 * 1024  # 5MB
    
    def __post_init__(self):
        """配置验证"""
        if not self.PROJECT_URL:
            raise ValueError("SUPABASE_URL环境变量未设置")
        if not self.PROJECT_KEY:
            raise ValueError("SUPABASE_ANON_KEY环境变量未设置")
    
    @property
    def is_configured(self) -> bool:
        """检查配置是否完整"""
        return bool(self.PROJECT_URL and self.PROJECT_KEY)
    
    def get_client_config(self) -> Dict[str, Any]:
        """获取客户端配置"""
        return {
            'url': self.PROJECT_URL,
            'key': self.PROJECT_KEY,
            'options': {
                'schema': 'public',
                'auto_refresh_token': True,
                'persist_session': True,
                'detect_session_in_url': True
            }
        }

# 实例化配置
supabase_config = SupabaseConfig()

# 数据库表结构定义
DATABASE_SCHEMA = {
    'users': {
        'id': 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        'phone': 'varchar(20) UNIQUE NOT NULL',
        'nickname': 'varchar(50) NOT NULL',
        'avatar': 'text',
        'password_hash': 'varchar(255) NOT NULL',
        'is_active': 'boolean DEFAULT true',
        'created_at': 'timestamp with time zone DEFAULT now()',
        'updated_at': 'timestamp with time zone DEFAULT now()',
        'last_login_at': 'timestamp with time zone',
        'login_count': 'integer DEFAULT 0',
        'last_ip': 'varchar(45)',
        'last_user_agent': 'text',
        'deleted_at': 'timestamp with time zone'
    },
    'conversations': {
        'id': 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        'user_id': 'uuid REFERENCES users(id) ON DELETE CASCADE',
        'title': 'varchar(255) NOT NULL',
        'dify_conversation_id': 'varchar(255)',
        'created_at': 'timestamp with time zone DEFAULT now()',
        'updated_at': 'timestamp with time zone DEFAULT now()'
    },
    'messages': {
        'id': 'uuid PRIMARY KEY DEFAULT gen_random_uuid()',
        'conversation_id': 'uuid REFERENCES conversations(id) ON DELETE CASCADE',
        'content': 'text NOT NULL',
        'sender_type': 'varchar(10) NOT NULL CHECK (sender_type IN (\'user\', \'ai\'))',
        'created_at': 'timestamp with time zone DEFAULT now()'
    }
}

# RLS策略定义
RLS_POLICIES = {
    'users': [
        {
            'name': 'Users can view own profile',
            'command': 'SELECT',
            'definition': 'auth.uid() = id'
        },
        {
            'name': 'Users can update own profile',
            'command': 'UPDATE',
            'definition': 'auth.uid() = id'
        }
    ],
    'conversations': [
        {
            'name': 'Users can manage own conversations',
            'command': 'ALL',
            'definition': 'auth.uid() = user_id'
        }
    ],
    'messages': [
        {
            'name': 'Users can access messages in own conversations',
            'command': 'ALL',
            'definition': 'EXISTS (SELECT 1 FROM conversations WHERE conversations.id = conversation_id AND conversations.user_id = auth.uid())'
        }
    ]
}

def validate_supabase_config() -> bool:
    """验证Supabase配置"""
    try:
        return supabase_config.is_configured
    except ValueError as e:
        print(f"❌ Supabase配置错误: {e}")
        return False