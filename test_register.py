#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试用户注册功能
"""

from utils.supabase_client import supabase_client
from utils.auth_utils import PasswordManager

def test_register():
    """测试注册功能"""
    print("INFO: 开始测试用户注册...")
    
    # 测试数据
    phone = "13900139003"
    nickname = "测试用户3"
    password = "test123456"
    
    # 生成密码哈希
    password_hash = PasswordManager.hash_password(password)
    print(f"INFO: 密码哈希生成成功: {password_hash[:20]}...")
    
    # 测试连接
    if not supabase_client.is_connected():
        print("ERROR: Supabase未连接")
        return False
    
    print("INFO: Supabase连接正常")
    
    try:
        # 测试创建用户
        result = supabase_client.create_user(phone, nickname, password_hash)
        
        print(f"INFO: 注册结果: success={result.success}")
        if result.success:
            print(f"INFO: 用户ID: {result.data}")
        else:
            print(f"ERROR: 注册失败: {result.error}")
        
        return result.success
        
    except Exception as e:
        print(f"ERROR: 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_register()
    print(f"INFO: 测试完成，成功: {success}")