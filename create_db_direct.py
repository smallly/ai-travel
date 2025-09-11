#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接通过数据库连接创建表 - 最终版本
"""

import os
import sys
import psycopg2
from urllib.parse import urlparse
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
from utils.supabase_client import supabase_client

# 加载环境变量
load_dotenv()

def get_db_connection_string():
    """构建数据库连接字符串"""
    supabase_url = os.getenv('SUPABASE_URL')
    if not supabase_url:
        return None
    
    # 从 Supabase URL 构建 PostgreSQL 连接字符串
    # Supabase URL 格式：https://xxxxx.supabase.co
    # PostgreSQL 连接：postgresql://postgres:password@db.xxxxx.supabase.co:5432/postgres
    
    parsed = urlparse(supabase_url)
    project_id = parsed.hostname.split('.')[0]
    
    # 使用 service role key 作为密码（这通常不正确，但我们试试）
    service_key = os.getenv('SUPABASE_SERVICE_KEY')
    
    # 构建连接字符串
    db_host = f"db.{project_id}.supabase.co"
    conn_string = f"postgresql://postgres:{service_key}@{db_host}:5432/postgres"
    
    return conn_string

def create_tables_with_psycopg2():
    """使用 psycopg2 直接连接数据库创建表"""
    
    conn_string = get_db_connection_string()
    if not conn_string:
        print("无法构建数据库连接字符串")
        return False
    
    try:
        print(f"尝试连接数据库...")
        conn = psycopg2.connect(conn_string)
        cur = conn.cursor()
        
        print("数据库连接成功！")
        
        # 创建表的 SQL
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

        -- 创建行程活动表
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

        -- 添加外键约束
        ALTER TABLE trip_activities ADD CONSTRAINT fk_trip_activities_trip_id 
            FOREIGN KEY (trip_id) REFERENCES user_trips(id) ON DELETE CASCADE;

        -- 创建索引
        CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
        CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
        CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON trip_activities(trip_id);
        """
        
        print("执行创建表的 SQL...")
        cur.execute(create_tables_sql)
        conn.commit()
        
        print("✅ 数据库表创建成功！")
        
        cur.close()
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ 数据库连接或创建表失败: {e}")
        return False

def create_sample_data_simple():
    """创建简单的示例数据"""
    try:
        if not supabase_client.is_connected():
            print("Supabase 客户端连接失败")
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
            }
        ]
        
        # 插入行程数据
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

def main():
    print("=== Supabase 数据库表创建工具 ===")
    
    # 方法 1: 尝试直接数据库连接
    success = create_tables_with_psycopg2()
    
    if success:
        print("\n表创建成功，现在创建示例数据...")
        if create_sample_data_simple():
            print("\n🎉 完全成功！数据库设置完成")
            print("现在可以启动前端查看效果了")
        else:
            print("\n⚠️ 表创建成功但示例数据创建失败")
    else:
        print("\n❌ 直接连接失败")
        print("需要手动在 Supabase Dashboard 创建表")
        print("\n请访问: https://app.supabase.com")
        print("选择项目，点击 SQL Editor，执行以下 SQL:")
        print("""
CREATE TABLE user_trips (
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

CREATE TABLE trip_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES user_trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    start_time TIME,
    end_time TIME,
    estimated_cost DECIMAL(8,2),
    activity_type VARCHAR(50) DEFAULT 'sightseeing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
        """)

if __name__ == '__main__':
    main()