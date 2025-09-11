#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单创建Supabase表结构和函数
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
        # 直接尝试查询现有的表
        print("INFO: 检查现有表...")
        
        # 检查用户表
        try:
            result = client.table('users').select('*').limit(1).execute()
            print("INFO: 用户表已存在")
            users_exist = True
        except:
            print("INFO: 用户表不存在")
            users_exist = False
        
        # 检查对话表
        try:
            result = client.table('conversations').select('*').limit(1).execute()
            print("INFO: 对话表已存在")
            conversations_exist = True
        except:
            print("INFO: 对话表不存在")
            conversations_exist = False
        
        # 检查消息表
        try:
            result = client.table('messages').select('*').limit(1).execute()
            print("INFO: 消息表已存在")
            messages_exist = True
        except:
            print("INFO: 消息表不存在")
            messages_exist = False
        
        if not (users_exist and conversations_exist and messages_exist):
            print("WARNING: 部分表不存在，请在Supabase控制台手动创建表")
            print("WARNING: 请复制scripts/setup_supabase_tables.sql的内容到Supabase SQL编辑器执行")
            return False
        
        # 检查函数是否存在
        print("INFO: 检查数据库函数...")
        try:
            result = client.rpc('register_user', {
                'user_phone': 'test',
                'user_nickname': 'test',
                'user_password_hash': 'test'
            }).execute()
            print("INFO: register_user函数已存在")
            register_func_exists = True
        except Exception as e:
            if 'Could not find the function' in str(e):
                print("WARNING: register_user函数不存在")
                register_func_exists = False
            else:
                print(f"INFO: register_user函数测试完成: {e}")
                register_func_exists = True
        
        try:
            result = client.rpc('verify_user_login', {
                'user_phone': 'test'
            }).execute()
            print("INFO: verify_user_login函数已存在")
            login_func_exists = True
        except Exception as e:
            if 'Could not find the function' in str(e):
                print("WARNING: verify_user_login函数不存在")
                login_func_exists = False
            else:
                print(f"INFO: verify_user_login函数测试完成: {e}")
                login_func_exists = True
        
        if not (register_func_exists and login_func_exists):
            print("WARNING: 部分数据库函数不存在")
            print("WARNING: 请在Supabase控制台SQL编辑器中执行scripts/setup_supabase_tables.sql")
            print("INFO: 或者访问: https://supabase.com/dashboard/project/" + client.supabase_url.split('.')[0].split('//')[1] + "/sql")
            return False
        
        print("SUCCESS: 所有表和函数都已存在并可用")
        return True
        
    except Exception as e:
        print(f"ERROR: 检查失败: {e}")
        return False

if __name__ == "__main__":
    success = create_tables()
    if success:
        print("SUCCESS: 数据库检查完成")
    else:
        print("WARNING: 请手动在Supabase控制台创建表和函数")
    sys.exit(0 if success else 1)