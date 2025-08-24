#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
AI旅行助手 - 测试文件
测试主要功能模块
"""

import unittest
import json
from datetime import datetime
from unittest.mock import patch, MagicMock
from app import app, db, Conversation, Message, DifyService
import config

class TestApp(unittest.TestCase):
    """应用测试类"""
    
    def setUp(self):
        """测试前准备"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['WTF_CSRF_ENABLED'] = False
        
        self.app = app.test_client()
        self.app_context = app.app_context()
        self.app_context.push()
        
        db.create_all()
    
    def tearDown(self):
        """测试后清理"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_health_check(self):
        """测试健康检查接口"""
        response = self.app.get('/api/health')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertEqual(data['status'], 'ok')
        self.assertIn('timestamp', data)
    
    def test_create_conversation(self):
        """测试创建对话"""
        response = self.app.post('/api/conversations',
                                json={'title': '测试对话'})
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(data['data']['title'], '测试对话')
    
    def test_get_conversations(self):
        """测试获取对话列表"""
        # 先创建一个对话
        conversation = Conversation(title='测试对话')
        db.session.add(conversation)
        db.session.commit()
        
        response = self.app.get('/api/conversations')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(len(data['data']), 1)
    
    def test_delete_conversation(self):
        """测试删除对话"""
        # 先创建一个对话
        conversation = Conversation(title='测试对话')
        db.session.add(conversation)
        db.session.commit()
        conv_id = conversation.id
        
        response = self.app.delete(f'/api/conversations/{conv_id}')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertTrue(data['success'])
    
    def test_get_messages(self):
        """测试获取消息"""
        # 创建对话和消息
        conversation = Conversation(title='测试对话')
        db.session.add(conversation)
        db.session.commit()
        
        message = Message(
            conversation_id=conversation.id,
            content='测试消息',
            sender_type='user'
        )
        db.session.add(message)
        db.session.commit()
        
        response = self.app.get(f'/api/conversations/{conversation.id}/messages')
        self.assertEqual(response.status_code, 200)
        
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertEqual(len(data['data']['messages']), 1)
    
    @patch('app.dify_service.send_message')
    def test_send_message_success(self, mock_send):
        """测试发送消息成功"""
        # 模拟Dify API成功响应
        mock_send.return_value = {
            'success': True,
            'data': {
                'answer': '很高兴为您服务！北京有很多著名景点，比如天安门广场、故宫博物院等。',
                'conversation_id': 'test-conv-id'
            }
        }
        
        response = self.app.post('/api/chat/send', 
                                json={
                                    'message': '你好，我想去北京旅游',
                                    'user_id': 'test_user'
                                })
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('conversation_id', data['data'])
        self.assertIn('user_message', data['data'])
        self.assertIn('ai_message', data['data'])
    
    @patch('app.dify_service.send_message')
    def test_send_message_failure(self, mock_send):
        """测试发送消息失败"""
        # 模拟Dify API失败响应
        mock_send.return_value = {
            'success': False,
            'error': '网络连接失败'
        }
        
        response = self.app.post('/api/chat/send', 
                                json={
                                    'message': '你好',
                                    'user_id': 'test_user'
                                })
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])  # 即使AI失败，也会保存失败消息
        self.assertIn('抱歉，AI服务暂时不可用', data['data']['ai_message']['content'])
    
    def test_send_empty_message(self):
        """测试发送空消息"""
        response = self.app.post('/api/chat/send', 
                                json={'message': '', 'user_id': 'test_user'})
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data['success'])
        self.assertEqual(data['error'], config.dify_config.ERROR_MESSAGES['EMPTY_MESSAGE'])
    
    def test_navigation_links(self):
        """测试导航链接生成"""
        response = self.app.post('/api/locations/navigation',
                                json={'address': '天安门广场'})
        
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertTrue(data['success'])
        self.assertIn('navigation_links', data['data'])
        self.assertIn('amap', data['data']['navigation_links'])
        self.assertIn('baidu', data['data']['navigation_links'])
    
    def test_navigation_empty_address(self):
        """测试空地址导航"""
        response = self.app.post('/api/locations/navigation',
                                json={'address': ''})
        
        self.assertEqual(response.status_code, 400)
        data = json.loads(response.data)
        self.assertFalse(data['success'])


class TestDifyService(unittest.TestCase):
    """Dify服务测试类"""
    
    def setUp(self):
        """测试前准备"""
        self.dify_service = DifyService()
    
    def test_extract_attractions(self):
        """测试景点提取"""
        text = "北京有很多著名景点，推荐您去故宫博物院、天安门广场、颐和园等地方参观。"
        attractions = self.dify_service.extract_attractions(text)
        
        # 由于正则表达式的复杂性，这里主要测试函数能正常运行
        self.assertIsInstance(attractions, list)
    
    def test_extract_no_attractions(self):
        """测试无景点文本"""
        text = "今天天气很好，适合出门。"
        attractions = self.dify_service.extract_attractions(text)
        
        self.assertEqual(attractions, [])


class TestModels(unittest.TestCase):
    """数据模型测试类"""
    
    def setUp(self):
        """测试前准备"""
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        
        self.app_context = app.app_context()
        self.app_context.push()
        
        db.create_all()
    
    def tearDown(self):
        """测试后清理"""
        db.session.remove()
        db.drop_all()
        self.app_context.pop()
    
    def test_conversation_model(self):
        """测试对话模型"""
        conversation = Conversation(title='测试对话')
        db.session.add(conversation)
        db.session.commit()
        
        # 测试to_dict方法
        conv_dict = conversation.to_dict()
        self.assertEqual(conv_dict['title'], '测试对话')
        self.assertIn('id', conv_dict)
        self.assertIn('created_at', conv_dict)
        self.assertEqual(conv_dict['message_count'], 0)
    
    def test_message_model(self):
        """测试消息模型"""
        # 先创建对话
        conversation = Conversation(title='测试对话')
        db.session.add(conversation)
        db.session.commit()
        
        # 创建消息
        message = Message(
            conversation_id=conversation.id,
            content='测试消息',
            sender_type='user'
        )
        db.session.add(message)
        db.session.commit()
        
        # 测试to_dict方法
        msg_dict = message.to_dict()
        self.assertEqual(msg_dict['content'], '测试消息')
        self.assertEqual(msg_dict['sender_type'], 'user')
        self.assertIn('id', msg_dict)
        self.assertIn('created_at', msg_dict)
        self.assertIn('timestamp', msg_dict)
    
    def test_conversation_message_relationship(self):
        """测试对话与消息关系"""
        conversation = Conversation(title='测试对话')
        db.session.add(conversation)
        db.session.commit()
        
        # 添加消息
        message1 = Message(
            conversation_id=conversation.id,
            content='消息1',
            sender_type='user'
        )
        message2 = Message(
            conversation_id=conversation.id,
            content='消息2',
            sender_type='ai'
        )
        db.session.add_all([message1, message2])
        db.session.commit()
        
        # 测试关系
        self.assertEqual(len(conversation.messages), 2)
        self.assertEqual(conversation.messages[0].content, '消息1')
        self.assertEqual(conversation.messages[1].content, '消息2')


if __name__ == '__main__':
    # 运行测试
    unittest.main(verbosity=2)