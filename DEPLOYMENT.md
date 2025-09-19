# AI旅行助手 - Railway部署指南

## 部署概述

本项目已配置为在Railway平台上部署，使用Docker容器化部署。

## 部署文件结构

```
.
├── Dockerfile              # Docker镜像构建文件
├── railway.json           # Railway部署配置(JSON格式)
├── railway.toml           # Railway部署配置(TOML格式)
├── .dockerignore          # Docker构建忽略文件
├── requirements.txt       # Python依赖
├── railway-env-config.txt # 环境变量配置清单
└── app.py                # 主应用文件(已支持生产环境)
```

## Railway部署步骤

### 1. 准备工作
- 确保已注册Railway账户: https://railway.app
- 安装Railway CLI (可选): `npm install -g @railway/cli`

### 2. 创建Railway项目
1. 登录Railway控制台
2. 点击"New Project"
3. 选择"Deploy from GitHub repo"或"Empty Project"

### 3. 配置环境变量
按照`railway-env-config.txt`文件中的清单，在Railway项目设置中逐一添加以下环境变量：

```
SECRET_KEY=ai-travel-production-secret-2024
DEBUG=False
DIFY_API_KEY=app-EFD7kwDBamONWVjo6DvSYojS
DIFY_API_URL=https://api.dify.ai/v1
SUPABASE_URL=https://dyxvnarknlcatrpxeshe.supabase.co
SUPABASE_ANON_KEY=[见配置文件]
SUPABASE_SERVICE_KEY=[见配置文件]
SUPABASE_JWT_SECRET=[见配置文件]
WECHAT_APP_ID=wxcf1bea177d6b93ec
WECHAT_APP_SECRET=0dede431b9b3bb68ab94d26b0d6c7142
TIMEZONE=Asia/Shanghai
```

### 4. 部署配置
Railway将自动识别以下配置文件：
- `railway.json` - 主要部署配置
- `railway.toml` - 备用配置格式
- `Dockerfile` - 容器构建配置

### 5. 自动部署
1. 连接GitHub仓库到Railway项目
2. Railway将自动检测Dockerfile并开始构建
3. 构建完成后自动部署到生产环境

## 技术特性

### 生产环境优化
- **Web服务器**: Gunicorn (多进程，2个worker)
- **端口绑定**: 自动检测Railway的PORT环境变量
- **健康检查**: `/api/health` 端点
- **日志配置**: 生产级别日志记录
- **错误处理**: 完善的异常处理机制

### 数据库
- **类型**: Supabase PostgreSQL (云端)
- **连接**: 通过环境变量配置
- **备份**: Supabase自动备份

### API集成
- **Dify AI**: 智能对话API集成
- **高德地图**: 地图服务API
- **微信**: 用户认证API

## 监控和维护

### 健康检查
- 端点: `GET /api/health`
- 频率: 每30秒检查
- 超时: 30秒

### 日志查看
在Railway控制台的"Deployments"页面可以查看实时日志。

### 重启策略
- 类型: ON_FAILURE (失败时重启)
- 最大重试: 10次

## 故障排除

### 常见问题
1. **部署失败**: 检查环境变量是否正确配置
2. **健康检查失败**: 确认`/api/health`端点可访问
3. **数据库连接失败**: 验证Supabase配置
4. **Dify API错误**: 检查API密钥和URL

### 调试方法
1. 查看Railway部署日志
2. 使用健康检查端点测试
3. 检查环境变量配置

## 本地开发 vs 生产环境

### 本地开发
```bash
python app.py
# 运行在 localhost:5000
```

### 生产环境
```bash
gunicorn --bind 0.0.0.0:$PORT app:app --workers 2 --timeout 120
# 运行在 Railway分配的域名
```

## 安全注意事项

1. **环境变量**: 敏感信息通过环境变量配置，不提交到代码库
2. **HTTPS**: Railway自动提供SSL证书
3. **CORS**: 配置了合适的跨域访问策略
4. **认证**: JWT token认证机制

## 更新部署

### 自动部署
推送代码到GitHub主分支，Railway将自动重新部署。

### 手动部署
通过Railway CLI或控制台手动触发部署。

## 域名配置

Railway会自动分配一个域名，格式类似：
`https://your-project-name.up.railway.app`

可以在Railway项目设置中绑定自定义域名。