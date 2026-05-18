# ureq

[English](./README.md) | [中文](./README_zh-CN.md)

A lightweight HTTP request library with dual-engine support (XHR & Fetch).

## Features

- **Dual Engine Support**: Seamlessly switch between XMLHttpRequest and Fetch API
- **Engine Chain**: Configure multiple engines with automatic fallback
- **Interceptor System**: Full support for request/response interceptors
- **TypeScript**: Complete TypeScript support out of the box
- **Lightweight**: Minimal bundle size, tree-shakable
- **Promise-based**: Modern async/await API

## Installation

```bash
# Using npm
npm install ureq

# Using pnpm
pnpm add ureq

# Using yarn
yarn add ureq
```

## Quick Start

```typescript
import ureq from 'ureq';

// Basic GET request
const { data } = await ureq.get('/api/users');

// POST request with data
const { data } = await ureq.post('/api/users', { name: 'John' });
```
