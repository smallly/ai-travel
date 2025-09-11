-- AI旅行助手 - Supabase数据库表结构
-- 执行此脚本来创建所有必要的表和安全策略

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 创建用户表
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    nickname VARCHAR(50) NOT NULL,
    avatar TEXT,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_login_at TIMESTAMP WITH TIME ZONE,
    login_count INTEGER DEFAULT 0,
    last_ip VARCHAR(45),
    last_user_agent TEXT,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 创建对话表
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    dify_conversation_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建消息表
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_type VARCHAR(10) NOT NULL CHECK (sender_type IN ('user', 'ai')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为相关表添加更新时间触发器
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 启用行级安全策略 (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- 用户表安全策略
DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" 
    ON users FOR SELECT 
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON users;
CREATE POLICY "Users can update own profile" 
    ON users FOR UPDATE 
    USING (auth.uid() = id);

-- 对话表安全策略
DROP POLICY IF EXISTS "Users can manage own conversations" ON conversations;
CREATE POLICY "Users can manage own conversations" 
    ON conversations FOR ALL 
    USING (auth.uid() = user_id);

-- 消息表安全策略
DROP POLICY IF EXISTS "Users can access messages in own conversations" ON messages;
CREATE POLICY "Users can access messages in own conversations" 
    ON messages FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE conversations.id = conversation_id 
            AND conversations.user_id = auth.uid()
        )
    );

-- 创建公共用户注册函数（绕过RLS）
CREATE OR REPLACE FUNCTION public.register_user(
    user_phone VARCHAR(20),
    user_nickname VARCHAR(50),
    user_password_hash VARCHAR(255)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    result JSON;
BEGIN
    -- 检查手机号是否已存在
    IF EXISTS (SELECT 1 FROM users WHERE phone = user_phone) THEN
        RETURN json_build_object(
            'success', false,
            'error', '该手机号已被注册'
        );
    END IF;
    
    -- 创建新用户
    INSERT INTO users (phone, nickname, password_hash)
    VALUES (user_phone, user_nickname, user_password_hash)
    RETURNING id INTO new_user_id;
    
    -- 返回成功结果
    RETURN json_build_object(
        'success', true,
        'user_id', new_user_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- 创建用户登录验证函数
CREATE OR REPLACE FUNCTION public.verify_user_login(
    user_phone VARCHAR(20)
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record RECORD;
    result JSON;
BEGIN
    -- 查找用户
    SELECT id, phone, nickname, avatar, password_hash, is_active, last_login_at
    INTO user_record
    FROM users 
    WHERE phone = user_phone AND is_active = true AND deleted_at IS NULL;
    
    IF NOT FOUND THEN
        RETURN json_build_object(
            'success', false,
            'error', '用户不存在或已禁用'
        );
    END IF;
    
    -- 更新登录信息
    UPDATE users 
    SET 
        last_login_at = now(),
        login_count = COALESCE(login_count, 0) + 1
    WHERE id = user_record.id;
    
    -- 返回用户信息
    RETURN json_build_object(
        'success', true,
        'user', json_build_object(
            'id', user_record.id,
            'phone', user_record.phone,
            'nickname', user_record.nickname,
            'avatar', user_record.avatar,
            'password_hash', user_record.password_hash
        )
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN json_build_object(
            'success', false,
            'error', SQLERRM
        );
END;
$$;

-- 插入测试数据（可选）
-- INSERT INTO users (phone, nickname, password_hash) 
-- VALUES ('13800138000', '测试用户', '$2b$12$example_hash_here') 
-- ON CONFLICT (phone) DO NOTHING;

COMMENT ON TABLE users IS 'AI旅行助手用户表';
COMMENT ON TABLE conversations IS 'AI对话会话表';
COMMENT ON TABLE messages IS 'AI对话消息表';

-- 显示创建完成的表
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'conversations', 'messages')
ORDER BY tablename;