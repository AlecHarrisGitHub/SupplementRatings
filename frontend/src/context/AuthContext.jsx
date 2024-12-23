// frontend/src/context/AuthContext.jsx

import React, { createContext, useState } from 'react';

export const AuthContext = createContext(null);

export const useAuth = () => {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'));
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem('isAdmin') === 'true');

  const login = (token, isAdmin) => {
    console.log('AuthContext login called with:', { token, isAdmin });
    localStorage.setItem('token', token);
    localStorage.setItem('isAdmin', String(isAdmin));
    setIsAuthenticated(true);
    setIsAdmin(isAdmin);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('isAdmin');
    setIsAuthenticated(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};