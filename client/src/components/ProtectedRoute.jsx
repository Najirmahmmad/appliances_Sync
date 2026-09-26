import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.some(role => role.toLowerCase() === user.role.toLowerCase())) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Access Denied: You do not have permission to view this page.</div>;
  }

  return <Outlet />;
};

export default ProtectedRoute;
