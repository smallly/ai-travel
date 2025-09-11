#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
认证工具模块
提供JWT管理、密码安全、登录限制等功能
"""

import jwt
# import bcrypt
import secrets
import hashlib
import re
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify, g, current_app
from typing import Optional, Dict, Any

class PasswordManager:
    """密码安全管理器"""
    
    MIN_LENGTH = 1  # 支持弱密码，最低1位
    MAX_LENGTH = 128
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """验证密码强度 - 支持弱密码"""
        errors = []
        score = 0
        
        # 基本长度检查（最低要求）
        if len(password) < 1:
            errors.append('密码不能为空')
        else:
            # 任何非空密码都给予基础分数
            score = 1
            if len(password) >= 8:
                score += 1
            
        if len(password) > PasswordManager.MAX_LENGTH:
            errors.append(f'密码长度不能超过{PasswordManager.MAX_LENGTH}位')
        
        # 字符类型检查（用于计分但不强制要求）
        if re.search(r'[a-z]', password):
            score += 1
        if re.search(r'[A-Z]', password):
            score += 1
        if re.search(r'\d', password):
            score += 1
        if re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            score += 1
        
        # 移除弱密码模式检查，允许简单密码
        # weak_patterns = [...] - 已注释掉
        
        # 强度评级（保持评级但不阻止弱密码）
        if score >= 4:
            strength = 'strong'
        elif score >= 2:
            strength = 'medium'
        else:
            strength = 'weak'
            # 移除弱密码错误提示，改为仅记录强度
        
        return {
            'valid': len(errors) == 0,  # 只要有密码且长度合理就认为有效
            'errors': errors,
            'strength': strength,
            'score': max(0, score)
        }
    
    @staticmethod
    def hash_password(password: str) -> str:
        """生成密码哈希"""
        if not password:
            raise ValueError("密码不能为空")
        
        # 验证密码强度
        validation = PasswordManager.validate_password_strength(password)
        if not validation['valid']:
            raise ValueError(f"密码不符合要求: {', '.join(validation['errors'])}")
        
        # 生成哈希（简单版本用于测试）
        password_bytes = password.encode('utf-8')
        salt = secrets.token_hex(16)
        hashed = hashlib.pbkdf2_hmac('sha256', password_bytes, salt.encode(), 100000)
        
        return f"{salt}${hashed.hex()}"
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """验证密码（简单版本用于测试）"""
        try:
            if '$' not in hashed_password:
                return False
            
            salt, stored_hash = hashed_password.split('$', 1)
            password_bytes = password.encode('utf-8')
            computed_hash = hashlib.pbkdf2_hmac('sha256', password_bytes, salt.encode(), 100000)
            
            return computed_hash.hex() == stored_hash
        except Exception:
            return False


class TokenManager:
    """JWT Token管理器"""
    
    def __init__(self, secret_key: str):
        self.secret_key = secret_key
        self.algorithm = 'HS256'
        self.access_token_expire = timedelta(hours=24)
        self.refresh_token_expire = timedelta(days=30)
    
    def generate_token_pair(self, user) -> Dict[str, Any]:
        """生成访问令牌和刷新令牌对"""
        now = datetime.utcnow()
        
        # Access Token - 包含用户基本信息
        # 支持字典和对象两种形式的用户数据
        user_id = user.get('id') if isinstance(user, dict) else user.id
        phone = user.get('phone') if isinstance(user, dict) else user.phone
        nickname = user.get('nickname') if isinstance(user, dict) else user.nickname
        
        access_payload = {
            'user_id': user_id,
            'phone': phone,
            'nickname': nickname,
            'iat': now,
            'exp': now + self.access_token_expire,
            'type': 'access'
        }
        
        # Refresh Token - 仅包含必要信息
        refresh_payload = {
            'user_id': user_id,
            'iat': now,
            'exp': now + self.refresh_token_expire,
            'type': 'refresh',
            'jti': secrets.token_hex(16)  # JWT ID
        }
        
        access_token = jwt.encode(access_payload, self.secret_key, algorithm=self.algorithm)
        refresh_token = jwt.encode(refresh_payload, self.secret_key, algorithm=self.algorithm)
        
        return {
            'access_token': access_token,
            'refresh_token': refresh_token,
            'expires_in': int(self.access_token_expire.total_seconds()),
            'token_type': 'Bearer'
        }
    
    def verify_token(self, token: str, token_type: str = 'access') -> Dict[str, Any]:
        """验证JWT token"""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # 验证token类型
            if payload.get('type') != token_type:
                raise jwt.InvalidTokenError('Invalid token type')
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise jwt.ExpiredSignatureError('Token has expired')
        except jwt.InvalidTokenError as e:
            raise jwt.InvalidTokenError(f'Invalid token: {str(e)}')


def token_required(f):
    """JWT认证装饰器"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        auth_header = request.headers.get('Authorization')
        
        if auth_header and auth_header.startswith('Bearer '):
            try:
                token = auth_header.split(' ')[1]
            except IndexError:
                return jsonify({
                    'success': False,
                    'error': 'Token格式错误',
                    'code': 'INVALID_TOKEN_FORMAT'
                }), 401
        
        if not token:
            return jsonify({
                'success': False,
                'error': '缺少认证令牌',
                'code': 'MISSING_TOKEN'
            }), 401
        
        try:
            # 验证token
            token_manager = TokenManager(current_app.config['SECRET_KEY'])
            payload = token_manager.verify_token(token)
            user_id = payload.get('user_id')
            
            # 查询用户 - 需要在app.py中导入User模型
            from app import User
            current_user = User.query.filter_by(
                id=user_id, 
                is_active=True, 
                deleted_at=None
            ).first()
            
            if not current_user:
                return jsonify({
                    'success': False,
                    'error': '用户不存在或已禁用',
                    'code': 'USER_NOT_FOUND'
                }), 401
            
            # 将用户对象存储在请求上下文中
            g.current_user = current_user
            
        except jwt.ExpiredSignatureError:
            return jsonify({
                'success': False,
                'error': '令牌已过期',
                'code': 'TOKEN_EXPIRED'
            }), 401
        except jwt.InvalidTokenError:
            return jsonify({
                'success': False,
                'error': '无效令牌',
                'code': 'INVALID_TOKEN'
            }), 401
        
        return f(*args, **kwargs)
    return decorated


def validate_phone(phone: str) -> bool:
    """验证手机号格式"""
    if not phone:
        return False
    return bool(re.match(r'^1[3-9]\d{9}$', phone))


def validate_email(email: str) -> bool:
    """验证邮箱格式"""
    if not email:
        return False
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))