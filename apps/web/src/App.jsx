import { Routes, Route, Navigate } from 'react-router-dom';

import TabBar from './components/TabBar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Chef from './pages/Chef.jsx';
import Pantry from './pages/Pantry.jsx';
import Saved from './pages/Saved.jsx';
import Profile from './pages/Profile.jsx';
import Auth from './pages/Auth.jsx';

/**
 * App — root layout with a persistent bottom tab bar and React Router routes.
 *
 * Route structure:
 *   /          → Home (public)
 *   /chef      → AI Chef (protected)
 *   /pantry    → Pantry manager (protected)
 *   /saved     → Saved recipes (protected)
 *   /profile   → User profile & settings
 *   /auth      → Sign-in / sign-up (no tab bar)
 *   *          → Redirect to /
 */
export default function App() {
  return (
    <div className="app-shell">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chef"   element={<ProtectedRoute><Chef /></ProtectedRoute>} />
          <Route path="/pantry" element={<ProtectedRoute><Pantry /></ProtectedRoute>} />
          <Route path="/saved"  element={<ProtectedRoute><Saved /></ProtectedRoute>} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth"   element={<Auth />} />
          <Route path="*"       element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <TabBar />
    </div>
  );
}
