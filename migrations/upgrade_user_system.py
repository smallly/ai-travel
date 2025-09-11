#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
用户系统升级迁移脚本
升级现有用户表结构，创建新的用户相关表
"""

import sqlite3
import os
from datetime import datetime
from sqlalchemy import text

def upgrade_database(db_path='database/travel.db'):
    """执行数据库升级"""
    print("开始用户系统升级迁移...")
    
    if not os.path.exists(db_path):
        print(f"数据库文件不存在: {db_path}")
        return False
    
    # 创建备份
    backup_path = f"database/travel_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.db"
    try:
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"数据库备份创建: {backup_path}")
    except Exception as e:
        print(f"备份创建失败: {str(e)}")
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 1. 升级users表结构
        print("升级users表结构...")
        upgrade_users_table(cursor)
        
        # 2. 创建新表
        print("创建新的数据表...")
        create_new_tables(cursor)
        
        # 3. 创建索引
        print("创建数据库索引...")
        create_indexes(cursor)
        
        # 4. 迁移现有数据
        print("迁移现有用户数据...")
        migrate_existing_data(cursor)
        
        conn.commit()
        print("数据库升级完成！")
        return True
        
    except Exception as e:
        conn.rollback()
        print(f"数据库升级失败: {str(e)}")
        return False
    finally:
        conn.close()


def safe_add_column(cursor, table_name, column_definition):
    """安全添加字段（如果不存在）"""
    try:
        cursor.execute(f"PRAGMA table_info({table_name})")
        existing_columns = [row[1] for row in cursor.fetchall()]
        
        column_name = column_definition.split()[0]
        if column_name not in existing_columns:
            cursor.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_definition}")
            print(f"  添加字段 {column_name} 到 {table_name}")
        else:
            print(f"  字段 {column_name} 已存在于 {table_name}")
    except Exception as e:
        print(f"  添加字段 {column_name} 失败: {str(e)}")
        raise


def upgrade_users_table(cursor):
    """升级用户表结构"""
    user_upgrades = [
        # 身份信息
        "real_name VARCHAR(50)",
        "gender CHAR(1)",
        "birthday DATE",
        "id_card_encrypted VARCHAR(100)",
        
        # 联系方式
        "email VARCHAR(255)",
        "wechat_id VARCHAR(100)",
        
        # 地理位置
        "country VARCHAR(50) DEFAULT 'China'",
        "province VARCHAR(50)",
        "city VARCHAR(50)", 
        "address TEXT",
        
        # 账户状态
        "account_status VARCHAR(20) DEFAULT 'active'",
        "email_verified BOOLEAN DEFAULT 0",
        "phone_verified BOOLEAN DEFAULT 1",
        "is_vip BOOLEAN DEFAULT 0",
        "vip_expires_at DATETIME",
        
        # 登录统计
        "login_count INTEGER DEFAULT 0",
        "failed_login_count INTEGER DEFAULT 0",
        "last_ip VARCHAR(45)",
        "last_user_agent TEXT",
        
        # 微信信息
        "wechat_openid VARCHAR(100)",
        "wechat_unionid VARCHAR(100)",
        "wechat_avatar TEXT",
        
        # 个人偏好
        "timezone VARCHAR(50) DEFAULT 'Asia/Shanghai'",
        "language VARCHAR(10) DEFAULT 'zh-CN'",
        
        # 软删除
        "deleted_at DATETIME"
    ]
    
    for upgrade in user_upgrades:
        safe_add_column(cursor, 'users', upgrade)


def create_new_tables(cursor):
    """创建新的数据表"""
    
    tables = {
        'user_preferences': """
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL UNIQUE,
                theme VARCHAR(20) DEFAULT 'light',
                font_size VARCHAR(10) DEFAULT 'medium',
                language VARCHAR(10) DEFAULT 'zh-CN',
                push_notifications BOOLEAN DEFAULT 1,
                email_notifications BOOLEAN DEFAULT 1,
                sms_notifications BOOLEAN DEFAULT 0,
                marketing_messages BOOLEAN DEFAULT 0,
                profile_public BOOLEAN DEFAULT 0,
                trip_sharing BOOLEAN DEFAULT 1,
                location_sharing BOOLEAN DEFAULT 0,
                auto_save BOOLEAN DEFAULT 1,
                offline_mode BOOLEAN DEFAULT 1,
                ai_suggestions BOOLEAN DEFAULT 1,
                data_analytics BOOLEAN DEFAULT 1,
                default_map_provider VARCHAR(20) DEFAULT 'amap',
                traffic_layer BOOLEAN DEFAULT 0,
                satellite_view BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """,
        
        'user_favorites': """
            CREATE TABLE IF NOT EXISTS user_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                item_type VARCHAR(20) NOT NULL,
                item_id VARCHAR(100) NOT NULL,
                item_title VARCHAR(255) NOT NULL,
                item_description TEXT,
                item_image TEXT,
                location_name VARCHAR(255),
                latitude REAL,
                longitude REAL,
                address TEXT,
                user_notes TEXT,
                user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5),
                user_tags TEXT,
                is_visited BOOLEAN DEFAULT 0,
                visit_date DATE,
                visit_duration INTEGER,
                metadata TEXT,
                is_public BOOLEAN DEFAULT 0,
                is_deleted BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, item_type, item_id)
            )
        """,
        
        'user_sessions': """
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_id VARCHAR(255) UNIQUE NOT NULL,
                refresh_token_jti VARCHAR(32) UNIQUE NOT NULL,
                device_id VARCHAR(255),
                device_name VARCHAR(100),
                device_type VARCHAR(20),
                platform VARCHAR(20),
                app_version VARCHAR(20),
                ip_address VARCHAR(45) NOT NULL,
                user_agent TEXT NOT NULL,
                location VARCHAR(100),
                is_active BOOLEAN DEFAULT 1,
                last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME NOT NULL,
                login_method VARCHAR(20) NOT NULL,
                is_trusted_device BOOLEAN DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """,
        
        'login_attempts': """
            CREATE TABLE IF NOT EXISTS login_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                phone VARCHAR(20) NOT NULL,
                ip_address VARCHAR(45),
                success BOOLEAN NOT NULL DEFAULT 0,
                attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                user_agent TEXT,
                error_reason VARCHAR(100)
            )
        """
    }
    
    for table_name, create_sql in tables.items():
        try:
            cursor.execute(create_sql)
            print(f"  创建表 {table_name}")
        except Exception as e:
            print(f"  创建表 {table_name} 失败: {str(e)}")
            raise


def create_indexes(cursor):
    """创建索引优化查询性能"""
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone)",
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_users_wechat_openid ON users(wechat_openid)",
        "CREATE INDEX IF NOT EXISTS idx_users_status ON users(account_status, is_active)",
        "CREATE INDEX IF NOT EXISTS idx_users_deleted ON users(deleted_at)",
        
        "CREATE INDEX IF NOT EXISTS idx_favorites_user_type ON user_favorites(user_id, item_type)",
        "CREATE INDEX IF NOT EXISTS idx_favorites_location ON user_favorites(latitude, longitude)",
        
        "CREATE INDEX IF NOT EXISTS idx_sessions_user_active ON user_sessions(user_id, is_active)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(refresh_token_jti)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at)",
        
        "CREATE INDEX IF NOT EXISTS idx_login_attempts_phone_time ON login_attempts(phone, attempted_at)",
        "CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_time ON login_attempts(ip_address, attempted_at)"
    ]
    
    for index_sql in indexes:
        try:
            cursor.execute(index_sql)
            print(f"  创建索引")
        except Exception as e:
            print(f"  创建索引失败: {str(e)}")


def migrate_existing_data(cursor):
    """迁移现有用户数据"""
    try:
        # 为现有用户创建默认偏好设置
        cursor.execute("SELECT id FROM users WHERE deleted_at IS NULL")
        users = cursor.fetchall()
        
        for user in users:
            user_id = user[0]
            
            # 检查是否已有偏好设置
            cursor.execute("SELECT 1 FROM user_preferences WHERE user_id = ?", (user_id,))
            if not cursor.fetchone():
                cursor.execute("INSERT INTO user_preferences (user_id) VALUES (?)", (user_id,))
        
        print(f"  为 {len(users)} 个用户创建默认偏好设置")
        
        # 更新现有用户的基础字段
        cursor.execute("""
            UPDATE users 
            SET account_status = 'active', 
                phone_verified = 1, 
                language = 'zh-CN',
                timezone = 'Asia/Shanghai'
            WHERE account_status IS NULL
        """)
        
        print("  更新现有用户基础字段")
        
    except Exception as e:
        print(f"  迁移数据失败: {str(e)}")
        raise


def upgrade_conversations_table(cursor):
    """扩展conversations表"""
    conversation_upgrades = [
        "conversation_type VARCHAR(20) DEFAULT 'general'",
        "status VARCHAR(20) DEFAULT 'active'",
        "tags TEXT",
        "user_rating INTEGER CHECK (user_rating BETWEEN 1 AND 5)",
        "ai_model VARCHAR(50)",
        "total_messages INTEGER DEFAULT 0",
        "metadata TEXT",
        "archived_at DATETIME",
        "deleted_at DATETIME"
    ]
    
    for upgrade in conversation_upgrades:
        safe_add_column(cursor, 'conversations', upgrade)


def upgrade_messages_table(cursor):
    """扩展messages表"""
    message_upgrades = [
        "message_type VARCHAR(20) DEFAULT 'text'",
        "parent_message_id INTEGER",
        "attachments TEXT",
        "user_feedback VARCHAR(20)",
        "processing_time_ms INTEGER",
        "tokens_used INTEGER",
        "metadata TEXT",
        "edited_at DATETIME",
        "deleted_at DATETIME"
    ]
    
    for upgrade in message_upgrades:
        safe_add_column(cursor, 'messages', upgrade)


if __name__ == "__main__":
    # 直接运行脚本进行升级
    success = upgrade_database()
    if success:
        print("数据库升级成功完成！")
    else:
        print("数据库升级失败！")