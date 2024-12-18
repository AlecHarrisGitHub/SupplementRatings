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
        if (error.response?.status === 401) {
            // Clear token and redirect to login if unauthorized
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const loginUser = async (credentials) => {
    try {
        const response = await API.post('token/obtain/', credentials);
        if (response.data.access) {
            localStorage.setItem('token', response.data.access);
            // Set the token in axios defaults immediately after login
            API.defaults.headers.common['Authorization'] = `Bearer ${response.data.access}`;
        }
        return response.data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const logoutUser = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    delete API.defaults.headers.common['Authorization'];
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

export const getSupplements = async (params = {}) => {
    try {
        const token = localStorage.getItem('token');
        console.log('Current token:', token); // Debug log
        const response = await API.get('supplements/', { params });
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
        return response.data;
    } catch (error) {
        console.error('Error adding rating:', error);
        throw error;
    }
};

export const addComment = async (commentData) => {
    try {
        const response = await API.post('comments/', {
            rating: commentData.rating,
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

export const getConditions = async () => {
    try {
        const response = await API.get('conditions/');
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
        
        const response = await API.post('/upload-supplements-csv/', formData, {
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

export default API;