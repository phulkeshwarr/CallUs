# Call.io Deployment Guide (Vercel + Render)

This guide will walk you through deploying the Call.io application. The frontend will be deployed on **Vercel** (for static/React hosting) and the backend will be deployed on **Render** (for Node.js/Socket.io hosting).

## Prerequisites
1. A GitHub account with this repository pushed to it.
2. A free [Render](https://render.com/) account.
3. A free [Vercel](https://vercel.com/) account.
4. Your MongoDB connection string (URI).

---

## 1. Deploying the Backend on Render

1. Log in to your Render dashboard.
2. Click **New +** and select **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub account.
4. Select the `Call.io` repository.
5. In the settings, configure the following:
   - **Name**: `call-io-backend` (or similar)
   - **Root Directory**: `backend` (⚠️ **CRITICAL: You must specify this since it's a monorepo**)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` (Make sure your `backend/package.json` has `"start": "node src/index.js"`)
6. Scroll down to **Environment Variables**, click **Add Environment Variable**, and add the following from your local `.env`:
   - `NODE_ENV` = `production`
   - `MONGO_URI` = `your_mongodb_connection_string`
   - `JWT_SECRET` = `your_secure_random_string`
   - `JWT_EXPIRES_IN` = `7d`
   - `CLIENT_URL` = `https://your-frontend-url-on-vercel.vercel.app` (You can add a dummy URL for now, then update it later once Vercel is set up).
   - `CLIENT_URLS` = `https://your-frontend-url-on-vercel.vercel.app`
7. Click **Create Web Service**. 
8. Wait for the build to finish. Once it's live, copy the Render URL (e.g., `https://call-io-backend.onrender.com`).

---

## 2. Deploying the Frontend on Vercel

1. Log in to your Vercel dashboard.
2. Click **Add New...** -> **Project**.
3. Import your `Call.io` GitHub repository.
4. In the "Configure Project" screen, expand the **Framework Preset** and select **Vite**.
5. Change the **Root Directory** to `frontend` (⚠️ **CRITICAL**).
6. Expand the **Environment Variables** section and add:
   - `VITE_API_URL` = `https://your-backend-url.onrender.com/api` (Use the Render URL from Step 1)
   - `VITE_SOCKET_URL` = `https://your-backend-url.onrender.com` (Use the Render URL from Step 1)
7. Click **Deploy**.
8. Once deployed, copy your new Vercel domain (e.g., `https://call-io-frontend.vercel.app`).

---

## 3. Final Connection Step (IMPORTANT)

Now that you have your Vercel URL, you need to tell your Render backend to accept connections (CORS) from it.

1. Go back to your **Render dashboard** -> **Your backend web service** -> **Environment**.
2. Update the `CLIENT_URL` and `CLIENT_URLS` variables to be exactly your Vercel URL **without a trailing slash**.
   - Example `CLIENT_URLS`: `https://call-io-frontend.vercel.app`
3. Click **Save Changes**. Render will automatically redeploy the backend with the new variables.

## 4. Local Development

If you want to run it locally again:
1. Open two terminals.
2. Terminal 1 (Backend):
   ```bash
   cd backend
   npm run dev
   ```
3. Terminal 2 (Frontend):
   ```bash
   cd frontend
   npm run dev
   ```
4. Access the app on `http://localhost:5173`. Make sure your local `frontend/.env` variables point to `http://localhost:5000`.
