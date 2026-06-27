import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { UserProvider } from './context/UserContext'
import { loadUser } from './utils/storage'
import Layout from './components/Layout'
import Onboarding from './pages/Onboarding'
import LiveSignal from './pages/LiveSignal'
import SignalHistory from './pages/SignalHistory'
import RiskCalculator from './pages/RiskCalculator'
import Learn from './pages/Learn'

function RequireOnboarding({ children }) {
  const user = loadUser()
  if (!user.onboarded) return <Navigate to="/onboarding" replace />
  return children
}

export default function App() {
  return (
    <UserProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route
            element={
              <RequireOnboarding>
                <Layout />
              </RequireOnboarding>
            }
          >
            <Route index element={<LiveSignal />} />
            <Route path="history" element={<SignalHistory />} />
            <Route path="calculator" element={<RiskCalculator />} />
            <Route path="learn" element={<Learn />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </UserProvider>
  )
}
