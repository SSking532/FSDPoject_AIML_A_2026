import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { getDashboardRoute, useAuth } from '../context/AuthContext';
import ForgotPassword from '../pages/auth/ForgotPassword';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import ProfilePage from '../pages/common/ProfilePage';
import PatientDashboard from '../pages/patient/PatientDashboard';
import EmergencyRequest from '../pages/patient/EmergencyRequest';
import PatientTracking from '../pages/patient/PatientTracking';
import PatientHistory from '../pages/patient/PatientHistory';
import DriverDashboard from '../pages/driver/DriverDashboard';
import DriverAssignments from '../pages/driver/DriverAssignments';
import DriverTrip from '../pages/driver/DriverTrip';
import DriverHistory from '../pages/driver/DriverHistory';
import AdminDashboard from '../pages/admin/AdminDashboard';
import Requests from '../pages/admin/Requests';
import Tracking from '../pages/admin/Tracking';
import Ambulances from '../pages/admin/Ambulances';
import Drivers from '../pages/admin/Drivers';
import Assignments from '../pages/admin/Assignments';
import Hospitals from '../pages/admin/Hospitals';
import Trips from '../pages/admin/Trips';
import Analytics from '../pages/admin/Analytics';
import ProtectedRoute from './ProtectedRoute';
import RoleRoute from './RoleRoute';

function RootRedirect() {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardRoute(user?.role)} replace />;
}

function PublicOnlyRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) {
    return <Navigate to={getDashboardRoute(user?.role)} replace />;
  }
  return children;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<RootRedirect />} />
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Register />
          </PublicOnlyRoute>
        }
      />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Patient Routes */}
      <Route
        path="/patient/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['patient']}>
              <PatientDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/request"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['patient']}>
              <EmergencyRequest />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/tracking"
        element={<Navigate to="/patient/tracking/active" replace />}
      />
      <Route
        path="/patient/tracking/:requestId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['patient']}>
              <PatientTracking />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/history"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['patient']}>
              <PatientHistory />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/patient/profile"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['patient']}>
              <ProfilePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Driver Routes */}
      <Route
        path="/driver/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['driver']}>
              <DriverDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/assignments"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['driver']}>
              <DriverAssignments />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/trip"
        element={<Navigate to="/driver/trip/active" replace />}
      />
      <Route
        path="/driver/trip/:tripId"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['driver']}>
              <DriverTrip />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/history"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['driver']}>
              <DriverHistory />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/driver/profile"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['driver']}>
              <ProfilePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Administrator Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/requests"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <Requests />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tracking"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <Tracking />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/ambulances"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <Ambulances />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/drivers"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <Drivers />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/assignments"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <Assignments />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/hospitals"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <Hospitals />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/trips"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <Trips />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <Analytics />
            </RoleRoute>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute>
            <RoleRoute allowedRoles={['admin']}>
              <ProfilePage />
            </RoleRoute>
          </ProtectedRoute>
        }
      />

      {/* Fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}

export default AppRoutes;
