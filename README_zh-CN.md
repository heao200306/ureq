# generic-request

[English](./README.md) | [中文](./README_zh-CN.md)

一个轻量级的 HTTP 请求库，基于 pnpm monorepo 架构，支持 XHR 和 Fetch 双引擎。

## 特性

- **双引擎支持**：无缝切换 XMLHttpRequest 和 Fetch API
- **引擎链**：配置多个引擎，自动降级
- **拦截器系统**：完整的请求/响应拦截器支持
- **TypeScript**：开箱即用的完整 TypeScript 支持
- **轻量级**：极小的打包体积，支持 tree-shaking
- **Promise-based**：现代化的 async/await API

## 项目结构

```
genericRequest/
└── src/
    ├── index.ts              # 主入口和导出
    └── components/
        ├── core/             # 核心类型和工具
        │   ├── types.ts      # 类型定义
        │   ├── utils.ts      # 工具函数
        │   ├── engine.ts     # 引擎接口
        │   └── index.ts
        ├── entry/            # 带拦截器的主入口
        │   ├── genericRequest.ts  # 主类
        │   ├── interceptor.ts     # 拦截器管理器
        │   ├── engine-manager.ts  # 引擎链管理器
        │   ├── ureq.ts           # 统一请求
        │   └── index.ts
        ├── fetch/            # Fetch API 引擎
        │   ├── fetch-engine.ts
        │   └── index.ts
        └── xhr/             # XMLHttpRequest 引擎
            ├── xhr-engine.ts
            └── index.ts
```

## 安装

```bash
# 使用 npm
npm install genericRequest

# 使用 pnpm
pnpm add genericRequest

# 使用 yarn
yarn add genericRequest
```

## 快速开始

```typescript
import genericRequest from 'genericRequest';

// 基础 GET 请求
const { data } = await genericRequest.get('/api/users');

// POST 请求
const { data } = await genericRequest.post('/api/users', { name: 'John' });

// 完整配置
const { data, meta } = await genericRequest({
  url: '/api/users',
  method: 'POST',
  data: { name: 'John' },
  headers: { 'X-Request-ID': '12345' },
  params: { page: 1, limit: 10 },
  timeout: 5000,
});
```

## 引擎链

配置多个引擎，自动降级：

```typescript
// Fetch 优先，XHR 作为后备
const api = genericRequest.create({
  engine: ['fetch', 'xhr'],
  baseURL: 'https://api.example.com',
});

// 如果 fetch 失败，自动降级到 XHR
api.get('/users').then((response) => {
  console.log(response.meta.engine); // 'fetch' 或 'xhr'
});
```

## 拦截器

```typescript
// 请求拦截器
api.interceptors.request.use((config) => {
  config.headers['Authorization'] = `Bearer ${getToken()}`;
  return config;
});

// 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.status === 401) redirectToLogin();
    return Promise.reject(error);
  }
);
```

## 配置

```typescript
const api = genericRequest.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  validateStatus: (status) => status >= 200 && status < 400,
});
```

## API 参考

### genericRequest

| 方法                                        | 描述         |
| ------------------------------------------- | ------------ |
| `genericRequest.get(url, config?)`          | GET 请求     |
| `genericRequest.post(url, data?, config?)`  | POST 请求    |
| `genericRequest.put(url, data?, config?)`   | PUT 请求     |
| `genericRequest.delete(url, config?)`       | DELETE 请求  |
| `genericRequest.patch(url, data?, config?)` | PATCH 请求   |
| `genericRequest.head(url, config?)`         | HEAD 请求    |
| `genericRequest.options(url, config?)`      | OPTIONS 请求 |
| `genericRequest.request(config)`            | 通用请求     |

### 实例方法

| 方法                    | 描述           |
| ----------------------- | -------------- |
| `api.get(...)`          | HTTP GET 请求  |
| `api.post(...)`         | HTTP POST 请求 |
| `api.create(config)`    | 创建新实例     |
| `api.setEngine(engine)` | 设置请求引擎   |
| `api.getEngine()`       | 获取当前引擎   |
| `api.setConfig(config)` | 更新全局配置   |
| `api.getConfig()`       | 获取当前配置   |

## 错误处理

```typescript
try {
  const { data } = await api.get('/api/users');
} catch (error) {
  if (error.isTimeout) {
    console.error('请求超时');
  } else if (error.isNetworkError) {
    console.error('网络错误');
  } else if (error.isAbort) {
    console.error('请求已取消');
  } else {
    console.error('HTTP 错误:', error.status, error.statusText);
  }
}
```

## 响应结构

```typescript
interface Response<T = unknown, B = unknown> {
  data: T; // 响应数据
  meta: {
    // 响应元信息
    status: number; // HTTP 状态码
    statusText: string;
    headers: Record<string, string>;
    engine: 'fetch' | 'xhr';
    duration: number; // 请求耗时（毫秒）
  };
  config: RequestConfig<B>;
  request: XMLHttpRequest | Request;
}
```

## 开发

```bash
# 安装依赖
pnpm install

# 构建所有包
pnpm build

# 运行测试
pnpm test

# 运行测试（带覆盖率）
pnpm test:coverage

# 运行 lint
pnpm lint

# 类型检查
pnpm typecheck
```

## 脚本命令

| 命令                 | 描述                     |
| -------------------- | ------------------------ |
| `pnpm build`         | 构建所有包               |
| `pnpm dev`           | 开发模式                 |
| `pnpm test`          | 运行单元测试             |
| `pnpm test:watch`    | 监听模式运行测试         |
| `pnpm test:coverage` | 运行测试并生成覆盖率报告 |
| `pnpm lint`          | 运行 ESLint              |
| `pnpm lint:fix`      | 自动修复 ESLint 问题     |
| `pnpm typecheck`     | 运行 TypeScript 类型检查 |
| `pnpm release`       | 创建并发布版本           |

## 贡献指南

欢迎贡献！请在提交 PR 之前阅读我们的 [贡献指南](./CONTRIBUTING.md)。

## 许可证

[MIT](./LICENSE) - 详见许可证文件。

## 致谢

灵感来自 [Axios](https://github.com/axios/axios) 和其他优秀的 HTTP 请求库。
