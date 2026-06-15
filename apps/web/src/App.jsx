import { Routes, Route, Navigate } from 'react-router-dom';

import TabBar from './components/TabBar.jsx';
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
 *   /          → Home (recipe feed)
 *   /chef      → AI Chef chat
 *   /pantry    → Pantry manager
 *   /saved     → Saved recipes
 *   /profile   → User profile & settings
 *   /auth      → Sign-in / sign-up (no tab bar)
 *   *          → Redirect to /
 */
export default function App() {
  // TODO: read auth state from authStore and redirect unauthenticated users to /auth
  // const { user } = useAuthStore();

  return (
    <div className="app-shell">
      <main className="app-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/chef" element={<Chef />} />
          <Route path="/pantry" element={<Pantry />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Hide tab bar on the auth screen */}
      <TabBar />
    </div>
  );
}
