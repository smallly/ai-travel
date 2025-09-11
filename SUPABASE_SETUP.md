# Supabase 数据库表创建指南

## 数据库表缺失问题解决方案

当前前端显示错误：`Could not find the table 'public.user_trips'`

需要在 Supabase 后台手动创建数据库表。

## 创建步骤

### 1. 登录 Supabase Dashboard
1. 访问 https://app.supabase.com
2. 选择你的项目
3. 点击左侧菜单的 "SQL Editor"

### 2. 执行以下 SQL 创建表结构

```sql
-- 创建用户行程表
CREATE TABLE IF NOT EXISTS user_trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    budget DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'ongoing', 'completed', 'cancelled')),
    cover_image TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建行程详细活动表
CREATE TABLE IF NOT EXISTS trip_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID NOT NULL REFERENCES user_trips(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    location VARCHAR(200),
    start_time TIME,
    end_time TIME,
    estimated_cost DECIMAL(8,2),
    activity_type VARCHAR(50) DEFAULT 'sightseeing' CHECK (activity_type IN ('sightseeing', 'dining', 'shopping', 'entertainment', 'transportation', 'accommodation', 'other')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_trips_user_id ON user_trips(user_id);
CREATE INDEX IF NOT EXISTS idx_user_trips_status ON user_trips(status);
CREATE INDEX IF NOT EXISTS idx_user_trips_start_date ON user_trips(start_date);
CREATE INDEX IF NOT EXISTS idx_trip_activities_trip_id ON trip_activities(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_activities_day ON trip_activities(trip_id, day_number);

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器
CREATE TRIGGER update_user_trips_updated_at 
    BEFORE UPDATE ON user_trips 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 3. 设置行级安全策略 (RLS)

```sql
-- 启用行级安全
ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_activities ENABLE ROW LEVEL SECURITY;

-- 用户只能查看和操作自己的行程
CREATE POLICY "Users can view own trips" ON user_trips
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trips" ON user_trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trips" ON user_trips
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own trips" ON user_trips
    FOR DELETE USING (auth.uid() = user_id);

-- 用户只能查看和操作属于自己行程的活动
CREATE POLICY "Users can view own trip activities" ON trip_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE user_trips.id = trip_activities.trip_id 
            AND user_trips.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own trip activities" ON trip_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE user_trips.id = trip_activities.trip_id 
            AND user_trips.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own trip activities" ON trip_activities
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE user_trips.id = trip_activities.trip_id 
            AND user_trips.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own trip activities" ON trip_activities
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_trips 
            WHERE user_trips.id = trip_activities.trip_id 
            AND user_trips.user_id = auth.uid()
        )
    );
```

### 4. 验证表创建
在 Supabase Dashboard 的 "Table Editor" 中应该可以看到：
- `user_trips` 表
- `trip_activities` 表

### 5. 运行示例数据脚本
创建表结构后，运行以下命令创建示例数据：

```bash
python "scripts\create_tables_direct.py"
```

## 完成后效果
- 前端行程页面将显示用户的真实行程数据
- 不再显示硬编码的示例行程
- 支持完整的行程CRUD操作

## 注意事项
- 确保 Supabase 项目中已有 `users` 表（通常通过 Auth 自动创建）
- 如果遇到权限问题，检查 RLS 策略设置
- 表创建完成后，前端应该能正常获取和显示用户行程数据