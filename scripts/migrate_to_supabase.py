#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据迁移脚本：SQLite -> Supabase
将现有的SQLite数据库数据迁移到Supabase PostgreSQL数据库
"""

import os
import sys
import sqlite3
import json
import uuid
from datetime import datetime
from typing import Dict, List, Any

# 添加项目根目录到路径
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from utils.supabase_client import supabase_client
    from utils.auth_utils import PasswordManager
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"❌ 导入Supabase客户端失败: {e}")
    print("请确保已安装supabase库: pip install supabase")
    SUPABASE_AVAILABLE = False

class DataMigrator:
    """数据迁移工具类"""
    
    def __init__(self, sqlite_db_path: str):
        """
        初始化迁移工具
        
        Args:
            sqlite_db_path: SQLite数据库文件路径
        """
        self.sqlite_db_path = sqlite_db_path
        self.sqlite_conn = None
        self.migration_log = []
        
    def connect_sqlite(self) -> bool:
        """连接SQLite数据库"""
        try:
            if not os.path.exists(self.sqlite_db_path):
                print(f"❌ SQLite数据库文件不存在: {self.sqlite_db_path}")
                return False
            
            self.sqlite_conn = sqlite3.connect(self.sqlite_db_path)
            self.sqlite_conn.row_factory = sqlite3.Row  # 使用字典形式返回行
            print(f"✅ 成功连接SQLite数据库: {self.sqlite_db_path}")
            return True
            
        except Exception as e:
            print(f"❌ 连接SQLite数据库失败: {e}")
            return False
    
    def test_supabase_connection(self) -> bool:
        """测试Supabase连接"""
        if not SUPABASE_AVAILABLE:
            print("❌ Supabase客户端不可用")
            return False
        
        result = supabase_client.test_connection()
        if result.success:
            print("✅ Supabase连接正常")
            return True
        else:
            print(f"❌ Supabase连接失败: {result.error}")
            return False
    
    def get_sqlite_data(self, table_name: str) -> List[Dict[str, Any]]:
        """从SQLite获取表数据"""
        try:
            cursor = self.sqlite_conn.cursor()
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            
            # 转换为字典列表
            data = []
            for row in rows:
                data.append(dict(row))
            
            print(f"📊 从SQLite表 {table_name} 读取 {len(data)} 条记录")
            return data
            
        except Exception as e:
            print(f"❌ 读取SQLite表 {table_name} 失败: {e}")
            return []
    
    def migrate_users(self) -> bool:
        """迁移用户数据"""
        print("\n🚀 开始迁移用户数据...")
        
        users_data = self.get_sqlite_data('users')
        if not users_data:
            print("ℹ️ 没有用户数据需要迁移")
            return True
        
        success_count = 0
        error_count = 0
        
        for user in users_data:
            try:
                # 为了兼容性，如果密码字段为空，设置一个默认密码
                password_hash = user.get('password_hash')
                if not password_hash:
                    # 生成一个临时密码哈希
                    password_hash = PasswordManager.hash_password('temp123456')
                    print(f"⚠️ 用户 {user['phone']} 没有密码，设置临时密码")
                
                # 创建用户
                result = supabase_client.create_user(
                    phone=user['phone'],
                    nickname=user['nickname'],
                    password_hash=password_hash
                )
                
                if result.success:
                    success_count += 1
                    self.migration_log.append({
                        'type': 'user',
                        'old_id': user['id'],
                        'new_id': result.data['user_id'],
                        'phone': user['phone'],
                        'status': 'success'
                    })
                    print(f"✅ 用户迁移成功: {user['phone']}")
                else:
                    error_count += 1
                    print(f"❌ 用户迁移失败: {user['phone']} - {result.error}")
                    
            except Exception as e:
                error_count += 1
                print(f"❌ 用户迁移异常: {user['phone']} - {e}")
        
        print(f"\n📊 用户迁移完成: 成功 {success_count} 条，失败 {error_count} 条")
        return error_count == 0
    
    def get_user_id_mapping(self) -> Dict[int, str]:
        """获取用户ID映射关系"""
        mapping = {}
        for log in self.migration_log:
            if log['type'] == 'user' and log['status'] == 'success':
                mapping[log['old_id']] = log['new_id']
        return mapping
    
    def migrate_conversations(self, user_id_mapping: Dict[int, str]) -> bool:
        """迁移对话数据"""
        print("\n🚀 开始迁移对话数据...")
        
        conversations_data = self.get_sqlite_data('conversations')
        if not conversations_data:
            print("ℹ️ 没有对话数据需要迁移")
            return True
        
        success_count = 0
        error_count = 0
        
        for conv in conversations_data:
            try:
                old_user_id = conv['user_id']
                new_user_id = user_id_mapping.get(old_user_id)
                
                if not new_user_id:
                    print(f"⚠️ 跳过对话 {conv['id']}：找不到对应用户映射")
                    error_count += 1
                    continue
                
                # 创建对话
                result = supabase_client.create_conversation(
                    user_id=new_user_id,
                    title=conv['title'],
                    dify_conversation_id=conv.get('dify_conversation_id')
                )
                
                if result.success:
                    success_count += 1
                    self.migration_log.append({
                        'type': 'conversation',
                        'old_id': conv['id'],
                        'new_id': result.data['id'],
                        'title': conv['title'],
                        'status': 'success'
                    })
                    print(f"✅ 对话迁移成功: {conv['title']}")
                else:
                    error_count += 1
                    print(f"❌ 对话迁移失败: {conv['title']} - {result.error}")
                    
            except Exception as e:
                error_count += 1
                print(f"❌ 对话迁移异常: {conv['title']} - {e}")
        
        print(f"\n📊 对话迁移完成: 成功 {success_count} 条，失败 {error_count} 条")
        return error_count == 0
    
    def get_conversation_id_mapping(self) -> Dict[int, str]:
        """获取对话ID映射关系"""
        mapping = {}
        for log in self.migration_log:
            if log['type'] == 'conversation' and log['status'] == 'success':
                mapping[log['old_id']] = log['new_id']
        return mapping
    
    def migrate_messages(self, conversation_id_mapping: Dict[int, str]) -> bool:
        """迁移消息数据"""
        print("\n🚀 开始迁移消息数据...")
        
        messages_data = self.get_sqlite_data('messages')
        if not messages_data:
            print("ℹ️ 没有消息数据需要迁移")
            return True
        
        success_count = 0
        error_count = 0
        
        for msg in messages_data:
            try:
                old_conv_id = msg['conversation_id']
                new_conv_id = conversation_id_mapping.get(old_conv_id)
                
                if not new_conv_id:
                    print(f"⚠️ 跳过消息 {msg['id']}：找不到对应对话映射")
                    error_count += 1
                    continue
                
                # 创建消息
                result = supabase_client.create_message(
                    conversation_id=new_conv_id,
                    content=msg['content'],
                    sender_type=msg['sender_type']
                )
                
                if result.success:
                    success_count += 1
                    print(f"✅ 消息迁移成功: {msg['sender_type']} - {msg['content'][:30]}...")
                else:
                    error_count += 1
                    print(f"❌ 消息迁移失败: {msg['content'][:30]}... - {result.error}")
                    
            except Exception as e:
                error_count += 1
                print(f"❌ 消息迁移异常: {msg['content'][:30]}... - {e}")
        
        print(f"\n📊 消息迁移完成: 成功 {success_count} 条，失败 {error_count} 条")
        return error_count == 0
    
    def save_migration_log(self):
        """保存迁移日志"""
        log_file = f"migration_log_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(log_file, 'w', encoding='utf-8') as f:
                json.dump(self.migration_log, f, ensure_ascii=False, indent=2)
            print(f"📝 迁移日志已保存: {log_file}")
        except Exception as e:
            print(f"❌ 保存迁移日志失败: {e}")
    
    def run_migration(self) -> bool:
        """执行完整迁移流程"""
        print("🚀 开始数据迁移流程...")
        print("=" * 50)
        
        # 1. 连接数据库
        if not self.connect_sqlite():
            return False
        
        if not self.test_supabase_connection():
            return False
        
        # 2. 迁移用户数据
        if not self.migrate_users():
            print("❌ 用户数据迁移失败，停止迁移")
            return False
        
        # 3. 迁移对话数据
        user_id_mapping = self.get_user_id_mapping()
        if not self.migrate_conversations(user_id_mapping):
            print("❌ 对话数据迁移失败，停止迁移")
            return False
        
        # 4. 迁移消息数据
        conversation_id_mapping = self.get_conversation_id_mapping()
        if not self.migrate_messages(conversation_id_mapping):
            print("❌ 消息数据迁移失败")
            return False
        
        # 5. 保存迁移日志
        self.save_migration_log()
        
        print("\n" + "=" * 50)
        print("🎉 数据迁移完成！")
        print(f"📊 总计迁移记录: {len(self.migration_log)}")
        
        return True
    
    def close(self):
        """关闭数据库连接"""
        if self.sqlite_conn:
            self.sqlite_conn.close()

def main():
    """主函数"""
    print("AI旅行助手 - 数据迁移工具")
    print("SQLite -> Supabase PostgreSQL")
    print("=" * 50)
    
    # 检查Supabase可用性
    if not SUPABASE_AVAILABLE:
        print("❌ Supabase客户端不可用，请先安装依赖:")
        print("pip install supabase postgrest")
        return
    
    # SQLite数据库路径
    sqlite_db_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'database',
        'travel.db'
    )
    
    print(f"📂 SQLite数据库路径: {sqlite_db_path}")
    
    # 确认迁移
    print("\n⚠️ 注意：此操作将把SQLite中的数据迁移到Supabase")
    print("请确保：")
    print("1. 已在Supabase中创建了对应的表结构")
    print("2. 已正确配置Supabase连接信息")
    print("3. 已备份重要数据")
    
    confirm = input("\n是否继续迁移？(y/N): ").strip().lower()
    if confirm != 'y':
        print("❌ 用户取消迁移")
        return
    
    # 执行迁移
    migrator = DataMigrator(sqlite_db_path)
    try:
        success = migrator.run_migration()
        if success:
            print("\n✅ 迁移成功完成！")
            print("下一步：")
            print("1. 验证Supabase中的数据")
            print("2. 更新应用配置使用新数据库")
            print("3. 测试应用功能")
        else:
            print("\n❌ 迁移过程中出现错误")
    finally:
        migrator.close()

if __name__ == '__main__':
    main()