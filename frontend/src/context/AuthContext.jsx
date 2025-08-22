// frontend/src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUserDetails } from '../services/api'; // Import getCurrentUserDetails
import { sessionManager, clearAuthHeader, setAuthHeader } from '../services/api'; // Import session manager

const AuthContext = createContext(null);

// Helper to parse JWT token (basic implementation)
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error("Error parsing JWT", e);
    return null;
  }
}

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Add loading state

  // Add this useEffect to initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token and fetch fresh user data
          const userDetails = await getCurrentUserDetails();
          setUser(userDetails);
          setIsAdmin(userDetails.is_staff || false);
          setIsAuthenticated(true);
          
          // Update localStorage with fresh data
          localStorage.setItem('user', JSON.stringify(userDetails));
          localStorage.setItem('isAdmin', userDetails.is_staff ? 'true' : 'false');

          sessionManager.startSessionMonitoring();
        } catch (error) {
          console.error("Auth initialization failed, token might be invalid.", error);
          // Token is invalid, clear storage and log out
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (token, isAdminUser, userData) => {
    localStorage.setItem('token', token);
    setAuthHeader(token);
    let userToStore = userData;
    let adminStatus = isAdminUser;
    let fetchedUserDetails = null;

    if (!userData && token) {
      const decodedToken = parseJwt(token);
      if (decodedToken) {
        userToStore = {
          id: decodedToken.user_id,
          username: decodedToken.username,
        };
        adminStatus = decodedToken.is_staff || false;
      }
    }

    // Set initial state based on token or passed data
    if (userToStore) {
      localStorage.setItem('user', JSON.stringify(userToStore));
      setUser(userToStore);
    } else {
      localStorage.removeItem('user');
      setUser(null);
    }
    localStorage.setItem('isAdmin', adminStatus ? 'true' : 'false');
    setIsAuthenticated(true);
    setIsAdmin(adminStatus);

    // Start session monitoring
    sessionManager.startSessionMonitoring();

    // Now, try to fetch full user details from API
    try {
      fetchedUserDetails = await getCurrentUserDetails();
      if (fetchedUserDetails) {
        // Update userToStore and adminStatus with authoritative data from API
        userToStore = {
          ...userToStore, // keep initial token data as fallback if some fields are missing
          ...fetchedUserDetails, // override with API data, including profile_image_url
        };
        adminStatus = fetchedUserDetails.is_staff || false;

        // Update localStorage and state with the full user details
        localStorage.setItem('user', JSON.stringify(userToStore));
        setUser(userToStore);
        localStorage.setItem('isAdmin', adminStatus ? 'true' : 'false');
        setIsAdmin(adminStatus); // Ensure admin status is updated from API too
      }
    } catch (error) {
      console.error("Failed to fetch full user details after login:", error);
      // User is still logged in with basic info from token if userToStore was set
      // No need to logout, but profile_image_url might be missing
    }
  };

  const logout = () => {
    // Stop session monitoring
    sessionManager.stopSessionMonitoring();
    
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('user');
    clearAuthHeader();
    try {
      if (window.google?.accounts?.id?.disableAutoSelect) {
        window.google.accounts.id.disableAutoSelect();
      }
      if (window.google?.accounts?.id?.cancel) {
        window.google.accounts.id.cancel();
      }
      window._gsiInited = undefined;
    } catch (e) {}
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
  };

  // Function to update parts of the user object
  const updateUser = (updatedFields) => {
    setUser(prevUser => {
      // Create a deep copy to ensure re-render for nested changes
      const newUserData = JSON.parse(JSON.stringify(prevUser || {}));
      const newUser = { ...newUserData, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, user, login, logout, updateUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);