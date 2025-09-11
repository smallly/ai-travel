# Supabase迁移指南

本指南将帮助你将AI旅行助手项目从SQLite数据库迁移到Supabase PostgreSQL数据库。

## 🎯 迁移优势

- **可视化管理**：通过Supabase控制台轻松查看和管理数据
- **云端托管**：无需担心本地数据库文件丢失
- **更好性能**：PostgreSQL提供更好的并发性能
- **自动备份**：Supabase提供自动备份功能
- **实时功能**：支持实时数据同步
- **RESTful API**：内置API，便于扩展

## 📋 迁移步骤

### 第一步：创建Supabase项目

1. 访问 [Supabase官网](https://supabase.com)
2. 注册账号并登录
3. 点击 "New Project" 创建新项目
4. 填写项目信息：
   - Name: `ai-travel-assistant`
   - Database Password: 设置一个强密码
   - Region: 选择离你最近的区域

### 第二步：获取项目配置信息

在Supabase项目控制台中：

1. 进入 **Settings** > **API**
2. 复制以下信息：
   - Project URL (类似：`https://your-project-id.supabase.co`)
   - anon public key
   - service_role key (⚠️ 保密)

3. 进入 **Settings** > **API** > **JWT Settings**
4. 复制 JWT Secret

### 第三步：配置环境变量

1. 复制 `.env.supabase.example` 为 `.env`：
```bash
cp .env.supabase.example .env
```

2. 编辑 `.env` 文件，填入你的Supabase配置：
```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_JWT_SECRET=your-jwt-secret-here
```

### 第四步：创建数据库表结构

1. 在Supabase控制台中，进入 **SQL Editor**
2. 复制 `scripts/setup_supabase_tables.sql` 文件的内容
3. 粘贴到SQL编辑器中并执行
4. 确认创建了以下表：
   - `users` - 用户表
   - `conversations` - 对话表
   - `messages` - 消息表

### 第五步：安装Python依赖

```bash
pip install supabase==2.3.4 postgrest==0.13.2
```

如果网络有问题，可以使用国内镜像：
```bash
pip install -i https://pypi.tuna.tsinghua.edu.cn/simple supabase postgrest
```

### 第六步：执行数据迁移

1. 确保SQLite数据库文件存在：`database/travel.db`
2. 运行迁移脚本：
```bash
python scripts/migrate_to_supabase.py
```

3. 按提示确认迁移操作
4. 等待迁移完成，查看迁移日志

### 第七步：启动新的应用

1. 使用Supabase版本的应用：
```bash
python app_supabase.py
```

2. 访问健康检查接口验证：
```bash
curl http://localhost:5000/api/health
```

应该看到包含 `"database": "connected"` 的响应。

## 🔍 验证迁移结果

### 在Supabase控制台验证

1. 进入 **Table Editor**
2. 检查各表的数据：
   - `users` 表：用户信息
   - `conversations` 表：对话记录
   - `messages` 表：聊天消息

### 通过API验证

1. 测试用户注册：
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"test123456","nickname":"测试用户"}'
```

2. 测试用户登录：
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","password":"test123456"}'
```

## 🛠️ 故障排除

### 常见问题

1. **连接失败**
   - 检查网络连接
   - 验证Supabase URL和密钥是否正确
   - 确认项目状态是否正常

2. **权限错误**
   - 确认使用了正确的service_role密钥
   - 检查RLS策略是否正确配置

3. **迁移失败**
   - 检查SQLite文件是否存在
   - 确认Supabase表结构已创建
   - 查看迁移日志获取详细错误信息

### 回滚操作

如果迁移出现问题，可以：

1. 继续使用原SQLite版本：
```bash
python app.py  # 使用原版本
```

2. 清空Supabase表数据重新迁移：
```sql
TRUNCATE users, conversations, messages CASCADE;
```

## 🎉 迁移完成后

1. **更新前端配置**（如果需要）
2. **测试所有功能**：
   - 用户注册/登录
   - 创建对话
   - 发送消息
   - 查看历史记录

3. **备份Supabase数据**：
   - 在Supabase控制台设置自动备份
   - 定期导出重要数据

4. **监控应用**：
   - 检查应用日志
   - 监控Supabase使用情况
   - 关注性能表现

## 📞 技术支持

- Supabase官方文档：https://supabase.com/docs
- 如有问题，请查看迁移日志文件获取详细信息
- 保留原SQLite文件作为备份

---

**注意**：迁移过程中请保持网络连接稳定，并确保有足够的时间完成整个流程。