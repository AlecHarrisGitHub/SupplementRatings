// frontend/src/services/api.js

import axios from 'axios';
import { getAuthToken } from '../utils/auth';
import { API_BASE_URL } from '../config';

// Create an axios instance with a base URL
const API = axios.create({
    baseURL: API_BASE_URL,
});

// Session management and auto-save functionality
class SessionManager {
    constructor() {
        this.refreshTimeout = null;
        this.warningTimeout = null;
        this.autoSaveInterval = null;
        this.isRefreshing = false;
        this.failedRefreshAttempts = 0;
        this.maxRefreshAttempts = 3;
    }

    // Start session monitoring
    startSessionMonitoring() {
        this.scheduleTokenRefresh();
        this.scheduleWarning();
    }

    // Stop session monitoring
    stopSessionMonitoring() {
        if (this.refreshTimeout) {
            clearTimeout(this.refreshTimeout);
            this.refreshTimeout = null;
        }
        if (this.warningTimeout) {
            clearTimeout(this.warningTimeout);
            this.warningTimeout = null;
        }
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Schedule token refresh (refresh 5 minutes before expiration)
    scheduleTokenRefresh() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000; // Convert to milliseconds
            const currentTime = Date.now();
            const timeUntilExpiration = expirationTime - currentTime;
            const timeUntilRefresh = Math.max(timeUntilExpiration - (5 * 60 * 1000), 60000); // 5 minutes before or 1 minute minimum

            this.refreshTimeout = setTimeout(() => {
                this.refreshToken();
            }, timeUntilRefresh);
        } catch (error) {
            console.error('Error parsing token for refresh scheduling:', error);
        }
    }

    // Schedule warning notification
    scheduleWarning() {
        const token = localStorage.getItem('token');
        if (!token) return;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const expirationTime = payload.exp * 1000;
            const currentTime = Date.now();
            const timeUntilExpiration = expirationTime - currentTime;
            const timeUntilWarning = Math.max(timeUntilExpiration - (2 * 60 * 1000), 30000); // 2 minutes before or 30 seconds minimum

            this.warningTimeout = setTimeout(() => {
                this.showSessionWarning();
            }, timeUntilWarning);
        } catch (error) {
            console.error('Error parsing token for warning scheduling:', error);
        }
    }

    // Refresh token
    async refreshToken() {
        if (this.isRefreshing) return;

        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            this.handleSessionExpired();
            return;
        }

        this.isRefreshing = true;

        try {
            const response = await axios.post(`${API_BASE_URL}token/refresh/`, {
                refresh: refreshToken
            });

            const { access } = response.data;
            localStorage.setItem('token', access);
            this.failedRefreshAttempts = 0;

            // Reschedule monitoring with new token
            this.scheduleTokenRefresh();
            this.scheduleWarning();

            console.log('Token refreshed successfully');
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.failedRefreshAttempts++;
            
            if (this.failedRefreshAttempts >= this.maxRefreshAttempts) {
                this.handleSessionExpired();
            } else {
                // Retry after 30 seconds
                setTimeout(() => {
                    this.refreshToken();
                }, 30000);
            }
        } finally {
            this.isRefreshing = false;
        }
    }

    // Show session warning
    showSessionWarning() {
        // Import toast dynamically to avoid circular dependencies
        import('react-hot-toast').then(({ toast }) => {
            toast.error(
                'Your session will expire soon. Please save your work and refresh the page if needed.',
                { duration: 10000 }
            );
        });
    }

    // Handle session expired
    handleSessionExpired() {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('user');
        
        // Import toast dynamically
        import('react-hot-toast').then(({ toast }) => {
            toast.error('Your session has expired. Please log in again.');
        });

        // Redirect to login
        window.location.href = '/login';
    }

    // Start auto-save for form data
    startAutoSave(formData, saveFunction, intervalMs = 30000) { // Auto-save every 30 seconds
        this.stopAutoSave();
        
        this.autoSaveInterval = setInterval(async () => {
            try {
                await saveFunction(formData);
                console.log('Auto-save completed');
            } catch (error) {
                console.error('Auto-save failed:', error);
            }
        }, intervalMs);
    }

    // Stop auto-save
    stopAutoSave() {
        if (this.autoSaveInterval) {
            clearInterval(this.autoSaveInterval);
            this.autoSaveInterval = null;
        }
    }

    // Save form data to localStorage as backup
    saveFormDataToStorage(formKey, formData) {
        try {
            const dataToSave = {
                data: formData,
                timestamp: Date.now(),
                url: window.location.pathname
            };
            localStorage.setItem(`form_backup_${formKey}`, JSON.stringify(dataToSave));
        } catch (error) {
            console.error('Error saving form data to storage:', error);
        }
    }

    // Load form data from localStorage
    loadFormDataFromStorage(formKey) {
        try {
            const savedData = localStorage.getItem(`form_backup_${formKey}`);
            if (savedData) {
                const parsed = JSON.parse(savedData);
                const isRecent = Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000; // 24 hours
                if (isRecent) {
                    return parsed.data;
                } else {
                    // Clean up old data
                    localStorage.removeItem(`form_backup_${formKey}`);
                }
            }
        } catch (error) {
            console.error('Error loading form data from storage:', error);
        }
        return null;
    }

    // Clear form data from localStorage
    clearFormDataFromStorage(formKey) {
        localStorage.removeItem(`form_backup_${formKey}`);
    }
}

// Create global session manager instance
export const sessionManager = new SessionManager();

// Add a request interceptor to include the auth token and CSRF token
API.interceptors.request.use((config) => {
    // Add auth token if it exists
    const token = localStorage.getItem('token');
    // console.log("TOKEN BEING SENT:", token ? "YES (length: " + token.length + ")" : "NO TOKEN");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // console.log("AUTHORIZATION HEADER:", config.headers.Authorization);
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
        const authEndpoints = ['token/obtain/', 'register/', 'token/refresh/'];

        if (
            error.response?.status === 401 &&
            !authEndpoints.some((endpoint) => requestUrl.includes(endpoint))
        ) {
            // Try to refresh token first
            if (!sessionManager.isRefreshing) {
                sessionManager.refreshToken().then(() => {
                    // Retry the original request
                    const originalRequest = error.config;
                    const token = localStorage.getItem('token');
                    if (token) {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return API(originalRequest);
                    }
                }).catch(() => {
                    // Refresh failed, logout user
                    localStorage.removeItem('token');
                    localStorage.removeItem('isAdmin');
                    window.location.href = '/login';
                });
            }
            
            // It's important to return a promise that will not resolve
            // to prevent further processing by the caller if a redirect is happening.
            return new Promise(() => {}); 
        }

        // Prepare a more detailed error object to be rejected
        let customError = {
            status: error.response?.status,
            data: error.response?.data, // Pass the whole data object from the backend response
            message: 'An unexpected error occurred' // Default message
        };

        if (error.response?.data) {
            const responseData = error.response.data;
            if (typeof responseData === 'string') {
                customError.message = responseData;
            } else if (responseData.detail) {
                customError.message = responseData.detail;
            } else if (responseData.error) {
                customError.message = responseData.error;
            } else if (typeof responseData === 'object' && Object.keys(responseData).length > 0) {
                // For DRF validation errors (or other structured errors)
                // Extract the first error message as a general message
                const firstErrorKey = Object.keys(responseData)[0];
                if (Array.isArray(responseData[firstErrorKey]) && responseData[firstErrorKey].length > 0) {
                    customError.message = responseData[firstErrorKey][0];
                } else if (typeof responseData[firstErrorKey] === 'string') {
                    customError.message = responseData[firstErrorKey];
                } else {
                    // Fallback if the first error isn't a string/array of strings
                    // but we still have an object in responseData.
                    customError.message = "Validation failed. Please check your input.";
                }
            }
        } else if (error.message && !error.response) { // Network errors or other errors without a response object
            customError.message = error.message;
        }
        
        return Promise.reject(customError);
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

    // Map sort_by to ordering for DRF compatibility
    const apiParams = { ...params };
    if (apiParams.sort_by) {
        if (apiParams.sort_by === 'name') {
            apiParams.ordering = 'name';
        } else if (apiParams.sort_by === 'highest_rating') {
            apiParams.ordering = '-avg_rating'; // Assuming avg_rating is annotated and available
        } else if (apiParams.sort_by === 'most_ratings') {
            apiParams.ordering = '-rating_count'; // Assuming rating_count is annotated
        }
        // Add more mappings if needed
        delete apiParams.sort_by;
    }

    // Handle benefits and side_effects filters (expecting comma-separated strings of condition names)
    if (apiParams.benefits) {
        // The backend expects condition IDs for M2M fields, not names directly in GET params for filtering.
        // This part assumes your backend API endpoint for supplements is set up to filter by benefit names or IDs.
        // If it expects IDs, you'd need to convert names to IDs here, which is complex without another API call.
        // For now, we'll pass names as is, assuming the backend can handle it (e.g., via a custom filter).
        // If it needs to be IDs, this will need adjustment or backend modification.
    }
    if (apiParams.side_effects) {
        // Similar assumption as for benefits.
    }

    try {
        const response = await API.get('supplements/', { params: apiParams });
        if (params.offset === 0) {  // Only cache first page, use original params for cache key
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

export const getAllSupplements = async (params = {}) => {
    try {
        // Fetch with a large limit to effectively get all supplements for dropdowns.
        // The modal expects data.results or an array. DRF paginated response is { count, next, previous, results }.
        const effectiveParams = { ...params, limit: 1000, offset: 0 }; // Fetch up to 1000 supplements
        const response = await API.get('supplements/', { params: effectiveParams });
        // Return the results array directly
        return response.data.results || []; 
    } catch (error) {
        console.error('Error fetching all supplements:', error);
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

export const getRatingsForSupplement = async (supplementId) => {
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
    // formData should already contain benefits and side_effects as arrays of IDs
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

export const getCommentsForRating = async (ratingId) => {
    try {
        const response = await API.get(`comments/`, {
            params: { rating: ratingId }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching comments for rating:', error);
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
        // console.log('Auth header:', API.defaults.headers.common['Authorization']);
        
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

export const deleteSupplement = async (supplementId, transferToSupplementId = null) => {
    try {
        let url = `/supplements/${supplementId}/`;
        if (transferToSupplementId) {
            url += `?transfer_ratings_to_id=${transferToSupplementId}`;
        }
        const response = await API.delete(url);
        return response.data;
    } catch (error) {
        console.error('Error deleting supplement:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const loginUser = async (credentials) => {
    try {
        const response = await API.post('token/obtain/', credentials);
        
        // Store refresh token for automatic token refresh
        if (response.data.refresh) {
            localStorage.setItem('refreshToken', response.data.refresh);
        }
        
        // Start session monitoring
        sessionManager.startSessionMonitoring();
        
        return response.data;
    } catch (error) {
        console.error('Login error:', error);
        throw error;
    }
};

export const logoutUser = async () => {
    try {
        // Stop session monitoring
        sessionManager.stopSessionMonitoring();
        
        // Clear all tokens and user data
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('user');
        
        // Clear any form backups
        sessionManager.clearFormDataFromStorage('rating_form');
        sessionManager.clearFormDataFromStorage('comment_form');
        
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

export const requestPasswordReset = async (emailData) => {
    try {
        const response = await API.post('password-reset/', emailData);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const confirmPasswordReset = async (data) => {
    try {
        const response = await API.post('password-reset/confirm/', data);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const updateComment = async (commentId, content, image = null) => {
    try {
        const formData = new FormData();
        formData.append('content', content);
        if (image) {
            // If image is a file (new upload)
            formData.append('image', image);
        } else if (image === null || image === '') {
            // If explicitly setting image to null/empty (to remove it), 
            // depending on backend, might need to send empty or specific value
            // For now, not appending image means it won't be changed unless backend handles absence as deletion.
            // If backend expects explicit null for clearing, that needs to be handled.
        }
        // If image is an existing URL and not changed, don't send it.

        const response = await API.patch(`comments/${commentId}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const deleteComment = async (commentId) => {
    try {
        const response = await API.delete(`comments/${commentId}/`);
        return response.data; // Or handle 204 No Content appropriately
    } catch (error) {
        throw error;
    }
};

export const updateRating = async (ratingId, formData) => {
    // formData should already contain benefits and side_effects as arrays of IDs
    try {
        const response = await API.put(`ratings/${ratingId}/`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        cache.clear(); // Clear cache on update
        return response.data;
    } catch (error) {
        throw {
            userMessage: error.response?.data?.detail || 
                        'Unable to update rating. Please check your input and try again.'
        };
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

export const deleteBrand = async (brandId, options = {}) => {
    try {
        let url = `/brands/${brandId}/`;
        const params = new URLSearchParams();
        if (options.replace_ratings_brand_with_id) {
            params.append('replace_ratings_brand_with_id', options.replace_ratings_brand_with_id);
        } else if (options.remove_from_ratings === true) { // Default backend behavior, but can be explicit
            // The backend defaults to removing the brand string from ratings if no replace option is given.
            // We don't strictly need to send a param for this default unless the backend API changes its default.
            // For clarity or future API changes, one might send: params.append('action', 'remove_from_ratings');
        }

        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }

        const response = await API.delete(url);
        return response.data;
    } catch (error) {
        console.error('Error deleting brand:', error.response?.data || error.message);
        throw error.response?.data || error;
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

// Function to get ALL conditions for dropdowns
export const getAllConditions = async () => {
    try {
        // Assuming the /conditions/ endpoint without search params returns all, or supports a specific param.
        const response = await API.get('conditions/'); 
        return response.data; // Expects an array or {results: [...]} that DeleteConditionModal can use
    } catch (error) {
        console.error('Error fetching all conditions:', error);
        throw error;
    }
};

export const deleteCondition = async (conditionId, options = {}) => {
    try {
        let url = `/conditions/${conditionId}/`;
        const params = new URLSearchParams();
        if (options.transfer_ratings_to_condition_id) {
            params.append('transfer_ratings_to_condition_id', options.transfer_ratings_to_condition_id);
        } else {
            // Default action is to delete associated ratings, as per user request
            // This is handled by the backend if no transfer ID is provided.
            // To be explicit or if backend required a flag: params.append('delete_associated_ratings', 'true');
        }

        const queryString = params.toString();
        if (queryString) {
            url += `?${queryString}`;
        }

        const response = await API.delete(url);
        return response.data;
    } catch (error) {
        console.error('Error deleting condition:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const deleteMyRating = async (ratingId) => {
    try {
        const response = await API.delete(`ratings/${ratingId}/`);
        cache.clear(); // Clear cache as ratings data has changed
        return response.data; // Or handle 204 No Content
    } catch (error) {
        console.error('Error deleting rating:', error);
        throw error; // Rethrow or handle more gracefully
    }
};

export const deleteRatingByAdmin = async (ratingId) => {
    try {
        const response = await API.delete(`/ratings/${ratingId}/`);
        return response.data; // Or simply return true/status if no specific data is returned
    } catch (error) {
        console.error('Error deleting rating by admin:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

export const deleteCommentByAdmin = async (commentId) => {
    try {
        const response = await API.delete(`/comments/${commentId}/`);
        return response.data; // Or true/status
    } catch (error) {
        console.error('Error deleting comment by admin:', error.response?.data || error.message);
        throw error.response?.data || error;
    }
};

// New function for ManageRatings.jsx to get all ratings with pagination/search
export const searchAllRatings = async (params = {}) => {
    try {
        // Assumes backend /ratings/ endpoint supports general listing with these params
        const response = await API.get('ratings/', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching all ratings for admin:', error);
        throw error;
    }
};

// New function for ManageComments.jsx to get all comments with pagination/search
export const searchAllComments = async (params = {}) => {
    try {
        // Assumes backend /comments/ endpoint supports general listing with these params
        const response = await API.get('comments/', { params });
        return response.data;
    } catch (error) {
        console.error('Error fetching all comments for admin:', error);
        throw error;
    }
};

// Function to update profile image
export const updateProfileImage = async (imageData) => {
    try {
        const response = await API.post('profile/image-upload/', imageData, {
            headers: {
                // 'Content-Type': 'multipart/form-data' // Handled by browser for FormData
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error updating profile image:', error);
        throw error.response?.data || error;
    }
};

export const getCurrentUserDetails = async () => {
    try {
        const response = await API.get('user/me/'); // Corrected endpoint
        return response.data;
    } catch (error) {
        console.error('Error fetching current user details:', error);
        throw error;
    }
};

export const getUserChronicConditions = async () => {
    try {
        const response = await API.get('user/chronic-conditions/');
        return response.data; // Expects an array of condition objects
    } catch (error) {
        console.error('Error fetching user chronic conditions:', error);
        throw error;
    }
};

export const updateUserChronicConditions = async (conditionIds) => {
    try {
        const response = await API.put('user/chronic-conditions/', { condition_ids: conditionIds });
        return response.data;
    } catch (error) {
        console.error('Error updating chronic conditions:', error);
        throw error;
    }
};

export const getUserPublicProfile = async (username) => {
    try {
        const response = await API.get(`profiles/${username}/`); // Matches the new backend URL structure
        return response.data;
    } catch (error) {
        console.error(`Error fetching public profile for ${username}:`, error);
        throw error; // Let the component handle the error message via toast
    }
};

// If you have admin-specific API calls, they might go here
// Example:
// export const getAdminStats = async () => {
// try {
// const response = await API.get('admin/stats/');
// return response.data;
// } catch (error) {
// console.error('Error fetching admin stats:', error);
// throw error;
// }
// };

// export const setAuthToken = (token) => {
//     if (token) {
//         API.defaults.headers.common['Authorization'] = `Bearer ${token}`;
//     } else {
//         delete API.defaults.headers.common['Authorization'];
//     }
// };

export default API;