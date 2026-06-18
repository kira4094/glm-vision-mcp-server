# GLM-Vision MCP Server

[![npm version](https://img.shields.io/npm/v/glm-vision-mcp-server)](https://www.npmjs.com/package/glm-vision-mcp-server)
[![GitHub](https://img.shields.io/github/stars/kira4094/glm-vision-mcp-server)](https://github.com/kira4094/glm-vision-mcp-server)

Zhipu AI GLM 视觉模型 MCP Server，支持 GLM-5V-Turbo / GLM-4.6V 等，用于 Claude Code。

## 特性

- 🖼️ 支持本地图片文件路径和远程 URL
- 💬 自定义 prompt，适合 UI 截图→代码、视觉调试等场景
- 🧠 可选 Thinking 模式（复杂推理）
- 📏 200K 上下文 / 128K 最大输出
- 🏆 Design2Code 基准 94.8 分
- ⚡ 一行 npx 部署，无需手动安装

## 快速开始（npx）

Claude Code settings.json 中添加：

```json
{
  "mcpServers": {
    "glm-5v": {
      "command": "npx",
      "args": ["-y", "glm-vision-mcp-server"],
      "env": {
        "ZAI_API_KEY": "your-zai-api-key"
      }
    }
  }
}
```

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `ZAI_API_KEY` | ✅ | — | Z.AI API Key，去 [z.ai](https://z.ai) 注册获取 |
| `GLM_MODEL` | 否 | `glm-5v-turbo` | 模型名，可换成 `glm-4.6v`、`glm-4.6v-flash`（免费）等 |

## 本地开发

```bash
git clone https://github.com/kira4094/glm-vision-mcp-server.git
cd glm-vision-mcp-server
npm install
```

本地路径注册到 Claude Code：

```json
{
  "mcpServers": {
    "glm-5v": {
      "command": "node",
      "args": ["E:\\Projects\\Claude\\MCP\\GLM\\glm-vision-mcp-server\\src\\index.js"],
      "env": {
        "ZAI_API_KEY": "your-key-here"
      }
    }
  }
}
```

## 工具说明

### `glm_5v_understand`

分析图片的核心工具。

| 参数 | 必填 | 说明 |
|------|------|------|
| `image` | ✅ | 本地路径 (`C:/img.png`) 或 URL (`https://...`) |
| `prompt` | ✅ | 对图的指令。越具体越好 |
| `detail` | 否 | 精度: `auto` / `low` / `high` |
| `max_tokens` | 否 | 最大输出（默认 4096，最大 128K） |
| `temperature` | 否 | 采样温度（默认 1） |
| `thinking` | 否 | 启用思考模式 |

### 使用示例

在 Claude Code 中直接问：

> 分析这张 UI 截图：`C:\screenshot.png`，描述它的布局和配色方案

> 把这张设计稿生成 HTML + Tailwind CSS：`https://example.com/mockup.png`

## 与 Doubao Vision 的对比

| | GLM-5V-Turbo | Doubao Vision 1.6 |
|---|---|---|
| API 提供商 | Z.AI (智谱) | 字节跳动 |
| 上下文 | 200K | 各有千秋 |
| Design2Code | **94.8** | — |
| 价格 | $1.20/M in · $4.00/M out | 见豆包定价 |
| 特长 | UI→代码、视觉编码 | 通用视觉理解 |
