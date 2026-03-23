# Personal OS — Command Center

A private personal operating system for managing goals, projects, tasks, notes, finances, and more. Built as real software — organized, modular, and scalable.

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React + Vite |
| Styling | Vanilla CSS with design tokens |
| Routing | React Router v6 |
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| Auth | JWT (access + refresh tokens) |

## Project Structure

```
Personal Dashboard/
├── frontend/          # React + Vite SPA
│   └── src/
│       ├── api/       # Axios client
│       ├── components/
│       │   ├── layout/  # AppShell, Sidebar, Topbar
│       │   └── ui/      # Reusable components
│       ├── context/   # AuthContext
│       ├── pages/     # Route pages
│       ├── router/    # React Router + guards
│       └── styles/    # Design system CSS
└── backend/           # Node.js + Express API
    ├── db/            # Database connection, schema, migrations
    ├── middleware/    # JWT auth middleware
    ├── routes/        # API route handlers
    ├── scripts/       # Seed script
    └── utils/         # JWT helpers
```

## Setup & Running

### 1. Backend

```bash
cd backend

# Copy and configure environment variables
cp .env.example .env
# Edit .env with your settings

# Install dependencies
npm install

# Create admin user
npm run seed

# Start dev server (port 3001)
npm run dev
```

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev
```

### 3. Open the app

Navigate to [http://localhost:5173](http://localhost:5173) and sign in with your admin credentials.

## Default Admin Credentials

Configured via `backend/.env`:
- **Email:** `admin@personal.os`
- **Password:** `changeme123`

⚠️ Change the default password before any external deployment.

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET  | `/api/v1/health` | Health check |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| GET  | `/api/v1/auth/me` | Current user (protected) |

## Adding a New Module

1. **Backend:** Create `backend/routes/modulename.js`, add one line to `backend/routes/index.js`
2. **Database:** Add a migration SQL file in `backend/db/`
3. **Frontend:** Create `frontend/src/pages/ModuleName.jsx`, add route to `frontend/src/router/index.jsx`, add nav item to `frontend/src/components/layout/Sidebar.jsx`
