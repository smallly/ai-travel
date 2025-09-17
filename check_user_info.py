#!/usr/bin/env python3
"""
检查用户信息脚本
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.supabase_client import supabase_client

def check_user_info():
    """检查用户详细信息"""
    phone = "13016475866"

    print("=== User Information Check ===")
    print(f"Phone: {phone}")

    # 获取用户完整信息
    try:
        result = supabase_client.client.table('users').select('*').eq('phone', phone).execute()

        if result.data:
            user = result.data[0]
            print(f"\nUser Details:")
            print(f"  ID: {user.get('id')}")
            print(f"  Phone: {user.get('phone')}")
            print(f"  Nickname: {user.get('nickname', 'NULL')}")
            print(f"  Avatar: {user.get('avatar', 'NULL')}")
            print(f"  Email: {user.get('email', 'NULL')}")
            print(f"  Created: {user.get('created_at', 'NULL')}")
            print(f"  Updated: {user.get('updated_at', 'NULL')}")

            # 检查所有字段
            print(f"\nAll fields:")
            for key, value in user.items():
                if key != 'password_hash':  # 不显示密码哈希
                    print(f"  {key}: {value}")

        else:
            print("User not found")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    check_user_info()