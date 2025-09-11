#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试用户登录功能
"""

from utils.supabase_client import supabase_client
from utils.auth_utils import PasswordManager

def test_login():
    """测试登录功能"""
    print("INFO: 开始测试用户登录...")
    
    # 使用刚才注册的用户
    phone = "13900139003"
    password = "test123456"
    
    try:
        # 测试获取用户
        result = supabase_client.get_user_by_phone(phone)
        
        print(f"INFO: 查询结果: success={result.success}")
        if result.success:
            user = result.data
            print(f"INFO: 用户信息: {user['nickname']}")
            
            # 验证密码
            if PasswordManager.verify_password(password, user['password_hash']):
                print("INFO: 密码验证成功")
                return True
            else:
                print("ERROR: 密码验证失败")
                return False
        else:
            print(f"ERROR: 查询用户失败: {result.error}")
            return False
            
    except Exception as e:
        print(f"ERROR: 测试异常: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_login()
    print(f"INFO: 测试完成，成功: {success}")