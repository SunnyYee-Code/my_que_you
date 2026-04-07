import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { measurePageLoad, observeCoreWebVitals } from '@/lib/performance-monitoring'

/**
 * Hook to monitor performance on route changes
 * Measures page load time and core web vitals
 */
export function usePerformanceMonitoring() {
  const location = useLocation()

  useEffect(() => {
    // Measure page load after route change
    const timer = setTimeout(() => {
      measurePageLoad(location.pathname)
    }, 0)

    return () => clearTimeout(timer)
  }, [location.pathname])

  useEffect(() => {
    // Setup core web vitals observation on mount
    const unobserve = () => {
      // Observers are cleaned up by browser
    }
    
    observeCoreWebVitals((metric) => {
      if (process.env.NODE_ENV === 'development') {
        console.debug('[Core Web Vitals]', metric.metric, `${metric.value.toFixed(2)}ms`)
      }
    })

    return unobserve
  }, [])
}
