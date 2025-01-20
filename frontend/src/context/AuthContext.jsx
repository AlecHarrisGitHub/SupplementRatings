// frontend/src/context/AuthContext.jsx

import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

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
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = (token, isAdminUser, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('isAdmin', isAdminUser);
    localStorage.setItem('user', JSON.stringify(userData));
    setIsAuthenticated(true);
    setIsAdmin(isAdminUser);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setIsAdmin(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);