#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
使用 Supabase Management API 创建数据库表
"""

import requests
import os
from dotenv import load_dotenv
import json

# 加载环境变量
load_dotenv()

def create_tables_via_api():
    """通过 Supabase REST API 创建表"""
    
    # 获取配置
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        print("ERROR: 缺少 Supabase 配置")
        return False
    
    # SQL 语句
    create_tables_sql = """
-- 创建用户行程表
CREATE TABLE IF NOT EXISTS user_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- 创建行程详细活动表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_start_date ON user_trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON trip_activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_activities_day ON trip_activities(trip_id, day_number);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
DROP TRIGGER IF EXISTS update_user_trips_updated_at ON user_trips;
CREATE TRIGGER update_user_trips_updated_at 
    BEFORE UPDATE ON user_trips 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_activities ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
DROP POLICY IF EXISTS "Users can view own trips" ON user_trips;
CREATE POLICY "Users can view own trips" ON user_trips
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own trips" ON user_trips;
CREATE POLICY "Users can insert own trips" ON user_trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own trips" ON user_trips;
CREATE POLICY "Users can update own trips" ON user_trips
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own trips" ON user_trips;
CREATE POLICY "Users can delete own trips" ON user_trips
    FOR DELETE USING (auth.uid() = user_id);

-- 行程活动策略
DROP POLICY IF EXISTS "Users can view own trip activities" ON trip_activities;
CREATE POLICY "Users can view own trip activities" ON trip_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE user_trips.id = trip_activities.trip_id 
            AND user_trips.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can insert own trip activities" ON trip_activities;
CREATE POLICY "Users can insert own trip activities" ON trip_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE user_trips.id = trip_activities.trip_id 
            AND user_trips.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can update own trip activities" ON trip_activities;
CREATE POLICY "Users can update own trip activities" ON trip_activities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE user_trips.id = trip_activities.trip_id 
            AND user_trips.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Users can delete own trip activities" ON trip_activities;
CREATE POLICY "Users can delete own trip activities" ON trip_activities
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE user_trips.id = trip_activities.trip_id 
            AND user_trips.user_id = auth.uid()
        )
    );
"""

    try:
        # 使用 Supabase REST API 执行 SQL
        db_url = f"{supabase_url}/rest/v1/rpc/exec_sql"
        
        headers = {
            'apikey': supabase_key,
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json'
        }
        
        payload = {
            'sql': create_tables_sql
        }
        
        print("正在创建数据库表...")
        response = requests.post(db_url, headers=headers, json=payload)
        
        if response.status_code == 200:
            print("SUCCESS: 数据库表创建成功")
            return True
        else:
            print(f"ERROR: 创建表失败: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        print(f"ERROR: 执行失败: {e}")
        return False

def create_sample_data():
    """创建示例数据"""
    from utils.supabase_client import supabase_client
    
    try:
        if not supabase_client.is_connected():
            print("ERROR: 数据库连接失败")
            return False
        
        # 获取第一个用户
        users_result = supabase_client.client.table('users').select('id').limit(1).execute()
        if not users_result.data:
            print("没有找到用户，跳过创建示例数据")
            return True
        
        user_id = users_result.data[0]['id']
        print(f"为用户 {user_id} 创建示例数据...")
        
        # 检查是否已有行程数据
        try:
            existing_trips = supabase_client.client.table('user_trips').select('id').eq('user_id', user_id).execute()
            if existing_trips.data:
                print(f"用户已有 {len(existing_trips.data)} 个行程，跳过创建")
                return True
        except:
            print("表可能不存在，尝试创建示例数据...")
        
        # 创建示例行程
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
        
        # 插入数据
        result = supabase_client.client.table('user_trips').insert(sample_trips).execute()
        if result.data:
            print(f"SUCCESS: 成功创建 {len(result.data)} 个示例行程")
            
            # 为第一个行程添加活动示例
            first_trip_id = result.data[0]['id']
            print("添加行程活动示例...")
            
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
                }
            ]
            
            activity_result = supabase_client.client.table('trip_activities').insert(activities).execute()
            if activity_result.data:
                print(f"SUCCESS: 成功创建 {len(activity_result.data)} 个活动示例")
            
            return True
        else:
            print("ERROR: 创建示例数据失败")
            return False
            
    except Exception as e:
        print(f"ERROR: 创建示例数据失败: {e}")
        return False

if __name__ == '__main__':
    print("开始设置 Supabase 数据库...")
    
    # 先尝试创建表结构
    if create_tables_via_api():
        print("SUCCESS: 表结构创建完成")
        
        # 然后创建示例数据
        if create_sample_data():
            print("SUCCESS: 数据库设置完全成功！现在可以在前端看到用户的真实行程数据了。")
        else:
            print("WARNING: 表创建成功但示例数据创建失败，请检查日志")
    else:
        print("ERROR: 表创建失败，尝试直接创建示例数据...")
        # 如果表创建失败，尝试直接创建数据（可能表已存在）
        if create_sample_data():
            print("SUCCESS: 示例数据创建成功")
        else:
            print("ERROR: 完全失败，请检查 Supabase 配置")