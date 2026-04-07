import { Routes, Route, NavLink } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/auth-context';
import LoginPage from './pages/LoginPage';
import TransferPage from './pages/TransferPage';
import TransactionHistoryPage from './pages/TransactionHistoryPage';
import BalancePage from './pages/BalancePage';
import AccountPage from './pages/AccountPage';

function AuthenticatedApp() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <nav className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-header">
          <h1>Teller System</h1>
          <span className="badge">v1.0</span>
        </div>
        <div className="sidebar-user">
          <span className="user-name">{user?.fullName}</span>
          <span className="user-role">{user?.role} · {user?.branchCode}</span>
        </div>
        <ul className="nav-list">
          <li>
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              โอนเงิน
            </NavLink>
          </li>
          <li>
            <NavLink to="/transactions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              ประวัติธุรกรรม
            </NavLink>
          </li>
          <li>
            <NavLink to="/balance" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              ยอดคงเหลือ
            </NavLink>
          </li>
          <li>
            <NavLink to="/accounts" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              เปิดบัญชี
            </NavLink>
          </li>
        </ul>
        <div className="sidebar-footer">
          <button onClick={logout} className="btn-logout" aria-label="ออกจากระบบ">
            ออกจากระบบ
          </button>
        </div>
      </nav>
      <main className="content" role="main">
        <Routes>
          <Route path="/" element={<TransferPage />} />
          <Route path="/transactions" element={<TransactionHistoryPage />} />
          <Route path="/balance" element={<BalancePage />} />
          <Route path="/accounts" element={<AccountPage />} />
        </Routes>
      </main>
    </div>
  );
}

function AppRouter() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <AuthenticatedApp />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
    </AuthProvider>
  );
}
