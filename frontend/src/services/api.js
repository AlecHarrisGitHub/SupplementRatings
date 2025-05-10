// frontend/src/services/api.js

import axios from 'axios';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config';

// Create an axios instance with a base URL
const API = axios.create({
    baseURL: API_BASE_URL,
});

// Add a request interceptor to include the auth token and CSRF token
API.interceptors.request.use((config) => {
    // Add auth token if it exists
    const token = localStorage.getItem('token');
    console.log("TOKEN BEING SENT:", token ? "YES (length: " + token.length + ")" : "NO TOKEN");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log("AUTHORIZATION HEADER:", config.headers.Authorization);
    }
    
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Add a response interceptor to handle errors
API.interceptors.response.use(
    (response) => response,
    (error) => {
        const requestUrl = error.config.url;
        const authEndpoints = ['token/obtain/', 'register/'];

        if (
            error.response?.status === 401 &&
            !authEndpoints.some((endpoint) => requestUrl.includes(endpoint))
        ) {
            localStorage.removeItem('token');
            localStorage.removeItem('isAdmin');
            window.location.href = '/login';
        }

        // Return the actual error message from the backend if available
        return Promise.reject({
            status: error.response?.status,
            message: error.response?.data?.detail || error.response?.data?.error || 'An unexpected error occurred'
        });
    }
);

// Add caching to the API service
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const authenticatedFetch = async (endpoint, options = {}) => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const headers = {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response;
};

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
        throw error;
    }
};

export const getSupplement = async (id) => {
    try {
        const response = await API.get(`supplements/${id}/`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const getSupplementDetails = async (id) => {
    try {
        const response = await API.get(`supplements/${id}/`);
        return response.data;
    } catch (error) {
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
        throw error;
    }
};

export const addRating = async (formData) => {
    try {
        const response = await API.post('ratings/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        cache.clear();
        return response.data;
    } catch (error) {
        throw {
            userMessage: error.response?.data?.detail || 
                        'Unable to add rating. Please check your input and try again.'
        };
    }
};

export const addComment = async (formData) => {
    try {
        const response = await API.post('comments/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw {
            userMessage: error.response?.data?.detail || 
                        'Unable to add comment. Please try again.'
        };
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

export const updateComment = async (commentId, content, image = null) => {
    try {
        const formData = new FormData();
        formData.append('content', content);
        if (image) {
            formData.append('image', image);
        }
        
        const response = await API.put(`comments/${commentId}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error updating comment:', error);
        throw error;
    }
};

export const updateRating = async (ratingId, formData) => {
    try {
        // Log FormData contents for debugging
        for (let pair of formData.entries()) {
            console.log('FormData:', pair[0], pair[1]);
        }

        const response = await API.put(`ratings/${ratingId}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        cache.clear();
        return response.data;
    } catch (error) {
        console.error('Error updating rating:', error);
        console.error('Error response:', error.response?.data);
        throw error;
    }
};

export const uploadBrandsCSV = async (file) => {
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await API.post('/upload-brands-csv/', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error uploading brands CSV:', error);
        throw error;
    }
};

export const getBrands = async () => {
    try {
        const response = await API.get('/brands/');
        return response.data;
    } catch (error) {
        console.error('Error fetching brands:', error);
        throw error;
    }
};

export const upvoteRating = async (ratingId) => {
    try {
        const response = await API.post(`ratings/${ratingId}/upvote/`);
        return response.data;
    } catch (error) {
        console.error('Error upvoting rating:', error);
        throw error;
    }
};

export const upvoteComment = async (commentId) => {
    try {
        const response = await API.post(`comments/${commentId}/upvote/`);
        return response.data;
    } catch (error) {
        console.error('Error upvoting comment:', error);
        throw error;
    }
};

export const getCategories = async () => {
    try {
        const response = await API.get('supplements/categories/');
        return response.data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
};

export default API;