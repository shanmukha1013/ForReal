ForReal Deployment Guide

Overview

This guide covers deploying the frontend (Vercel/Netlify) and backend (Render/Railway) with production-ready configuration.

Frontend (Vercel)

1. Connect the `ForReal/client` folder to Vercel as a project.
2. Set the root directory to `ForReal/client`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Environment variables (set in Vercel dashboard):
   - `VITE_API_BASE_URL` = https://api.yourdomain.com/api
   - `VITE_SOCKET_URL` = https://api.yourdomain.com
6. Configure rewrites so client-side routing works (Vercel does this automatically).

Backend (Render)

1. Create a new Web Service on Render.
2. Connect the repository and set the root to the repository root.
3. Build command: `cd server && npm ci` (Render will run install) — or leave default.
4. Start command: `cd server && npm start`.
5. Environment variables (Render dashboard):
   - `MONGO_URI` = your Atlas connection string
   - `JWT_SECRET` = strong secret
   - `CLIENT_URL` = https://your-frontend-domain
   - `NODE_ENV` = production
   - `PORT` = 10000 (Render supplies one automatically)
6. For Socket.IO, ensure WebSocket support is enabled (Render supports websockets).

MongoDB Atlas

- Create an Atlas cluster, whitelist Render/Vercel IPs or use VPC peering depending on platform.
- Create a user and use the connection string for `MONGO_URI`.

Testing after deploy

- Visit the frontend URL, sign up, and verify sockets connect and messages flow.
- Use browser devtools to inspect websocket connection and auth headers.

Security & Operational Notes

- Use platform secrets managers for `JWT_SECRET` and `MONGO_URI`.
- Monitor logs and set up alerting for `unhandledRejection` and `uncaughtException`.
- Consider enabling connection pooling and scaling for Socket.IO via Redis adapter when needed.

Troubleshooting

- If sockets fail to connect, check CORS and `CLIENT_URL` configuration.
- Check that `cookie.secure` is only used when HTTPS is active behind the proxy.

