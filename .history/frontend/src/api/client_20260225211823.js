import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;
let unauthorizedHandler = null;

export const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.response.use(  //interceptors are functions that are called before a request is sent or after a response is received. They can be used to modify the request or response, or to handle errors.
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = error?.config?.url || "";
    const isAuthMutation = url.includes("/auth/login") || url.includes("/auth/register");

    if (status === 401 && !isAuthMutation) {
      unauthorizedHandler?.();
    }

    return Promise.reject(error); // promise is an object that represents the eventual completion (or failure) of an asynchronous operation and its resulting value. In this case, we are rejecting the promise with the error object, which allows us to handle the error in the calling code using .catch() or try/catch with async/await.
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
