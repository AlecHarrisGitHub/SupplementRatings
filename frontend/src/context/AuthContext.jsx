// frontend/src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUserDetails } from '../services/api'; // Import getCurrentUserDetails

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

  // Add this useEffect to initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    const storedIsAdmin = localStorage.getItem('isAdmin') === 'true';

    if (token && storedUser) {
      setIsAuthenticated(true);
      setIsAdmin(storedIsAdmin);
      try {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser) { // Ensure parsedUser is not null/undefined
          setUser(parsedUser);
        } else {
          // Handle case where storedUser is "null" or invalid JSON string that parses to null
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('isAdmin');
        }
      } catch (e) {
        console.error("Error parsing stored user from localStorage", e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('isAdmin');
      }
    }
  }, []);

  const login = async (token, isAdminUser, userData) => {
    localStorage.setItem('token', token);
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
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
  };

  // Function to update parts of the user object
  const updateUser = (updatedFields) => {
    setUser(prevUser => {
      const newUser = { ...prevUser, ...updatedFields };
      localStorage.setItem('user', JSON.stringify(newUser));
      return newUser;
    });
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, user, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);