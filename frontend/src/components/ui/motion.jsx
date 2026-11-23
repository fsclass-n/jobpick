import { useEffect, useRef, useState } from 'react'
import { cx } from '../../lib/format'

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** 요소가 화면에 들어왔는지 감지 (한 번만) */
export function useInView(options = { threshold: 0.2 }) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el || inView) return undefined
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return undefined
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setInView(true)
        observer.disconnect()
      }
    }, options)
    observer.observe(el)
    return () => observer.disconnect()
  }, [inView]) // eslint-disable-line react-hooks/exhaustive-deps
  return [ref, inView]
}

/** 0 -> target 카운트업 */
export function useCountUp(target, duration = 1200, start = true) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (!start) return undefined
    if (!duration || prefersReducedMotion()) {
      setValue(target)
      return undefined
    }
    let frame
    const begin = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - begin) / duration)
      setValue(target * (1 - Math.pow(1 - p, 3)))
      if (p < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, start])
  return value
}

/** 스크롤 진입 시 페이드업 */
export function Reveal({ as: Tag = 'div', delay = 0, className, children }) {
  const [ref, inView] = useInView({ threshold: 0.12 })
  return (
    <Tag
      ref={ref}
      className={cx('transition duration-700 ease-out', inView ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0', className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  )
}

export function CountUp({ value, duration = 1400, decimals = 0, suffix = '' }) {
  const [ref, inView] = useInView()
  const v = useCountUp(value, duration, inView)
  return (
    <span ref={ref}>
      {v.toLocaleString('ko-KR', { maximumFractionDigits: decimals, minimumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}
