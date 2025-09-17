#!/usr/bin/env python3
"""
密码测试脚本 - 检查密码哈希和验证
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.supabase_client import supabase_client
from utils.auth_utils import PasswordManager

def test_password():
    """测试密码验证"""
    phone = "13016475866"

    print("=== Password Test Script ===")
    print(f"Testing phone: {phone}")

    # 获取用户数据
    user_result = supabase_client.get_user_by_phone(phone)
    if not user_result.success:
        print(f"User not found: {user_result.error}")
        return

    user = user_result.data
    stored_hash = user['password_hash']

    print(f"Stored password hash: {stored_hash[:50]}...")
    print(f"Hash type: {type(stored_hash)}")
    print(f"Hash length: {len(stored_hash)}")

    # 检测hash格式
    if stored_hash.startswith('pbkdf2:sha256:'):
        print("Hash format: Werkzeug PBKDF2")
    elif '$' in stored_hash:
        print("Hash format: Custom salt$hash")
    elif len(stored_hash) == 32:
        print("Hash format: MD5")
    else:
        print("Hash format: Unknown")

    # 测试不同密码
    test_passwords = ["123456", "password", "admin", "test", "123"]

    print(f"\nTesting passwords:")
    for pwd in test_passwords:
        try:
            is_valid = PasswordManager.verify_password(pwd, stored_hash)
            status = "VALID" if is_valid else "Invalid"
            print(f"  '{pwd}': {status}")
            if is_valid:
                print(f"  -> Correct password found: '{pwd}'")
                break
        except Exception as e:
            print(f"  '{pwd}': ERROR - {e}")

if __name__ == '__main__':
    test_password()