import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAdmin, RequireSandbox, RequireUser } from './components/layout/Guards'
import Layout from './components/layout/Layout'
import AdminLogin from './pages/AdminLogin'
import AnalysisNew from './pages/AnalysisNew'
import Dashboard from './pages/Dashboard'
import History from './pages/History'
import Home from './pages/Home'
import JobDetail from './pages/JobDetail'
import Jobs from './pages/Jobs'
import Login from './pages/Login'
import OAuthCallback from './pages/OAuthCallback'
import Report from './pages/Report'
import ResumeEditor from './pages/ResumeEditor'
import Resumes from './pages/Resumes'
import Signup from './pages/Signup'
import { Forbidden, NotFound, Privacy, Terms } from './pages/StatusPages'

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'))
const AdminCrawl = lazy(() => import('./pages/admin/AdminCrawl'))
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'))

const adminChildren = (withLogs) => [
  { index: true, element: <AdminDashboard /> },
  { path: 'users', element: <AdminUsers /> },
  { path: 'crawl', element: <AdminCrawl /> },
  ...(withLogs ? [{ path: 'logs', element: <AdminLogs /> }] : []),
]

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/jobs', element: <Jobs /> },
      { path: '/jobs/:id', element: <JobDetail /> },
      { path: '/login', element: <Login /> },
      { path: '/signup', element: <Signup /> },
      { path: '/oauth/callback', element: <OAuthCallback /> },
      { path: '/terms', element: <Terms /> },
      { path: '/privacy', element: <Privacy /> },
      { path: '/403', element: <Forbidden /> },
      {
        // 일반 사용자 / 테스트 관리자 공통 서비스 영역
        element: <RequireUser />,
        children: [
          { path: '/dashboard', element: <Dashboard /> },
          { path: '/resumes', element: <Resumes /> },
          { path: '/resumes/new', element: <ResumeEditor /> },
          { path: '/resumes/:id', element: <ResumeEditor /> },
          { path: '/analysis', element: <Navigate to="/analysis/new" replace /> },
          { path: '/analysis/new', element: <AnalysisNew /> },
          { path: '/analysis/:id', element: <Report /> },
          { path: '/history', element: <History /> },
        ],
      },
      {
        // 테스트 관리자 샌드박스 콘솔
        element: <RequireSandbox />,
        children: [{ path: '/sandbox/admin', element: <AdminLayout scope="sandbox" />, children: adminChildren(false) }],
      },
      // 정식 관리자: 별도 로그인 경로 + 별도 세션
      { path: '/admin/login', element: <AdminLogin /> },
      {
        element: <RequireAdmin />,
        children: [{ path: '/admin', element: <AdminLayout scope="admin" />, children: adminChildren(true) }],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])
