#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整的文本清理功能测试脚本
"""

import re

def test_cleanAIText():
    """测试文本清理函数的JavaScript逻辑（Python模拟版）"""
    
    # 模拟包含坐标信息的AI回复文本
    test_texts = [
        # 测试1：标准格式的经纬度
        """1. 天安门广场
地址：北京市东城区东长安街
经纬度：39.903179,116.397755
推荐理由：天安门广场是中国的象征，也是世界上最大的城市中心广场。

2. 故宫博物院
地址：北京市东城区景山前街4号
经纬度：39.916345,116.397155
推荐理由：故宫是中国明、清两代皇宫。""",
        
        # 测试2：括号内坐标格式
        """北京颐和园 (经度：116.273567，纬度：39.999912) 是一座大型皇家园林。
坐标：40.010742,116.295012
位置：北京市海淀区新建宫门路19号""",
        
        # 测试3：GPS坐标格式
        """推荐景点：八达岭长城
GPS：40.3587,116.0154
地址：北京市延庆区八达岭镇八达岭村""",
        
        # 测试4：混合格式
        """
景点1：天坛公园
地址：北京市东城区天坛东路甲1号
坐标：39.88221,116.406515
经度：116.406515，纬度：39.88221
(GPS坐标：39.88221,116.406515)
"""
    ]
    
    # JavaScript正则表达式模式（转换为Python格式）
    coordinate_patterns = [
        # 中文标识的坐标
        r'经纬度[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+',
        r'纬度[：:]?\s*[0-9.-]+',
        r'经度[：:]?\s*[0-9.-]+',
        r'坐标[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+',
        # 括号内的坐标信息
        r'\([^)]*经度[^)]*\)',
        r'\([^)]*纬度[^)]*\)',
        r'\([^)]*坐标[^)]*\)',
        # 纯数字坐标格式（较精确的格式）
        r'\b[0-9]{1,3}\.[0-9]{5,8}\s*[,，]\s*[0-9]{1,3}\.[0-9]{5,8}\b',
        # GPS坐标格式
        r'GPS[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+',
        # 位置坐标格式
        r'位置[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+',
        # 地理坐标
        r'地理坐标[：:]?\s*[0-9.-]+\s*[,，]\s*[0-9.-]+',
    ]
    
    print("=== 文本清理功能测试 ===")
    print()
    
    for i, original_text in enumerate(test_texts, 1):
        print(f"测试 {i}:")
        print("原始文本:")
        print(original_text)
        print()
        
        # 应用清理规则
        cleaned_text = original_text
        matches_found = []
        
        for pattern in coordinate_patterns:
            found_matches = re.findall(pattern, cleaned_text)
            if found_matches:
                matches_found.extend(found_matches)
            cleaned_text = re.sub(pattern, '', cleaned_text)
        
        # 清理因移除坐标信息而产生的多余格式
        cleaned_text = re.sub(r'^[：:]\s*$', '', cleaned_text, flags=re.MULTILINE)  # 移除空的冒号行
        cleaned_text = re.sub(r'\n\s*\n\s*\n', '\n\n', cleaned_text)  # 移除连续的换行符
        cleaned_text = re.sub(r'^[\s]*[：:]\s*', '', cleaned_text, flags=re.MULTILINE)  # 移除行首的冒号和空格
        cleaned_text = re.sub(r'\s*[：:]\s*$', '', cleaned_text, flags=re.MULTILINE)  # 移除行尾的冒号和空格
        cleaned_text = re.sub(r'^\s+|\s+$', '', cleaned_text)  # 清理首尾空格
        cleaned_text = re.sub(r'\n\s+', '\n', cleaned_text)  # 清理行首空格
        cleaned_text = re.sub(r'\s+\n', '\n', cleaned_text)  # 清理行尾空格
        
        print("找到的坐标信息:")
        for match in matches_found:
            print(f"  - {match}")
        print()
        
        print("清理后文本:")
        print(cleaned_text)
        print()
        
        # 验证是否还有残留的坐标信息
        remaining_coords = []
        coord_check_patterns = ['经纬度', '坐标', '经度', '纬度', 'GPS']
        for check_pattern in coord_check_patterns:
            if check_pattern in cleaned_text:
                remaining_coords.append(check_pattern)
        
        if remaining_coords:
            print(f"⚠️  警告: 仍有坐标相关文本残留: {', '.join(remaining_coords)}")
        else:
            print("✅ 清理成功: 未发现坐标信息残留")
        
        print("-" * 60)
        print()

def test_coordinate_detection():
    """测试坐标检测功能"""
    print("=== 坐标检测测试 ===")
    
    test_cases = [
        "经纬度：39.903179,116.397755",
        "GPS：40.3587,116.0154",
        "坐标：39.88221,116.406515",
        "(经度：116.273567，纬度：39.999912)",
        "正常的文本没有坐标信息",
        "这是一个包含经度116.123456和纬度39.654321的句子"
    ]
    
    coord_keywords = ['经纬度', '坐标', '经度', '纬度', 'GPS']
    
    for test_case in test_cases:
        has_coords = any(keyword in test_case for keyword in coord_keywords)
        print(f"文本: {test_case}")
        print(f"包含坐标: {'是' if has_coords else '否'}")
        print()

if __name__ == '__main__':
    test_cleanAIText()
    test_coordinate_detection()