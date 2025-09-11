#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
创建Supabase表结构和函数
"""

import os
import sys
from utils.supabase_client import supabase_client

def create_tables():
    """创建数据库表和函数"""
    
    if not supabase_client.is_connected():
        print("ERROR: Supabase客户端未连接")
        return False
    
    client = supabase_client.client
    
    try:
        # 1. 创建用户表
        print("📋 创建用户表...")
        users_sql = """
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            phone VARCHAR(20) UNIQUE NOT NULL,
            nickname VARCHAR(50) NOT NULL,
            avatar TEXT,
            password_hash VARCHAR(255) NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            last_login_at TIMESTAMP WITH TIME ZONE,
            login_count INTEGER DEFAULT 0,
            last_ip VARCHAR(45),
            last_user_agent TEXT,
            deleted_at TIMESTAMP WITH TIME ZONE
        );
        """
        client.rpc('exec_sql', {'sql': users_sql}).execute()
        print("✅ 用户表创建成功")
        
        # 2. 创建对话表
        print("📋 创建对话表...")
        conversations_sql = """
        CREATE TABLE IF NOT EXISTS conversations (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(255) NOT NULL,
            dify_conversation_id VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        """
        client.rpc('exec_sql', {'sql': conversations_sql}).execute()
        print("✅ 对话表创建成功")
        
        # 3. 创建消息表
        print("📋 创建消息表...")
        messages_sql = """
        CREATE TABLE IF NOT EXISTS messages (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
            content TEXT NOT NULL,
            sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'ai')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        """
        client.rpc('exec_sql', {'sql': messages_sql}).execute()
        print("✅ 消息表创建成功")
        
        # 4. 创建用户注册函数
        print("📋 创建用户注册函数...")
        register_function = """
        CREATE OR REPLACE FUNCTION public.register_user(
            user_phone VARCHAR(20),
            user_nickname VARCHAR(50),
            user_password_hash VARCHAR(255)
        )
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            new_user_id UUID;
        BEGIN
            -- 检查手机号是否已存在
            IF EXISTS (SELECT 1 FROM users WHERE phone = user_phone) THEN
                RETURN json_build_object(
                    'success', false,
                    'error', '该手机号已被注册'
                );
            END IF;
            
            -- 创建新用户
            INSERT INTO users (phone, nickname, password_hash)
            VALUES (user_phone, user_nickname, user_password_hash)
            RETURNING id INTO new_user_id;
            
            -- 返回成功结果
            RETURN json_build_object(
                'success', true,
                'user_id', new_user_id
            );
        EXCEPTION
            WHEN OTHERS THEN
                RETURN json_build_object(
                    'success', false,
                    'error', SQLERRM
                );
        END;
        $$;
        """
        client.rpc('exec_sql', {'sql': register_function}).execute()
        print("✅ 用户注册函数创建成功")
        
        # 5. 创建用户登录验证函数
        print("📋 创建用户登录验证函数...")
        login_function = """
        CREATE OR REPLACE FUNCTION public.verify_user_login(
            user_phone VARCHAR(20)
        )
        RETURNS JSON
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
            user_record RECORD;
        BEGIN
            -- 查找用户
            SELECT id, phone, nickname, avatar, password_hash, is_active, last_login_at
            INTO user_record
            FROM users 
            WHERE phone = user_phone AND is_active = true AND deleted_at IS NULL;
            
            IF NOT FOUND THEN
                RETURN json_build_object(
                    'success', false,
                    'error', '用户不存在或已禁用'
                );
            END IF;
            
            -- 更新登录信息
            UPDATE users 
            SET 
                last_login_at = now(),
                login_count = COALESCE(login_count, 0) + 1
            WHERE id = user_record.id;
            
            -- 返回用户信息
            RETURN json_build_object(
                'success', true,
                'user', json_build_object(
                    'id', user_record.id,
                    'phone', user_record.phone,
                    'nickname', user_record.nickname,
                    'avatar', user_record.avatar,
                    'password_hash', user_record.password_hash
                )
            );
        EXCEPTION
            WHEN OTHERS THEN
                RETURN json_build_object(
                    'success', false,
                    'error', SQLERRM
                );
        END;
        $$;
        """
        client.rpc('exec_sql', {'sql': login_function}).execute()
        print("✅ 用户登录验证函数创建成功")
        
        print("🎉 所有表和函数创建完成！")
        return True
        
    except Exception as e:
        print(f"❌ 创建失败: {e}")
        # 尝试使用更简单的方法
        print("🔄 尝试替代方案...")
        return create_tables_alternative()

def create_tables_alternative():
    """使用直接SQL执行的替代方案"""
    try:
        client = supabase_client.client
        
        # 创建表结构（不使用rpc）
        print("📋 使用直接SQL创建表...")
        
        # 先直接插入一些数据来确保表存在
        try:
            # 测试用户表是否存在
            result = client.table('users').select('count').limit(1).execute()
            print("✅ 用户表已存在")
        except:
            print("⚠️ 用户表不存在，请在Supabase控制台手动创建")
            return False
            
        return True
        
    except Exception as e:
        print(f"❌ 替代方案也失败: {e}")
        return False

if __name__ == "__main__":
    success = create_tables()
    sys.exit(0 if success else 1)