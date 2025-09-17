#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单部署检查脚本
"""

import os

def main():
    print("AI Travel Assistant - Deployment Check")
    print("=" * 50)

    all_good = True

    # 检查必要文件
    print("\nChecking required files...")
    required_files = [
        'requirements.txt',
        'Procfile',
        'vercel.json',
        'runtime.txt',
        '.env.production',
        'src/App.tsx',
        'app.py'
    ]

    for file_path in required_files:
        if os.path.exists(file_path):
            print(f"[OK] {file_path}")
        else:
            print(f"[MISSING] {file_path}")
            all_good = False

    # 检查环境变量
    print("\nChecking environment configuration...")
    if os.path.exists('.env'):
        print("[OK] .env file exists")
        with open('.env', 'r', encoding='utf-8') as f:
            content = f.read()

        required_vars = ['DIFY_API_KEY', 'SUPABASE_URL', 'VITE_AMAP_API_KEY']
        for var in required_vars:
            if var in content:
                print(f"[OK] {var} configured")
            else:
                print(f"[MISSING] {var} not found")
                all_good = False
    else:
        print("[MISSING] .env file")
        all_good = False

    # 总结
    print("\n" + "=" * 50)
    if all_good:
        print("SUCCESS: Project is ready for deployment!")
        print("\nNext steps:")
        print("1. Push code to GitHub")
        print("2. Follow DEPLOYMENT_GUIDE.md")
        print("3. Configure WeChat Official Account")
    else:
        print("ISSUES FOUND: Please fix issues before deployment")

    return all_good

if __name__ == '__main__':
    main()