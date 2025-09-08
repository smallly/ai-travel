# 微信小程序改造指南

本文档说明如何将现有的React旅行助手应用改造为微信小程序。

## 项目结构说明

```
project-root/
├── src/                          # 原React项目
│   ├── App.tsx                  # React主应用
│   ├── components/              # React组件
│   └── services/                # API服务
├── server/                      # 后端代理服务器
│   ├── server.js               # Express服务器
│   ├── package.json            # 服务器依赖
│   └── .env                    # 环境配置
└── miniprogram/                # 微信小程序
    ├── app.js                  # 小程序入口
    ├── app.json                # 全局配置
    ├── app.wxss                # 全局样式
    ├── pages/                  # 页面目录
    ├── components/             # 组件目录
    └── utils/                  # 工具库
```

## 改造步骤

### 1. 后端代理服务器部署

#### 1.1 安装依赖
```bash
cd server
npm install
```

#### 1.2 配置环境变量
复制 `.env.example` 为 `.env` 并配置：
```env
DIFY_API_KEY=your_dify_api_key_here
DIFY_API_BASE_URL=https://api.dify.ai/v1
PORT=3000
ALLOWED_ORIGINS=https://yourdomain.com
```

#### 1.3 部署到服务器
1. 将 `server/` 目录上传到您的服务器
2. 安装 PM2 进程管理器：`npm install -g pm2`
3. 启动服务：`pm2 start server.js --name travel-proxy`
4. 设置开机自启：`pm2 startup && pm2 save`

#### 1.4 配置域名和HTTPS
- 确保域名已备案（中国境内）
- 配置 Nginx 反向代理
- 配置 SSL 证书

### 2. 微信小程序配置

#### 2.1 创建小程序
1. 登录 [微信公众平台](https://mp.weixin.qq.com)
2. 注册小程序账号
3. 获取 AppID

#### 2.2 下载开发工具
- 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
- 导入 `miniprogram/` 目录作为新项目

#### 2.3 配置request合法域名
在小程序后台 → 开发管理 → 开发设置 → 服务器域名中添加：
- request合法域名：`https://yourdomain.com`

### 3. 功能对应关系

| 原React功能 | 小程序实现 | 文件路径 |
|------------|-----------|----------|
| AI对话 | pages/chat | `pages/chat/index.js` |
| 地图展示 | 原生map组件 | `components/map-view/` |
| 旅行计划 | pages/index | `pages/index/index.js` |
| 数据存储 | 本地存储 | `utils/storage.js` |
| API调用 | 代理服务器 | `utils/api.js` |

### 4. 核心改造点

#### 4.1 地图功能
**原React实现（高德地图Web API）：**
```javascript
import RealMap from './components/RealMap';
```

**小程序实现（原生map组件）：**
```javascript
// components/map-view/index.js
<map 
  id="map"
  markers="{{markers}}"
  bindmarkertap="onMarkerTap"
/>
```

#### 4.2 API调用
**原React实现：**
```javascript
import { chatApi } from './services/api';
const response = await chatApi.sendMessage(message);
```

**小程序实现：**
```javascript
const api = require('../../utils/api.js');
const response = await api.chatWithAI(message);
```

#### 4.3 数据存储
**原React实现（SQLite）：**
```javascript
// 使用数据库存储
```

**小程序实现（本地存储）：**
```javascript
const Storage = require('../../utils/storage.js');
Storage.saveLocation(location);
```

### 5. 样式适配要点

#### 5.1 单位转换
- React中的 `px` → 小程序中的 `rpx`
- `1px = 2rpx`（iPhone 6为基准）

#### 5.2 布局调整
```css
/* React CSS */
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}

/* 小程序 WXSS */
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
}
```

#### 5.3 安全区域适配
```css
.safe-area {
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
}
```

### 6. 测试部署

#### 6.1 本地测试
1. 启动后端服务器：`cd server && npm run dev`
2. 在微信开发者工具中预览小程序
3. 测试API调用和地图功能

#### 6.2 真机测试
1. 上传代码到微信后台
2. 设置为体验版
3. 扫码在手机上测试

#### 6.3 发布上线
1. 提交审核
2. 处理审核意见
3. 发布正式版

### 7. 注意事项

#### 7.1 API限制
- 小程序只能请求 HTTPS 域名
- 域名必须在后台配置白名单
- 请求并发限制：最多10个

#### 7.2 存储限制
- 本地存储限制：10MB
- 单个key最大1MB
- 超过限制会报错

#### 7.3 地图功能
- 使用腾讯地图作为底层服务
- 需要申请地图密钥
- 标记点数量限制

#### 7.4 权限申请
```json
"permission": {
  "scope.userLocation": {
    "desc": "获取您的位置信息用于推荐附近景点"
  }
}
```

## 常见问题

### Q1: Dify API调用失败
**A:** 检查以下几点：
1. 后端服务器是否正常运行
2. DIFY_API_KEY 是否正确配置
3. 域名是否已添加到小程序后台
4. 网络是否正常

### Q2: 地图不显示
**A:** 检查以下几点：
1. 地图组件配置是否正确
2. 经纬度数据是否有效
3. 位置权限是否已授权

### Q3: 样式显示异常
**A:** 检查以下几点：
1. rpx 单位使用是否正确
2. flex 布局在小程序中的兼容性
3. 安全区域适配

### Q4: 数据存储失败
**A:** 检查以下几点：
1. 数据大小是否超过限制
2. 数据格式是否正确
3. 存储空间是否足够

## 性能优化建议

1. **图片优化**：使用 WebP 格式，压缩图片大小
2. **代码分包**：将非首页代码设置为分包加载
3. **数据缓存**：合理使用本地存储，减少网络请求
4. **懒加载**：列表页面使用懒加载
5. **避免频繁setData**：批量更新数据

## 维护更新

1. **版本控制**：使用语义化版本号
2. **日志监控**：添加错误日志收集
3. **用户反馈**：提供反馈渠道
4. **定期更新**：保持与微信平台同步

---

通过以上步骤，可以将React旅行助手应用成功改造为微信小程序，保持核心功能的同时，充分利用小程序平台的优势。