#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
直接创建数据库表和示例数据
"""

from utils.supabase_client import supabase_client

def setup_database():
    """设置数据库表结构和示例数据"""
    
    print("开始设置数据库...")
    
    if not supabase_client.is_connected():
        print("❌ 数据库连接失败")
        return False
    
    try:
        # 创建user_trips表 - 如果已存在会忽略
        print("1. 创建用户行程表...")
        
        # 获取现有用户ID
        users_result = supabase_client.client.table('users').select('id').limit(1).execute()
        if not users_result.data:
            print("没有找到用户，请先注册用户")
            return False
        
        user_id = users_result.data[0]['id']
        print(f"找到用户ID: {user_id}")
        
        # 检查是否已有行程数据
        existing_trips = supabase_client.client.table('user_trips').select('id').eq('user_id', user_id).limit(1).execute()
        if existing_trips.data:
            print(f"用户已有行程数据 ({len(existing_trips.data)} 个)")
            return True
        
        # 创建示例行程数据
        print("2. 创建示例行程数据...")
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
        print(f"设置数据库失败: {e}")
        return False

if __name__ == '__main__':
    if setup_database():
        print("\n数据库设置成功！现在可以在前端看到用户的真实行程数据了。")
    else:
        print("\n数据库设置失败，请检查日志。")