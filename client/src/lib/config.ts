const API_ORIGIN = (import.meta.env.VITE_API_URL as string).replace(/\/+$/, "");

export { API_ORIGIN };
export const API_BASE_URL = `${API_ORIGIN}/api`;
