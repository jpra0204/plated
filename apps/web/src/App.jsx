import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import TabBar from './components/TabBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import PantrySyncModal from './components/PantrySyncModal.jsx';
import Home from './pages/Home.jsx';
import Chef from './pages/Chef.jsx';
import Pantry from './pages/Pantry.jsx';
import Saved from './pages/Saved.jsx';
import Profile from './pages/Profile.jsx';
import Auth from './pages/Auth.jsx';
import RecipeDetail from './pages/RecipeDetail.jsx';
import Landing from './pages/Landing.jsx';
import useAuthStore from './stores/authStore.js';
import usePantrySync from './hooks/usePantrySync.js';
import { get } from './lib/api.js';
import { queryKeys } from './lib/queryKeys.js';

/**
 * App — root layout with a persistent bottom tab bar and React Router routes.
 *
 * Route structure:
 *   /home      → Home (protected — requires auth)
 *   /chef      → AI Chef (protected)
 *   /pantry    → Pantry manager (protected)
 *   /saved     → Saved recipes (protected)
 *   /recipe/:id → Recipe detail (protected)
 *   /profile   → User profile & settings
 *   /auth      → Sign-in / sign-up (no tab bar)
 *   /          → Landing page — public marketing page (no tab bar) [A12]
 *   *          → Redirect to /home
 */
export default function App() {
  return (
    <div className="app-shell">
      <PantrySyncController />
      <main className="app-content">
        <Routes>
          <Route path="/home"       element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/chef"       element={<ProtectedRoute><Chef /></ProtectedRoute>} />
          <Route path="/pantry"     element={<ProtectedRoute><Pantry /></ProtectedRoute>} />
          <Route path="/saved"      element={<ProtectedRoute><Saved /></ProtectedRoute>} />
          <Route path="/recipe/:id" element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth"    element={<Auth />} />
          <Route path="/"        element={<Landing />} />
          <Route path="*"        element={<Navigate to="/home" replace />} />
        </Routes>
      </main>

      <TabBar />
    </div>
  );
}

/**
 * Mounts at app root (not page-level) so the sync modal can trigger on any
 * route — login, tab return, etc. Fetches pantry count to skip empty pantries.
 */
function PantrySyncController() {
  const { token } = useAuthStore();
  const { data: pantryData } = useQuery({
    queryKey: queryKeys.pantry.list(),
    queryFn: () => get('/api/v1/pantry'),
    enabled: !!token,
    staleTime: 60_000,
  });
  const pantryCount = pantryData?.items?.length ?? 0;
  const { shouldShow, dismiss, mealLabel } = usePantrySync({ isAuthenticated: !!token, pantryCount });

  if (!shouldShow) return null;
  return <PantrySyncModal mealLabel={mealLabel} onClose={dismiss} />;
}
