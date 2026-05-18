# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-01

### Added

- Initial release
- Dual engine support (XHR & Fetch)
- Engine chain with automatic fallback
- Request and response interceptors
- Full TypeScript support
- Complete type definitions
- Request configuration (timeout, headers, params, etc.)
- Response metadata (status, headers, duration, engine)
- Error handling (timeout, network error, abort)
- Upload and download progress callbacks
- Global configuration via `create()`
- Instance methods for all HTTP verbs (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)

### Packages

- `@ureq/core` - Core types and utilities
- `@ureq/xhr` - XMLHttpRequest engine implementation
- `@ureq/fetch` - Fetch API engine implementation
- `@ureq/entry` - Internal entry implementation
- `ureq` - Main entry point for npm distribution

[1.0.0]: https://github.com/ureq/ureq/releases/tag/v1.0.0
