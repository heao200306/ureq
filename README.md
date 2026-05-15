# xRequest

[English](./README.md) | [中文](./README_zh-CN.md)

A lightweight HTTP request library with dual-engine support (XHR & Fetch) based on pnpm monorepo architecture.

## Features

- **Dual Engine Support**: Seamlessly switch between XMLHttpRequest and Fetch API
- **Engine Chain**: Configure multiple engines with automatic fallback
- **Interceptor System**: Full support for request/response interceptors
- **TypeScript**: Complete TypeScript support out of the box
- **Lightweight**: Minimal bundle size, tree-shakable
- **Promise-based**: Modern async/await API

## Packages

This monorepo contains the following packages:

| Package                              | Description                          |
| ------------------------------------ | ------------------------------------ |
| [xrequest](./packages/xrequest-main) | Main entry point for end users       |
| [@xrequest/core](./packages/core)    | Core type definitions and utilities  |
| [@xrequest/xhr](./packages/xhr)      | XMLHttpRequest engine implementation |
| [@xrequest/fetch](./packages/fetch)  | Fetch API engine implementation      |
| [@xrequest/entry](./packages/entry)  | Internal entry implementation        |

## Installation

```bash
# Using npm
npm install xrequest

# Using pnpm
pnpm add xrequest

# Using yarn
yarn add xrequest
```

## Quick Start

```typescript
import xrequest from 'xrequest';

// Basic GET request
const { data } = await xrequest.get('/api/users');

// POST request with data
const { data } = await xrequest.post('/api/users', { name: 'John' });

// Full configuration
const { data, meta } = await xrequest({
  url: '/api/users',
  method: 'POST',
  data: { name: 'John' },
  headers: { 'X-Request-ID': '12345' },
  params: { page: 1, limit: 10 },
  timeout: 5000,
});
```

## Engine Chain

Configure multiple engines with automatic fallback:

```typescript
// Fetch is primary, XHR is fallback
const api = xrequest.create({
  engine: ['fetch', 'xhr'],
  baseURL: 'https://api.example.com',
});

// If fetch fails, it automatically falls back to XHR
api.get('/users').then((response) => {
  console.log(response.meta.engine); // 'fetch' or 'xhr'
});
```

## Interceptors

```typescript
// Request interceptor
api.interceptors.request.use((config) => {
  config.headers['Authorization'] = `Bearer ${getToken()}`;
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.status === 401) redirectToLogin();
    return Promise.reject(error);
  }
);
```

## Configuration

```typescript
const api = xrequest.create({
  baseURL: 'https://api.example.com',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
  validateStatus: (status) => status >= 200 && status < 400,
});
```

## API Reference

### xrequest

| Method                                | Description     |
| ------------------------------------- | --------------- |
| `xrequest.get(url, config?)`          | GET request     |
| `xrequest.post(url, data?, config?)`  | POST request    |
| `xrequest.put(url, data?, config?)`   | PUT request     |
| `xrequest.delete(url, config?)`       | DELETE request  |
| `xrequest.patch(url, data?, config?)` | PATCH request   |
| `xrequest.head(url, config?)`         | HEAD request    |
| `xrequest.options(url, config?)`      | OPTIONS request |
| `xrequest.request(config)`            | Generic request |

### Instance Methods

| Method                  | Description          |
| ----------------------- | -------------------- |
| `api.get(...)`          | HTTP GET request     |
| `api.post(...)`         | HTTP POST request    |
| `api.create(config)`    | Create new instance  |
| `api.setEngine(engine)` | Set request engine   |
| `api.getEngine()`       | Get current engine   |
| `api.setConfig(config)` | Update global config |
| `api.getConfig()`       | Get current config   |

## Error Handling

```typescript
try {
  const { data } = await api.get('/api/users');
} catch (error) {
  if (error.isTimeout) {
    console.error('Request timeout');
  } else if (error.isNetworkError) {
    console.error('Network error');
  } else if (error.isAbort) {
    console.error('Request cancelled');
  } else {
    console.error('HTTP error:', error.status, error.statusText);
  }
}
```

## Response Structure

```typescript
interface Response<T = unknown, B = unknown> {
  data: T; // Response data
  meta: {
    // Response metadata
    status: number; // HTTP status code
    statusText: string;
    headers: Record<string, string>;
    engine: 'fetch' | 'xhr';
    duration: number; // Request duration in ms
  };
  config: RequestConfig<B>;
  request: XMLHttpRequest | Request;
}
```

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run linting
pnpm lint

# Type checking
pnpm typecheck
```

## Scripts

| Command              | Description                    |
| -------------------- | ------------------------------ |
| `pnpm build`         | Build all packages             |
| `pnpm dev`           | Run dev mode for all packages  |
| `pnpm test`          | Run unit tests                 |
| `pnpm test:watch`    | Run tests in watch mode        |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint`          | Run ESLint                     |
| `pnpm lint:fix`      | Run ESLint with auto-fix       |
| `pnpm typecheck`     | Run TypeScript type checking   |
| `pnpm release`       | Create and publish release     |

## Project Structure

```
xRequest/
├── packages/
│   ├── core/           # Core types and utilities
│   ├── xhr/            # XMLHttpRequest engine
│   ├── fetch/          # Fetch API engine
│   └── xrequest/       # Main entry point
├── examples/           # Example code
├── .github/            # GitHub workflows and templates
├── vitest.config.ts    # Test configuration
├── eslint.config.js    # Linting configuration
└── tsconfig.json       # TypeScript configuration
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a PR.

## License

[MIT](./LICENSE) - see the LICENSE file for details.

## Acknowledgments

Inspired by [Axios](https://github.com/axios/axios) and other excellent HTTP request libraries.
