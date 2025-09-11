#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的数据库设置脚本 - 直接使用table操作
"""

import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.supabase_client import supabase_client

def setup_sample_trips():
    """直接创建示例行程数据到现有表格"""
    try:
        # 获取第一个用户ID用于创建示例数据
        users_result = supabase_client.client.table('users').select('id').limit(1).execute()
        
        if not users_result.data:
            print("没有找到用户，无法创建示例数据")
            return False
        
        user_id = users_result.data[0]['id']
        print(f"为用户 {user_id} 创建示例行程数据...")
        
        # 检查是否已有行程数据
        existing_trips = supabase_client.client.table('user_trips').select('id').eq('user_id', user_id).execute()
        if existing_trips.data:
            print(f"用户已有 {len(existing_trips.data)} 个行程，跳过创建")
            return True
        
        # 创建示例行程
        sample_trips = [
            {
                'user_id': user_id,
                'title': '日本京都樱花之旅',
                'destination': '京都',
                'start_date': '2024-04-01',
                'end_date': '2024-04-05',
                'budget': 8000.00,
                'status': 'completed',
                'cover_image': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=400',
                'description': '在樱花盛开的季节探索古都京都的文化魅力'
            },
            {
                'user_id': user_id,
                'title': '巴厘岛度假计划',
                'destination': '巴厘岛',
                'start_date': '2024-06-15',
                'end_date': '2024-06-22',
                'budget': 12000.00,
                'status': 'planned',
                'cover_image': 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=400',
                'description': '热带天堂的放松度假之旅'
            },
            {
                'user_id': user_id,
                'title': '欧洲文化探索',
                'destination': '巴黎-罗马',
                'start_date': '2024-09-01',
                'end_date': '2024-09-14',
                'budget': 20000.00,
                'status': 'planned',
                'cover_image': 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?w=400',
                'description': '深度体验欧洲的艺术、历史和美食文化'
            }
        ]
        
        # 插入行程数据
        result = supabase_client.client.table('user_trips').insert(sample_trips).execute()
        
        if result.data:
            print(f"成功创建 {len(result.data)} 个示例行程")
            
            # 为第一个行程添加详细活动
            first_trip_id = result.data[0]['id']
            activities = [
                {
                    'trip_id': first_trip_id,
                    'day_number': 1,
                    'title': '抵达京都站',
                    'description': '从机场乘坐电车到达京都站，入住酒店',
                    'location': '京都站',
                    'start_time': '14:00',
                    'end_time': '17:00',
                    'activity_type': 'transportation'
                },
                {
                    'trip_id': first_trip_id,
                    'day_number': 2,
                    'title': '清水寺参观',
                    'description': '参观著名的清水寺，观赏樱花美景',
                    'location': '清水寺',
                    'start_time': '09:00',
                    'end_time': '12:00',
                    'activity_type': 'sightseeing'
                },
                {
                    'trip_id': first_trip_id,
                    'day_number': 2,
                    'title': '祇园散步',
                    'description': '在传统的祇园区域漫步，体验古都风情',
                    'location': '祇园',
                    'start_time': '14:00',
                    'end_time': '18:00',
                    'activity_type': 'sightseeing'
                }
            ]
            
            activity_result = supabase_client.client.table('trip_activities').insert(activities).execute()
            if activity_result.data:
                print(f"成功创建 {len(activity_result.data)} 个示例活动")
                
            return True
        else:
            print("创建示例数据失败")
            return False
        
    except Exception as e:
        print(f"创建示例数据失败: {e}")
        return False

if __name__ == '__main__':
    print("开始设置用户行程示例数据...")
    
    if not supabase_client.is_connected():
        print("数据库连接失败")
        sys.exit(1)
    
    if setup_sample_trips():
        print("用户行程示例数据设置完成！")
    else:
        print("示例数据设置失败")