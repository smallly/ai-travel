#!/usr/bin/env python3
# -*- coding: utf-8 -*-

import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def add_missing_columns():
    """尝试添加缺失的列到现有表"""

    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY', os.getenv('SUPABASE_ANON_KEY'))

    if not supabase_url or not supabase_key:
        print("Error: Missing Supabase credentials")
        return False

    try:
        print("Connecting to Supabase...")
        supabase: Client = create_client(supabase_url, supabase_key)

        # 尝试直接查询来测试哪些字段缺失
        print("Testing field access...")

        # 测试基本字段
        try:
            result = supabase.table('user planning').select('id').limit(1).execute()
            print("✓ id field exists")
        except Exception as e:
            print(f"✗ id field issue: {e}")

        # 测试user_id字段
        try:
            result = supabase.table('user planning').select('user_id').limit(1).execute()
            print("✓ user_id field exists")
        except Exception as e:
            print(f"✗ user_id field missing: {e}")

        # 测试cover_image字段
        try:
            result = supabase.table('user planning').select('cover_image').limit(1).execute()
            print("✓ cover_image field exists")
        except Exception as e:
            print(f"✗ cover_image field missing: {e}")

        # 测试其他字段
        required_fields = ['title', 'destination', 'start_date', 'end_date', 'budget', 'status', 'description', 'created_at', 'updated_at']

        for field in required_fields:
            try:
                result = supabase.table('user planning').select(field).limit(1).execute()
                print(f"✓ {field} field exists")
            except Exception as e:
                print(f"✗ {field} field missing: {e}")

        return True

    except Exception as e:
        print(f"Connection error: {e}")
        return False

if __name__ == "__main__":
    print("=== Checking Supabase Table Structure ===")
    add_missing_columns()