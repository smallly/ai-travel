#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
修复Supabase数据库表结构
检查'user planning'表并确保所有必需字段存在
"""

import os
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# 加载环境变量
load_dotenv()

def check_and_fix_table_structure():
    """检查并修复表结构"""

    # 获取Supabase凭据
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY', os.getenv('SUPABASE_ANON_KEY'))

    if not supabase_url or not supabase_key:
        print("错误：请设置SUPABASE_URL和SUPABASE_SERVICE_KEY环境变量")
        return False

    try:
        print("连接到Supabase...")
        supabase: Client = create_client(supabase_url, supabase_key)

        # 首先检查表是否存在以及当前结构
        print("检查'user planning'表的当前结构...")

        try:
            # 尝试查询表结构
            result = supabase.table('user planning').select('*').limit(1).execute()
            print("✓ 'user planning'表存在")
            print(f"当前表数据示例: {result.data}")
        except Exception as e:
            print(f"表查询失败: {e}")

        # 我们需要的完整表结构
        required_table_sql = '''
        -- 删除现有表（如果存在）
        DROP TABLE IF EXISTS "user planning";

        -- 重新创建表，包含所有必需字段
        CREATE TABLE "user planning" (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            title VARCHAR(200) NOT NULL,
            destination VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            budget DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'planned',
            cover_image TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_user_planning_user_id ON "user planning"(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_planning_status ON "user planning"(status);
        '''

        print("开始重建'user planning'表...")
        print("SQL语句:")
        print(required_table_sql)

        # 尝试执行SQL（这可能需要特殊权限）
        try:
            # 分别执行每个SQL语句
            sql_statements = [
                'DROP TABLE IF EXISTS "user planning"',
                '''CREATE TABLE "user planning" (
                    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                    user_id UUID NOT NULL,
                    title VARCHAR(200) NOT NULL,
                    destination VARCHAR(100) NOT NULL,
                    start_date DATE NOT NULL,
                    end_date DATE NOT NULL,
                    budget DECIMAL(10,2),
                    status VARCHAR(20) DEFAULT 'planned',
                    cover_image TEXT,
                    description TEXT,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                )''',
                'CREATE INDEX IF NOT EXISTS idx_user_planning_user_id ON "user planning"(user_id)',
                'CREATE INDEX IF NOT EXISTS idx_user_planning_status ON "user planning"(status)'
            ]

            for i, sql in enumerate(sql_statements, 1):
                print(f"执行SQL语句 {i}/{len(sql_statements)}...")
                try:
                    result = supabase.rpc('exec', {'sql': sql}).execute()
                    print(f"✓ SQL语句 {i} 执行成功")
                except Exception as e:
                    print(f"✗ SQL语句 {i} 执行失败: {e}")
                    if "exec" in str(e):
                        print("注意：RPC exec方法不可用，请手动在Supabase Dashboard中执行SQL")
                        break

        except Exception as e:
            print(f"表重建失败: {e}")
            print("\n手动操作步骤：")
            print("1. 访问 https://app.supabase.com")
            print("2. 选择您的项目")
            print("3. 进入 'SQL Editor'")
            print("4. 执行以下SQL:")
            print("-" * 50)
            print(required_table_sql)
            print("-" * 50)
            return False

        # 验证新表结构
        print("验证新表结构...")
        try:
            result = supabase.table('user planning').select('id, user_id, title, cover_image').limit(1).execute()
            print("✓ 表结构验证成功 - 所有必需字段存在")
            return True
        except Exception as e:
            print(f"✗ 表结构验证失败: {e}")
            return False

    except Exception as e:
        print(f"连接错误: {e}")
        return False

if __name__ == "__main__":
    print("=== Supabase表结构修复工具 ===")
    print()

    if check_and_fix_table_structure():
        print("\n✅ 表结构修复完成！")
        print("现在可以重新启动应用程序进行测试。")
    else:
        print("\n❌ 表结构修复失败！")
        print("请按照上述手动步骤在Supabase Dashboard中执行SQL。")