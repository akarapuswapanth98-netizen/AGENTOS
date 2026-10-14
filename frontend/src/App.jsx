import { Route, Routes, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import Layout from './components/Layout.jsx'
import PageFade from './components/PageFade.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { WorkspaceProvider } from './context/WorkspaceContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { SoundProvider } from './context/SoundContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import Dashboard from './pages/Dashboard.jsx'
import GoalDetail from './pages/GoalDetail.jsx'
import InterviewRunner from './pages/InterviewRunner.jsx'
import Interviews from './pages/Interviews.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'
import NotFound from './pages/NotFound.jsx'
import Quiz from './pages/Quiz.jsx'
import Report from './pages/Report.jsx'
import Resume from './pages/Resume.jsx'
import Review from './pages/Review.jsx'
import Settings from './pages/Settings.jsx'
import TaskDetail from './pages/TaskDetail.jsx'
import Weekly from './pages/Weekly.jsx'
import AgentBuilder from './pages/AgentBuilder.jsx'
import Monitoring from './pages/Monitoring.jsx'
import Marketplace from './pages/Marketplace.jsx'
import KnowledgeBase from './pages/KnowledgeBase.jsx'
import Scheduler from './pages/Scheduler.jsx'
import Workspaces from './pages/Workspaces.jsx'
import Analytics from './pages/Analytics.jsx'
import JobMatch from './pages/JobMatch.jsx'
import Skills from './pages/Skills.jsx'
import HowItWorks from './pages/HowItWorks.jsx'
import PromptEngineering from './pages/PromptEngineering.jsx'
import About from './pages/About.jsx'

// Every route fades through the same transition. Keyed by pathname so the old
// page exits before the new one enters; skipped entirely on first load.
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageFade><Login /></PageFade>} />
        <Route path="/register" element={<PageFade><Register /></PageFade>} />
        <Route path="/forgot-password" element={<PageFade><ForgotPassword /></PageFade>} />
        <Route path="/reset-password" element={<PageFade><ResetPassword /></PageFade>} />
        <Route path="/how-it-works" element={<PageFade><HowItWorks /></PageFade>} />
        <Route path="/prompt-engineering" element={<PageFade><PromptEngineering /></PageFade>} />
        <Route path="/about" element={<PageFade><About /></PageFade>} />

        <Route path="/" element={<PageFade><ProtectedRoute><Dashboard /></ProtectedRoute></PageFade>} />
        <Route path="/job-match" element={<PageFade><ProtectedRoute><JobMatch /></ProtectedRoute></PageFade>} />
        <Route path="/skills" element={<PageFade><ProtectedRoute><Skills /></ProtectedRoute></PageFade>} />
        <Route path="/builder" element={<PageFade><ProtectedRoute><AgentBuilder /></ProtectedRoute></PageFade>} />
        <Route path="/monitoring" element={<PageFade><ProtectedRoute><Monitoring /></ProtectedRoute></PageFade>} />
        <Route path="/marketplace" element={<PageFade><ProtectedRoute><Marketplace /></ProtectedRoute></PageFade>} />
        <Route path="/knowledge" element={<PageFade><ProtectedRoute><KnowledgeBase /></ProtectedRoute></PageFade>} />
        <Route path="/schedules" element={<PageFade><ProtectedRoute><Scheduler /></ProtectedRoute></PageFade>} />
        <Route path="/workspaces" element={<PageFade><ProtectedRoute><Workspaces /></ProtectedRoute></PageFade>} />
        <Route path="/analytics" element={<PageFade><ProtectedRoute><Analytics /></ProtectedRoute></PageFade>} />
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

// Public auth/educational pages + protected app pages. Layout wraps everything.
export default function App() {
  return (
    <ToastProvider>
      <ThemeProvider>
        <SoundProvider>
          <AuthProvider>
            <WorkspaceProvider>
              <Layout>
                <AnimatedRoutes />
              </Layout>
            </WorkspaceProvider>
          </AuthProvider>
        </SoundProvider>
      </ThemeProvider>
    </ToastProvider>
  )
}
