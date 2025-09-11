#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Supabase数据库初始化脚本
执行SQL脚本来创建表结构和函数
"""

import os
import sys
from utils.supabase_client import supabase_client

def setup_database():
    """初始化Supabase数据库"""
    
    print("🔍 开始初始化Supabase数据库...")
    
    # 检查连接
    if not supabase_client.is_connected():
        print("❌ Supabase客户端未连接，请检查配置")
        return False
    
    # 读取SQL脚本
    sql_file = "scripts/setup_supabase_tables.sql"
    if not os.path.exists(sql_file):
        print(f"❌ SQL脚本文件不存在: {sql_file}")
        return False
    
    with open(sql_file, 'r', encoding='utf-8') as f:
        sql_content = f.read()
    
    try:
        # 分割SQL语句并执行
        sql_statements = []
        current_statement = ""
        
        for line in sql_content.split('\n'):
            line = line.strip()
            if not line or line.startswith('--'):
                continue
            
            current_statement += line + "\n"
            
            # 检查是否是语句结束
            if line.endswith(';'):
                sql_statements.append(current_statement.strip())
                current_statement = ""
        
        print(f"📋 找到 {len(sql_statements)} 条SQL语句")
        
        # 执行每条SQL语句
        for i, statement in enumerate(sql_statements, 1):
            try:
                if statement.strip():
                    print(f"⚡ 执行语句 {i}/{len(sql_statements)}")
                    result = supabase_client.client.rpc('exec', {'query': statement}).execute()
                    print(f"✅ 语句 {i} 执行成功")
            except Exception as e:
                # 对于已存在的对象，忽略错误
                error_msg = str(e).lower()
                if any(keyword in error_msg for keyword in ['already exists', 'duplicate', 'already defined']):
                    print(f"ℹ️ 语句 {i} 跳过（对象已存在）")
                else:
                    print(f"⚠️ 语句 {i} 执行失败: {e}")
        
        print("🎉 数据库初始化完成！")
        return True
        
    except Exception as e:
        print(f"❌ 数据库初始化失败: {e}")
        return False

if __name__ == "__main__":
    success = setup_database()
    sys.exit(0 if success else 1)