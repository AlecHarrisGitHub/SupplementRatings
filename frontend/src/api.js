import axios from 'axios';

const API = axios.create({
  baseURL: 'http://127.0.0.1:8000/api/',
  withCredentials: true,  // If using session authentication
});

export const fetchSupplements = () => API.get('/supplements/');
export const fetchConditions = () => API.get('/conditions/');
export const fetchRatings = () => API.get('/ratings/');
export const fetchComments = () => API.get('/comments/');

// Add more API calls as needed
