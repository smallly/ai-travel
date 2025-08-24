#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
简单的API测试脚本，测试文本清理功能
"""

import requests
import json

def test_chat_api():
    """测试聊天API和文本清理功能"""
    url = "http://127.0.0.1:5000/api/chat/send"
    
    # 测试消息 - 请求包含地点信息的推荐
    test_message = "推荐北京的几个著名旅游景点"
    
    data = {
        "message": test_message,
        "user_id": "test_user"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print(f"发送测试请求: {test_message}")
    print(f"API地址: {url}")
    
    try:
        response = requests.post(url, json=data, headers=headers, timeout=30)
        
        print(f"响应状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            
            if result.get('success'):
                print("API调用成功!")
                
                # 检查返回的数据结构
                data = result.get('data', {})
                ai_message = data.get('ai_message', {})
                attractions = data.get('attractions', [])
                
                print(f"AI回复内容:")
                ai_content = ai_message.get('content', '')
                print(f"   内容: {ai_content[:200]}...")
                
                # 检查文本是否已经清理了坐标信息
                has_coordinates = any(keyword in ai_content.lower() for keyword in ['经纬度', '坐标', '经度', '纬度'])
                if has_coordinates:
                    print("警告: 文本中仍包含坐标信息，清理功能可能未生效")
                else:
                    print("文本清理成功: 未发现坐标信息")
                
                print(f"提取的景点数量: {len(attractions)}")
                
                for i, attraction in enumerate(attractions, 1):
                    print(f"   景点 {i}: {attraction.get('name', '未知')} - {attraction.get('address', '未知地址')}")
                    if 'coordinates' in attraction:
                        coords = attraction['coordinates']
                        print(f"      坐标: {coords.get('lat')}, {coords.get('lng')} (仅用于导航)")
                
            else:
                print(f"API返回错误: {result.get('error')}")
        else:
            print(f"HTTP错误: {response.status_code}")
            print(f"   响应内容: {response.text}")
    
    except Exception as e:
        print(f"请求异常: {str(e)}")

if __name__ == '__main__':
    test_chat_api()