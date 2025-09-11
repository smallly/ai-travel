#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
测试数据库表是否存在
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.supabase_client import supabase_client

def test_tables():
    """测试表是否存在"""
    
    if not supabase_client.is_connected():
        print("数据库连接失败")
        return False
    
    try:
        print("测试 user_trips 表...")
        
        # 方法1: 尝试查询表结构
        try:
            result = supabase_client.client.table('user_trips').select('*').limit(0).execute()
            print("✅ user_trips 表存在")
            
            # 测试插入数据
            print("测试插入数据...")
            test_data = {
                'user_id': 'bae7d7e5-d2cd-42c2-bec8-3a0e968a315d',
                'title': '测试行程',
                'destination': '测试目的地',
                'start_date': '2024-01-01',
                'end_date': '2024-01-02',
                'status': 'planned'
            }
            
            insert_result = supabase_client.client.table('user_trips').insert(test_data).execute()
            if insert_result.data:
                print("✅ 数据插入成功")
                
                # 删除测试数据
                trip_id = insert_result.data[0]['id']
                supabase_client.client.table('user_trips').delete().eq('id', trip_id).execute()
                print("✅ 测试数据已清理")
                
                return True
            else:
                print("❌ 数据插入失败")
                return False
                
        except Exception as e:
            print(f"❌ user_trips 表不存在或无法访问: {e}")
            
            # 方法2: 尝试列出所有表
            try:
                print("尝试列出所有可用的表...")
                # 这个可能不会工作，但值得一试
                all_tables = supabase_client.client.from_('information_schema.tables').select('table_name').execute()
                if all_tables.data:
                    print("可用的表:")
                    for table in all_tables.data:
                        print(f"  - {table['table_name']}")
                        
            except Exception as e2:
                print(f"无法列出表: {e2}")
            
            return False
            
    except Exception as e:
        print(f"测试失败: {e}")
        return False

if __name__ == '__main__':
    print("=== 数据库表测试 ===")
    if test_tables():
        print("\n🎉 数据库表测试成功！可以继续创建示例数据")
    else:
        print("\n❌ 数据库表不存在")
        print("\n请确保已在 Supabase Dashboard 中执行了 SQL 创建语句:")
        print("1. 访问 https://app.supabase.com")
        print("2. 选择项目 dyxvnarknlcatrpxeshe") 
        print("3. 点击 SQL Editor")
        print("4. 执行创建表的 SQL 语句")
        print("5. 等待几分钟让缓存更新")