import { BrowserRouter, Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import { AppProvider, useApp } from './state'
import Home from './pages/Home'
import { AdminLogin, Login } from './pages/Auth'
import Match from './pages/Match'
import Gap from './pages/Gap'
import Rewrite from './pages/Rewrite'
import Rehearse from './pages/Rehearse'
import Journey from './pages/Journey'
import Admin from './pages/Admin'

function UserOnly({ children }) {
  const { role, isAdmin } = useApp()
  const loc = useLocation()
  if (isAdmin) return <Navigate to="/admin" replace />
  return role ? children : <Navigate to="/login" state={{ from: loc.pathname }} replace />
}

function AdminOnly({ children }) {
  const { role, isAdmin } = useApp()
  if (isAdmin) return children
  return role ? <Info title="403" body="관리자 권한이 필요합니다." /> : <Navigate to="/admin/login" replace />
}

function Info({ title, body }) {
  return (
    <div className="wrap py-24 text-center">
      <div className="num text-7xl font-bold">{title}</div>
      <p className="mt-4 text-sub">{body}</p>
      <Link to="/" className="mt-8 inline-flex h-12 items-center rounded-full bg-navy px-6 text-sm font-semibold text-white">메인으로</Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="admin/login" element={<AdminLogin />} />
            <Route path="match" element={<UserOnly><Match /></UserOnly>} />
            <Route path="gap" element={<UserOnly><Gap /></UserOnly>} />
            <Route path="rewrite" element={<UserOnly><Rewrite /></UserOnly>} />
            <Route path="rehearse" element={<UserOnly><Rehearse /></UserOnly>} />
            <Route path="journey" element={<UserOnly><Journey /></UserOnly>} />
            <Route path="admin" element={<AdminOnly><Admin /></AdminOnly>} />
            <Route path="support" element={<Info title="고객센터" body="1588-0000 · 평일 10:00–18:00 · help@jobpick.example" />} />
            <Route path="terms" element={<Info title="이용약관" body="서비스 이용약관은 정식 오픈 전 확정됩니다." />} />
            <Route path="privacy" element={<Info title="개인정보처리방침" body="자소서 원문은 분석 요청에만 사용하며 AI 학습에 사용하지 않습니다." />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}
