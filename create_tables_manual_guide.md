# Supabase 数据库表手动创建指南

## 问题现状
- 前端显示错误：`Could not find the table 'public.user_trips'`
- 自动化脚本无法直接执行 DDL 语句
- 需要手动在 Supabase Dashboard 中创建表

## 解决方案

### 方法一：使用 SQL Editor（推荐）

1. **登录 Supabase Dashboard**
   - 访问：https://app.supabase.com
   - 选择项目：`dyxvnarknlcatrpxeshe`

2. **打开 SQL Editor**
   - 点击左侧菜单 "SQL Editor"
   - 点击 "New Query" 按钮

3. **复制并执行以下 SQL**
   ```sql
   -- 创建用户行程表
   CREATE TABLE user_trips (
       id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
       user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

   -- 创建行程活动表
   CREATE TABLE trip_activities (
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
   CREATE INDEX idx_user_trips_user_id ON user_trips(user_id);
   CREATE INDEX idx_user_trips_status ON user_trips(status);
   CREATE INDEX idx_trip_activities_trip_id ON trip_activities(trip_id);

   -- 启用行级安全
   ALTER TABLE user_trips ENABLE ROW LEVEL SECURITY;
   ALTER TABLE trip_activities ENABLE ROW LEVEL SECURITY;

   -- 创建安全策略
   CREATE POLICY "Users can manage own trips" ON user_trips
       USING (auth.uid() = user_id);

   CREATE POLICY "Users can manage own activities" ON trip_activities
       USING (EXISTS (
           SELECT 1 FROM user_trips 
           WHERE user_trips.id = trip_activities.trip_id 
           AND user_trips.user_id = auth.uid()
       ));
   ```

4. **点击 RUN 按钮执行**

### 方法二：使用 Table Editor

1. **打开 Table Editor**
   - 点击左侧菜单 "Table Editor"
   - 点击 "Create a new table" 

2. **创建 user_trips 表**
   - Table name: `user_trips`
   - 添加以下列：
     - `id` (uuid, primary key, default: gen_random_uuid())
     - `user_id` (uuid, not null)
     - `title` (varchar, not null)
     - `destination` (varchar, not null)  
     - `start_date` (date, not null)
     - `end_date` (date, not null)
     - `budget` (numeric)
     - `status` (varchar, default: 'planned')
     - `cover_image` (text)
     - `description` (text)
     - `created_at` (timestamptz, default: now())
     - `updated_at` (timestamptz, default: now())

3. **创建 trip_activities 表**
   - 类似地创建第二个表...

## 创建完成后的验证

1. **检查表是否创建成功**
   - 在 Table Editor 中应该看到两个新表
   - `user_trips`
   - `trip_activities`

2. **运行示例数据脚本**
   ```bash
   python setup_trips_simple.py
   ```

3. **检查前端**
   - 访问 http://localhost:5173
   - 登录用户账号
   - 检查行程页面是否正常显示

## 完成后效果

- ✅ 前端不再显示 "Could not find table" 错误
- ✅ 行程页面显示真实的用户数据
- ✅ 支持完整的 CRUD 操作
- ✅ 用户只能看到自己的行程数据

## 如果遇到问题

1. **外键约束错误**：确保 `auth.users` 表存在
2. **权限错误**：检查 RLS 策略设置
3. **数据类型错误**：按照上述字段定义严格创建

完成表创建后请告诉我，我会运行脚本创建示例数据。