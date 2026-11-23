import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 환경 변수는 루트(.env) 하나로 관리합니다. (VITE_ 접두사 변수만 클라이언트에 노출)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  envDir: '..',
  server: {
    port: 5173,
    // Mock 모드에서 rpa/data/sample_jobs.json 을 공유하기 위해 상위 폴더 접근 허용
    fs: { allow: ['..'] },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
})
