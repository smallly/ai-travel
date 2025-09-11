#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI旅行助手 - Flask API后端服务
为React前端提供API接口，集成Dify AI服务
"""

import logging
import requests
import re
from datetime import datetime
from flask import Flask, request, jsonify, g
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
# from flask_bcrypt import Bcrypt
# from flask_limiter import Limiter
# from flask_limiter.util import get_remote_address
from logging.handlers import RotatingFileHandler
from sqlalchemy.exc import IntegrityError
import pytz

# 导入配置管理模块
from config import app_config, dify_config, nav_config, log_config, validate_all_configs

# 导入认证工具
from utils.auth_utils import PasswordManager, TokenManager, token_required, validate_phone

# 验证配置
if not validate_all_configs():
    print("❌ 配置验证失败，应用无法启动")
    exit(1)

# 创建Flask应用
app = Flask(__name__)

# 应用配置 - 使用统一配置管理
app.config['SECRET_KEY'] = app_config.SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = app_config.SQLALCHEMY_DATABASE_URI
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = app_config.SQLALCHEMY_TRACK_MODIFICATIONS
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = app_config.SQLALCHEMY_ENGINE_OPTIONS

# 配置CORS - 使用统一配置管理
CORS(app, origins=app_config.CORS_ORIGINS)

# 创建目录
import os
os.makedirs('database', exist_ok=True)
os.makedirs(app_config.LOG_DIRECTORY, exist_ok=True)
os.makedirs('utils', exist_ok=True)

# 初始化数据库和扩展
db = SQLAlchemy(app)
# bcrypt = Bcrypt(app)
# limiter = Limiter(app, key_func=get_remote_address)

# 配置日志 - 使用统一配置管理
class EmojiFilter(logging.Filter):
    """过滤emoji字符以避免控制台编码错误"""
    def filter(self, record):
        if hasattr(record, 'msg'):
            # 移除emoji字符，保留基本信息
            import re
            emoji_pattern = re.compile("["
                                       u"\U0001F600-\U0001F64F"  # emoticons
                                       u"\U0001F300-\U0001F5FF"  # symbols & pictographs
                                       u"\U0001F680-\U0001F6FF"  # transport & map symbols
                                       u"\U0001F1E0-\U0001F1FF"  # flags (iOS)
                                       u"\U00002500-\U00002BEF"  # chinese char
                                       u"\U00002702-\U000027B0"
                                       u"\U00002702-\U000027B0"
                                       u"\U000024C2-\U0001F251"
                                       u"\U0001f926-\U0001f937"
                                       u"\U00010000-\U0010ffff"
                                       u"\u2640-\u2642" 
                                       u"\u2600-\u2B55"
                                       u"\u200d"
                                       u"\u23cf"
                                       u"\u23e9"
                                       u"\u231a"
                                       u"\ufe0f"  # dingbats
                                       u"\u3030"
                                       "]+", flags=re.UNICODE)
            if isinstance(record.msg, str):
                record.msg = emoji_pattern.sub('[EMOJI]', record.msg)
        return True

def setup_logging():
    """配置日志系统"""
    log_level = getattr(logging, app_config.LOG_LEVEL)
    
    formatter = logging.Formatter(
        log_config.LOG_FORMAT,
        datefmt=log_config.DATE_FORMAT
    )
    
    # 文件日志 - 保留完整的emoji
    log_filename = log_config.LOG_FILE_FORMAT.format(
        date=datetime.now().strftime("%Y-%m-%d")
    )
    file_handler = RotatingFileHandler(
        os.path.join(app_config.LOG_DIRECTORY, log_filename),
        maxBytes=app_config.LOG_MAX_BYTES,
        backupCount=app_config.LOG_BACKUP_COUNT,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    file_handler.setLevel(log_level)
    
    # 控制台日志 - 过滤emoji避免编码问题
    import sys
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.addFilter(EmojiFilter())
    simple_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(simple_formatter)
    console_handler.setLevel(log_level)
    
    app.logger.addHandler(file_handler)
    app.logger.addHandler(console_handler)
    app.logger.setLevel(log_level)

# 数据库模型
class User(db.Model):
    """用户模型"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    nickname = db.Column(db.String(50), nullable=False)
    avatar = db.Column(db.String(500), nullable=True)
    # wechat_openid = db.Column(db.String(100), nullable=True, unique=True, index=True)  # 已注释，后续启用时解除注释
    # wechat_unionid = db.Column(db.String(100), nullable=True, unique=True, index=True)  # 已注释，后续启用时解除注释
    password_hash = db.Column(db.String(255), nullable=False)  # 新增密码字段
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = db.Column(db.DateTime, nullable=True)
    
    # 关联关系
    conversations = db.relationship('Conversation', backref='user', lazy=True, cascade='all, delete-orphan')
    
    def set_password(self, password):
        """设置密码"""
        self.password_hash = PasswordManager.hash_password(password)
    
    def check_password(self, password):
        """验证密码"""
        return PasswordManager.verify_password(password, self.password_hash)
    
    def to_dict(self):
        beijing_tz = pytz.timezone(os.getenv('TIMEZONE', 'Asia/Shanghai'))
        created_beijing = self.created_at.replace(tzinfo=pytz.UTC).astimezone(beijing_tz)
        
        return {
            'user_id': str(self.id),
            'phone': self.phone,
            'nickname': self.nickname,
            'avatar': self.avatar,
            'created_at': created_beijing.strftime('%Y-%m-%d %H:%M:%S'),
            'is_active': self.is_active
        }

class Conversation(db.Model):
    """对话会话模型"""
    __tablename__ = 'conversations'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(255), nullable=False)
    dify_conversation_id = db.Column(db.String(255), nullable=True)  # 存储Dify的对话ID
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    messages = db.relationship('Message', backref='conversation', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        beijing_tz = pytz.timezone(os.getenv('TIMEZONE', 'Asia/Shanghai'))
        created_beijing = self.created_at.replace(tzinfo=pytz.UTC).astimezone(beijing_tz)
        
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'dify_conversation_id': self.dify_conversation_id,
            'created_at': created_beijing.strftime('%Y-%m-%d %H:%M:%S'),
            'message_count': len(self.messages)
        }

class Message(db.Model):
    """聊天消息模型"""
    __tablename__ = 'messages'
    
    id = db.Column(db.Integer, primary_key=True)
    conversation_id = db.Column(db.Integer, db.ForeignKey('conversations.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    sender_type = db.Column(db.String(10), nullable=False)  # 'user' or 'ai'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        beijing_tz = pytz.timezone(os.getenv('TIMEZONE', 'Asia/Shanghai'))
        created_beijing = self.created_at.replace(tzinfo=pytz.UTC).astimezone(beijing_tz)
        
        return {
            'id': self.id,
            'content': self.content,
            'sender_type': self.sender_type,
            'created_at': created_beijing.strftime('%H:%M:%S'),
            'timestamp': created_beijing.isoformat()
        }

# Dify API服务 - 使用统一配置管理
class DifyService:
    """Dify API服务类 - 基于官方API文档实现，使用统一配置管理"""
    
    def __init__(self):
        # 使用统一配置
        self.api_url = dify_config.API_BASE_URL
        self.api_key = dify_config.API_KEY
        self.timeout = dify_config.TIMEOUT
        self.max_retries = dify_config.MAX_RETRIES
        
        # 配置验证在应用启动时已完成
        app.logger.info(f'🤖 初始化Dify服务: {self.api_url}')
    
    def send_message(self, message, conversation_id=None, user_id=None):
        """
        发送消息到Dify API - 使用统一配置管理
        
        Args:
            message: 用户输入的消息
            conversation_id: 对话ID，如果为None则开始新对话
            user_id: 用户标识符
            
        Returns:
            dict: 包含success状态和响应数据的字典
        """
        try:
            if not self.api_key:
                return {
                    'success': False,
                    'error': dify_config.ERROR_MESSAGES['NO_API_KEY']
                }
            
            # 使用统一配置构建请求头
            headers = dify_config.get_headers()
            
            # 使用统一配置构建请求体
            data = dify_config.build_chat_request(
                message=message,
                conversation_id=conversation_id,
                user_id=user_id or dify_config.DEFAULT_USER_ID
            )
            
            # 记录请求信息
            if conversation_id:
                app.logger.info(f'🔄 继续对话 {conversation_id}: {message[:50]}...')
            else:
                app.logger.info(f'🆕 开始新对话: {message[:50]}...')
            
            app.logger.info(f'🤖 调用Dify API: {dify_config.CHAT_MESSAGES_ENDPOINT}')
            
            # 发送请求到Dify API - 使用配置的端点和超时时间
            response = requests.post(
                dify_config.CHAT_MESSAGES_ENDPOINT,
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            
            app.logger.info(f'📡 Dify API响应状态: {response.status_code}')
            
            if response.status_code == 200:
                result = response.json()
                
                # 记录响应信息
                answer = result.get('answer', '')
                new_conversation_id = result.get('conversation_id', '')
                
                app.logger.info(f'✅ Dify响应成功:')
                app.logger.info(f'   - 对话ID: {new_conversation_id}')
                app.logger.info(f'   - 回复长度: {len(answer)}字符')
                app.logger.info(f'   - 回复预览: {answer[:100]}...')
                
                return {
                    'success': True,
                    'data': result
                }
            else:
                # 详细记录错误信息
                error_text = response.text
                app.logger.error(f'❌ Dify API调用失败:')
                app.logger.error(f'   - 状态码: {response.status_code}')
                app.logger.error(f'   - 错误内容: {error_text}')
                
                # 使用统一配置的错误消息
                if response.status_code == 401:
                    error_msg = dify_config.ERROR_MESSAGES['API_KEY_INVALID']
                elif response.status_code == 429:
                    error_msg = dify_config.ERROR_MESSAGES['RATE_LIMIT']
                elif response.status_code == 500:
                    error_msg = dify_config.ERROR_MESSAGES['SERVER_ERROR']
                else:
                    error_msg = f'API调用失败 (状态码: {response.status_code})'
                
                return {
                    'success': False,
                    'error': error_msg,
                    'details': error_text
                }
                
        except requests.exceptions.Timeout:
            app.logger.error('⏰ Dify API调用超时')
            return {
                'success': False,
                'error': dify_config.ERROR_MESSAGES['TIMEOUT']
            }
        except requests.exceptions.ConnectionError:
            app.logger.error('🔌 无法连接到Dify API服务器，使用本地模拟回复')
            # 使用本地模拟回复功能
            return self._get_local_mock_response(message, conversation_id)
        except requests.exceptions.RequestException as e:
            app.logger.error(f'📡 网络请求异常: {str(e)}，使用本地模拟回复')
            # 使用本地模拟回复功能
            return self._get_local_mock_response(message, conversation_id)
        except Exception as e:
            app.logger.error(f'💥 Dify API调用异常: {str(e)}，使用本地模拟回复')
            # 使用本地模拟回复功能
            return self._get_local_mock_response(message, conversation_id)
    
    def _get_local_mock_response(self, message, conversation_id=None):
        """
        本地模拟AI回复功能 - 当Dify不可用时提供智能回复
        """
        import random
        import uuid
        from datetime import datetime
        
        # 根据用户消息内容生成智能回复
        message_lower = message.lower()
        
        # 旅游相关回复
        if any(keyword in message_lower for keyword in ['旅游', '旅行', '景点', '游玩', '出行']):
            mock_responses = [
                "我是您的AI旅行助手！🎯 虽然暂时无法访问在线服务，但我可以为您提供一些通用的旅行建议：\n\n• 提前规划行程，预订酒店和交通\n• 查看目的地天气，准备合适衣物\n• 了解当地文化和习俗\n• 准备必要的证件和物品\n• 购买旅行保险确保安全\n\n如果您有具体的目的地，我很乐意为您推荐热门景点！",
                "作为您的旅行助手，我建议您：\n\n🗺️ **行程规划**\n• 确定旅行日期和预算\n• 选择交通方式和住宿\n• 列出必去景点清单\n\n📱 **实用工具**\n• 下载地图和翻译App\n• 备份重要证件照片\n• 准备当地货币\n\n✨ 请告诉我您想去哪里，我会提供更具体的建议！"
            ]
        elif any(keyword in message_lower for keyword in ['北京', '故宫', '天安门', '长城']):
            mock_responses = [
                "北京是一座充满历史韵味的城市！🏛️ 推荐您游览：\n\n**经典景点：**\n• 故宫博物院 - 明清皇宫，世界文化遗产\n• 天安门广场 - 世界最大城市中心广场\n• 八达岭长城 - 万里长城精华段\n• 颐和园 - 中国古典园林典范\n• 天坛 - 明清皇帝祭天场所\n\n**美食推荐：**\n• 北京烤鸭、炸酱面、豆汁焦圈\n• 南锣鼓巷小吃街\n\n需要具体的交通和住宿建议吗？"
            ]
        elif any(keyword in message_lower for keyword in ['上海', '外滩', '东方明珠']):
            mock_responses = [
                "上海是国际化大都市！🌃 为您推荐：\n\n**必游景点：**\n• 外滩 - 万国建筑博览群\n• 东方明珠塔 - 上海地标建筑\n• 豫园 - 江南古典园林\n• 南京路步行街 - 购物天堂\n• 田子坊 - 艺术创意园区\n\n**特色体验：**\n• 黄浦江夜游\n• 新天地酒吧街\n• 小笼包美食之旅\n\n想了解具体的游玩路线吗？"
            ]
        elif any(keyword in message_lower for keyword in ['你好', 'hello', 'hi', '早上好', '下午好', '晚上好']):
            mock_responses = [
                "您好！我是您的AI旅行助手 🤖✨\n\n虽然目前无法连接到在线AI服务，但我依然可以帮助您：\n\n🔗 **链接解析**\n• 小红书、大众点评等旅行链接\n• 提取景点信息和地址\n\n📍 **行程规划**\n• 个性化旅行建议\n• 景点推荐和路线规划\n\n🗺️ **导航服务**\n• 多平台地图导航\n• 精确位置定位\n\n请告诉我您想去哪里或发送旅行链接，我会为您提供帮助！",
                "欢迎使用AI旅行助手！👋\n\n我是您专属的旅行顾问，可以为您提供：\n• 🎯 智能行程规划\n• 📍 景点信息解析\n• 🗺️导航路线指引\n• 💡 当地特色推荐\n\n快发送一个旅行链接或告诉我您想去的目的地吧！我会根据您的需求提供个性化建议。"
            ]
        else:
            # 通用回复
            mock_responses = [
                "作为您的AI旅行助手，我注意到您的询问。虽然目前无法连接到完整的AI服务，但我会尽力帮助您！\n\n如果您需要：\n• 🗺️ 旅行规划建议\n• 📍 景点信息查询\n• 🚗 交通导航指引\n• 🏨 住宿餐饮推荐\n\n请提供更具体的信息，比如您想去的城市或发送旅行相关的链接，我会为您提供详细的帮助！",
                "感谢您的咨询！🤔 虽然暂时无法访问完整的AI服务，但我依然想帮助您。\n\n请尝试：\n• 告诉我具体的旅行目的地\n• 分享您感兴趣的旅行链接\n• 描述您的旅行需求和偏好\n\n这样我就能为您提供更准确的建议和信息了！"
            ]
        
        # 随机选择一个回复
        answer = random.choice(mock_responses)
        
        # 生成模拟的对话ID
        mock_conversation_id = conversation_id or str(uuid.uuid4())
        
        app.logger.info(f'🤖 使用本地模拟回复，长度: {len(answer)}字符')
        
        # 返回Dify格式的响应
        return {
            'success': True,
            'data': {
                'answer': answer,
                'conversation_id': mock_conversation_id,
                'created_at': datetime.utcnow().timestamp()
            }
        }
    
    def extract_attractions(self, text):
        """
        从AI响应中提取景点信息 - 增强版，支持地址和经纬度提取
        
        Args:
            text: AI返回的文本内容
            
        Returns:
            list: 提取的景点信息列表，包含coordinates字段
        """
        attractions = []
        
        # 记录原始文本用于调试
        app.logger.info(f'📝 开始解析AI文本，长度: {len(text)}')
        app.logger.info(f'📝 文本预览: {text[:200]}...')
        
        
        # 先尝试按数字编号分割（如：1. 八达岭长城）
        numbered_sections = re.split(r'\n\s*\d+\.\s*', text)
        
        # 如果没有数字编号，按段落分割
        if len(numbered_sections) <= 2:
            numbered_sections = re.split(r'\n\n+', text)
        
        app.logger.info(f'📝 分割成 {len(numbered_sections)} 个段落')
        
        for i, section in enumerate(numbered_sections):
            section = section.strip()
            if len(section) < 5:  # 跳过太短的段落
                continue
                
            app.logger.info(f'📝 处理段落 {i}: {section[:100]}...')
            
            # 提取地点名称 - 增加智能过滤
            attraction_name = None
            
            # 方法1: 查找段落开头的地点名称
            first_line = section.split('\n')[0].strip()
            if len(first_line) > 0 and len(first_line) < 50:
                # 清理可能的序号 - 更彻底的清理
                clean_name = re.sub(r'^\d+[\.\。、]\s*', '', first_line)  # 数字+点/句号/顿号
                clean_name = re.sub(r'^[•·\-\*]\s*', '', clean_name)     # 符号
                clean_name = re.sub(r'^[一二三四五六七八九十]\s*[\.\。、]\s*', '', clean_name)  # 中文数字
                clean_name = clean_name.strip()  # 确保去掉多余空格
                
                if len(clean_name) > 1:
                    # 过滤掉明显不是地点的内容
                    invalid_patterns = [
                        # 行程规划类
                        r'(行程|规划|总结|建议|推荐|注意|提醒|小贴士|攻略)',
                        # 时间类
                        r'(第\d+天|上午|下午|晚上|早上|中午|时间|安排)',
                        # 交通类描述
                        r'(交通|路线|导航|距离|车程|步行|地铁|公交)',
                        # 费用类
                        r'(费用|价格|门票|花费|预算|成本)',
                        # 其他非地点内容
                        r'(总体|整体|概述|介绍|说明|详情|特色|亮点)',
                        r'^(如何|怎么|为什么|什么|哪里|当地)',
                        # 问候语和结束语
                        r'^(希望|祝您|欢迎|感谢|如果|需要)'
                    ]
                    
                    # 检查是否匹配无效模式
                    is_invalid = any(re.search(pattern, clean_name, re.IGNORECASE) for pattern in invalid_patterns)
                    
                    if not is_invalid:
                        # 检查是否包含地点关键词
                        location_keywords = [
                            '景区', '景点', '公园', '广场', '寺庙', '教堂', '博物馆', '纪念馆',
                            '古城', '古镇', '老街', '步行街', '商业街', '购物中心',
                            '山', '湖', '河', '海', '岛', '峡', '谷', '洞', '泉',
                            '长城', '故宫', '天安门', '颐和园', '天坛', '圆明园',
                            '大厦', '中心', '塔', '桥', '门', '城', '府', '院',
                            '村', '镇', '县', '区', '路', '街', '巷'
                        ]
                        
                        has_location_keyword = any(keyword in clean_name for keyword in location_keywords)
                        
                        # 只有包含地点关键词的才被认为是有效地点
                        if has_location_keyword:
                            attraction_name = clean_name
            
            # 方法2: 查找包含景点关键词的名称
            if not attraction_name:
                attraction_patterns = [
                    r'([^，,。.！!？?；;：:\n]{2,}(?:长城|山|湖|河|海|岛|公园|寺|庙|塔|景区|风景区))',
                    r'([^，,。.！!？?；;：:\n]{2,}(?:博物馆|纪念馆|展览馆|文化宫|体育馆|图书馆))',
                    r'([^，,。.！!？?；;：:\n]{2,}(?:广场|中心|大厦|大楼|桥|古城|古镇))'
                ]
                
                for pattern in attraction_patterns:
                    matches = re.findall(pattern, section)
                    if matches:
                        attraction_name = matches[0].strip()
                        break
            
            if not attraction_name or len(attraction_name) < 2:
                app.logger.info(f'📝 段落 {i} 未找到有效地点名称或被过滤')
                continue
                
            app.logger.info(f'📝 提取到地点名称: {attraction_name}')
                
            # 提取经纬度信息
            coordinates = None
            coord_patterns = [
                r'经纬度[：:]\s*([0-9.]+)[,，]\s*([0-9.]+)',
                r'坐标[：:]\s*([0-9.]+)[,，]\s*([0-9.]+)',
                r'([0-9]+\.[0-9]+)[,，]\s*([0-9]+\.[0-9]+)'
            ]
            
            for pattern in coord_patterns:
                coord_match = re.search(pattern, section)
                if coord_match:
                    try:
                        lat = float(coord_match.group(1))
                        lng = float(coord_match.group(2))
                        # 验证经纬度范围
                        if -90 <= lat <= 90 and -180 <= lng <= 180:
                            coordinates = {'lat': lat, 'lng': lng}
                            app.logger.info(f'📝 提取到经纬度: {lat}, {lng}')
                            break
                    except ValueError:
                        continue
            
            # 提取地址信息
            address = f'{attraction_name}'  # 默认使用地点名称
            address_patterns = [
                r'地址[：:]\s*([^，,。.！!？?；;：:\n]+)',
                r'位于\s*([^，,。.！!？?；;：:\n]+)',
                r'坐落在\s*([^，,。.！!？?；;：:\n]+)',
                r'([^，,。.！!？?；;：:\n]*(?:省|市|区|县|镇|街道|路|街|巷|号)[^，,。.！!？?；;：:\n]*)'
            ]
            
            for pattern in address_patterns:
                match = re.search(pattern, section)
                if match:
                    found_address = match.group(1).strip()
                    if 5 <= len(found_address) <= 100:  # 合理长度的地址
                        address = found_address
                        app.logger.info(f'📝 提取到地址: {address}')
                        break
            
            # 创建景点对象
            attraction_data = {
                'id': f'attraction_{int(datetime.now().timestamp())}_{len(attractions)}',
                'name': attraction_name,
                'address': address,
                'image': dify_config.DEFAULT_ATTRACTION_IMAGE,
                'type': '景点'
            }
            
            # 如果有经纬度信息，添加到景点数据中
            if coordinates:
                attraction_data['coordinates'] = coordinates
            
            attractions.append(attraction_data)
            app.logger.info(f'📝 成功创建景点: {attraction_name}')
            
            # 限制景点数量
            if len(attractions) >= dify_config.MAX_ATTRACTIONS_PER_RESPONSE:
                break
        
        app.logger.info(f'🏛️ 从AI回复中提取到 {len(attractions)} 个景点信息')
        for attraction in attractions:
            coords_info = f" (经纬度: {attraction['coordinates']['lat']}, {attraction['coordinates']['lng']})" if 'coordinates' in attraction else ""
            app.logger.info(f"   - {attraction['name']}: {attraction['address']}{coords_info}")
        
        return attractions
    
    def test_connection(self):
        """
        测试Dify API连接 - 使用统一配置管理
        
        Returns:
            dict: 测试结果
        """
        try:
            result = self.send_message('测试连接', user_id=dify_config.TEST_USER_ID)
            if result['success']:
                return {
                    'success': True,
                    'message': dify_config.SUCCESS_MESSAGES['CONNECTION_OK']
                }
            else:
                return {
                    'success': False,
                    'message': f'Dify API连接失败: {result["error"]}'
                }
        except Exception as e:
            return {
                'success': False,
                'message': f'连接测试异常: {str(e)}'
            }

# 初始化Dify服务
dify_service = DifyService()

# 用户认证相关函数
import jwt
import hashlib
import time
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import re

def generate_token(user_id):
    """生成JWT token"""
    payload = {
        'user_id': user_id,
        'iat': time.time(),
        'exp': time.time() + 30 * 24 * 60 * 60  # 30天过期
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def verify_token(token):
    """验证JWT token"""
    try:
        payload = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def require_auth(f):
    """认证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]  # Bearer <token>
            except IndexError:
                pass
        
        if not token:
            return jsonify({'success': False, 'error': '未提供认证令牌'}), 401
        
        user_id = verify_token(token)
        if not user_id:
            return jsonify({'success': False, 'error': '认证令牌无效或已过期'}), 401
        
        # 验证用户是否存在且激活
        user = User.query.filter_by(id=user_id, is_active=True).first()
        if not user:
            return jsonify({'success': False, 'error': '用户不存在或已禁用'}), 401
        
        request.current_user = user
        return f(*args, **kwargs)
    return decorated

# API路由
@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({
        'status': 'ok',
        'message': 'AI旅行助手API服务正常运行',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'version': '1.0.0'
    })

@app.route('/api/conversations', methods=['GET'])
@require_auth
def get_conversations():
    """获取用户的对话列表"""
    try:
        user = request.current_user
        conversations = Conversation.query.filter_by(user_id=user.id).order_by(Conversation.updated_at.desc()).all()
        return jsonify({
            'success': True,
            'data': [conv.to_dict() for conv in conversations]
        })
    except Exception as e:
        app.logger.error(f'获取对话列表失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/conversations', methods=['POST'])
@require_auth
def create_conversation():
    """创建新对话"""
    try:
        user = request.current_user
        data = request.get_json() or {}
        title = data.get('title', f'对话 {datetime.now().strftime("%m-%d %H:%M")}')
        
        conversation = Conversation(title=title, user_id=user.id)
        db.session.add(conversation)
        db.session.commit()
        
        app.logger.info(f'📝 用户 {user.phone} 创建新对话: {title}')
        
        return jsonify({
            'success': True,
            'data': conversation.to_dict()
        })
        
    except Exception as e:
        app.logger.error(f'创建对话失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/conversations/<int:conversation_id>', methods=['DELETE'])
@require_auth
def delete_conversation(conversation_id):
    """删除对话（仅限用户自己的对话）"""
    try:
        user = request.current_user
        conversation = Conversation.query.filter_by(
            id=conversation_id, 
            user_id=user.id
        ).first_or_404()
        title = conversation.title
        
        db.session.delete(conversation)
        db.session.commit()
        
        app.logger.info(f'🗑️ 用户 {user.phone} 删除对话: {title}')
        
        return jsonify({
            'success': True,
            'message': '对话已删除'
        })
        
    except Exception as e:
        app.logger.error(f'删除对话失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/conversations/<int:conversation_id>/messages', methods=['GET'])
@require_auth
def get_messages(conversation_id):
    """获取对话消息（仅限用户自己的对话）"""
    try:
        user = request.current_user
        conversation = Conversation.query.filter_by(
            id=conversation_id, 
            user_id=user.id
        ).first_or_404()
        
        messages = Message.query.filter_by(conversation_id=conversation_id).order_by(Message.created_at).all()
        
        return jsonify({
            'success': True,
            'data': {
                'conversation': conversation.to_dict(),
                'messages': [msg.to_dict() for msg in messages]
            }
        })
        
    except Exception as e:
        app.logger.error(f'获取消息失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/chat/send', methods=['POST'])
@require_auth
def send_message():
    """发送消息并获取AI回复"""
    try:
        user = request.current_user
        data = request.get_json()
        message_content = data.get('message', '').strip()
        conversation_id = data.get('conversation_id')
        
        if not message_content:
            return jsonify({
                'success': False,
                'error': dify_config.ERROR_MESSAGES['EMPTY_MESSAGE']
            }), 400
        
        # 数据库对话记录
        db_conversation = None
        dify_conversation_id = None
        
        # 如果提供了conversation_id，尝试获取现有对话（必须属于当前用户）
        if conversation_id:
            db_conversation = Conversation.query.filter_by(
                id=conversation_id, 
                user_id=user.id
            ).first()
            if db_conversation:
                # 从数据库对话记录中获取Dify的conversation_id
                dify_conversation_id = db_conversation.dify_conversation_id
        
        # 如果没有找到现有对话，创建新对话
        if not db_conversation:
            title = message_content[:30] + ('...' if len(message_content) > 30 else '')
            db_conversation = Conversation(
                title=title,
                user_id=user.id
            )
            db.session.add(db_conversation)
            db.session.flush()  # 获取ID但不提交
        
        # 保存用户消息
        user_message = Message(
            conversation_id=db_conversation.id,
            content=message_content,
            sender_type='user'
        )
        db.session.add(user_message)
        
        # 调用Dify API（传入Dify的conversation_id，不是数据库的ID）
        app.logger.info(f'📤 用户 {user.phone} 发送消息: {message_content[:50]}...')
        app.logger.info(f'📤 使用Dify对话ID: {dify_conversation_id}')
        
        result = dify_service.send_message(
            message_content, 
            conversation_id=dify_conversation_id,
            user_id=f"user_{user.id}"
        )
        
        if result['success']:
            dify_data = result['data']
            ai_content = dify_data.get('answer', '抱歉，我暂时无法回答您的问题。')
            
            # 获取Dify返回的conversation_id
            returned_conversation_id = dify_data.get('conversation_id', '')
            
            # 如果这是新对话，保存Dify的conversation_id
            if not dify_conversation_id and returned_conversation_id:
                db_conversation.dify_conversation_id = returned_conversation_id
                app.logger.info(f'🆕 保存新Dify对话ID: {returned_conversation_id}')
            
            app.logger.info(f'✅ AI回复成功: {ai_content[:100]}...')
            
        else:
            ai_content = f"抱歉，AI服务暂时不可用：{result.get('error', '未知错误')}"
            app.logger.error(f'❌ AI回复失败: {result.get("error")}')
        
        # 保存AI回复
        ai_message = Message(
            conversation_id=db_conversation.id,
            content=ai_content,
            sender_type='ai'
        )
        db.session.add(ai_message)
        
        # 更新对话时间
        db_conversation.updated_at = datetime.utcnow()
        db.session.commit()
        
        # 提取景点信息
        attractions = dify_service.extract_attractions(ai_content)
        
        app.logger.info(f'💬 对话完成: 用户={user.phone}, 数据库ID={db_conversation.id}, 景点数={len(attractions)}')
        
        return jsonify({
            'success': True,
            'data': {
                'conversation_id': db_conversation.id,  # 返回数据库的对话ID
                'user_message': user_message.to_dict(),
                'ai_message': ai_message.to_dict(),
                'attractions': attractions
            }
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'💥 发送消息失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 用户认证路由
# 微信网页授权手机号 - 已注释，后续启用时解除注释
# @app.route('/api/auth/wechat/phone', methods=['POST'])
# def wechat_phone_auth():
#     """微信网页授权手机号"""
#     try:
#         data = request.get_json()
#         auth_code = data.get('auth_code')
        
#         if not auth_code:
#             return jsonify({'success': False, 'error': '授权码不能为空'}), 400
        
#         # 这里应该调用微信API验证授权码并获取手机号
#         # 目前使用模拟数据
#         app.logger.info(f'📱 微信网页授权: {auth_code}')
        
#         # 模拟从微信获取的用户信息
#         phone = f"1{hash(auth_code) % 10000000000:010d}"  # 模拟手机号
#         openid = f"wx_openid_{hash(auth_code) % 100000}"
        
#         # 查找或创建用户
#         user = User.query.filter_by(phone=phone).first()
#         if not user:
#             user = User(
#                 phone=phone,
#                 nickname=f"用户{phone[-4:]}",
#                 wechat_openid=openid
#             )
#             db.session.add(user)
#             db.session.flush()
        
#         # 更新最后登录时间
#         user.last_login_at = datetime.utcnow()
#         db.session.commit()
        
#         # 生成token
#         token = generate_token(user.id)
        
#         app.logger.info(f'✅ 用户登录成功: {user.phone}')
        
#         return jsonify({
#             'success': True,
#             'data': {
#                 'token': token,
#                 **user.to_dict()
#             }
#         })
        
#     except Exception as e:
#         db.session.rollback()
#         app.logger.error(f'微信授权失败: {str(e)}')
#         return jsonify({'success': False, 'error': str(e)}), 500

# 微信小程序手机号授权 - 已注释，后续启用时解除注释
# @app.route('/api/auth/miniprogram/phone', methods=['POST'])
# def miniprogram_phone_auth():
#     """微信小程序手机号授权"""
#     try:
#         data = request.get_json()
#         encrypted_data = data.get('encryptedData')
#         iv = data.get('iv')
#         session_key = data.get('sessionKey')
        
#         if not all([encrypted_data, iv, session_key]):
#             return jsonify({'success': False, 'error': '授权数据不完整'}), 400
        
#         # 这里应该解密微信小程序的加密数据
#         # 目前使用模拟数据
#         app.logger.info('📱 微信小程序授权')
        
#         # 模拟从微信获取的用户信息
#         phone = f"1{hash(encrypted_data) % 10000000000:010d}"  # 模拟手机号
#         openid = f"mp_openid_{hash(encrypted_data) % 100000}"
        
#         # 查找或创建用户
#         user = User.query.filter_by(phone=phone).first()
#         if not user:
#             user = User(
#                 phone=phone,
#                 nickname=f"用户{phone[-4:]}",
#                 wechat_openid=openid
#             )
#             db.session.add(user)
#             db.session.flush()
        
#         # 更新最后登录时间
#         user.last_login_at = datetime.utcnow()
#         db.session.commit()
        
#         # 生成token
#         token = generate_token(user.id)
        
#         app.logger.info(f'✅ 用户登录成功: {user.phone}')
        
#         return jsonify({
#             'success': True,
#             'data': {
#                 'token': token,
#                 **user.to_dict()
#             }
#         })
        
#     except Exception as e:
#         db.session.rollback()
#         app.logger.error(f'小程序授权失败: {str(e)}')
#         return jsonify({'success': False, 'error': str(e)}), 500

# 手机号密码注册 - 增强版
@app.route('/api/auth/register', methods=['POST'])
# @limiter.limit("3 per minute")
def register_with_phone():
    """手机号密码注册 - 增强版"""
    try:
        data = request.get_json()
        phone = data.get('phone', '').strip()
        password = data.get('password', '').strip()
        nickname = data.get('nickname', '').strip()
        ip_address = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
        
        # 1. 基础验证
        if not phone or not password:
            return jsonify({
                'success': False, 
                'error': '手机号和密码不能为空',
                'code': 'MISSING_REQUIRED_FIELDS'
            }), 400
        
        # 2. 手机号格式验证
        if not validate_phone(phone):
            return jsonify({
                'success': False, 
                'error': '请输入正确的11位手机号',
                'code': 'INVALID_PHONE_FORMAT'
            }), 400
        
        # 3. 密码强度验证
        password_validation = PasswordManager.validate_password_strength(password)
        if not password_validation['valid']:
            return jsonify({
                'success': False,
                'error': password_validation['errors'][0],
                'code': 'WEAK_PASSWORD'
            }), 400
        
        # 4. 检查手机号唯一性
        existing_user = User.query.filter_by(phone=phone).first()
        if existing_user:
            app.logger.warning(f"重复注册尝试: {phone} from {ip_address}")
            return jsonify({
                'success': False,
                'error': '该手机号已被注册，请直接登录或使用找回密码功能',
                'code': 'PHONE_ALREADY_EXISTS'
            }), 409
        
        # 5. 创建用户账户
        user = User(
            phone=phone,
            nickname=nickname or f"用户{phone[-4:]}",
            password_hash='temp'  # 临时值，下面会设置正确密码
        )
        user.set_password(password)  # 使用安全密码哈希
        
        db.session.add(user)
        db.session.flush()  # 获取ID但不提交
        
        # 6. 生成认证令牌
        token_manager = TokenManager(app.config['SECRET_KEY'])
        tokens = token_manager.generate_token_pair(user)
        
        db.session.commit()
        
        app.logger.info(f"用户注册成功: {phone} from {ip_address}")
        
        return jsonify({
            'success': True,
            'data': {
                **tokens,
                'user': {
                    'id': user.id,
                    'phone': user.phone,
                    'nickname': user.nickname,
                    'avatar': user.avatar,
                    'created_at': user.created_at.isoformat()
                }
            },
            'message': '注册成功！'
        }), 201
        
    except IntegrityError:
        db.session.rollback()
        app.logger.error(f"数据库约束冲突: 重复手机号 {phone}")
        return jsonify({
            'success': False,
            'error': '该手机号已被注册',
            'code': 'DATABASE_CONSTRAINT_ERROR'
        }), 409
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f"注册异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': '注册失败，请稍后重试',
            'code': 'INTERNAL_SERVER_ERROR'
        }), 500

# 手机号密码登录 - 增强版
@app.route('/api/auth/login', methods=['POST'])
# @limiter.limit("10 per minute")
def login_with_phone():
    """手机号密码登录 - 增强版"""
    try:
        data = request.get_json()
        phone = data.get('phone', '').strip()
        password = data.get('password', '').strip()
        ip_address = request.environ.get('HTTP_X_REAL_IP', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')
        
        # 基础验证
        if not phone or not password:
            return jsonify({
                'success': False, 
                'error': '手机号和密码不能为空'
            }), 400
        
        # 查找用户
        user = User.query.filter_by(phone=phone).first()
        
        if not user or not user.check_password(password):
            app.logger.warning(f"登录失败: {phone} from {ip_address}")
            return jsonify({
                'success': False,
                'error': '手机号或密码错误'
            }), 401
            
        if not user.is_active:
            app.logger.warning(f"登录失败 - 账户已停用: {phone} from {ip_address}")
            return jsonify({
                'success': False,
                'error': '账户已被停用，请联系客服'
            }), 403
        
        # 更新用户登录信息
        user.last_login_at = datetime.utcnow()
        user.login_count = (user.login_count or 0) + 1
        user.last_ip = ip_address
        user.last_user_agent = user_agent
        
        # 生成token
        token_manager = TokenManager(app.config['SECRET_KEY'])
        tokens = token_manager.generate_token_pair(user)
        
        db.session.commit()
        
        app.logger.info(f"用户登录成功: {phone} from {ip_address}")
        
        return jsonify({
            'success': True,
            'data': {
                **tokens,
                'user': {
                    'id': user.id,
                    'phone': user.phone,
                    'nickname': user.nickname,
                    'avatar': user.avatar,
                    'created_at': user.created_at.isoformat()
                }
            }
        })
        
    except Exception as e:
        app.logger.error(f"登录异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': '登录失败，请重试'
        }), 500

@app.route('/api/auth/verify', methods=['GET'])
@token_required
def verify_auth():
    """验证用户认证状态"""
    try:
        current_user = g.current_user
        return jsonify({
            'success': True,
            'data': {
                'user_id': current_user.id,
                'phone': current_user.phone,
                'nickname': current_user.nickname,
                'avatar': current_user.avatar
            }
        })
    except Exception as e:
        app.logger.error(f'验证认证状态失败: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/refresh', methods=['POST'])
# @limiter.limit("5 per minute")
def refresh_token():
    """刷新访问令牌"""
    try:
        data = request.get_json() or {}
        refresh_token_value = data.get('refresh_token')
        
        if not refresh_token_value:
            return jsonify({
                'success': False,
                'error': '缺少刷新令牌',
                'code': 'MISSING_REFRESH_TOKEN'
            }), 400
        
        # 验证刷新令牌
        token_manager = TokenManager(app.config['SECRET_KEY'])
        try:
            payload = token_manager.verify_token(refresh_token_value, 'refresh')
            user_id = payload.get('user_id')
        except Exception as e:
            return jsonify({
                'success': False,
                'error': '刷新令牌无效或已过期',
                'code': 'INVALID_REFRESH_TOKEN'
            }), 401
        
        # 查询用户
        user = User.query.filter_by(
            id=user_id, 
            is_active=True,
            deleted_at=None
        ).first()
        
        if not user:
            return jsonify({
                'success': False,
                'error': '用户不存在或已禁用',
                'code': 'USER_NOT_FOUND'
            }), 401
        
        # 生成新的令牌对
        tokens = token_manager.generate_token_pair(user)
        
        app.logger.info(f'🔄 令牌刷新成功: {user.phone}')
        
        return jsonify({
            'success': True,
            'data': tokens
        })
        
    except Exception as e:
        app.logger.error(f'刷新令牌失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': '刷新令牌失败',
            'code': 'REFRESH_ERROR'
        }), 500

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout():
    """用户登出"""
    try:
        current_user = g.current_user
        app.logger.info(f'👋 用户登出: {current_user.phone}')
        
        return jsonify({
            'success': True,
            'data': {'message': '登出成功'}
        })
    except Exception as e:
        app.logger.error(f'登出失败: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/profile', methods=['GET'])
@require_auth
def get_profile():
    """获取用户信息"""
    try:
        user = request.current_user
        return jsonify({
            'success': True,
            'data': user.to_dict()
        })
    except Exception as e:
        app.logger.error(f'获取用户信息失败: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/user/profile', methods=['PUT'])
@require_auth
def update_profile():
    """更新用户信息"""
    try:
        user = request.current_user
        data = request.get_json()
        
        if 'nickname' in data:
            user.nickname = data['nickname']
        if 'avatar' in data:
            user.avatar = data['avatar']
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        app.logger.info(f'📝 用户信息更新: {user.phone}')
        
        return jsonify({
            'success': True,
            'data': user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'更新用户信息失败: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/locations/navigation', methods=['POST'])
def get_navigation():
    """获取导航链接"""
    try:
        data = request.get_json()
        address = data.get('address', '')
        
        if not address:
            return jsonify({
                'success': False,
                'error': '地址不能为空'
            }), 400
        
        # 使用统一配置生成导航链接
        navigation_links = {}
        for service_key, service_config in nav_config.MAP_SERVICES.items():
            navigation_links[service_key] = service_config['url_template'].format(address=address)
        
        app.logger.info(f'🧭 生成导航链接: {address}')
        
        return jsonify({
            'success': True,
            'data': {
                'address': address,
                'navigation_links': navigation_links
            }
        })
        
    except Exception as e:
        app.logger.error(f'生成导航链接失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 错误处理
@app.errorhandler(404)
def not_found_error(error):
    return jsonify({
        'success': False,
        'error': 'API接口不存在',
        'code': 404
    }), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({
        'success': False,
        'error': '服务器内部错误',
        'code': 500
    }), 500

# 初始化数据库
def init_db():
    """初始化数据库"""
    with app.app_context():
        db.create_all()
        app.logger.info('📊 数据库初始化完成')

if __name__ == '__main__':
    # 设置日志
    setup_logging()
    
    # 初始化数据库
    init_db()
    
    # 测试Dify连接（可选）
    app.logger.info('🔍 测试Dify API连接...')
    connection_test = dify_service.test_connection()
    if connection_test['success']:
        app.logger.info(f'✅ {connection_test["message"]}')
    else:
        app.logger.warning(f'⚠️ {connection_test["message"]}')
    
    # 使用统一配置启动应用
    app.logger.info('🚀 AI旅行助手API服务启动成功')
    app.logger.info(f'📍 API地址: http://{app_config.HOST}:{app_config.PORT}/api')
    app.logger.info(f'🌍 运行环境: {"production" if not app_config.DEBUG else "development"}')
    app.logger.info(f'🎯 前端地址: {app_config.FRONTEND_URL}')
    app.logger.info(f'🤖 Dify API: {dify_config.API_BASE_URL}')
    app.logger.info(f'📊 数据库: {app_config.DATABASE_URL}')
    
    # 启动应用
    app.run(host=app_config.HOST, port=app_config.PORT, debug=app_config.DEBUG)
