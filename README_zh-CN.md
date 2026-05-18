# ureq

[English](./README.md) | [中文](./README_zh-CN.md)

一个轻量级的 HTTP 请求库，支持 XHR 和 Fetch 双引擎。

## 特性

- **双引擎支持**：无缝切换 XMLHttpRequest 和 Fetch API
- **引擎链**：配置多个引擎，自动降级
- **拦截器系统**：完整的请求/响应拦截器支持
- **TypeScript**：开箱即用的完整 TypeScript 支持
- **轻量级**：极小的打包体积，支持 tree-shaking
- **Promise-based**：现代化的 async/await API

## 安装

```bash
# 使用 npm
npm install ureq

# 使用 pnpm
pnpm add ureq

# 使用 yarn
yarn add ureq
```

## 快速开始

```typescript
import ureq from 'ureq';

// 基础 GET 请求
const { data } = await ureq.get('/api/users');

// POST 请求
const { data } = await ureq.post('/api/users', { name: 'John' });
```
