import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
let unauthorizedHandler = null;

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.response.use(  //inter
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isAuthMutation = url.includes("/auth/login") || url.includes("/auth/register");

    if (status === 401 && !isAuthMutation) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error);
  }
);

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
}

export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}
