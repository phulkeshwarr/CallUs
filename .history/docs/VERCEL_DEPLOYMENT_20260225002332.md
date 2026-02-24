# Vercel Deployment Guide

This project should be deployed as:

- Frontend (`frontend`) on Vercel
- Backend (`backend`) on a Node host that supports persistent connections (Render, Railway, Fly.io, VPS, etc.)

Reason: this app uses Socket.IO for WebRTC signaling, and Vercel Functions cannot act as a WebSocket server.

## 1. Deploy the backend first

Deploy the `backend` directory to Render/Railway (or equivalent) with:

- Build command: `npm install`
- Start command: `npm start`
- Root directory: `backend`

Set backend environment variables:

```env
NODE_ENV=production
PORT=5000
MONGO_URI=<mongodb-atlas-or-hosted-uri>
JWT_SECRET=<strong-random-secret>
JWT_EXPIRES_IN=7d
CLIENT_URL=https://<your-vercel-domain>
CLIENT_URLS=https://<your-vercel-domain>,https://<your-project>-git-*.vercel.app
```

Notes:

- `CLIENT_URL` is required.
- `CLIENT_URLS` supports comma-separated values and wildcard patterns.
- If you do not need preview deployments, keep `CLIENT_URLS` to only your production domain.

After deployment, copy your backend base URL (example: `https://callio-api.onrender.com`).

## 2. Deploy the frontend to Vercel

### Option A: Vercel Dashboard

1. Push this repo to GitHub/GitLab/Bitbucket.
2. In Vercel, click `Add New -> Project`.
3. Import this repository.
4. Configure:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. Add Environment Variables:
   - `VITE_API_URL=https://<backend-domain>/api`
   - `VITE_SOCKET_URL=https://<backend-domain>`
6. Click `Deploy`.

### Option B: Vercel CLI

```bash
cd frontend
npm i -g vercel
vercel login
vercel
```

Set env vars in Vercel project settings (or CLI), then deploy production:

```bash
vercel --prod
```

## 3. Update backend CORS after first frontend deploy

Once Vercel gives your real domain (for example `https://callio.vercel.app`), update backend:

```env
CLIENT_URL=https://callio.vercel.app
CLIENT_URLS=https://callio.vercel.app,https://callio-git-*.vercel.app
```

Redeploy/restart backend so CORS and Socket.IO origin checks are refreshed.

## 4. Final verification

1. Open the deployed frontend.
2. Register/login two different users in two browser sessions.
3. Confirm both users show `Online`.
4. Test `Audio` and `Video` calls.

## 5. Troubleshooting

- `Realtime connection unavailable`:
  - `VITE_SOCKET_URL` is wrong, backend is down, or backend CORS is missing your Vercel origin.
- API `401` loops:
  - stale token in browser storage; logout/login again.
- Video call fails but audio works:
  - camera permission/device issue; test on separate devices/cameras.
- No incoming popup:
  - verify both sessions are different logged-in users and both show online.

## 6. Reference docs

- Vercel Vite framework docs: https://vercel.com/docs/frameworks/frontend/vite
- Vercel build/root directory settings: https://vercel.com/docs/deployments/configure-a-build
- Vercel environment variables: https://vercel.com/docs/environment-variables
- Vercel limits (WebSocket note): https://vercel.com/docs/platform/limits
