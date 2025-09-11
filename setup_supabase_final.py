#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
最终的 Supabase 数据库设置脚本
"""

import requests
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from utils.supabase_client import supabase_client

# 加载环境变量
load_dotenv()

def create_tables_via_raw_sql():
    """通过原始 SQL 连接创建表"""
    
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    if not supabase_url or not supabase_key:
        print("ERROR: 缺少 Supabase 配置")
        return False
    
    # 构建 PostgreSQL 连接字符串（如果有的话）
    # 由于我们只有 REST API 访问权限，我们需要使用不同的方法
    
    print("尝试通过 Supabase REST API 创建表...")
    
    # SQL 语句
    create_tables_sql = """
-- 创建用户行程表
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

-- 创建行程详细活动表
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
"""
    
    # 分割 SQL 语句并逐一执行
    sql_statements = [stmt.strip() for stmt in create_tables_sql.split(';') if stmt.strip()]
    
    try:
        headers = {
            'apikey': supabase_key,
            'Authorization': f'Bearer {supabase_key}',
            'Content-Type': 'application/json'
        }
        
        success_count = 0
        for i, sql in enumerate(sql_statements):
            if not sql:
                continue
                
            print(f"执行 SQL 语句 {i+1}/{len(sql_statements)}...")
            
            # 使用 PostgREST 的 rpc 功能执行 SQL
            url = f"{supabase_url}/rest/v1/rpc/exec"
            payload = {'sql': sql}
            
            try:
                response = requests.post(url, headers=headers, json=payload)
                if response.status_code in [200, 201]:
                    success_count += 1
                    print(f"  - 成功")
                else:
                    print(f"  - 失败: {response.status_code} - {response.text}")
            except Exception as e:
                print(f"  - 执行失败: {e}")
        
        print(f"完成 {success_count}/{len(sql_statements)} 个 SQL 语句")
        return success_count > 0
        
    except Exception as e:
        print(f"ERROR: 执行 SQL 失败: {e}")
        return False

def create_tables_using_supabase_client():
    """使用 Supabase 客户端尝试创建表"""
    
    print("尝试使用 Supabase 客户端创建表...")
    
    try:
        client = supabase_client.client
        
        # 尝试创建一个简单的测试表来验证权限
        test_sql = "SELECT 1 as test"
        result = client.rpc('exec', {'sql': test_sql}).execute()
        print("数据库连接正常")
        
        # 由于我们无法直接执行 DDL，我们将尝试插入数据让 Supabase 自动创建表结构
        print("尝试通过插入数据来创建表结构...")
        return create_sample_data_directly()
        
    except Exception as e:
        print(f"Supabase 客户端方法失败: {e}")
        return False

def create_sample_data_directly():
    """直接创建示例数据，让 Supabase 自动创建表"""
    
    try:
        if not supabase_client.is_connected():
            print("ERROR: 数据库连接失败")
            return False
        
        # 获取第一个用户
        print("获取用户信息...")
        users_result = supabase_client.client.table('users').select('id').limit(1).execute()
        if not users_result.data:
            print("没有找到用户，请先注册用户")
            return False
        
        user_id = users_result.data[0]['id']
        print(f"用户ID: {user_id}")
        
        # 尝试查询现有的行程表
        try:
            existing_trips = supabase_client.client.table('user_trips').select('id').eq('user_id', user_id).execute()
            if existing_trips.data:
                print(f"用户已有 {len(existing_trips.data)} 个行程，跳过创建")
                return True
        except Exception as e:
            print(f"表可能不存在: {e}")
        
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
            print(f"SUCCESS: 成功创建 {len(result.data)} 个示例行程")
            
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
                print(f"SUCCESS: 成功创建 {len(activity_result.data)} 个活动示例")
            
            return True
        else:
            print("ERROR: 创建示例数据失败")
            return False
            
    except Exception as e:
        print(f"ERROR: 创建示例数据失败: {e}")
        # 输出详细错误信息以便调试
        import traceback
        traceback.print_exc()
        return False

def main():
    print("开始设置 Supabase 数据库...")
    print("=" * 50)
    
    # 方法 1: 尝试通过 REST API 创建表
    print("方法 1: 通过 REST API 创建表结构")
    tables_created = create_tables_via_raw_sql()
    
    if not tables_created:
        # 方法 2: 尝试通过 Supabase 客户端
        print("\n方法 2: 使用 Supabase 客户端")
        tables_created = create_tables_using_supabase_client()
    
    if not tables_created:
        # 方法 3: 直接创建数据（可能会自动创建表）
        print("\n方法 3: 直接创建示例数据")
        if create_sample_data_directly():
            print("\nSUCCESS: 数据创建成功！")
            print("现在可以在前端看到用户的行程数据了。")
        else:
            print("\nERROR: 所有方法都失败了")
            print("需要手动在 Supabase Dashboard 中创建表结构")
            print("请参考 SUPABASE_SETUP.md 文件中的 SQL 语句")
    else:
        print("\nSUCCESS: 表结构创建成功！")
        # 创建示例数据
        if create_sample_data_directly():
            print("示例数据也创建成功！")
        else:
            print("示例数据创建失败，但表结构已存在")

if __name__ == '__main__':
    main()