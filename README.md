# generic-request

[English](./README.md) | [中文](./README_zh-CN.md)

A lightweight HTTP request library with dual-engine support (XHR & Fetch) based on pnpm monorepo architecture.

## Features

- **Dual Engine Support**: Seamlessly switch between XMLHttpRequest and Fetch API
- **Engine Chain**: Configure multiple engines with automatic fallback
- **Interceptor System**: Full support for request/response interceptors
- **TypeScript**: Complete TypeScript support out of the box
- **Lightweight**: Minimal bundle size, tree-shakable
- **Promise-based**: Modern async/await API

## Project Structure

```
genericRequest/
└── src/
    ├── index.ts              # Main entry point and exports
    └── components/
        ├── core/             # Core types and utilities
        │   ├── types.ts      # Type definitions
        │   ├── utils.ts      # Utility functions
        │   ├── engine.ts     # Engine interface
        │   └── index.ts
        ├── entry/            # Main entry with interceptors
        │   ├── genericRequest.ts  # Main class
        │   ├── interceptor.ts     # Interceptor manager
        │   ├── engine-manager.ts  # Engine chain manager
        │   ├── ureq.ts           # Unified request
        │   └── index.ts
        ├── fetch/            # Fetch API engine
        │   ├── fetch-engine.ts
        │   └── index.ts
        └── xhr/             # XMLHttpRequest engine
            ├── xhr-engine.ts
            └── index.ts
```

## Installation

```bash
# Using npm
npm install genericRequest

# Using pnpm
pnpm add genericRequest

# Using yarn
yarn add genericRequest
```

## Quick Start

```typescript
import genericRequest from 'genericRequest';

// Basic GET request
const { data } = await genericRequest.get('/api/users');

// POST request with data
const { data } = await genericRequest.post('/api/users', { name: 'John' });

// Full configuration
const { data, meta } = await genericRequest({
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
const api = genericRequest.create({
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

## API Reference

### genericRequest

| Method                                      | Description     |
| ------------------------------------------- | --------------- |
| `genericRequest.get(url, config?)`          | GET request     |
| `genericRequest.post(url, data?, config?)`  | POST request    |
| `genericRequest.put(url, data?, config?)`   | PUT request     |
| `genericRequest.delete(url, config?)`       | DELETE request  |
| `genericRequest.patch(url, data?, config?)` | PATCH request   |
| `genericRequest.head(url, config?)`         | HEAD request    |
| `genericRequest.options(url, config?)`      | OPTIONS request |
| `genericRequest.request(config)`            | Generic request |

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

# Build the project
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
| `pnpm build`         | Build the project              |
| `pnpm dev`           | Run dev mode                   |
| `pnpm test`          | Run unit tests                 |
| `pnpm test:watch`    | Run tests in watch mode        |
| `pnpm test:coverage` | Run tests with coverage report |
| `pnpm lint`          | Run ESLint                     |
| `pnpm lint:fix`      | Run ESLint with auto-fix       |
| `pnpm typecheck`     | Run TypeScript type checking   |
| `pnpm release`       | Create and publish release     |

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting a PR.

## License

[MIT](./LICENSE) - see the LICENSE file for details.

## Acknowledgments

Inspired by [Axios](https://github.com/axios/axios) and other excellent HTTP request libraries.
