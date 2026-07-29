import { Navigate, useLocation } from "react-router-dom";
import * as authService from "../../services/authService";

function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();

  const user = authService.getStoredUser();
  const role = authService.normalizeRole(user?.role);
  if (!authService.getStoredToken()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={`/${role || "login"}`} replace />;
  }
  return children;
}

export default ProtectedRoute;
