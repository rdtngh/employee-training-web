import { Navigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import * as authService from "../../services/authService";

function ProtectedRoute({ allowedRoles, children }) {
  const location = useLocation();
  const [user, setUser] = useState(() => authService.getStoredUser());
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    authService
      .getCurrentUser()
      .then((currentUser) => {
        if (active) {
          setUser(currentUser);
        }
      })
      .catch(() => {
        authService.clearSession();
        if (active) {
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setCheckingSession(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (checkingSession) {
    return null;
  }

  const role = authService.normalizeRole(user?.role);
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to={`/${role || "login"}`} replace />;
  }
  return children;
}

export default ProtectedRoute;
