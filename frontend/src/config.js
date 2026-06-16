// API endpoint configuration
// In development, Vite proxies '/api' to 'http://localhost:5000/api'
// In production on Vercel, the backend is mapped to '/_/backend/api'
export const API_BASE = import.meta.env.PROD ? '/_/backend/api' : '/api';
