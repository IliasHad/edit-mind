# DB Package

This package is a database utility library, providing helper functions and models for interacting with the database.

## Dependencies

This package has dependencies on the following libraries:

- `bcryptjs` for password hashing
- `nanoid` for generating unique IDs

## Features

- **Prisma Client:** The `db.ts` file imports and exports the Prisma client, which is the main interface for interacting with the database.
- **Singleton Pattern:** It uses a singleton pattern to ensure that there is only one instance of the Prisma client in the application. This is a good practice for managing database connections.
- **Data Access Layer:** The `models` directory defines a data access layer for the database models. It provides methods for creating, finding, updating, and deleting records.