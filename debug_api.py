#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
调试API问题的简化版本
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from utils.supabase_client import supabase_client
from utils.auth_utils import PasswordManager, TokenManager

app = Flask(__name__)
CORS(app, origins=['http://localhost:5173'])

@app.route('/api/debug/register', methods=['POST'])
def debug_register():
    """调试版本的注册接口"""
    try:
        data = request.get_json()
        phone = data.get('phone', '').strip()
        password = data.get('password', '').strip()
        nickname = data.get('nickname', '').strip()
        
        print(f"DEBUG: 收到注册请求 - phone={phone}, nickname={nickname}")
        
        if not phone or not password:
            return jsonify({
                'success': False, 
                'error': '手机号和密码不能为空'
            }), 400
        
        # 生成密码哈希
        password_hash = PasswordManager.hash_password(password)
        print(f"DEBUG: 密码哈希生成成功")
        
        # 创建用户
        result = supabase_client.create_user(phone, nickname or f"用户{phone[-4:]}", password_hash)
        print(f"DEBUG: 创建用户结果 - success={result.success}, data={result.data}, error={result.error}")
        
        if not result.success:
            return jsonify({
                'success': False,
                'error': result.error
            }), 409
        
        # 生成token
        token_manager = TokenManager('your-secret-key-change-this-in-production')
        user_data = {'id': result.data['user_id'], 'phone': phone}
        tokens = token_manager.generate_token_pair(user_data)
        print(f"DEBUG: Token生成成功")
        
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
        print(f"DEBUG: 异常发生 - {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': f'调试：{str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=True)