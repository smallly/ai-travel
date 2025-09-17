#!/usr/bin/env python3
"""
直接修复用户信息和检查对话记录
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.supabase_client import supabase_client

def fix_user_info():
    """修复用户信息"""
    phone = "13016475866"

    print("=== Fixing User Information ===")

    try:
        # 1. 更新用户昵称和头像
        update_data = {
            'nickname': 'zx',  # 改为你的名字
            'avatar': None,    # 清空头像，使用默认
            'updated_at': 'now()'
        }

        update_result = supabase_client.client.table('users').update(update_data).eq('phone', phone).execute()

        if update_result.data:
            print("OK - User information updated successfully!")
            print(f"  New nickname: zx")
            print(f"  Avatar cleared (will use default)")
        else:
            print("FAILED - Update user information failed")

        # 2. 检查对话记录
        print("\n=== Checking Conversation History ===")

        # 获取用户ID
        user_result = supabase_client.client.table('users').select('id').eq('phone', phone).execute()
        if user_result.data:
            user_id = user_result.data[0]['id']
            print(f"User ID: {user_id}")

            # 检查conversations表
            conv_result = supabase_client.client.table('conversations').select('*').eq('user_id', user_id).execute()

            if conv_result.data:
                print(f"Found {len(conv_result.data)} conversations:")
                for conv in conv_result.data:
                    print(f"  - ID: {conv['id']}")
                    print(f"    Title: {conv.get('title', 'Untitled')}")
                    print(f"    Created: {conv.get('created_at')}")
                    print(f"    Updated: {conv.get('updated_at')}")
                    print()
            else:
                print("No conversations found")
                print("This explains why history is empty")

            # 检查messages表
            msg_result = supabase_client.client.table('messages').select('*').eq('user_id', user_id).execute()

            if msg_result.data:
                print(f"Found {len(msg_result.data)} messages:")
                for i, msg in enumerate(msg_result.data[:5]):  # 只显示前5条
                    print(f"  - Message {i+1}: {msg.get('content', '')[:50]}...")
            else:
                print("No messages found")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    fix_user_info()