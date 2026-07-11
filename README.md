# ForReal V2

> **WE DON'T TALK SHIT.**

ForReal is a next-generation social discussion platform built around authentic conversations. Unlike traditional social media that rewards attention and fake engagement, ForReal rewards meaningful discussions, honest opinions, and structured debates.

## Architecture

This project is built using a modern, scalable monorepo architecture:

- **Frontend (`client/`)**: React 19, Vite, Tailwind CSS V4, React Router V7, Zustand, Axios, Framer Motion.
- **Backend (`server/`)**: Node.js, Express.js, MongoDB Atlas (Mongoose), JWT Auth, Socket.IO, Winston Logger.

## Environment Variables

You need to create a `.env` file in the `server` directory based on `.env.example`:

```env
# Server
PORT=5000
NODE_ENV=development
API_PREFIX=/api/v1

# Client Config
CLIENT_URL=http://localhost:5173

# Database
MONGODB_URI=mongodb://localhost:27017/forreal

# Authentication
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRE=30d
COOKIE_EXPIRE=30
```

> **Note:** The server will crash on startup if any of these required variables are missing. This is a strict architectural constraint to prevent silent failures in production.

## Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd forreal
   ```

2. **Install Server Dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Install Client Dependencies:**
   ```bash
   cd ../client
   npm install
   ```

## Development Guide

To start the development servers, run the following commands in two separate terminal tabs:

**Tab 1 (Server):**
```bash
cd server
npm run dev
```

**Tab 2 (Client):**
```bash
cd client
npm run dev
```

The application will be available at `http://localhost:5173`.

## Available Scripts

### Client (`client/`)
- `npm run dev`: Starts the Vite dev server.
- `npm run build`: Builds the app for production.
- `npm run lint`: Lints the codebase using oxlint.

### Server (`server/`)
- `npm start`: Starts the production server.
- `npm run dev`: Starts the dev server with Nodemon.
- `npm run build`: (No-op, present for CI/CD compatibility).

## Production Certification

This project employs strict GitHub Actions CI/CD workflows for PRs and merges to the `master` branch. The pipeline enforces:
- `npm install` success
- Zero lint errors (`npm run lint`)
- Zero build failures (`npm run build`)
- Zero high/critical vulnerabilities (`npm audit`)
