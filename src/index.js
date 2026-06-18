#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync, existsSync } from "fs";
import { isAbsolute } from "path";

// ─── Configuration ────────────────────────────────────────────
const API_KEY = process.env.ZAI_API_KEY;
if (!API_KEY) {
  console.error("❌ ZAI_API_KEY environment variable is required");
  process.exit(1);
}

const BASE_URL = "https://api.z.ai/api/paas/v4/chat/completions";
const MODEL = process.env.GLM_MODEL || "glm-5v-turbo";

// ─── Helpers ──────────────────────────────────────────────────

/**
 * Determine if a string is a local file path (absolute or relative)
 * vs. a remote URL. Reads local files and returns base64 data URI.
 */
function resolveImageSource(image) {
  // Check if it's already a URL
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  // Resolve relative paths against cwd
  const absPath = isAbsolute(image) ? image : process.cwd() + "/" + image;

  if (!existsSync(absPath)) {
    throw new Error(`Image file not found: ${image} (resolved: ${absPath})`);
  }

  const buffer = readFileSync(absPath);
  const ext = absPath.split(".").pop().toLowerCase();
  const mimeMap = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    bmp: "image/bmp",
  };
  const mime = mimeMap[ext] || "image/png";
  const base64 = buffer.toString("base64");

  return `data:${mime};base64,${base64}`;
}

/**
 * Call the Z.AI API (OpenAI-compatible).
 */
async function callGLM5V({ image, prompt, detail, maxTokens, temperature, thinking }) {
  const imageSource = resolveImageSource(image);

  const content = [
    { type: "text", text: prompt },
    {
      type: "image_url",
      image_url: {
        url: imageSource,
        detail: detail || "auto",
      },
    },
  ];

  const body = {
    model: MODEL,
    messages: [{ role: "user", content }],
    temperature: temperature ?? 1,
    max_tokens: maxTokens ?? 4096,
    stream: false,
  };

  // Optional thinking mode
  if (thinking) {
    body.thinking = { type: "enabled" };
  }

  const response = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Z.AI API error (${response.status}): ${errText}`);
  }

  const data = await response.json();

  return {
    content: data.choices?.[0]?.message?.content || "",
    reasoning: data.choices?.[0]?.message?.reasoning_content || null,
    usage: data.usage || null,
    model: data.model,
  };
}

// ─── MCP Server ───────────────────────────────────────────────

const server = new Server(
  { name: "glm-vision-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "glm_5v_understand",
      description: `Analyze an image using GLM-5V-Turbo (Zhipu AI's multimodal vision model).
Supports local image files and remote URLs.
Excels at: UI screenshot→code, design mockup analysis, visual debugging, chart/document understanding.`,
      inputSchema: {
        type: "object",
        properties: {
          image: {
            type: "string",
            description:
              "Image source: local file path (e.g. C:/path/to/screenshot.png) or URL (https://...)",
          },
          prompt: {
            type: "string",
            description:
              "What to ask about the image. Be specific for best results. E.g.: 'Recreate this UI as HTML with Tailwind CSS'",
          },
          detail: {
            type: "string",
            enum: ["auto", "low", "high"],
            default: "auto",
            description: "Image detail level. 'high' for fine-grained UI analysis",
          },
          max_tokens: {
            type: "number",
            default: 4096,
            description: "Maximum output tokens (max 128K)",
          },
          temperature: {
            type: "number",
            default: 1,
            description: "Sampling temperature (0-2)",
          },
          thinking: {
            type: "boolean",
            default: false,
            description:
              "Enable thinking mode for complex reasoning tasks",
          },
        },
        required: ["image", "prompt"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "glm_5v_understand") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments;
  if (!args.image || !args.prompt) {
    throw new Error("Missing required parameters: image and prompt");
  }

  try {
    const result = await callGLM5V({
      image: args.image,
      prompt: args.prompt,
      detail: args.detail,
      maxTokens: args.max_tokens,
      temperature: args.temperature,
      thinking: args.thinking,
    });

    // Build response text
    let text = result.content;

    // Append reasoning if present
    if (result.reasoning) {
      text = `<thinking>\n${result.reasoning}\n</thinking>\n\n${text}`;
    }

    // Append usage info as comment
    if (result.usage) {
      text += `\n\n---\n_⚡ ${result.usage.prompt_tokens ?? "?"} in → ${result.usage.completion_tokens ?? "?"} out (model: ${result.model})_`;
    }

    return {
      content: [{ type: "text", text }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `❌ Error: ${error.message}` }],
      isError: true,
    };
  }
});

// ─── Start ────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("✅ GLM-5V-Turbo MCP Server ready (stdio)");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
