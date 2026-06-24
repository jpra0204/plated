import PropTypes from 'prop-types';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../stores/authStore.js';

/**
 * ProtectedRoute — renders children when authenticated, redirects to /auth
 * when not. Stores the attempted path in authStore so Auth.jsx can send the
 * user back after a successful sign-in.
 *
 * Renders null while Firebase is resolving the initial auth state ('loading')
 * to avoid a flash-redirect before we know if the user is signed in.
 */
export default function ProtectedRoute({ children }) {
  const status = useAuthStore((s) => s.status);
  const { pathname } = useLocation();

  if (status === 'loading') return null;

  if (status === 'unauthenticated') {
    // Store intended destination before redirecting (getState avoids a
    // reactive side-effect during render).
    useAuthStore.getState().setIntendedDestination(pathname);
    return <Navigate to="/auth" replace />;
  }

  return children;
}

ProtectedRoute.propTypes = {
  children: PropTypes.node.isRequired,
};
