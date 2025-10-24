// import React from 'react';
// import { Navigate } from 'react-router-dom';

// export default function PrivateRoute({ user, roles, children }) {
//   if (!user) {
//     return <Navigate to="/login" replace />;
//   }

//   if (!roles.includes(user.role)) {
//     return <Navigate to="/unauthorized" replace />;
//   }

//   return children;
// }

// src/components/Login/PrivateRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";

export default function PrivateRoute({ user, roles = [], children }) {
  if (!user) {
    // Not logged in
    return <Navigate to="/login" replace />;
  }

  if (user?.passwordResetRequired === true) {
    return <Navigate to="/password-reset" replace />;
  }

  if (roles.length > 0 && !roles.includes(user.role)) {
    // Role not authorized
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
