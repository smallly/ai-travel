#!/usr/bin/env python3
"""
认证调试脚本 - 检查用户数据和登录流程
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.supabase_client import supabase_client
from utils.auth_utils import PasswordManager

def debug_auth():
    """调试认证问题"""
    print("=== Authentication Debug Script ===")

    # 1. 测试数据库连接
    print("\n1. Testing database connection...")
    conn_test = supabase_client.test_connection()
    if conn_test.success:
        print("OK - Database connected")
    else:
        print(f"FAILED - Database connection: {conn_test.error}")
        return

    # 2. 查看所有用户
    print("\n2. Checking users in database...")
    try:
        result = supabase_client.client.table('users').select('id, phone, nickname, created_at').execute()
        if result.data:
            print(f"Found {len(result.data)} users:")
            for user in result.data:
                print(f"  - ID: {user['id']}, Phone: {user['phone']}, Name: {user['nickname']}, Created: {user['created_at']}")
        else:
            print("NO USERS - Database is empty")
            print("TIP: Register a user first")
    except Exception as e:
        print(f"FAILED - Query users: {str(e)}")

    print("\n=== Debug Complete ===")
    print("Check the output above to see if users exist in database")

if __name__ == '__main__':
    debug_auth()