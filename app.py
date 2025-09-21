#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI旅行助手 - Flask API后端服务 (Supabase版本)
为React前端提供API接口，使用Supabase作为数据库
"""

import logging
import requests
import re
import os
from datetime import datetime
from flask import Flask, request, jsonify, g, send_from_directory, send_file
from flask_cors import CORS
from logging.handlers import RotatingFileHandler
import pytz

# 导入配置管理模块  
from config import app_config, dify_config, nav_config, log_config, validate_all_configs

# 导入认证工具
from utils.auth_utils import PasswordManager, TokenManager, token_required, validate_phone

# 导入Supabase客户端
from utils.supabase_client import supabase_client, DatabaseResponse

# 验证配置
if not validate_all_configs():
    print("❌ 配置验证失败，应用无法启动")
    exit(1)

# 创建Flask应用
app = Flask(__name__)

# 应用配置
app.config['SECRET_KEY'] = app_config.SECRET_KEY

# 配置CORS
CORS(app, origins=app_config.CORS_ORIGINS)

# 创建目录
os.makedirs(app_config.LOG_DIRECTORY, exist_ok=True)
os.makedirs('utils', exist_ok=True)

# 配置日志
class EmojiFilter(logging.Filter):
    """过滤emoji字符以避免控制台编码错误"""
    def filter(self, record):
        if hasattr(record, 'msg'):
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
    
    # 文件日志
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
    
    # 控制台日志
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

# Dify API服务（保持原有逻辑）
class DifyService:
    """Dify API服务类"""
    
    def __init__(self):
        self.api_url = dify_config.API_BASE_URL
        self.api_key = dify_config.API_KEY
        self.timeout = dify_config.TIMEOUT
        self.max_retries = dify_config.MAX_RETRIES
        
        app.logger.info(f'🤖 初始化Dify服务: {self.api_url}')
    
    def send_message(self, message, conversation_id=None, user_id=None):
        """发送消息到Dify API"""
        try:
            if not self.api_key:
                return {
                    'success': False,
                    'error': dify_config.ERROR_MESSAGES['NO_API_KEY']
                }
            
            headers = dify_config.get_headers()
            data = dify_config.build_chat_request(
                message=message,
                conversation_id=conversation_id,
                user_id=user_id or dify_config.DEFAULT_USER_ID
            )
            
            if conversation_id:
                app.logger.info(f'🔄 继续对话 {conversation_id}: {message[:50]}...')
            else:
                app.logger.info(f'🆕 开始新对话: {message[:50]}...')
            
            response = requests.post(
                dify_config.CHAT_MESSAGES_ENDPOINT,
                headers=headers,
                json=data,
                timeout=self.timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                answer = result.get('answer', '')
                new_conversation_id = result.get('conversation_id', '')
                
                app.logger.info(f'✅ Dify响应成功: {answer[:100]}...')
                
                return {
                    'success': True,
                    'data': result
                }
            else:
                app.logger.error(f'❌ Dify API调用失败: {response.status_code}')
                return {
                    'success': False,
                    'error': f'API调用失败 (状态码: {response.status_code})'
                }
                
        except requests.exceptions.Timeout:
            app.logger.error('⏰ Dify API调用超时')
            return self._get_local_mock_response(message, conversation_id)
        except requests.exceptions.ConnectionError:
            app.logger.error('🔌 无法连接到Dify API服务器，使用本地模拟回复')
            return self._get_local_mock_response(message, conversation_id)
        except Exception as e:
            app.logger.error(f'💥 Dify API调用异常: {str(e)}，使用本地模拟回复')
            return self._get_local_mock_response(message, conversation_id)
    
    def _get_local_mock_response(self, message, conversation_id=None):
        """本地模拟AI回复功能"""
        import random
        import uuid
        
        message_lower = message.lower()
        
        if any(keyword in message_lower for keyword in ['旅游', '旅行', '景点', '游玩', '出行']):
            mock_responses = [
                "我是您的AI旅行助手！🎯 虽然暂时无法访问在线服务，但我可以为您提供一些通用的旅行建议：\n\n• 提前规划行程，预订酒店和交通\n• 查看目的地天气，准备合适衣物\n• 了解当地文化和习俗\n• 准备必要的证件和物品\n• 购买旅行保险确保安全",
            ]
        elif any(keyword in message_lower for keyword in ['你好', 'hello', 'hi']):
            mock_responses = [
                "您好！我是您的AI旅行助手 🤖✨\n\n请告诉我您想去哪里或发送旅行链接，我会为您提供帮助！",
            ]
        else:
            mock_responses = [
                "感谢您的咨询！请告诉我具体的旅行目的地，我会为您提供详细的建议！",
            ]
        
        answer = random.choice(mock_responses)
        mock_conversation_id = conversation_id or str(uuid.uuid4())
        
        return {
            'success': True,
            'data': {
                'answer': answer,
                'conversation_id': mock_conversation_id,
                'created_at': datetime.utcnow().timestamp()
            }
        }
    
    def extract_attractions(self, text):
        """从AI响应中提取景点信息"""
        attractions = []
        
        app.logger.info(f'📝 开始解析AI文本，长度: {len(text)}')
        
        # 按数字编号分割
        numbered_sections = re.split(r'\n\s*\d+\.\s*', text)
        
        if len(numbered_sections) <= 2:
            numbered_sections = re.split(r'\n\n+', text)
        
        for i, section in enumerate(numbered_sections):
            section = section.strip()
            if len(section) < 5:
                continue
                
            # 提取地点名称
            attraction_name = None
            first_line = section.split('\n')[0].strip()
            if len(first_line) > 0 and len(first_line) < 50:
                clean_name = re.sub(r'^\d+[\.\。、]\s*', '', first_line)
                clean_name = re.sub(r'^[•·\-\*]\s*', '', clean_name)
                clean_name = clean_name.strip()
                
                if len(clean_name) > 1:
                    location_keywords = [
                        '景区', '景点', '公园', '广场', '寺庙', '教堂', '博物馆',
                        '古城', '古镇', '老街', '步行街', '商业街',
                        '山', '湖', '河', '海', '岛', '峡', '谷', '洞', '泉',
                        '长城', '故宫', '天安门', '颐和园', '天坛',
                        '大厦', '中心', '塔', '桥', '门', '城'
                    ]
                    
                    has_location_keyword = any(keyword in clean_name for keyword in location_keywords)
                    if has_location_keyword:
                        attraction_name = clean_name
            
            if not attraction_name or len(attraction_name) < 2:
                continue
                
            # 创建景点对象
            attraction_data = {
                'id': f'attraction_{int(datetime.now().timestamp())}_{len(attractions)}',
                'name': attraction_name,
                'address': attraction_name,
                'image': dify_config.DEFAULT_ATTRACTION_IMAGE,
                'type': '景点'
            }
            
            attractions.append(attraction_data)
            
            if len(attractions) >= dify_config.MAX_ATTRACTIONS_PER_RESPONSE:
                break
        
        app.logger.info(f'🏛️ 从AI回复中提取到 {len(attractions)} 个景点信息')
        return attractions

# 初始化Dify服务
dify_service = DifyService()

# 认证装饰器
def require_auth(f):
    """认证装饰器"""
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header:
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                pass
        
        if not token:
            return jsonify({'success': False, 'error': '未提供认证令牌'}), 401
        
        # 使用TokenManager验证token
        token_manager = TokenManager(app.config['SECRET_KEY'])
        try:
            payload = token_manager.verify_token(token, 'access')
            user_id = payload.get('user_id')
        except Exception:
            return jsonify({'success': False, 'error': '认证令牌无效或已过期'}), 401
        
        # 从Supabase获取用户信息
        user_result = supabase_client.get_user_by_id(user_id)
        if not user_result.success:
            return jsonify({'success': False, 'error': '用户不存在或已禁用'}), 401
        
        request.current_user = user_result.data
        return f(*args, **kwargs)
    return decorated

# API路由
@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    db_status = supabase_client.test_connection()

    return jsonify({
        'status': 'ok',
        'message': 'AI旅行助手API服务正常运行 (Supabase版本)',
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'version': '2.0.0-supabase',
        'database': 'connected' if db_status.success else 'disconnected'
    })

@app.route('/api/debug/supabase', methods=['GET'])
def debug_supabase():
    """调试Supabase连接"""
    debug_info = {
        'supabase_url': bool(os.getenv('SUPABASE_URL')),
        'supabase_anon_key': bool(os.getenv('SUPABASE_ANON_KEY')),
        'supabase_service_key': bool(os.getenv('SUPABASE_SERVICE_KEY')),
        'client_initialized': supabase_client.is_connected(),
        'config_valid': supabase_client.is_connected()
    }

    # 尝试连接测试
    connection_test = supabase_client.test_connection()
    debug_info['connection_test'] = {
        'success': connection_test.success,
        'error': connection_test.error,
        'data': connection_test.data
    }

    # 检查环境变量（脱敏）
    env_vars = {}
    for key in ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_KEY']:
        value = os.getenv(key)
        if value:
            env_vars[key] = f"{value[:20]}...{value[-10:]}" if len(value) > 30 else value[:10] + "..."
        else:
            env_vars[key] = None

    debug_info['environment_variables'] = env_vars

    return jsonify(debug_info)

@app.route('/api/conversations', methods=['GET'])
@require_auth
def get_conversations():
    """获取用户的对话列表"""
    try:
        user = request.current_user
        result = supabase_client.get_user_conversations(user['id'])
        
        if result.success:
            return jsonify({
                'success': True,
                'data': result.data
            })
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 500
            
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
        
        result = supabase_client.create_conversation(user['id'], title)
        
        if result.success:
            app.logger.info(f'📝 用户 {user["phone"]} 创建新对话: {title}')
            return jsonify({
                'success': True,
                'data': result.data
            })
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 500
            
    except Exception as e:
        app.logger.error(f'创建对话失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/conversations/<conversation_id>', methods=['DELETE'])
@require_auth
def delete_conversation(conversation_id):
    """删除对话"""
    try:
        user = request.current_user
        result = supabase_client.delete_conversation(conversation_id, user['id'])
        
        if result.success:
            app.logger.info(f'🗑️ 用户 {user["phone"]} 删除对话')
            return jsonify({
                'success': True,
                'message': '对话已删除'
            })
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 500
            
    except Exception as e:
        app.logger.error(f'删除对话失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/conversations/<conversation_id>/messages', methods=['GET'])
@require_auth
def get_messages(conversation_id):
    """获取对话消息"""
    try:
        user = request.current_user
        
        # 验证对话属于当前用户
        conv_result = supabase_client.get_conversation(conversation_id, user['id'])
        if not conv_result.success:
            return jsonify({
                'success': False,
                'error': '对话不存在或无权访问'
            }), 404
        
        # 获取消息列表
        msg_result = supabase_client.get_conversation_messages(conversation_id)
        
        if msg_result.success:
            return jsonify({
                'success': True,
                'data': {
                    'conversation': conv_result.data,
                    'messages': msg_result.data
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': msg_result.error
            }), 500
            
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
        
        # 处理对话
        db_conversation = None
        dify_conversation_id = None
        
        if conversation_id:
            conv_result = supabase_client.get_conversation(conversation_id, user['id'])
            if conv_result.success:
                db_conversation = conv_result.data
                dify_conversation_id = db_conversation.get('dify_conversation_id')
        
        # 如果没有找到现有对话，创建新对话
        if not db_conversation:
            title = message_content[:30] + ('...' if len(message_content) > 30 else '')
            conv_result = supabase_client.create_conversation(user['id'], title)
            
            if not conv_result.success:
                return jsonify({
                    'success': False,
                    'error': '创建对话失败'
                }), 500
            
            db_conversation = conv_result.data
        
        # 保存用户消息
        user_msg_result = supabase_client.create_message(
            db_conversation['id'], message_content, 'user'
        )
        
        if not user_msg_result.success:
            return jsonify({
                'success': False,
                'error': '保存用户消息失败'
            }), 500
        
        # 调用Dify API
        app.logger.info(f'📤 用户 {user["phone"]} 发送消息: {message_content[:50]}...')
        
        result = dify_service.send_message(
            message_content, 
            conversation_id=dify_conversation_id,
            user_id=f"user_{user['id']}"
        )
        
        if result['success']:
            dify_data = result['data']
            ai_content = dify_data.get('answer', '抱歉，我暂时无法回答您的问题。')
            
            # 更新Dify对话ID
            returned_conversation_id = dify_data.get('conversation_id', '')
            if not dify_conversation_id and returned_conversation_id:
                supabase_client.update_conversation(
                    db_conversation['id'], 
                    {'dify_conversation_id': returned_conversation_id}
                )
            
            app.logger.info(f'✅ AI回复成功: {ai_content[:100]}...')
        else:
            ai_content = f"抱歉，AI服务暂时不可用：{result.get('error', '未知错误')}"
            app.logger.error(f'❌ AI回复失败: {result.get("error")}')
        
        # 保存AI回复
        ai_msg_result = supabase_client.create_message(
            db_conversation['id'], ai_content, 'ai'
        )
        
        if not ai_msg_result.success:
            return jsonify({
                'success': False,
                'error': '保存AI回复失败'
            }), 500
        
        # 提取景点信息
        attractions = dify_service.extract_attractions(ai_content)
        
        app.logger.info(f'💬 对话完成: 用户={user["phone"]}, 对话ID={db_conversation["id"]}, 景点数={len(attractions)}')
        
        return jsonify({
            'success': True,
            'data': {
                'conversation_id': db_conversation['id'],
                'user_message': user_msg_result.data,
                'ai_message': ai_msg_result.data,
                'attractions': attractions
            }
        })
        
    except Exception as e:
        app.logger.error(f'💥 发送消息失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 临时无认证AI对话端点（用于调试Supabase连接问题）
@app.route('/api/chat/test', methods=['POST'])
def test_chat():
    """临时无认证AI对话端点"""
    try:
        data = request.get_json()
        message_content = data.get('message', '').strip()

        if not message_content:
            return jsonify({
                'success': False,
                'error': '消息不能为空'
            }), 400

        app.logger.info(f'🔧 临时测试AI对话: {message_content[:50]}...')

        # 直接调用Dify API，不需要认证
        result = dify_service.send_message(message_content)

        if result['success']:
            dify_data = result['data']
            ai_content = dify_data.get('answer', '抱歉，我暂时无法回答您的问题。')

            # 提取景点信息
            attractions = dify_service.extract_attractions(ai_content)

            app.logger.info(f'✅ 临时测试AI回复成功: {ai_content[:100]}...')

            return jsonify({
                'success': True,
                'data': {
                    'ai_message': {
                        'content': ai_content,
                        'created_at': datetime.now().isoformat()
                    },
                    'attractions': attractions
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': f"AI服务暂时不可用：{result.get('error', '未知错误')}"
            }), 500

    except Exception as e:
        app.logger.error(f'💥 临时测试AI对话失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 用户认证路由
@app.route('/api/auth/register', methods=['POST'])
def register_with_phone():
    """手机号密码注册"""
    try:
        data = request.get_json()
        phone = data.get('phone', '').strip()
        password = data.get('password', '').strip()
        nickname = data.get('nickname', '').strip()
        
        if not phone or not password:
            return jsonify({
                'success': False, 
                'error': '手机号和密码不能为空'
            }), 400
        
        if not validate_phone(phone):
            return jsonify({
                'success': False, 
                'error': '请输入正确的11位手机号'
            }), 400
        
        # 密码强度验证
        password_validation = PasswordManager.validate_password_strength(password)
        if not password_validation['valid']:
            return jsonify({
                'success': False,
                'error': password_validation['errors'][0]
            }), 400
        
        # 创建用户
        password_hash = PasswordManager.hash_password(password)
        result = supabase_client.create_user(
            phone, nickname or f"用户{phone[-4:]}", password_hash
        )
        
        if not result.success:
            return jsonify({
                'success': False,
                'error': result.error
            }), 409
        
        # 生成token
        token_manager = TokenManager(app.config['SECRET_KEY'])
        user_data = {'id': result.data['user_id'], 'phone': phone}
        tokens = token_manager.generate_token_pair(user_data)
        
        app.logger.info(f"用户注册成功: {phone}")
        
        return jsonify({
            'success': True,
            'data': {
                **tokens,
                'user': {
                    'id': result.data['user_id'],
                    'phone': phone,
                    'nickname': nickname or f"用户{phone[-4:]}"
                }
            }
        }), 201
        
    except Exception as e:
        app.logger.error(f"注册异常: {str(e)}")
        return jsonify({
            'success': False,
            'error': '注册失败，请稍后重试'
        }), 500

@app.route('/api/auth/login', methods=['POST'])
def login_with_phone():
    """手机号密码登录"""
    try:
        data = request.get_json()
        phone = data.get('phone', '').strip()
        password = data.get('password', '').strip()
        
        if not phone or not password:
            return jsonify({
                'success': False, 
                'error': '手机号和密码不能为空'
            }), 400
        
        # 获取用户信息
        result = supabase_client.get_user_by_phone(phone)
        
        if not result.success:
            return jsonify({
                'success': False,
                'error': '手机号或密码错误'
            }), 401
        
        user = result.data
        
        # 验证密码
        if not PasswordManager.verify_password(password, user['password_hash']):
            return jsonify({
                'success': False,
                'error': '手机号或密码错误'
            }), 401
        
        # 生成token
        token_manager = TokenManager(app.config['SECRET_KEY'])
        tokens = token_manager.generate_token_pair(user)
        
        app.logger.info(f"用户登录成功: {phone}")
        
        return jsonify({
            'success': True,
            'data': {
                **tokens,
                'user': {
                    'id': user['id'],
                    'phone': user['phone'],
                    'nickname': user['nickname'],
                    'avatar': user.get('avatar')
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
                'user_id': current_user['id'],
                'phone': current_user['phone'],
                'nickname': current_user['nickname'],
                'avatar': current_user.get('avatar')
            }
        })
    except Exception as e:
        app.logger.error(f'验证认证状态失败: {str(e)}')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/auth/logout', methods=['POST'])
@token_required
def logout():
    """用户登出"""
    try:
        current_user = g.current_user
        app.logger.info(f"用户登出: {current_user.get('phone', '未知')}")

        return jsonify({
            'success': True,
            'message': '登出成功'
        })
    except Exception as e:
        app.logger.error(f'登出失败: {str(e)}')
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
        
        # 生成导航链接
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

# 用户行程管理路由
@app.route('/api/trips', methods=['GET'])
@require_auth
def get_user_trips():
    """获取用户的行程列表"""
    try:
        user = request.current_user
        result = supabase_client.get_user_trips(user['id'])
        
        if result.success:
            return jsonify({
                'success': True,
                'data': result.data
            })
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 500
            
    except Exception as e:
        app.logger.error(f'获取行程列表失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/trips', methods=['POST'])
@require_auth
def create_trip():
    """创建新行程"""
    try:
        user = request.current_user
        data = request.get_json() or {}
        
        title = data.get('title', '').strip()
        destination = data.get('destination', '').strip()
        start_date = data.get('start_date', '').strip()
        end_date = data.get('end_date', '').strip()
        budget = data.get('budget')
        cover_image = data.get('cover_image')
        description = data.get('description', '').strip()
        
        if not all([title, destination, start_date, end_date]):
            return jsonify({
                'success': False,
                'error': '标题、目的地、开始日期和结束日期不能为空'
            }), 400
        
        result = supabase_client.create_trip(
            user['id'], title, destination, start_date, end_date,
            budget, cover_image, description
        )
        
        if result.success:
            app.logger.info(f'📝 用户 {user["phone"]} 创建新行程: {title}')
            return jsonify({
                'success': True,
                'data': result.data
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 500
            
    except Exception as e:
        app.logger.error(f'创建行程失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/trips/<trip_id>', methods=['GET'])
@require_auth
def get_trip_details(trip_id):
    """获取行程详情"""
    try:
        user = request.current_user
        result = supabase_client.get_trip_details(trip_id, user['id'])
        
        if result.success:
            return jsonify({
                'success': True,
                'data': result.data
            })
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 404
            
    except Exception as e:
        app.logger.error(f'获取行程详情失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/trips/<trip_id>', methods=['PUT'])
@require_auth
def update_trip(trip_id):
    """更新行程信息"""
    try:
        user = request.current_user
        data = request.get_json() or {}
        
        # 构建更新数据
        updates = {}
        allowed_fields = ['title', 'destination', 'start_date', 'end_date', 'budget', 'cover_image', 'description', 'status']
        
        for field in allowed_fields:
            if field in data:
                updates[field] = data[field]
        
        if not updates:
            return jsonify({
                'success': False,
                'error': '没有提供要更新的字段'
            }), 400
        
        result = supabase_client.update_trip(trip_id, user['id'], updates)
        
        if result.success:
            app.logger.info(f'✏️ 用户 {user["phone"]} 更新行程 {trip_id}')
            return jsonify({
                'success': True,
                'data': result.data
            })
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 500
            
    except Exception as e:
        app.logger.error(f'更新行程失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/trips/<trip_id>', methods=['DELETE'])
@require_auth
def delete_trip(trip_id):
    """删除行程"""
    try:
        user = request.current_user
        result = supabase_client.delete_trip(trip_id, user['id'])
        
        if result.success:
            app.logger.info(f'🗑️ 用户 {user["phone"]} 删除行程 {trip_id}')
            return jsonify({
                'success': True,
                'message': '行程已删除'
            })
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 500
            
    except Exception as e:
        app.logger.error(f'删除行程失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/trips/<trip_id>/activities', methods=['POST'])
@require_auth
def add_trip_activity(trip_id):
    """为行程添加活动"""
    try:
        user = request.current_user
        data = request.get_json() or {}
        
        day_number = data.get('day_number')
        title = data.get('title', '').strip()
        description = data.get('description', '').strip()
        location = data.get('location', '').strip()
        start_time = data.get('start_time')
        end_time = data.get('end_time')
        estimated_cost = data.get('estimated_cost')
        activity_type = data.get('activity_type', 'sightseeing')
        
        if not all([day_number is not None, title]):
            return jsonify({
                'success': False,
                'error': '天数和活动标题不能为空'
            }), 400
        
        # 验证行程属于当前用户
        trip_result = supabase_client.get_trip_details(trip_id, user['id'])
        if not trip_result.success:
            return jsonify({
                'success': False,
                'error': '行程不存在或无权访问'
            }), 404
        
        result = supabase_client.add_trip_activity(
            trip_id, day_number, title, description, location,
            start_time, end_time, estimated_cost, activity_type
        )
        
        if result.success:
            app.logger.info(f'📅 用户 {user["phone"]} 为行程 {trip_id} 添加活动: {title}')
            return jsonify({
                'success': True,
                'data': result.data
            }), 201
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 500
            
    except Exception as e:
        app.logger.error(f'添加行程活动失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 用户信息管理
@app.route('/api/user/profile', methods=['GET'])
@require_auth
def get_user_profile():
    """获取用户信息"""
    try:
        user = request.current_user
        return jsonify({
            'success': True,
            'data': {
                'user_id': user['id'],
                'phone': user['phone'],
                'nickname': user['nickname'],
                'avatar': user.get('avatar'),
                'created_at': user['created_at']
            }
        })
    except Exception as e:
        app.logger.error(f'获取用户信息失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/user/profile', methods=['PUT'])
@require_auth
def update_user_profile():
    """更新用户信息"""
    try:
        user = request.current_user
        data = request.get_json() or {}

        # 获取要更新的字段
        updates = {}
        if 'nickname' in data:
            nickname = data['nickname'].strip()
            if nickname:
                updates['nickname'] = nickname
        if 'avatar' in data:
            updates['avatar'] = data['avatar']

        if not updates:
            return jsonify({
                'success': False,
                'error': '没有要更新的数据'
            }), 400

        # 使用Supabase客户端更新用户信息
        result = supabase_client.update_user(user['id'], updates)

        if result.success:
            return jsonify({
                'success': True,
                'data': {
                    'user_id': result.data['id'],
                    'phone': result.data['phone'],
                    'nickname': result.data['nickname'],
                    'avatar': result.data.get('avatar')
                }
            })
        else:
            return jsonify({
                'success': False,
                'error': result.error
            }), 500

    except Exception as e:
        app.logger.error(f'更新用户信息失败: {str(e)}')
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# 微信验证文件路由
@app.route('/MP_verify_<filename>')
def wechat_verify(filename):
    """微信公众号域名验证文件"""
    try:
        return send_from_directory('.', f'MP_verify_{filename}')
    except FileNotFoundError:
        return "Verification file not found", 404

# 静态文件服务
@app.route('/')
def serve_frontend():
    """提供前端首页"""
    try:
        return send_file('dist/index.html')
    except FileNotFoundError:
        return jsonify({
            'success': False,
            'error': '前端文件未找到，请先运行 npm run build',
            'message': 'AI旅行助手API服务正常运行'
        }), 404

# 微信跳转页面 - 必须在catch-all路由之前
@app.route('/jump')
def wechat_jump():
    """微信访问跳转页面"""
    try:
        return send_file('jump.html')
    except FileNotFoundError:
        return "Jump page not found", 404

@app.route('/<path:path>')
def serve_static_files(path):
    """提供静态文件服务"""
    try:
        # 先尝试从dist目录提供文件
        return send_from_directory('dist', path)
    except FileNotFoundError:
        # 如果是前端路由，返回index.html
        try:
            return send_file('dist/index.html')
        except FileNotFoundError:
            return jsonify({
                'success': False,
                'error': f'文件未找到: {path}',
                'message': 'AI旅行助手API服务正常运行'
            }), 404

# 错误处理
@app.errorhandler(404)
def not_found_error(error):
    # 如果是API请求，返回JSON错误
    if request.path.startswith('/api/'):
        return jsonify({
            'success': False,
            'error': 'API接口不存在',
            'code': 404
        }), 404

    # 否则尝试提供前端页面
    try:
        return send_file('dist/index.html')
    except FileNotFoundError:
        return jsonify({
            'success': False,
            'error': '前端文件未找到',
            'code': 404
        }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': '服务器内部错误',
        'code': 500
    }), 500

if __name__ == '__main__':
    # 设置日志
    setup_logging()
    
    # 测试Supabase连接
    app.logger.info('🔍 测试Supabase数据库连接...')
    connection_test = supabase_client.test_connection()
    if connection_test.success:
        app.logger.info(f'✅ Supabase连接正常')
    else:
        app.logger.warning(f'⚠️ Supabase连接失败: {connection_test.error}')
    
    # 测试Dify连接
    app.logger.info('🔍 测试Dify API连接...')
    dify_test = dify_service.send_message('测试连接')
    if dify_test['success']:
        app.logger.info('✅ Dify API连接正常')
    else:
        app.logger.warning(f'⚠️ Dify API连接失败: {dify_test.get("error")}')
    
    app.logger.info('🚀 AI旅行助手API服务启动成功 (Supabase版本)')
    app.logger.info(f'📍 API地址: http://{app_config.HOST}:{app_config.PORT}/api')
    app.logger.info(f'🌍 运行环境: {"production" if not app_config.DEBUG else "development"}')
    app.logger.info(f'🎯 前端地址: {app_config.FRONTEND_URL}')
    app.logger.info(f'🤖 Dify API: {dify_config.API_BASE_URL}')
    app.logger.info(f'📊 数据库: Supabase')
    
    # 生产环境检查
    if os.environ.get('RAILWAY_ENVIRONMENT') or os.environ.get('PORT'):
        # Railway或其他云平台环境
        port = int(os.environ.get('PORT', app_config.PORT))
        app.run(host='0.0.0.0', port=port, debug=False)
    else:
        # 本地开发环境
        app.run(host=app_config.HOST, port=app_config.PORT, debug=app_config.DEBUG)