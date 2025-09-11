-- Supabase数据库函数
-- 请在Supabase控制台的SQL编辑器中执行这些函数

-- 创建用户注册函数（绕过RLS）
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