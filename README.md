# MetMatch - Fixed Income Trading Platform

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL (via Docker)

### Setup Instructions

1. **Start the database**
```bash
docker-compose up -d
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup backend environment**
```bash
cp backend/.env.example backend/.env
```

4. **Initialize database**
```bash
cd backend
npx prisma generate
npx prisma db push
```

5. **Start development servers**
```bash
# From root directory
npm run dev
```

This will start:
- Backend API: http://localhost:5001
- Frontend: http://localhost:5173

## Project Structure

```
/
├── backend/           # Express.js API with TypeScript
│   ├── src/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── types/
│   └── prisma/       # Database schema
├── frontend/         # React with TypeScript & Vite
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/
│       └── store/
└── docker-compose.yml
```

## Features Implemented

- ✅ User authentication (JWT)
- ✅ RFQ creation and management
- ✅ Order management system
- ✅ Market broadcasts
- ✅ Real-time updates (Socket.io)
- ✅ PostgreSQL with Prisma ORM
- ✅ TypeScript throughout
- ✅ Tailwind CSS for styling

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/rfqs` - List RFQs
- `POST /api/rfqs` - Create RFQ
- `GET /api/orders` - List orders
- `GET /api/markets/broadcasts` - Get market broadcasts

## Default Credentials

First, register a new account at http://localhost:5173/register