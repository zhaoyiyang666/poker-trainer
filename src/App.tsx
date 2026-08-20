import { Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { GamePage } from './pages/GamePage';
import { CalculatorPage } from './pages/CalculatorPage';
import { QuizPage } from './pages/QuizPage';
import { StatsPage } from './pages/StatsPage';
import { ManualPage } from './pages/ManualPage';
import { SettingsPage } from './pages/SettingsPage';

const NAV = [
  { to: '/', icon: '🏠', label: '首页', exact: true },
  { to: '/game', icon: '🃏', label: '对局' },
  { to: '/calculator', icon: '📊', label: '计算器' },
  { to: '/quiz', icon: '📝', label: '刷题' },
  { to: '/stats', icon: '📈', label: '数据' },
];

export function App() {
  const location = useLocation();
  // 对局进行页隐藏底部导航，避免误触
  const hideNav = false;

  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/calculator" element={<CalculatorPage />} />
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/stats" element={<StatsPage />} />
        <Route path="/manual" element={<ManualPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>

      {!hideNav && (
        <nav className="bottom-nav">
          {NAV.map((item) => {
            const active = item.exact
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`nav-item ${active ? 'active' : ''}`}
              >
                <span className="nav-icon">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </div>
  );
}
