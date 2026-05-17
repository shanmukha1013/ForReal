ForReal — Production readiness notes
=================================

Quick steps to prepare and run in production-like environment:

1. Create a `.env` file from `.env.example` and populate values (DO NOT commit `.env`).

2. Frontend build (from repo root):

```bash
cd ForReal/client
npm ci
npm run build
```

Serve the `dist/` with any static host (Vercel/Netlify) or a CDN.

3. Backend (server) deploy:

Ensure `MONGO_URI` and `JWT_SECRET` are set in your environment (provider secrets).

```bash
cd server
npm ci
# On Linux/macOS the classic start:
NODE_ENV=production PORT=5000 node server.js
# On platforms like Render/Heroku set env vars in the dashboard and use `npm start`.
```

Optional: deploy backend as a Docker container using `server/Dockerfile`:

```bash
# build
docker build -t forreal-server -f server/Dockerfile .
# run (ensure MONGO_URI and JWT_SECRET envs are set)
docker run -e MONGO_URI="$MONGO_URI" -e JWT_SECRET="$JWT_SECRET" -p 5000:5000 forreal-server
```

4. Health checks & readiness:

- HTTP health: `GET /api/health`
- Confirm Socket.IO endpoint at `ws(s)://<host>:<port>`

Operational notes:

- Use MongoDB Atlas for production and configure IP allowlist and backups.
- Rotate `JWT_SECRET` carefully — implement refresh token rotation when ready.
- Configure HTTPS + proxy settings on your host to expose secure sockets.
- Use process manager (PM2) or platform process supervisor to auto-restart on crash.
