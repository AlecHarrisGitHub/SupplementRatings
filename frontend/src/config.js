const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = isDevelopment 
    ? 'http://127.0.0.1:8000/api/'
    : 'https://supplementratings.com/api/'; 