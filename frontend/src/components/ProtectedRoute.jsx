import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getUser } from '@/lib/auth';

export default function ProtectedRoute({ children, allowedRoles }) {
    const location = useLocation();

    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles && allowedRoles.length > 0) {
        const user = getUser();
        if (!user || !allowedRoles.includes(user.role)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    return children;
}
