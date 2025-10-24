import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUserRole, hasRole } from '../utils/roleUtils';

const ProtectedRoute = ({ children, requiredRoles, redirectTo = '/login' }) => {
  const userRole = getUserRole();
  
  // If no user role, redirect to login
  if (!userRole) {
    return <Navigate to={redirectTo} replace />;
  }
  
  // If specific roles are required, check access
  if (requiredRoles && !hasRole(requiredRoles)) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return children;
};

export default ProtectedRoute;
