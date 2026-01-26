# Shared Package

This package contains common utilities, types, schemas, and services that are shared across multiple applications and packages in the monorepo. It promotes code reusability, consistency, and type safety.

## Features

- **Centralized Logging:** The `services/logger.ts` file sets up a centralized logger using `pino`, configured differently for production and development environments.
- **Zod Schemas:** The `schemas` directory defines various Zod schemas for validating data structures, such as `VideoSearchParamsSchema`, `searchSuggestionSchema`, and `VideoMetadataSummarySchema`. This ensures strong type safety and data integrity.
- **Common Utilities:** Provides various utility functions (e.g., for analytics, file handling, time manipulation) that are used across the project.
- **Shared Types:** Defines common TypeScript types and interfaces that are used consistently throughout the monorepo.
