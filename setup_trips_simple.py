#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的行程数据设置脚本
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.supabase_client import supabase_client

def create_sample_trips_data():
    """创建示例行程数据，让 Supabase 自动创建表结构"""
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
        try:
            existing_trips = supabase_client.client.table('user_trips').select('id').eq('user_id', user_id).execute()
            if existing_trips.data:
                print(f"用户已有 {len(existing_trips.data)} 个行程，跳过创建")
                return True
        except Exception as e:
            print(f"表可能不存在，准备创建数据: {e}")
        
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
            
            print("数据创建完成！")
            return True
        else:
            print("创建示例数据失败")
            return False
            
    except Exception as e:
        print(f"创建数据失败: {e}")
        print("这通常是因为数据库表还不存在")
        print("需要在 Supabase 控制台手动创建表结构")
        return False

if __name__ == '__main__':
    print("开始设置用户行程数据...")
    
    if create_sample_trips_data():
        print("\n成功！现在可以在前端看到用户的行程数据了。")
    else:
        print("\n失败！需要先在 Supabase 控制台创建数据库表。")
        print("请参考 SUPABASE_SETUP.md 文件中的说明。")