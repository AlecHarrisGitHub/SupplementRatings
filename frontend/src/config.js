const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = isDevelopment 
    ? 'http://127.0.0.1:8000/api/'
    : 'https://supplementratings.com/api/';

// Centralized default profile image URL to avoid mixed-content and hardcoded localhost
// Derive from API_BASE_URL so it works in both dev and prod
// Compute media base by stripping a trailing /api or /api/
const MEDIA_BASE = API_BASE_URL.endsWith('/api/')
    ? API_BASE_URL.slice(0, -5)
    : (API_BASE_URL.endsWith('/api') ? API_BASE_URL.slice(0, -4) : API_BASE_URL);
export const DEFAULT_PROFILE_IMAGE_URL = `${MEDIA_BASE}/media/profile_pics/default.jpg`;