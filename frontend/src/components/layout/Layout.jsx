import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Footer, { ToTopButton } from './Footer'
import { Spinner } from '../ui'
import Header from './Header'

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [pathname])
  return (
    <div className="flex min-h-screen flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[90] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2">
        본문 바로가기
      </a>
      <Header />
      <main id="main" className="flex-1">
        <Suspense fallback={<Spinner className="py-40" />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <ToTopButton />
    </div>
  )
}
