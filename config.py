#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI旅行助手 - 配置管理模块
集中管理所有配置变量，特别是Dify API相关配置
"""

import os
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

class Config:
    """应用配置类 - 集中管理所有配置变量"""
    
    # Flask应用配置
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
    DEBUG = os.getenv('DEBUG', 'True').lower() == 'true'
    
    # 服务器配置
    HOST = os.getenv('HOST', '127.0.0.1')
    PORT = int(os.getenv('PORT', 5000))
    
    # 数据库配置  
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///database/travel.db')
    if DATABASE_URL.startswith('sqlite://') and not DATABASE_URL.startswith('sqlite:////'):
        # 转换为绝对路径
        db_path = DATABASE_URL.replace('sqlite:///', '')
        if not os.path.isabs(db_path):
            current_dir = os.path.dirname(os.path.abspath(__file__))
            DATABASE_URL = f'sqlite:///{os.path.join(current_dir, db_path).replace(os.sep, "/")}'
    SQLALCHEMY_DATABASE_URI = DATABASE_URL
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 20,
        'pool_recycle': 3600,
        'pool_pre_ping': True
    }
    
    # 日志配置
    LOG_DIRECTORY = os.getenv('LOG_DIRECTORY', 'logs')
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO').upper()
    LOG_MAX_BYTES = int(os.getenv('LOG_MAX_BYTES', 10485760))  # 10MB
    LOG_BACKUP_COUNT = int(os.getenv('LOG_BACKUP_COUNT', 5))
    
    # 时区配置
    TIMEZONE = os.getenv('TIMEZONE', 'Asia/Shanghai')
    
    # CORS配置
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    CORS_ORIGINS = [
        FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
        'http://localhost:5178',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000'
    ]

class DifyConfig:
    """Dify API配置类 - 集中管理所有Dify相关配置"""
    
    # Dify API基础配置
    API_BASE_URL = os.getenv('DIFY_API_URL', 'https://api.dify.ai/v1')
    API_KEY = os.getenv('DIFY_API_KEY')
    
    # API端点配置
    CHAT_MESSAGES_ENDPOINT = f"{API_BASE_URL}/chat-messages"
    CONVERSATIONS_ENDPOINT = f"{API_BASE_URL}/conversations"
    
    # 请求配置
    TIMEOUT = int(os.getenv('DIFY_TIMEOUT', 60))  # 60秒超时
    MAX_RETRIES = int(os.getenv('DIFY_MAX_RETRIES', 3))  # 最大重试次数
    
    # 响应模式配置
    RESPONSE_MODE_BLOCKING = 'blocking'  # 阻塞模式，等待完整响应
    RESPONSE_MODE_STREAMING = 'streaming'  # 流式模式，实时返回
    DEFAULT_RESPONSE_MODE = RESPONSE_MODE_BLOCKING
    
    # 用户配置
    DEFAULT_USER_ID = 'user'
    TEST_USER_ID = 'test_user'
    
    # 输入变量配置
    DEFAULT_INPUTS = {}  # 默认输入变量为空
    
    # 错误消息配置
    ERROR_MESSAGES = {
        'NO_API_KEY': 'Dify API密钥未配置，请检查环境变量DIFY_API_KEY',
        'INVALID_API_KEY_FORMAT': 'Dify API密钥格式可能不正确，应该以"app-"开头',
        'API_KEY_INVALID': 'API密钥无效或已过期，请检查DIFY_API_KEY配置',
        'RATE_LIMIT': 'API调用频率超限，请稍后重试',
        'SERVER_ERROR': 'Dify服务器内部错误，请稍后重试',
        'TIMEOUT': 'AI服务响应超时，请稍后重试',
        'CONNECTION_ERROR': '无法连接到AI服务，请检查网络连接',
        'NETWORK_ERROR': '网络请求异常',
        'UNKNOWN_ERROR': '服务异常',
        'EMPTY_MESSAGE': '消息内容不能为空'
    }
    
    # 成功消息配置
    SUCCESS_MESSAGES = {
        'CONNECTION_OK': 'Dify API连接正常',
        'MESSAGE_SENT': '消息发送成功',
        'CONVERSATION_CREATED': '对话创建成功'
    }
    
    # 景点提取配置
    ATTRACTION_KEYWORDS = [
        '景点', '地点', '推荐', '旅游', '游览', '参观', '打卡',
        '必去', '热门', '著名', '经典', '网红', '特色'
    ]
    
    PLACE_NAME_PATTERNS = [
        r'([^\s]{2,10}(?:景区|公园|寺|庙|塔|山|湖|河|街|路|广场|博物馆|纪念馆))',
        r'([^\s]{2,10}(?:古城|古镇|老街|步行街|商业街))',
        r'([^\s]{2,10}(?:大厦|中心|广场|公园|花园|乐园))',
        r'([^\s]{2,10}(?:故居|遗址|文化|艺术|科技)(?:馆|院|中心))',
    ]
    
    MAX_ATTRACTIONS_PER_RESPONSE = 5  # 每次最多返回的景点数量
    DEFAULT_ATTRACTION_IMAGE = 'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=400'
    
    @classmethod
    def validate_config(cls):
        """验证Dify配置是否正确"""
        errors = []
        warnings = []
        
        # 检查必需的配置
        if not cls.API_KEY:
            errors.append(cls.ERROR_MESSAGES['NO_API_KEY'])
        elif not cls.API_KEY.startswith('app-'):
            warnings.append(cls.ERROR_MESSAGES['INVALID_API_KEY_FORMAT'])
        
        if not cls.API_BASE_URL:
            errors.append('DIFY_API_URL未配置')
        
        return {
            'valid': len(errors) == 0,
            'errors': errors,
            'warnings': warnings
        }
    
    @classmethod
    def get_headers(cls):
        """获取API请求头"""
        return {
            'Authorization': f'Bearer {cls.API_KEY}',
            'Content-Type': 'application/json'
        }
    
    @classmethod
    def build_chat_request(cls, message, conversation_id=None, user_id=None, inputs=None, response_mode=None):
        """构建聊天请求数据"""
        return {
            'inputs': inputs or cls.DEFAULT_INPUTS,
            'query': message,
            'response_mode': response_mode or cls.DEFAULT_RESPONSE_MODE,
            'user': user_id or cls.DEFAULT_USER_ID,
            'conversation_id': conversation_id
        }

class NavigationConfig:
    """导航服务配置类"""
    
    # 地图服务配置
    MAP_SERVICES = {
        'amap': {
            'name': '高德地图',
            'url_template': 'https://uri.amap.com/navigation?to={address}',
            'priority': 1
        },
        'baidu': {
            'name': '百度地图',
            'url_template': 'https://api.map.baidu.com/direction?destination={address}&mode=driving',
            'priority': 2
        },
        'tencent': {
            'name': '腾讯地图',
            'url_template': 'https://apis.map.qq.com/uri/v1/routeplan?type=drive&to={address}',
            'priority': 3
        },
        'google': {
            'name': 'Google地图',
            'url_template': 'https://www.google.com/maps/dir/?api=1&destination={address}',
            'priority': 4
        },
        'apple': {
            'name': 'Apple地图',
            'url_template': 'http://maps.apple.com/?daddr={address}',
            'priority': 5
        }
    }
    
    DEFAULT_SERVICE = 'amap'  # 默认导航服务

class LogConfig:
    """日志配置类"""
    
    # 日志格式
    LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    DATE_FORMAT = '%Y-%m-%d %H:%M:%S'
    
    # 日志文件命名
    LOG_FILE_FORMAT = '{date}.log'  # 按日期命名
    
    # 日志级别映射
    LEVEL_MAPPING = {
        'DEBUG': 10,
        'INFO': 20,
        'WARNING': 30,
        'ERROR': 40,
        'CRITICAL': 50
    }

# 导出配置实例
app_config = Config()
dify_config = DifyConfig()
nav_config = NavigationConfig()
log_config = LogConfig()

# 启动时验证配置
def validate_all_configs():
    """验证所有配置"""
    print("验证应用配置...")
    
    # 验证Dify配置
    dify_validation = dify_config.validate_config()
    if not dify_validation['valid']:
        print("Dify配置验证失败:")
        for error in dify_validation['errors']:
            print(f"   - {error}")
        return False
    
    if dify_validation['warnings']:
        print("Dify配置警告:")
        for warning in dify_validation['warnings']:
            print(f"   - {warning}")
    
    print("配置验证通过")
    return True

if __name__ == '__main__':
    # 直接运行此文件时进行配置验证
    validate_all_configs()
    
    print("\n📋 当前配置信息:")
    print(f"   - Dify API地址: {dify_config.API_BASE_URL}")
    print(f"   - API密钥状态: {'已配置' if dify_config.API_KEY else '未配置'}")
    print(f"   - 数据库地址: {app_config.DATABASE_URL}")
    print(f"   - 服务端口: {app_config.PORT}")
    print(f"   - 调试模式: {app_config.DEBUG}")
