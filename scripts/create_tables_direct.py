#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接创建数据库表结构和示例数据
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.supabase_client import supabase_client
from supabase import create_client
import os
from dotenv import load_dotenv

def setup_database_with_sql():
    """使用SQL直接创建表结构"""
    
    # 加载环境变量
    load_dotenv()
    
    # 获取Supabase配置
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')  # 使用service role key来执行DDL
    
    if not supabase_url or not supabase_key:
        print("❌ Supabase配置缺失")
        return False
    
    try:
        # 创建具有更高权限的客户端
        admin_client = create_client(supabase_url, supabase_key)
        
        print("开始创建数据库表结构...")
        
        # 创建user_trips表的SQL
        create_user_trips_sql = """
        CREATE TABLE IF NOT EXISTS user_trips (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        
        # 创建trip_activities表的SQL  
        create_trip_activities_sql = """
        CREATE TABLE IF NOT EXISTS trip_activities (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            trip_id UUID NOT NULL REFERENCES user_trips(id) ON DELETE CASCADE,
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
        
        # 创建索引的SQL
        create_indexes_sql = """
        CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
        CREATE INDEX IF NOT EXISTS idx_user_trips_start_date ON user_trips(start_date);
        CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON trip_activities(trip_id);
        CREATE INDEX IF NOT EXISTS idx_trip_activities_day ON trip_activities(trip_id, day_number);
        """
        
        # 创建触发器函数和触发器的SQL
        create_trigger_sql = """
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';

        DROP TRIGGER IF EXISTS update_user_trips_updated_at ON user_trips;
        CREATE TRIGGER update_user_trips_updated_at 
            BEFORE UPDATE ON user_trips 
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
        """
        
        # 执行SQL语句
        print("1. 创建user_trips表...")
        admin_client.postgrest.rpc('execute_sql', {'query': create_user_trips_sql}).execute()
        
        print("2. 创建trip_activities表...")
        admin_client.postgrest.rpc('execute_sql', {'query': create_trip_activities_sql}).execute()
        
        print("3. 创建索引...")
        admin_client.postgrest.rpc('execute_sql', {'query': create_indexes_sql}).execute()
        
        print("4. 创建触发器...")
        admin_client.postgrest.rpc('execute_sql', {'query': create_trigger_sql}).execute()
        
        print("✅ 数据库表结构创建完成")
        return True
        
    except Exception as e:
        print(f"❌ 创建表结构失败: {e}")
        return False

def setup_database():
    """设置数据库表结构和示例数据"""
    
    print("开始设置数据库...")
    
    if not supabase_client.is_connected():
        print("❌ 数据库连接失败")
        return False
    
    try:
        # 获取现有用户ID
        users_result = supabase_client.client.table('users').select('id').limit(1).execute()
        if not users_result.data:
            print("没有找到用户，请先注册用户")
            return False
        
        user_id = users_result.data[0]['id']
        print(f"找到用户ID: {user_id}")
        
        # 尝试查询user_trips表，如果失败说明表不存在
        try:
            test_query = supabase_client.client.table('user_trips').select('id').limit(1).execute()
            print("user_trips表已存在")
        except Exception as e:
            if 'Could not find the table' in str(e):
                print("user_trips表不存在，尝试使用其他方法创建...")
                # 这里我们直接创建示例数据，让Supabase自动推断表结构
                return create_sample_data_directly(user_id)
        
        # 检查是否已有行程数据
        existing_trips = supabase_client.client.table('user_trips').select('id').eq('user_id', user_id).limit(1).execute()
        if existing_trips.data:
            print(f"用户已有行程数据 ({len(existing_trips.data)} 个)")
            return True
        
        return create_sample_data_directly(user_id)
            
    except Exception as e:
        print(f"设置数据库失败: {e}")
        return False

def create_sample_data_directly(user_id):
    """直接创建示例数据"""
    try:
        print("2. 创建示例行程数据...")
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
        
        result = supabase_client.client.table('user_trips').insert(sample_trips).execute()
        
        if result.data:
            print(f"成功创建 {len(result.data)} 个示例行程")
            
            # 为第一个行程添加活动示例
            first_trip_id = result.data[0]['id']
            print("3. 添加行程活动示例...")
            
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
            
            print("数据库设置完成！")
            return True
        else:
            print("创建示例数据失败")
            return False
            
    except Exception as e:
        print(f"创建示例数据失败: {e}")
        return False

if __name__ == '__main__':
    if setup_database():
        print("\n数据库设置成功！现在可以在前端看到用户的真实行程数据了。")
    else:
        print("\n数据库设置失败，请检查日志。")