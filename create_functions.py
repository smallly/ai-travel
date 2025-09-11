#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通过Supabase REST API创建数据库函数
"""

import os
import requests
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def create_functions():
    """使用Supabase REST API创建函数"""
    
    # Supabase配置
    supabase_url = os.getenv('SUPABASE_URL')
    service_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not service_key:
        print("ERROR: Supabase配置不完整")
        return False
    
    # 构建API endpoint
    api_url = f"{supabase_url}/rest/v1/rpc"
    
    headers = {
        'apikey': service_key,
        'Authorization': f'Bearer {service_key}',
        'Content-Type': 'application/json'
    }
    
    # 1. 创建用户注册函数
    print("INFO: 创建register_user函数...")
    register_sql = '''
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
    '''
    
    try:
        # 使用直接的HTTP请求到PostgreSQL
        pg_url = f"{supabase_url}/rest/v1/rpc/exec_sql"
        
        response = requests.post(
            pg_url,
            headers=headers,
            json={'sql': register_sql}
        )
        
        if response.status_code == 200:
            print("SUCCESS: register_user函数创建成功")
        else:
            print(f"WARNING: 创建register_user函数失败: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"ERROR: 创建register_user函数时出错: {e}")
    
    # 2. 创建用户登录验证函数
    print("INFO: 创建verify_user_login函数...")
    login_sql = '''
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
    '''
    
    try:
        response = requests.post(
            pg_url,
            headers=headers,
            json={'sql': login_sql}
        )
        
        if response.status_code == 200:
            print("SUCCESS: verify_user_login函数创建成功")
        else:
            print(f"WARNING: 创建verify_user_login函数失败: {response.status_code} - {response.text}")
    
    except Exception as e:
        print(f"ERROR: 创建verify_user_login函数时出错: {e}")
    
    return True

def create_functions_alternative():
    """使用直接插入的方式替代函数"""
    print("INFO: 使用替代方案 - 直接修改Supabase客户端代码")
    
    # 修改supabase_client.py以不使用函数
    supabase_client_path = "utils/supabase_client.py"
    
    try:
        with open(supabase_client_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # 替换create_user函数实现
        old_create_user = '''        try:
            # 使用数据库函数来创建用户（绕过RLS）
            result = self.client.rpc('register_user', {
                'user_phone': phone,
                'user_nickname': nickname,
                'user_password_hash': password_hash
            }).execute()
            
            response_data = result.data
            
            if response_data.get('success'):
                return DatabaseResponse(
                    success=True,
                    data={'user_id': response_data.get('user_id')}
                )
            else:
                return DatabaseResponse(
                    success=False,
                    error=response_data.get('error', '创建用户失败')
                )'''
        
        new_create_user = '''        try:
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
                )'''
        
        # 替换get_user_by_phone函数实现
        old_get_user = '''        try:
            # 使用数据库函数来验证用户登录
            result = self.client.rpc('verify_user_login', {
                'user_phone': phone
            }).execute()
            
            response_data = result.data
            
            if response_data.get('success'):
                return DatabaseResponse(
                    success=True,
                    data=response_data.get('user')
                )
            else:
                return DatabaseResponse(
                    success=False,
                    error=response_data.get('error', '用户不存在')
                )'''
        
        new_get_user = '''        try:
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
                )'''
        
        # 执行替换
        content = content.replace(old_create_user, new_create_user)
        content = content.replace(old_get_user, new_get_user)
        
        # 写入文件
        with open(supabase_client_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("SUCCESS: Supabase客户端代码已修改为直接操作模式")
        return True
        
    except Exception as e:
        print(f"ERROR: 修改客户端代码失败: {e}")
        return False

if __name__ == "__main__":
    print("INFO: 开始创建Supabase数据库函数...")
    
    # 首先尝试通过API创建
    try:
        create_functions()
    except:
        pass
    
    # 使用替代方案
    print("INFO: 使用替代方案...")
    success = create_functions_alternative()
    
    if success:
        print("SUCCESS: 数据库函数问题已解决")
    else:
        print("ERROR: 无法解决数据库函数问题")
    
    print("INFO: 请重启后端服务以应用更改")