#!/usr/bin/env python3
import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

print("=== 环境变量检查 ===")
print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL')}")
print(f"SUPABASE_ANON_KEY: {os.getenv('SUPABASE_ANON_KEY', '')[:50]}...")
print(f"SUPABASE_SERVICE_KEY: {os.getenv('SUPABASE_SERVICE_KEY', '')[:50]}...")