# 🚀 AI旅行助手 - 部署指南

## 📋 部署前准备

### 需要你提供的信息：
1. **微信公众号信息**
   - AppID（在公众号后台 -> 开发 -> 基本配置）
   - AppSecret（同上位置）

2. **选择域名方案**
   - 方案A：使用免费子域名（推荐初期）
   - 方案B：使用自有域名

## 🔧 第一步：后端部署（Railway）

### 1.1 注册Railway账号
1. 访问 https://railway.app
2. 使用GitHub账号登录
3. 进入Dashboard

### 1.2 部署后端
1. 点击 "New Project" -> "Deploy from GitHub repo"
2. 选择你的项目仓库
3. 选择从根目录部署
4. Railway会自动检测Python项目

### 1.3 配置环境变量
在Railway项目设置中添加以下环境变量：

```bash
SECRET_KEY=your-super-secret-production-key-2024
DEBUG=False
DIFY_API_KEY=app-EFD7kwDBamONWVjo6DvSYojS
DIFY_API_URL=https://api.dify.ai/v1
SUPABASE_URL=https://dyxvnarknlcatrpxeshe.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHZuYXJrbmxjYXRycHhlc2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Njg5NjQsImV4cCI6MjA3MzE0NDk2NH0.ERK4rjCVXlKdqR_NHde4AoqF7DoKfBngYi4lDpsxiLk
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5eHZuYXJrbmxjYXRycHhlc2hlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1Njg5NjQsImV4cCI6MjA3MzE0NDk2NH0.ERK4rjCVXlKdqR_NHde4AoqF7DoKfBngYi4lDpsxiLk
SUPABASE_JWT_SECRET=2tHKUFnOSaW3SNSS2qOfzBK0ArfhZuVd49HOQSfOhxWigBrQTQeGlAzzCacVVXO6hN8Z+TQ6rE6nE9oOWSP/jQ==
WECHAT_APP_ID=wxcf1bea177d6b93ec
WECHAT_APP_SECRET=你的微信AppSecret
TIMEZONE=Asia/Shanghai
```

**重要：** 你还需要从微信公众号后台获取AppSecret，路径：公众号后台 -> 开发 -> 基本配置 -> AppSecret

### 1.4 获取后端URL
部署完成后，Railway会提供一个URL，格式如：`https://your-app-name.railway.app`

## 🌐 第二步：前端部署（Vercel）

### 2.1 注册Vercel账号
1. 访问 https://vercel.com
2. 使用GitHub账号登录

### 2.2 部署前端
1. 点击 "New Project"
2. 选择你的GitHub仓库
3. 配置构建设置：
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`

### 2.3 配置环境变量
在Vercel项目设置中添加：

```bash
VITE_AMAP_API_KEY=82ad389388b4c7a935ed536749ebfd92
VITE_API_BASE_URL=https://你的railway后端域名.railway.app/api
```

### 2.4 获取前端URL
部署完成后获得URL，如：`https://your-app.vercel.app`

## 🔗 第三步：连接前后端

### 3.1 更新后端CORS设置
在Railway环境变量中添加：
```bash
FRONTEND_URL=https://your-app.vercel.app
```

### 3.2 测试连接
访问前端URL，测试登录和聊天功能是否正常

## 📱 第四步：微信公众号配置

### 4.1 设置网页授权域名
1. 进入微信公众平台 -> 设置 -> 公众号设置 -> 功能设置
2. 在"网页授权域名"中添加：`your-app.vercel.app`

### 4.2 设置菜单链接
1. 进入 自定义菜单 -> 创建菜单
2. 添加菜单项：
   - 菜单名称：AI旅行助手
   - 菜单类型：跳转网页
   - 页面地址：`https://your-app.vercel.app`

### 4.3 JS安全域名（可选）
如需微信分享功能：
1. 进入 设置 -> 公众号设置 -> 功能设置
2. 在"JS接口安全域名"添加：`your-app.vercel.app`

## ✅ 第五步：测试验证

### 5.1 功能测试清单
- [ ] 网站可以正常访问（HTTPS）
- [ ] 用户可以注册/登录
- [ ] AI对话功能正常
- [ ] 历史对话加载正常
- [ ] 地图功能正常
- [ ] 微信浏览器中访问正常
- [ ] 公众号菜单跳转正常

### 5.2 性能优化
- [ ] 页面加载速度 < 3秒
- [ ] 移动端适配良好
- [ ] 微信分享卡片正常

## 🔧 故障排除

### 常见问题：

1. **CORS错误**
   - 检查Railway中的FRONTEND_URL环境变量
   - 确保URL不包含尾随斜杠

2. **API调用失败**
   - 检查Vercel中的VITE_API_BASE_URL
   - 确保Railway服务正在运行

3. **微信公众号无法访问**
   - 确保使用HTTPS
   - 检查域名是否在白名单中

## 📞 需要帮助？

如遇到问题，请提供：
1. 错误截图
2. 浏览器控制台错误信息
3. 具体操作步骤

## 🎉 部署完成！

完成以上步骤后，你的AI旅行助手就可以在微信公众号中正常使用了！

---

**预估成本：**
- Railway: 免费额度足够初期使用
- Vercel: 完全免费
- 总计：$0/月（免费额度内）