import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import StatusBar from './components/StatusBar';
import HomePage from './pages/HomePage';
import SettingsPage from './pages/SettingsPage';

export default function PhoneApp() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-commute-bg text-commute-text flex flex-col">
        <StatusBar />

        <main className="flex-1 overflow-y-auto pb-16">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        {/* Bottom navigation */}
        <nav className="fixed bottom-0 left-0 right-0 flex bg-commute-surface border-t border-commute-accent">
          <NavLink
            to="/"
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-sm font-medium ${
                isActive ? 'text-commute-primary' : 'text-commute-muted'
              }`
            }
          >
            Commute
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex-1 py-3 text-center text-sm font-medium ${
                isActive ? 'text-commute-primary' : 'text-commute-muted'
              }`
            }
          >
            Settings
          </NavLink>
        </nav>
      </div>
    </BrowserRouter>
  );
}
