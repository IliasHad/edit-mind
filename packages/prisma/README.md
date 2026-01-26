# Prisma Package

This package defines the Prisma schema for the entire application, including models, enums, and relations. It also contains the database migrations and seed data.

## Purpose

The `schema.prisma` file is the single source of truth for the entire application's data structure. It defines the core entities, their fields, and their relationships.

## Contents

- **`schema.prisma`**: The main Prisma schema file, defining the database models, enums, and relations.
- **`migrations` directory**: Contains the database migration files, which are used to evolve the database schema over time.
- **`seed.ts`**: Contains seed data for populating the database with initial data.
