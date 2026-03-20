# Vercel Deployment Guide (Frontend) + Render Deployment Guide (Backend)

Deploy this project in 2 parts:

- Frontend (`frontend`) -> Vercel
- Backend (`backend`) -> Render

Do not deploy backend to Vercel for this app. Socket.IO signaling needs a long-running Node server.

## 1. Deploy backend on Render

Create a **Web Service** and set:

- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`

Set these environment variables in Render:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=<your-mongodb-uri>
JWT_SECRET=<your-strong-secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://frontend-git-main-phulkeshwar-mahtos-projects-dc98ca4b.vercel.app
CLIENT_URLS=https://frontend-red-nine-77.vercel.app,https://frontend-red-nine-77-git-*.vercel.app

CLIENT_URLS=https://frontend-git-main-phulkeshwar-mahtos-projects-dc98ca4b.vercel.app,https://*.vercel.app


Remove these from backend env if present:

- `VITE_API_URL`
- `VITE_SOCKET_URL`

Backend health check:

`https://callus-pgo1.onrender.com/api/health`

Expected:

```json
{"status":"ok"}
```

## 2. Deploy frontend on Vercel

Create Vercel project with:

- Framework: `Vite`
- Root Directory: `frontend`
- Install Command: `npm install`
- Build Command: `npm run build`
- Output Directory: `dist`

Set frontend environment variables in Vercel:

```env
VITE_API_URL=https://callus-pgo1.onrender.com/api
VITE_SOCKET_URL=https://callus-pgo1.onrender.com
```

Redeploy frontend after saving env vars.

## 3. Correct deployment order

1. Deploy backend on Render.
2. Confirm backend health URL works.
3. Set Vercel env vars to Render backend URL.
4. Deploy frontend on Vercel.
5. Ensure Render `CLIENT_URL` and `CLIENT_URLS` point to your Vercel domain.
6. Redeploy backend once after URL changes.

## 4. Post-deploy testing

1. Open `https://frontend-red-nine-77.vercel.app`.
2. Login with two different users in two browser sessions.
3. Confirm both users show `Online`.
4. Test audio call.
5. Test video call.

## 5. Common errors

- `FUNCTION_INVOCATION_FAILED` on Vercel:
  - backend was deployed to Vercel instead of Render.
- `Missing required environment variable: CLIENT_URL` on Render:
  - `CLIENT_URL` not set.
- `Realtime connection unavailable`:
  - wrong `VITE_SOCKET_URL` or backend is down.
- API 401 loops:
  - stale token in browser storage; logout/login again.

## 6. References

- Vercel + Vite: https://vercel.com/docs/frameworks/frontend/vite
- Vercel env vars: https://vercel.com/docs/environment-variables
- Render web services: https://render.com/docs/web-services