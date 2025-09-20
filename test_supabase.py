#!/usr/bin/env python3
"""
临时Supabase连接测试脚本
"""
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

def test_supabase_connection():
    """测试Supabase连接"""
    print("Testing Supabase connection...")

    # 检查环境变量
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_anon_key = os.getenv('SUPABASE_ANON_KEY')
    supabase_service_key = os.getenv('SUPABASE_SERVICE_KEY')

    print(f"SUPABASE_URL: {supabase_url}")
    print(f"SUPABASE_ANON_KEY: {supabase_anon_key[:50]}..." if supabase_anon_key else "SUPABASE_ANON_KEY: None")
    print(f"SUPABASE_SERVICE_KEY: {supabase_service_key[:50]}..." if supabase_service_key else "SUPABASE_SERVICE_KEY: None")

    if not supabase_url or not supabase_anon_key:
        print("ERROR: Missing required environment variables")
        return False

    try:
        from supabase import create_client

        # 测试ANON KEY连接
        print("\nTesting ANON KEY connection...")
        client_anon = create_client(supabase_url, supabase_anon_key)

        # 尝试简单查询
        try:
            result = client_anon.table('users').select('count').limit(1).execute()
            print("SUCCESS: ANON KEY connection works")
        except Exception as e:
            print(f"ERROR: ANON KEY query failed: {str(e)}")

        # 测试SERVICE KEY连接（如果有的话）
        if supabase_service_key and supabase_service_key != supabase_anon_key:
            print("\nTesting SERVICE KEY connection...")
            client_service = create_client(supabase_url, supabase_service_key)

            try:
                result = client_service.table('users').select('count').limit(1).execute()
                print("SUCCESS: SERVICE KEY connection works")
            except Exception as e:
                print(f"ERROR: SERVICE KEY query failed: {str(e)}")
        else:
            print("\nWARNING: SERVICE KEY not configured or same as ANON KEY")

    except ImportError:
        print("ERROR: Supabase library not installed")
        return False
    except Exception as e:
        print(f"ERROR: Connection test failed: {str(e)}")
        return False

    return True

if __name__ == "__main__":
    test_supabase_connection()