# Local Setup and Deployment

## 1. Project structure

```text
call.io/
  backend/
    .env.example
    package.json
    src/
      app.js
      server.js
      config/
        db.js
        env.js
      controllers/
        authController.js
        userController.js
      middleware/
        authMiddleware.js
        errorHandler.js
      models/
        User.js
      routes/
        authRoutes.js
        userRoutes.js
      services/
        tokenService.js
      sockets/
        socketServer.js
        socketState.js
  frontend/
    .env.example
    index.html
    package.json
    vite.config.js
    src/
      App.jsx
      main.jsx
      api/
        client.js
      components/
        CallPanel.jsx
        Header.jsx
        IncomingCallModal.jsx
        UserList.jsx
        VideoPane.jsx
      context/
        AuthContext.jsx
        CallContext.jsx
        SocketContext.jsx
      pages/
        DashboardPage.jsx
        LoginPage.jsx
        RegisterPage.jsx
      styles/
        main.css
  docs/
    SETUP.md
  .gitignore
  README.md
```

## 2. Run locally

### Prerequisites
- Node.js 18+
- MongoDB running locally (or MongoDB Atlas URI)
- Redis is optional. If `REDIS_URL` is not set, realtime state uses in-memory fallback.

### Backend
```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## 3. Environment variables

### backend/.env
- `PORT=5000`
- `NODE_ENV=development`
- `MONGO_URI=...`
- `JWT_SECRET=...`
- `JWT_EXPIRES_IN=7d`
- `CLIENT_URL=http://localhost:5173`
- `CLIENT_URLS=http://localhost:5173,http://127.0.0.1:5173`
- `REDIS_URL=` optional
- `REDIS_KEY_PREFIX=callus` optional

### frontend/.env
- `VITE_API_URL=http://localhost:5000/api`
- `VITE_SOCKET_URL=http://localhost:5000`

## 4. WebRTC + signaling flow

1. Caller creates offer and emits `call:initiate`.
2. Server creates `callId`, stores call session, and emits `call:incoming` to callee.
3. Callee accepts with `call:accept` + answer.
4. Server relays `call:accepted` to caller.
5. Both peers exchange ICE via `call:ice-candidate`.
6. Any peer can terminate via `call:end`.
7. On disconnect, server clears active calls and notifies peer with `call:ended`.

## 5. Deployment

Detailed Vercel production steps are in `docs/VERCEL_DEPLOYMENT.md`.

### Backend (Render / Railway)
1. Create service from `backend` directory.
2. Build command: `npm install`
3. Start command: `npm start`
4. Set env vars: `MONGO_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL`, `PORT`.
5. Update `CLIENT_URL` to deployed frontend URL.

### Frontend (Vercel)
1. Import repo and set root directory to `frontend`.
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set env vars:
   - `VITE_API_URL=https://<backend-domain>/api`
   - `VITE_SOCKET_URL=https://<backend-domain>`
5. Redeploy after setting env vars.

## 6. Production notes

- Use HTTPS in production (required for camera/mic permissions and stable WebRTC).
- Add TURN server for NAT-restricted environments (current config includes public STUN only).
- Consider rate limiting and brute-force protection on auth routes.
- Add structured logging and monitoring.
