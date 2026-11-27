import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import UnauthorizedPage from '../pages/common/UnauthorizedPage';

export function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <UnauthorizedPage />;
  }

  return children;
}

export default RoleRoute;
