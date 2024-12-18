// frontend/src/components/ProtectedRoute.jsx

import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function ProtectedRoute({ children }) {
  const { auth } = useContext(AuthContext);

  if (!auth.access) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
