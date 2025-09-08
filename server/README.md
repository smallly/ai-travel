# 后端代理服务器

这是微信小程序的后端代理服务器，用于处理小程序与Dify API的通信。

## 功能特性

- 🔐 Dify API代理，解决跨域和域名限制问题
- 💬 AI对话接口代理
- 📱 专为微信小程序优化
- 🛡️ 安全的API密钥管理
- 📊 请求日志和错误处理

## 快速开始

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 环境配置

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的Dify API密钥：

```env
DIFY_API_KEY=your_actual_dify_api_key
DIFY_API_BASE_URL=https://api.dify.ai/v1
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. 启动服务

开发环境：
```bash
npm run dev
```

生产环境：
```bash
npm start
```

## API接口

### AI对话接口
```
POST /api/dify/chat
```

请求体：
```json
{
  "query": "用户消息",
  "conversation_id": "对话ID（可选）",
  "inputs": {},
  "user": "用户标识"
}
```

### 旅行计划保存
```
POST /api/travel/save
```

### 旅行计划列表
```
GET /api/travel/list
```

### 健康检查
```
GET /health
```

## 部署说明

1. 将代码部署到您的服务器
2. 配置环境变量
3. 确保域名已备案（中国境内）
4. 在微信小程序后台添加服务器域名到request合法域名列表

## 目录结构

```
server/
├── package.json          # 依赖配置
├── server.js             # 主服务器文件
├── .env.example          # 环境变量示例
└── README.md            # 说明文档
```