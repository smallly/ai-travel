#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
执行SQL创建数据库表结构
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.supabase_client import supabase_client

def execute_sql_setup():
    """执行SQL创建表结构"""
    try:
        if not supabase_client.is_connected():
            print("❌ 数据库连接失败")
            return False
        
        # 读取SQL文件
        sql_file_path = os.path.join(os.path.dirname(__file__), 'setup_trips_schema.sql')
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_content = f.read()
        
        print("执行数据库表创建SQL...")
        
        # 执行SQL - 使用rpc调用执行原生SQL
        result = supabase_client.client.rpc('execute_sql', {'sql_query': sql_content}).execute()
        
        if result.data is not None:
            print("✅ 数据库表创建成功")
            return True
        else:
            print(f"❌ SQL执行失败: {result}")
            return False
            
    except Exception as e:
        print(f"❌ 执行SQL失败: {e}")
        return False

def create_sample_data():
    """创建示例数据"""
    try:
        # 获取第一个用户
        users_result = supabase_client.client.table('users').select('id').limit(1).execute()
        if not users_result.data:
            print("没有找到用户，跳过创建示例数据")
            return True
        
        user_id = users_result.data[0]['id']
        print(f"为用户 {user_id} 创建示例数据...")
        
        # 检查是否已有行程数据
        existing_trips = supabase_client.client.table('user_trips').select('id').eq('user_id', user_id).execute()
        if existing_trips.data:
            print(f"用户已有 {len(existing_trips.data)} 个行程，跳过创建")
            return True
        
        # 创建示例行程
        sample_trips = [
            {
                'user_id': user_id,
                'title': '青岛海滨三日游',
                'destination': '青岛',
                'start_date': '2024-04-15',
                'end_date': '2024-04-17',
                'budget': 2500.00,
                'status': 'planning',
                'cover_image': 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
                'description': '探索青岛的海滨风光和德国建筑风情'
            },
            {
                'user_id': user_id,
                'title': '北京文化深度游',
                'destination': '北京',
                'start_date': '2024-03-20',
                'end_date': '2024-03-22',
                'budget': 3000.00,
                'status': 'completed',
                'cover_image': 'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=400',
                'description': '深度游览紫禁城，感受古都文化魅力'
            }
        ]
        
        # 插入数据
        result = supabase_client.client.table('user_trips').insert(sample_trips).execute()
        if result.data:
            print(f"✅ 成功创建 {len(result.data)} 个示例行程")
            return True
        else:
            print("❌ 创建示例数据失败")
            return False
            
    except Exception as e:
        print(f"❌ 创建示例数据失败: {e}")
        return False

if __name__ == '__main__':
    print("开始设置数据库结构...")
    
    if execute_sql_setup():
        print("✅ 数据库表创建完成")
        if create_sample_data():
            print("✅ 所有设置完成！")
        else:
            print("⚠️ 表创建成功但示例数据创建失败")
    else:
        print("❌ 数据库设置失败")