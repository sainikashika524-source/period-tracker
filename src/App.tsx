import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router'
import { MotionConfig } from 'motion/react'
import { Toaster } from 'sonner'
import { AppLayout, ProtectedRoute, PublicLayout } from './components/Layouts'
import { useTheme } from './context/ThemeProvider'
import Home from './pages/Home'
import AuthPage from './pages/Auth'

const Learn = lazy(() => import('./pages/Learn'))
const Myths = lazy(() => import('./pages/Myths'))
const Quiz = lazy(() => import('./pages/Quiz'))
const Feedback = lazy(() => import('./pages/Feedback'))
const Share = lazy(() => import('./pages/Share'))
const NotFound = lazy(() => import('./pages/NotFound'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const Onboarding = lazy(() => import('./pages/app/Onboarding'))
const Dashboard = lazy(() => import('./pages/app/Dashboard'))
const CalendarPage = lazy(() => import('./pages/app/Calendar'))
const Insights = lazy(() => import('./pages/app/Insights'))
const Profile = lazy(() => import('./pages/app/Profile'))

function Fallback() {
  return <div className="min-h-[60dvh]" aria-busy="true" />
}

export default function App() {
  const { dark } = useTheme()
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="learn" element={<Learn />} />
              <Route path="myths" element={<Myths />} />
              <Route path="quiz" element={<Quiz />} />
              <Route path="feedback" element={<Feedback />} />
              <Route path="share" element={<Share />} />
              <Route path="*" element={<NotFound />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route path="/app/welcome" element={<Onboarding />} />
              <Route element={<AppLayout />}>
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/calendar" element={<CalendarPage />} />
                <Route path="/app/insights" element={<Insights />} />
                <Route path="/app/profile" element={<Profile />} />
              </Route>
            </Route>
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster position="top-center" theme={dark ? 'dark' : 'light'} toastOptions={{ style: { borderRadius: 18, fontFamily: 'Poppins, sans-serif' } }} />
    </MotionConfig>
  )
}
