# Vercel Deployment Guide

Deploy this project in 2 parts:

- Frontend (`frontend`) on Vercel
- Backend (`backend`) on Render

Do not deploy the backend to Vercel for this app. Socket.IO signaling needs a long-running Node server.

## Backend on Render

Create a Render Web Service with:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Set these environment variables:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-strong-secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://frontend-git-main-phulkeshwar-mahtos-projects-dc98ca4b.vercel.app
CLIENT_URLS=https://frontend-git-main-phulkeshwar-mahtos-projects-dc98ca4b.vercel.app,https://*.vercel.app
REDIS_URL=<optional>
REDIS_KEY_PREFIX=callus
```

Notes:

- `REDIS_URL` is optional. If it is missing, the backend now falls back to single-instance in-memory realtime state.
- Remove frontend-only variables from Render if they exist: `VITE_API_URL`, `VITE_SOCKET_URL`.

Health check:

`https://callus-pgo1.onrender.com/api/health`

Expected response:

```json
{"status":"ok"}
```

## Frontend on Vercel

Create a Vercel project with:

- Framework: `Vite`
- Root Directory: `frontend`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Set these Vercel environment variables:

```env
VITE_API_URL=https://callus-pgo1.onrender.com/api
VITE_SOCKET_URL=https://callus-pgo1.onrender.com
```

Redeploy frontend after saving the variables.

## Recommended order

1. Deploy backend on Render.
2. Confirm the health URL works.
3. Set Vercel env vars to the Render backend URL.
4. Deploy frontend on Vercel.
5. If frontend URL changes, update `CLIENT_URL` and `CLIENT_URLS` in Render and redeploy backend.

## Post-deploy checks

1. Open the frontend URL.
2. Register or log in with two different users.
3. Confirm both users show `Online`.
4. Test audio call.
5. Test video call.

## Common issues

- `FUNCTION_INVOCATION_FAILED` on Vercel:
  - the backend was deployed to Vercel instead of Render.
- `Missing required environment variable: CLIENT_URL` on Render:
  - `CLIENT_URL` is missing from Render env vars.
- `Not allowed by CORS`:
  - `CLIENT_URL` or `CLIENT_URLS` does not include the exact frontend origin.
- `Realtime connection unavailable`:
  - `VITE_SOCKET_URL` is wrong or backend is down.

## References

- Vercel Vite docs: https://vercel.com/docs/frameworks/frontend/vite
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Render web services: https://render.com/docs/web-services
