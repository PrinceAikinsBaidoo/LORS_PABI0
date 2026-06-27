import { NavLink, Outlet } from 'react-router-dom'
import { Activity, BookOpen, Calculator, History, Radio } from 'lucide-react'

const nav = [
  { to: '/', icon: Radio, label: 'Signals' },
  { to: '/history', icon: History, label: 'History' },
  { to: '/calculator', icon: Calculator, label: 'Risk' },
  { to: '/learn', icon: BookOpen, label: 'Learn' },
]

export default function Layout() {
  return (
    <div className="app-shell min-h-screen flex flex-col max-w-lg mx-auto">
      <header className="glass-header sticky top-0 z-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl neo-surface flex items-center justify-center">
            <Activity className="w-4 h-4 text-teal-accent" />
          </div>
          <span className="font-bold text-lg tracking-tight">PipSense</span>
          <span className="text-xs text-text-muted">🇬🇭</span>
        </div>
        <span className="text-xs text-teal-accent font-medium px-2.5 py-1 rounded-full neo-chip neo-chip-active">
          London OR
        </span>
      </header>

      <main className="flex-1 px-4 py-4 pb-24">
        <Outlet />
      </main>

      <nav className="glass-nav fixed bottom-0 left-0 right-0 z-50">
        <div className="max-w-lg mx-auto flex">
          {nav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `relative flex-1 flex flex-col items-center gap-0.5 py-3 text-xs transition-colors ${
                  isActive ? 'text-teal-accent nav-link-active' : 'text-text-muted hover:text-text-secondary'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
