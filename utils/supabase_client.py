#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase客户端工具类
为AI旅行助手提供Supabase数据库操作封装
"""

import os
import json
import logging
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
from dataclasses import dataclass

try:
    from supabase import create_client, Client
    from postgrest.exceptions import APIError
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("WARNING: Supabase library not installed. Run: pip install supabase")

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from supabase_config.supabase_config import supabase_config

@dataclass
class DatabaseResponse:
    """数据库操作响应"""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    count: Optional[int] = None

class SupabaseClient:
    """Supabase数据库客户端"""
    
    def __init__(self):
        """初始化Supabase客户端"""
        self.client: Optional[Client] = None
        self.logger = logging.getLogger(__name__)
        self._initialize_client()
    
    def _initialize_client(self):
        """初始化Supabase连接"""
        if not SUPABASE_AVAILABLE:
            self.logger.error("Supabase library not installed")
            return
        
        try:
            if not supabase_config.is_configured:
                self.logger.error("Supabase configuration incomplete")
                return
            
            config = supabase_config.get_client_config()
            self.client = create_client(config['url'], config['key'])
            self.logger.info("Supabase client initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Supabase client initialization failed: {str(e)}")
            self.client = None
    
    def is_connected(self) -> bool:
        """检查数据库连接状态"""
        return self.client is not None
    
    def test_connection(self) -> DatabaseResponse:
        """测试数据库连接"""
        if not self.is_connected():
            return DatabaseResponse(
                success=False,
                error="Supabase client not initialized"
            )
        
        try:
            # 尝试查询用户表来测试连接
            result = self.client.table('users').select('count').limit(1).execute()
            return DatabaseResponse(
                success=True,
                data={"message": "Supabase connection OK"}
            )
        except Exception as e:
            return DatabaseResponse(
                success=False,
                error=f"Connection test failed: {str(e)}"
            )
    
    # ========== 用户相关操作 ==========
    
    def create_user(self, phone: str, nickname: str, password_hash: str) -> DatabaseResponse:
        """创建用户"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            # 检查用户是否存在
            existing = self.client.table('users').select('phone').eq('phone', phone).execute()
            if existing.data:
                return DatabaseResponse(
                    success=False,
                    error='该手机号已被注册'
                )
            
            # 直接插入用户
            result = self.client.table('users').insert({
                'phone': phone,
                'nickname': nickname,
                'password_hash': password_hash
            }).execute()
            
            if result.data:
                return DatabaseResponse(
                    success=True,
                    data={'user_id': result.data[0]['id']}
                )
            else:
                return DatabaseResponse(
                    success=False,
                    error='创建用户失败'
                )
                
        except Exception as e:
            self.logger.error(f"创建用户失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def get_user_by_phone(self, phone: str) -> DatabaseResponse:
        """根据手机号获取用户"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            # 直接查询用户
            result = self.client.table('users').select('*').eq('phone', phone).eq('is_active', True).is_('deleted_at', 'null').execute()
            
            if result.data:
                user = result.data[0]
                # 更新登录信息
                self.client.table('users').update({
                    'last_login_at': datetime.now().isoformat(),
                    'login_count': user.get('login_count', 0) + 1
                }).eq('id', user['id']).execute()
                
                return DatabaseResponse(
                    success=True,
                    data=user
                )
            else:
                return DatabaseResponse(
                    success=False,
                    error='用户不存在或已禁用'
                )
                
        except Exception as e:
            self.logger.error(f"查询用户失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def get_user_by_id(self, user_id: str) -> DatabaseResponse:
        """根据ID获取用户"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            result = self.client.table('users').select('*').eq('id', user_id).eq('is_active', True).single().execute()
            
            if result.data:
                return DatabaseResponse(success=True, data=result.data)
            else:
                return DatabaseResponse(success=False, error="用户不存在")
                
        except Exception as e:
            self.logger.error(f"查询用户失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def update_user(self, user_id: str, updates: Dict[str, Any]) -> DatabaseResponse:
        """更新用户信息"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            # 添加更新时间
            updates['updated_at'] = datetime.now().isoformat()
            
            result = self.client.table('users').update(updates).eq('id', user_id).execute()
            
            if result.data:
                return DatabaseResponse(success=True, data=result.data[0])
            else:
                return DatabaseResponse(success=False, error="更新用户失败")
                
        except Exception as e:
            self.logger.error(f"更新用户失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    # ========== 对话相关操作 ==========
    
    def create_conversation(self, user_id: str, title: str, dify_conversation_id: Optional[str] = None) -> DatabaseResponse:
        """创建对话"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            conversation_data = {
                'user_id': user_id,
                'title': title,
                'dify_conversation_id': dify_conversation_id
            }
            
            result = self.client.table('conversations').insert(conversation_data).execute()
            
            if result.data:
                return DatabaseResponse(success=True, data=result.data[0])
            else:
                return DatabaseResponse(success=False, error="创建对话失败")
                
        except Exception as e:
            self.logger.error(f"创建对话失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def get_user_conversations(self, user_id: str) -> DatabaseResponse:
        """获取用户的对话列表"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            result = self.client.table('conversations').select('*').eq('user_id', user_id).order('updated_at', desc=True).execute()
            
            return DatabaseResponse(success=True, data=result.data)
                
        except Exception as e:
            self.logger.error(f"获取对话列表失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def get_conversation(self, conversation_id: str, user_id: str) -> DatabaseResponse:
        """获取指定对话"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            result = self.client.table('conversations').select('*').eq('id', conversation_id).eq('user_id', user_id).single().execute()
            
            if result.data:
                return DatabaseResponse(success=True, data=result.data)
            else:
                return DatabaseResponse(success=False, error="对话不存在")
                
        except Exception as e:
            self.logger.error(f"获取对话失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def update_conversation(self, conversation_id: str, updates: Dict[str, Any]) -> DatabaseResponse:
        """更新对话"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            result = self.client.table('conversations').update(updates).eq('id', conversation_id).execute()
            
            if result.data:
                return DatabaseResponse(success=True, data=result.data[0])
            else:
                return DatabaseResponse(success=False, error="更新对话失败")
                
        except Exception as e:
            self.logger.error(f"更新对话失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def delete_conversation(self, conversation_id: str, user_id: str) -> DatabaseResponse:
        """删除对话"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            result = self.client.table('conversations').delete().eq('id', conversation_id).eq('user_id', user_id).execute()
            
            return DatabaseResponse(success=True, data={"message": "对话已删除"})
                
        except Exception as e:
            self.logger.error(f"删除对话失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    # ========== 用户行程相关操作 ==========
    
    def create_trip(self, user_id: str, title: str, destination: str, start_date: str, end_date: str, 
                   budget: Optional[float] = None, cover_image: Optional[str] = None, 
                   description: Optional[str] = None) -> DatabaseResponse:
        """创建用户行程"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            trip_data = {
                'user_id': user_id,
                'title': title,
                'destination': destination,
                'start_date': start_date,
                'end_date': end_date
            }
            
            # 添加可选字段
            if budget is not None:
                trip_data['budget'] = budget
            if cover_image:
                trip_data['cover_image'] = cover_image
            if description:
                trip_data['description'] = description
            
            result = self.client.table('user_trips').insert(trip_data).execute()
            
            if result.data:
                return DatabaseResponse(success=True, data=result.data[0])
            else:
                return DatabaseResponse(success=False, error="创建行程失败")
                
        except Exception as e:
            self.logger.error(f"创建行程失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def get_user_trips(self, user_id: str) -> DatabaseResponse:
        """获取用户的行程列表"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            result = self.client.table('user_trips').select('*').eq('user_id', user_id).order('created_at', desc=True).execute()
            
            return DatabaseResponse(success=True, data=result.data)
                
        except Exception as e:
            self.logger.error(f"获取行程列表失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def get_trip_details(self, trip_id: str, user_id: str) -> DatabaseResponse:
        """获取行程详情及其活动"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            # 获取行程基本信息
            trip_result = self.client.table('user_trips').select('*').eq('id', trip_id).eq('user_id', user_id).single().execute()
            
            if not trip_result.data:
                return DatabaseResponse(success=False, error="行程不存在")
            
            # 获取行程活动
            activities_result = self.client.table('trip_activities').select('*').eq('trip_id', trip_id).order('day_number').order('start_time').execute()
            
            trip_data = trip_result.data
            trip_data['activities'] = activities_result.data
            
            return DatabaseResponse(success=True, data=trip_data)
                
        except Exception as e:
            self.logger.error(f"获取行程详情失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def update_trip(self, trip_id: str, user_id: str, updates: Dict[str, Any]) -> DatabaseResponse:
        """更新行程信息"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            # 添加更新时间
            updates['updated_at'] = datetime.now().isoformat()
            
            result = self.client.table('user_trips').update(updates).eq('id', trip_id).eq('user_id', user_id).execute()
            
            if result.data:
                return DatabaseResponse(success=True, data=result.data[0])
            else:
                return DatabaseResponse(success=False, error="更新行程失败")
                
        except Exception as e:
            self.logger.error(f"更新行程失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def delete_trip(self, trip_id: str, user_id: str) -> DatabaseResponse:
        """删除行程"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            result = self.client.table('user_trips').delete().eq('id', trip_id).eq('user_id', user_id).execute()
            
            return DatabaseResponse(success=True, data={"message": "行程已删除"})
                
        except Exception as e:
            self.logger.error(f"删除行程失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def add_trip_activity(self, trip_id: str, day_number: int, title: str, 
                         description: Optional[str] = None, location: Optional[str] = None,
                         start_time: Optional[str] = None, end_time: Optional[str] = None,
                         estimated_cost: Optional[float] = None, activity_type: str = 'sightseeing') -> DatabaseResponse:
        """添加行程活动"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            activity_data = {
                'trip_id': trip_id,
                'day_number': day_number,
                'title': title,
                'activity_type': activity_type
            }
            
            # 添加可选字段
            if description:
                activity_data['description'] = description
            if location:
                activity_data['location'] = location
            if start_time:
                activity_data['start_time'] = start_time
            if end_time:
                activity_data['end_time'] = end_time
            if estimated_cost is not None:
                activity_data['estimated_cost'] = estimated_cost
            
            result = self.client.table('trip_activities').insert(activity_data).execute()
            
            if result.data:
                return DatabaseResponse(success=True, data=result.data[0])
            else:
                return DatabaseResponse(success=False, error="添加活动失败")
                
        except Exception as e:
            self.logger.error(f"添加活动失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    # ========== 消息相关操作 ==========
    
    def create_message(self, conversation_id: str, content: str, sender_type: str) -> DatabaseResponse:
        """创建消息"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            message_data = {
                'conversation_id': conversation_id,
                'content': content,
                'sender_type': sender_type
            }
            
            result = self.client.table('messages').insert(message_data).execute()
            
            if result.data:
                return DatabaseResponse(success=True, data=result.data[0])
            else:
                return DatabaseResponse(success=False, error="创建消息失败")
                
        except Exception as e:
            self.logger.error(f"创建消息失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))
    
    def get_conversation_messages(self, conversation_id: str) -> DatabaseResponse:
        """获取对话的消息列表"""
        if not self.is_connected():
            return DatabaseResponse(success=False, error="Database not connected")
        
        try:
            result = self.client.table('messages').select('*').eq('conversation_id', conversation_id).order('created_at').execute()
            
            return DatabaseResponse(success=True, data=result.data)
                
        except Exception as e:
            self.logger.error(f"获取消息列表失败: {str(e)}")
            return DatabaseResponse(success=False, error=str(e))

# 创建全局客户端实例
supabase_client = SupabaseClient()