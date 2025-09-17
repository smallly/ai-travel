#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
部署前检查脚本
检查项目是否已经准备好进行生产环境部署
"""

import os
import sys
import json
import re

def check_file_exists(file_path, description):
    """检查文件是否存在"""
    if os.path.exists(file_path):
        print(f"[OK] {description}: {file_path}")
        return True
    else:
        print(f"[FAIL] {description}: {file_path} - 文件不存在")
        return False

def check_env_vars():
    """检查环境变量配置"""
    print("\n📋 检查环境变量配置...")

    required_vars = [
        'DIFY_API_KEY',
        'SUPABASE_URL',
        'SUPABASE_ANON_KEY',
        'VITE_AMAP_API_KEY'
    ]

    env_file = '.env'
    if not os.path.exists(env_file):
        print(f"❌ {env_file} 文件不存在")
        return False

    with open(env_file, 'r', encoding='utf-8') as f:
        content = f.read()

    missing_vars = []
    for var in required_vars:
        if var not in content:
            missing_vars.append(var)

    if missing_vars:
        print(f"❌ 缺少环境变量: {', '.join(missing_vars)}")
        return False
    else:
        print("✅ 所有必需的环境变量都已配置")
        return True

def check_package_json():
    """检查package.json配置"""
    print("\n📦 检查前端配置...")

    if not os.path.exists('package.json'):
        print("❌ package.json 不存在")
        return False

    with open('package.json', 'r', encoding='utf-8') as f:
        package = json.load(f)

    # 检查必要的脚本
    required_scripts = ['build', 'dev', 'preview']
    scripts = package.get('scripts', {})

    missing_scripts = []
    for script in required_scripts:
        if script not in scripts:
            missing_scripts.append(script)

    if missing_scripts:
        print(f"❌ package.json 缺少脚本: {', '.join(missing_scripts)}")
        return False
    else:
        print("✅ package.json 配置正确")
        return True

def check_api_endpoints():
    """检查API端点配置"""
    print("\n🔗 检查API配置...")

    api_file = 'src/services/api.ts'
    if not os.path.exists(api_file):
        print(f"❌ {api_file} 不存在")
        return False

    with open(api_file, 'r', encoding='utf-8') as f:
        content = f.read()

    # 检查是否有硬编码的localhost
    if 'localhost:5000' in content or '127.0.0.1:5000' in content:
        print("⚠️ 警告: API配置中包含硬编码的localhost地址")
        print("   部署时需要更新为生产环境地址")
    else:
        print("✅ API配置看起来正确")

    return True

def main():
    """主检查函数"""
    print("🚀 AI旅行助手 - 部署前检查")
    print("=" * 50)

    all_good = True

    # 检查必要文件
    print("\n📁 检查必要文件...")
    required_files = [
        ('requirements.txt', 'Python依赖文件'),
        ('Procfile', 'Railway部署配置'),
        ('vercel.json', 'Vercel部署配置'),
        ('runtime.txt', 'Python版本配置'),
        ('.env.production', '生产环境配置'),
        ('src/App.tsx', '前端主文件'),
        ('app.py', '后端主文件')
    ]

    for file_path, description in required_files:
        if not check_file_exists(file_path, description):
            all_good = False

    # 检查配置
    if not check_env_vars():
        all_good = False

    if not check_package_json():
        all_good = False

    if not check_api_endpoints():
        all_good = False

    # 总结
    print("\n" + "=" * 50)
    if all_good:
        print("🎉 检查完成！项目已准备好部署")
        print("\n📋 下一步操作:")
        print("1. 将代码推送到GitHub")
        print("2. 按照 DEPLOYMENT_GUIDE.md 进行部署")
        print("3. 配置微信公众号")
    else:
        print("❌ 发现问题，请修复后再部署")
        print("\n🔧 修复建议:")
        print("1. 检查缺失的文件和配置")
        print("2. 运行 pip freeze > requirements.txt 更新依赖")
        print("3. 确保所有环境变量已正确配置")

    return all_good

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)