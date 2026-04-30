# STI Cubao Faculty Paging System

A web-based faculty paging system for STI College Cubao that allows students to call teachers by department using outside and faculty display screens.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, Tailwind CSS |
| Backend | Node.js + Express |
| Real-time | Socket.io |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Database | MySQL 8 |
| Container | Docker + Docker Compose |

## Quick Start (Docker)

```bash
# 1. Clone and enter the repo
git clone <repo-url>
cd sti-cubao-paging-system

# 2. Create your env file
cp .env.example .env
# Edit .env and set a strong JWT_SECRET

# 3. Start all services
docker compose up --build

# The app is now available at:
#   http://localhost        → Student paging UI
#   http://localhost/display → Faculty display screen
#   http://localhost/admin  → Admin dashboard
```

Default admin credentials (change after first login):
- **Username:** `admin`
- **Password:** `admin123`

## Project Structure

```
├── client/           # React + Vite frontend (served by nginx)
│   ├── src/
│   │   ├── pages/    # StudentPage, DisplayScreen, AdminLogin, AdminDashboard
│   │   ├── components/
│   │   ├── context/  # JWT AuthContext
│   │   ├── hooks/    # useSocket (Socket.io)
│   │   └── api/      # Axios instance
│   └── nginx.conf    # Reverse proxy config
│
├── server/           # Express API + Socket.io
│   ├── routes/       # /auth /departments /teachers /pages
│   ├── middleware/   # JWT auth middleware
│   ├── socket/       # Socket.io event handlers
│   └── db/           # MySQL pool
│
├── database/
│   └── init.sql      # Schema + seed data
│
├── docker-compose.yml
└── .env.example
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login, returns JWT |
| POST | `/api/auth/register` | Admin | Create staff user |
| GET | `/api/departments` | — | List departments |
| POST/PUT/DELETE | `/api/departments/:id` | Admin | Manage departments |
| GET | `/api/teachers` | — | List teachers (`?department_id=`) |
| POST/PUT/DELETE | `/api/teachers/:id` | Admin | Manage teachers |
| POST | `/api/pages` | — | Student pages a teacher |
| GET | `/api/pages` | Admin | List page requests |
| PATCH | `/api/pages/:id/resolve` | Admin | Resolve a page |
| DELETE | `/api/pages/:id` | Admin | Delete a page |

## Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_display` | Client → Server | Join the display room |
| `new_page` | Server → Display | New page request created |
| `page_resolved` | Server → Display | Page request resolved |

## Development (without Docker)

```bash
# Terminal 1 — backend
cd server
cp .env.example .env   # edit as needed
npm install
npm run dev

# Terminal 2 — frontend
cd client
npm install
npm run dev
# Vite dev server: http://localhost:5173
```
