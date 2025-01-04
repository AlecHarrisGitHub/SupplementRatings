// frontend/src/services/api.js

import axios from 'axios';

// Create an axios instance with a base URL
const API = axios.create({
    baseURL: 'http://localhost:8000/api/'
});

// Add a request interceptor to include the auth token
API.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request config:', config); // Debug log
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Add a response interceptor to handle errors
API.interceptors.response.use(
    (response) => response,
    (error) => {
        console.error('API Error:', error.response); // Debug log

        // Extract the request URL
        const requestUrl = error.config.url;

        // Define endpoints that should not trigger a redirect
        const authEndpoints = ['token/obtain/', 'register/'];

        // Check if the error is 401 and the request is not to an auth endpoint
        if (
            error.response?.status === 401 &&
            !authEndpoints.some((endpoint) => requestUrl.includes(endpoint))
        ) {
            // Clear token and redirect to login if unauthorized
            localStorage.removeItem('token');
            localStorage.removeItem('isAdmin');
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

// Add caching to the API service
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getSupplements = async (params = {}, skipCache = false) => {
    const cacheKey = JSON.stringify(params);
    const cached = cache.get(cacheKey);
    
    if (!skipCache && cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    try {
        const response = await API.get('supplements/', { params });
        if (params.offset === 0) {  // Only cache first page
            cache.set(cacheKey, {
                data: response.data,
                timestamp: Date.now()
            });
        }
        return response.data;
    } catch (error) {
        console.error('Error fetching supplements:', error);
        throw error;
    }
};

export const getSupplement = async (id) => {
    try {
        const response = await API.get(`supplements/${id}/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching supplement:', error);
        throw error;
    }
};

export const getSupplementDetails = async (id) => {
    try {
        const response = await API.get(`supplements/${id}/`);
        return response.data;
    } catch (error) {
        console.error('Error fetching supplement details:', error);
        throw error;
    }
};

export const getRatings = async (supplementId) => {
    try {
        const response = await API.get(`ratings/`, {
            params: { supplement: supplementId }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching ratings:', error);
        throw error;
    }
};

export const addRating = async (ratingData) => {
    try {
        const response = await API.post('ratings/', ratingData);
        // Clear the cache for this supplement's data
        cache.clear(); // Clear all cache when a rating is added
        return response.data;
    } catch (error) {
        const errorMessage = error.response?.data?.detail || 
                           error.response?.data?.message || 
                           'Failed to add rating.';
        error.userMessage = errorMessage;
        throw error;
    }
};

export const addComment = async (commentData) => {
    try {
        const response = await API.post('comments/', {
            rating: commentData.rating,
            parent_comment: commentData.parent_comment,
            content: commentData.content.trim()
        });
        return response.data;
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};

export const getComments = async (ratingId) => {
    try {
        const response = await API.get(`comments/`, {
            params: { rating: ratingId }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching comments:', error);
        throw error;
    }
};

export const getConditions = async (searchTerm) => {
    try {
        const response = await API.get('conditions/', {
            params: { search: searchTerm }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching conditions:', error);
        throw error;
    }
};

export const uploadConditionsCSV = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        // Log the auth header for debugging
        console.log('Auth header:', API.defaults.headers.common['Authorization']);
        
        const response = await API.post('upload-conditions-csv/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading conditions CSV:', error);
        throw error;
    }
};

export const uploadSupplementsCSV = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await API.post('/upload-supplements-csv/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading supplements CSV:', error);
        throw error;
    }
};

export const loginUser = async (credentials) => {
    try {
        const response = await API.post('token/obtain/', credentials);
        return response.data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
};

export const registerUser = async (userData) => {
    try {
        const response = await API.post('register/', userData);
        return response.data;
    } catch (error) {
        console.error('Registration error:', error);
        throw error;
    }
};

export const verifyEmail = async (token) => {
    try {
        const response = await API.get(`verify-email/${token}/`);
        return response.data;
    } catch (error) {
        console.error('Error verifying email:', error);
        throw error;
    }
};

export const updateComment = async (commentId, content) => {
    try {
        const response = await API.put(`comments/${commentId}/`, {
            content: content,
            is_edited: true
        });
        return response.data;
    } catch (error) {
        console.error('Error updating comment:', error);
        throw error;
    }
};

export const updateRating = async (ratingId, ratingData) => {
    try {
        const response = await API.patch(`ratings/${ratingId}/`, ratingData);
        // Clear the cache for this supplement's data
        cache.clear();
        return response.data;
    } catch (error) {
        console.error('Error updating rating:', error);
        throw error;
    }
};

export default API;