/* eslint-disable */

/**
 * VS Code 配置
 * 项目根目录的 .vscode 文件夹
 */

// launch.json - 调试配置
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "后端调试 (NestJS)",
      "program": "${workspaceFolder}/backend/dist/main.js",
      "restart": true,
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen",
      "preLaunchTask": "npm: start:dev - backend"
    },
    {
      "type": "chrome",
      "request": "launch",
      "name": "前端调试 (React)",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend/src",
      "sourceMaps": true,
      "runtimeArgs": ["--disable-background-networking"]
    }
  ]
}

// settings.json - VS Code 设置
{
  // 格式化设置
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true,
    "editor.formatOnPaste": true
  },
  "[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },
  "[json]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.formatOnSave": true
  },

  // ESLint 设置
  "eslint.validate": ["javascript", "javascriptreact", "typescript", "typescriptreact"],
  "eslint.format.enable": true,

  // TypeScript 设置
  "typescript.tsdk": "./node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true,

  // 文件关联
  "files.associations": {
    "*.env*": "plaintext"
  },

  // 排除文件夹
  "files.exclude": {
    "**/.next": true,
    "**/node_modules": true,
    "**/dist": true
  }
}

// extensions.json - 推荐扩展
{
  "recommendations": [
    "ms-vscode.vscode-typescript-next",
    "adrien-polynard.nestjs-snippets",
    "dsznajder.es7-react-js-snippets",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "bradlc.vscode-tailwindcss",
    "ms-vscode.makefile-tools",
    "redhat.vscode-xml"
  ]
}
