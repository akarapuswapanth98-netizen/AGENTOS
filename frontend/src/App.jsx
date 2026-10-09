import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout.jsx'
import PageFade from './components/PageFade.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import GoalDetail from './pages/GoalDetail.jsx'
import InterviewRunner from './pages/InterviewRunner.jsx'
import Interviews from './pages/Interviews.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import Quiz from './pages/Quiz.jsx'
import Register from './pages/Register.jsx'
import Report from './pages/Report.jsx'
import Resume from './pages/Resume.jsx'
import Review from './pages/Review.jsx'
import Settings from './pages/Settings.jsx'
import TaskDetail from './pages/TaskDetail.jsx'
import Weekly from './pages/Weekly.jsx'

// Every route fades through the same transition. Keyed by pathname so the old
// page exits before the new one enters; skipped entirely on first load.
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageFade><Login /></PageFade>} />
        <Route path="/register" element={<PageFade><Register /></PageFade>} />
        <Route path="/" element={<PageFade><ProtectedRoute><Dashboard /></ProtectedRoute></PageFade>} />
        <Route path="/goals/:id" element={<PageFade><ProtectedRoute><GoalDetail /></ProtectedRoute></PageFade>} />
        <Route path="/goals/:id/report" element={<PageFade><ProtectedRoute><Report /></ProtectedRoute></PageFade>} />
        <Route path="/tasks/:id" element={<PageFade><ProtectedRoute><TaskDetail /></ProtectedRoute></PageFade>} />
        <Route path="/interviews" element={<PageFade><ProtectedRoute><Interviews /></ProtectedRoute></PageFade>} />
        <Route path="/interviews/:id" element={<PageFade><ProtectedRoute><InterviewRunner /></ProtectedRoute></PageFade>} />
        <Route path="/resume" element={<PageFade><ProtectedRoute><Resume /></ProtectedRoute></PageFade>} />
        <Route path="/review" element={<PageFade><ProtectedRoute><Review /></ProtectedRoute></PageFade>} />
        <Route path="/quiz" element={<PageFade><ProtectedRoute><Quiz /></ProtectedRoute></PageFade>} />
        <Route path="/weekly" element={<PageFade><ProtectedRoute><Weekly /></ProtectedRoute></PageFade>} />
        <Route path="/settings" element={<PageFade><ProtectedRoute><Settings /></ProtectedRoute></PageFade>} />
        <Route path="*" element={<PageFade><NotFound /></PageFade>} />
      </Routes>
    </AnimatePresence>
  )
}

// Public auth pages + protected app pages. Layout wraps everything.
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Layout>
          <AnimatedRoutes />
        </Layout>
      </ToastProvider>
    </AuthProvider>
  )
}
