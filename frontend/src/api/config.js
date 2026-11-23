const env = import.meta.env

export const API_BASE_URL = (env.VITE_API_BASE_URL || '').replace(/\/$/, '')
// Netlify 데모(--mode demo) 또는 API 주소가 없으면 Mock 데이터/인증으로 동작
export const USE_MOCK = env.MODE === 'demo' || env.VITE_USE_MOCK === 'true' || !API_BASE_URL
