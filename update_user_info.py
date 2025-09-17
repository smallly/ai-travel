#!/usr/bin/env python3
"""
更新用户信息脚本
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.supabase_client import supabase_client

def update_user_info():
    """更新用户信息"""
    phone = "13016475866"

    print("=== Update User Information ===")
    print(f"Phone: {phone}")

    # 获取用户当前信息
    try:
        result = supabase_client.client.table('users').select('*').eq('phone', phone).execute()

        if not result.data:
            print("User not found")
            return

        user = result.data[0]
        print(f"Current info:")
        print(f"  Nickname: {user.get('nickname')}")
        print(f"  Avatar: {user.get('avatar')}")

        # 获取新的用户信息
        print(f"\nEnter new information (press Enter to keep current):")

        new_nickname = input(f"New nickname (current: {user.get('nickname')}): ").strip()
        if not new_nickname:
            new_nickname = user.get('nickname')

        new_avatar = input(f"New avatar URL (current: {user.get('avatar')}): ").strip()
        if not new_avatar:
            new_avatar = user.get('avatar')

        # 更新用户信息
        update_data = {
            'nickname': new_nickname,
            'avatar': new_avatar,
            'updated_at': 'now()'
        }

        update_result = supabase_client.client.table('users').update(update_data).eq('phone', phone).execute()

        if update_result.data:
            print(f"\nUser information updated successfully!")
            print(f"  New nickname: {new_nickname}")
            print(f"  New avatar: {new_avatar}")
        else:
            print(f"Failed to update user information")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    update_user_info()