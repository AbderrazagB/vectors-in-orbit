import { Navigate } from 'react-router-dom';
import { useContext, useEffect } from 'react';
import { StoreContext } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useContext(StoreContext);
  const toast = useToast();

  // Check localStorage as backup
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const hasValidUser = !!(user._id && user.user_type);

  useEffect(() => {
    if (!isAuthenticated && !hasValidUser) {
      // show friendly prompt once
      try { toast.info('Please login to continue'); } catch (err) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, hasValidUser]);

  if (!isAuthenticated && !hasValidUser) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
