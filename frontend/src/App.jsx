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

function Guard({ need, children }) {
  const { role } = useApp()
  const loc = useLocation()
  if (role === need) return children
  if (need === 'ADMIN') return role ? <Info title="403" body="접근 권한이 없습니다." /> : <Navigate to="/admin/login" replace />
  return role ? children : <Navigate to="/login" state={{ from: loc.pathname }} replace />
}

function Info({ title, body }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <h1 className="font-display text-4xl font-extrabold">{title}</h1>
      <p className="mt-3 text-slate-600">{body}</p>
      <Link to="/" className="mt-6 inline-block text-brand">홈으로</Link>
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
            <Route path="match" element={<Guard need="USER"><Match /></Guard>} />
            <Route path="gap" element={<Guard need="USER"><Gap /></Guard>} />
            <Route path="rewrite" element={<Guard need="USER"><Rewrite /></Guard>} />
            <Route path="rehearse" element={<Guard need="USER"><Rehearse /></Guard>} />
            <Route path="journey" element={<Guard need="USER"><Journey /></Guard>} />
            <Route path="admin" element={<Guard need="ADMIN"><Admin /></Guard>} />
            <Route path="terms" element={<Info title="이용약관" body="서비스 이용약관은 정식 오픈 전 확정됩니다." />} />
            <Route path="privacy" element={<Info title="개인정보처리방침" body="자소서 원문은 분석 요청에만 사용하며 AI 학습에 사용하지 않습니다." />} />
            <Route path="*" element={<Info title="404" body="페이지를 찾을 수 없습니다." />} />
          </Route>
        </Routes>
      </AppProvider>
    </BrowserRouter>
  )
}
