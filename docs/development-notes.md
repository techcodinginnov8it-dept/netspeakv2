# Development Notes — Netspeak Portal

## Architectural Decisions & Assumptions

### 1. Framework & Application Architecture
- **Next.js App Router (15+)** with TypeScript and `src/` directory layout.
- Styling: Vanilla CSS with design system variables (`src/app/globals.css`) for high flexibility, consistent tokens, and responsive layout.

### 2. Authentication & Session Handling
- **Non-Supabase Auth**: Authentication is managed by the application itself.
- Passwords hashed using `bcryptjs` with salt rounds (12).
- Session tokens are cryptographically secure random values (hex) stored in a database `Session` table and set via `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- Server-side validation on every authenticated request via session lookup in the database.

### 3. Database & ORM
- **PostgreSQL** via Supabase connection string.
- **Prisma ORM** for type-safe models, schema migrations, and client generation.
- Initial schema handles core identity & access management: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, and `Session`.

### 4. Server-Side Authorization (RBAC)
- All authorization decisions are verified on the server (Server Actions and Route Handlers) via permission queries.
- UI elements adapt based on session permission state, but the server is the single enforcement barrier.
