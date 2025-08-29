# Claude Code 项目配置

## 重要配置说明

### 前端服务器配置
- **端口固定为 5173** - 不要变更，用户要求保持固定
- 地址: http://localhost:5173
- 如果端口被占用，需要先杀掉占用进程，然后使用固定端口启动

### 开发服务器启动命令
```bash
npm run dev
```

### 项目结构
- 前端框架：React + TypeScript + Vite
- 地图组件：高德地图API集成
- 后端：Python Flask (端口5000)

### 地图组件说明
- 使用独立DOM容器避免React DOM冲突
- API Key配置在.env文件中: VITE_AMAP_API_KEY
- 组件路径: src/components/RealMap.tsx

### 注意事项
1. 端口5173必须固定，不允许自动切换到其他端口
2. 修改package.json的dev命令已包含--force参数确保端口固定
3. 如遇端口冲突，使用taskkill或powershell停止占用进程

## 用户偏好
- 端口固定5173，每次都要确保使用此端口
- 不需要每次提醒端口问题，应该主动维护