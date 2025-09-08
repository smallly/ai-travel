const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 请求日志中间件
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 健康检查接口
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Dify AI对话代理接口
app.post('/api/dify/chat', async (req, res) => {
  try {
    const { query, conversation_id, inputs, user } = req.body;

    // 参数验证
    if (!query) {
      return res.status(400).json({ 
        error: '缺少必要参数：query' 
      });
    }

    // 检查API密钥
    if (!process.env.DIFY_API_KEY) {
      console.error('错误：未配置DIFY_API_KEY环境变量');
      return res.status(500).json({ 
        error: '服务器配置错误，请联系管理员' 
      });
    }

    // 构建请求数据
    const requestData = {
      inputs: inputs || {},
      query: query,
      response_mode: "blocking", // 改为blocking模式，避免流式返回的复杂性
      conversation_id: conversation_id || undefined,
      user: user || "miniprogram-user"
    };

    console.log('发送到Dify的请求数据:', JSON.stringify(requestData, null, 2));

    // 调用Dify API
    const difyResponse = await fetch(`${process.env.DIFY_API_BASE_URL}/chat-messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    console.log('Dify API响应状态:', difyResponse.status);

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      console.error('Dify API错误响应:', errorText);
      return res.status(difyResponse.status).json({ 
        error: `Dify API错误: ${difyResponse.status}`,
        details: errorText
      });
    }

    const data = await difyResponse.json();
    console.log('Dify API响应数据:', JSON.stringify(data, null, 2));

    // 提取景点信息（如果有的话）
    const attractions = extractAttractions(data.answer);

    // 返回格式化的响应
    res.json({
      success: true,
      data: {
        conversation_id: data.conversation_id,
        ai_message: {
          id: data.id,
          content: data.answer,
          timestamp: new Date().toISOString()
        },
        attractions: attractions
      }
    });

  } catch (error) {
    console.error('处理对话请求时发生错误:', error);
    res.status(500).json({ 
      error: '服务器内部错误',
      message: process.env.NODE_ENV === 'development' ? error.message : '请稍后重试'
    });
  }
});

// 获取对话历史接口
app.get('/api/dify/conversations/:conversation_id', async (req, res) => {
  try {
    const { conversation_id } = req.params;

    if (!conversation_id) {
      return res.status(400).json({ 
        error: '缺少对话ID' 
      });
    }

    const difyResponse = await fetch(`${process.env.DIFY_API_BASE_URL}/conversations/${conversation_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.DIFY_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!difyResponse.ok) {
      const errorText = await difyResponse.text();
      console.error('获取对话历史失败:', errorText);
      return res.status(difyResponse.status).json({ 
        error: `获取对话历史失败: ${difyResponse.status}`
      });
    }

    const data = await difyResponse.json();
    res.json({
      success: true,
      data: data
    });

  } catch (error) {
    console.error('获取对话历史时发生错误:', error);
    res.status(500).json({ 
      error: '服务器内部错误'
    });
  }
});

// 保存旅行计划接口
app.post('/api/travel/save', async (req, res) => {
  try {
    const { title, duration, locations, attractions, user_id } = req.body;

    // 这里可以连接数据库保存数据
    // 目前返回模拟的成功响应
    const tripData = {
      id: Date.now().toString(),
      title: title || '未命名旅行计划',
      duration: duration || '未指定',
      locations: locations || 0,
      attractions: attractions || [],
      user_id: user_id,
      created_at: new Date().toISOString(),
      status: 'planning'
    };

    console.log('保存旅行计划:', tripData);

    res.json({
      success: true,
      data: tripData
    });

  } catch (error) {
    console.error('保存旅行计划时发生错误:', error);
    res.status(500).json({ 
      error: '保存失败，请重试'
    });
  }
});

// 获取旅行计划列表接口
app.get('/api/travel/list', async (req, res) => {
  try {
    const { user_id, status } = req.query;

    // 这里可以从数据库获取数据
    // 目前返回模拟数据
    const mockData = [
      {
        id: '1',
        title: '青岛三天旅游计划',
        duration: '3天2晚',
        locations: 8,
        status: 'upcoming',
        created_at: '2024-03-01T00:00:00.000Z'
      }
    ];

    res.json({
      success: true,
      data: mockData.filter(item => !status || item.status === status)
    });

  } catch (error) {
    console.error('获取旅行计划列表时发生错误:', error);
    res.status(500).json({ 
      error: '获取数据失败'
    });
  }
});

// 提取景点信息的辅助函数
function extractAttractions(aiResponse) {
  // 这里可以实现更复杂的景点信息提取逻辑
  // 目前返回空数组，实际使用时需要根据AI响应格式来解析
  const attractions = [];
  
  // 可以添加正则表达式或其他解析逻辑来提取景点信息
  // 例如：解析包含地址、名称等信息的文本
  
  return attractions;
}

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('未处理的错误:', err);
  res.status(500).json({ 
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? err.message : '请稍后重试'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ 
    error: '接口不存在',
    path: req.path 
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器已启动在端口 ${PORT}`);
  console.log(`📊 健康检查: http://localhost:${PORT}/health`);
  console.log(`🤖 Dify代理: http://localhost:${PORT}/api/dify/chat`);
  console.log(`💾 旅行数据: http://localhost:${PORT}/api/travel/*`);
  
  if (!process.env.DIFY_API_KEY) {
    console.warn('⚠️  警告: 未设置DIFY_API_KEY环境变量，请查看.env.example文件');
  }
});

module.exports = app;