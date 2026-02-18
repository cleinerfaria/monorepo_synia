import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useTheme } from '@/contexts/ThemeContext';
import { LogOut, Calendar, Clock, Sun, Moon, Monitor } from 'lucide-react';
import { clsx } from 'clsx';

export default function ShiftLayout() {
  const navigate = useNavigate();
  const { appUser, signOut } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const themeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;
  const ThemeIcon = themeIcon;

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold text-gray-900 dark:text-white">Meu Plantão</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{appUser?.name}</span>
            <button
              onClick={cycleTheme}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <ThemeIcon className="h-4 w-4" />
            </button>
            <button
              onClick={handleSignOut}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-lg flex-1 px-4 py-4">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="sticky bottom-0 border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="mx-auto flex max-w-lg">
          <NavLink
            to="/meu-plantao"
            end
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )
            }
          >
            <Calendar className="h-5 w-5" />
            <span>Meus Plantões</span>
          </NavLink>
          <NavLink
            to="/meu-plantao/ativo"
            className={({ isActive }) =>
              clsx(
                'flex flex-1 flex-col items-center gap-1 py-3 text-xs transition-colors',
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              )
            }
          >
            <Clock className="h-5 w-5" />
            <span>Plantão Ativo</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
