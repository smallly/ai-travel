#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接通过数据库连接创建表结构
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from utils.supabase_client import supabase_client

# 加载环境变量
load_dotenv()

def create_tables_with_supabase_client():
    """使用 Supabase 客户端创建表结构"""
    
    if not supabase_client.is_connected():
        print("数据库连接失败")
        return False
    
    try:
        print("开始创建数据库表结构...")
        
        # 尝试使用 Supabase 的原生 SQL 执行功能
        # 这需要使用 service role key
        client = supabase_client.client
        
        # 创建 user_trips 表的 SQL
        create_user_trips_sql = """
        CREATE TABLE IF NOT EXISTS user_trips (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            title VARCHAR(200) NOT NULL,
            destination VARCHAR(100) NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            budget DECIMAL(10,2),
            status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
            cover_image TEXT,
            description TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        # 创建 trip_activities 表的 SQL
        create_trip_activities_sql = """
        CREATE TABLE IF NOT EXISTS trip_activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            trip_id UUID NOT NULL,
            day_number INTEGER NOT NULL,
            title VARCHAR(200) NOT NULL,
            description TEXT,
            location VARCHAR(200),
            start_time TIME,
            end_time TIME,
            estimated_cost DECIMAL(8,2),
            activity_type VARCHAR(50) DEFAULT 'sightseeing' CHECK (activity_type IN ('sightseeing', 'dining', 'shopping', 'entertainment', 'transportation', 'accommodation', 'other')),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        """
        
        # 创建索引的 SQL
        create_indexes_sql = """
        CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
        CREATE INDEX IF NOT EXISTS idx_user_trips_start_date ON user_trips(start_date);
        CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON trip_activities(trip_id);
        CREATE INDEX IF NOT EXISTS idx_trip_activities_day ON trip_activities(trip_id, day_number);
        """
        
        # 尝试执行 SQL
        print("1. 创建 user_trips 表...")
        try:
            result1 = client.rpc('execute_sql', {'query': create_user_trips_sql}).execute()
            print("user_trips 表创建成功")
        except Exception as e:
            print(f"创建 user_trips 表失败: {e}")
        
        print("2. 创建 trip_activities 表...")
        try:
            result2 = client.rpc('execute_sql', {'query': create_trip_activities_sql}).execute()
            print("trip_activities 表创建成功")
        except Exception as e:
            print(f"创建 trip_activities 表失败: {e}")
        
        print("3. 创建索引...")
        try:
            result3 = client.rpc('execute_sql', {'query': create_indexes_sql}).execute()
            print("索引创建成功")
        except Exception as e:
            print(f"创建索引失败: {e}")
        
        print("表结构创建完成!")
        return True
        
    except Exception as e:
        print(f"创建表结构失败: {e}")
        return False

def create_sample_data():
    """创建示例数据"""
    try:
        if not supabase_client.is_connected():
            print("数据库连接失败")
            return False
        
        # 获取第一个用户
        print("获取用户信息...")
        users_result = supabase_client.client.table('users').select('id').limit(1).execute()
        if not users_result.data:
            print("没有找到用户，请先注册用户")
            return False
        
        user_id = users_result.data[0]['id']
        print(f"用户ID: {user_id}")
        
        # 检查是否已有行程数据
        print("检查现有行程数据...")
        existing_trips = supabase_client.client.table('user_trips').select('id').eq('user_id', user_id).execute()
        if existing_trips.data:
            print(f"用户已有 {len(existing_trips.data)} 个行程，跳过创建")
            return True
        
        # 创建示例行程数据
        print("创建示例行程数据...")
        sample_trips = [
            {
                'user_id': user_id,
                'title': '青岛海滨三日游',
                'destination': '青岛',
                'start_date': '2024-04-15',
                'end_date': '2024-04-17',
                'budget': 2500.00,
                'status': 'planned',
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
            },
            {
                'user_id': user_id,
                'title': '成都美食文化之旅',
                'destination': '成都',
                'start_date': '2024-05-01',
                'end_date': '2024-05-03',
                'budget': 2000.00,
                'status': 'planned',
                'cover_image': 'https://images.pexels.com/photos/2901209/pexels-photo-2901209.jpeg?auto=compress&cs=tinysrgb&w=400',
                'description': '品味正宗川菜，感受天府之国的悠闲生活'
            }
        ]
        
        # 插入行程数据
        result = supabase_client.client.table('user_trips').insert(sample_trips).execute()
        
        if result.data:
            print(f"成功创建 {len(result.data)} 个示例行程")
            
            # 为第一个行程添加活动示例
            first_trip_id = result.data[0]['id']
            print("创建行程活动示例...")
            
            activities = [
                {
                    'trip_id': first_trip_id,
                    'day_number': 1,
                    'title': '抵达青岛',
                    'description': '抵达青岛，入住酒店，休整',
                    'location': '青岛流亭国际机场',
                    'start_time': '15:00',
                    'end_time': '17:00',
                    'activity_type': 'transportation'
                },
                {
                    'trip_id': first_trip_id,
                    'day_number': 2,
                    'title': '栈桥观光',
                    'description': '游览青岛标志性景点栈桥',
                    'location': '栈桥',
                    'start_time': '09:00',
                    'end_time': '11:00',
                    'activity_type': 'sightseeing'
                },
                {
                    'trip_id': first_trip_id,
                    'day_number': 2,
                    'title': '八大关漫步',
                    'description': '在八大关感受欧式建筑风情',
                    'location': '八大关',
                    'start_time': '14:00',
                    'end_time': '17:00',
                    'activity_type': 'sightseeing'
                }
            ]
            
            activity_result = supabase_client.client.table('trip_activities').insert(activities).execute()
            if activity_result.data:
                print(f"成功创建 {len(activity_result.data)} 个活动示例")
            
            print("示例数据创建完成!")
            return True
        else:
            print("创建示例数据失败")
            return False
            
    except Exception as e:
        print(f"创建示例数据失败: {e}")
        return False

if __name__ == '__main__':
    print("开始设置 Supabase 数据库...")
    
    # 先尝试创建表结构
    tables_created = create_tables_with_supabase_client()
    
    # 然后创建示例数据
    if create_sample_data():
        print("\n成功！数据库设置完成，现在可以在前端看到用户的行程数据了。")
    else:
        print("\n示例数据创建失败。")
        if not tables_created:
            print("请在 Supabase 控制台手动创建表，参考 SUPABASE_SETUP.md 文件。")