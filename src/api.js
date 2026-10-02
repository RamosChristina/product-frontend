import axios from "axios";

// The API address comes from the .env file (VITE_API_URL).
// If it is missing, fall back to the local LavaLust server.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:3000/api",
  headers: { "Content-Type": "application/json" },
});

// Attach the login token to every request, if we have one.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function login(username, password) {
  const { data } = await api.post("/login", { username, password });
  localStorage.setItem("access_token", data.access_token);
  localStorage.setItem("username", username);
  return data;
}

export function logout() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("username");
}

export function isLoggedIn() {
  return Boolean(localStorage.getItem("access_token"));
}

export function currentUser() {
  return localStorage.getItem("username") || "";
}

export const getProducts = () => api.get("/products").then((r) => r.data);
export const addProduct = (product) => api.post("/products", product);
export const updateProduct = (id, product) => api.put(`/products/${id}`, product);
export const deleteProduct = (id) => api.delete(`/products/${id}`);

// Turns any failed request into a short message a person can read.
export function errorMessage(err) {
  if (err.response?.data?.error) return err.response.data.error;
  if (err.request) return "Can't reach the API. Check that the server is running.";
  return "Something went wrong. Try again.";
}
