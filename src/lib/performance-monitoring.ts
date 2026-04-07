/**
 * Performance monitoring utilities for core application routes
 * Tracks key performance metrics for optimization and regression detection
 */

export interface PerformanceMetrics {
  timestamp: string
  routeName: string
  navigationTiming: {
    // Navigation timing API metrics
    domContentLoaded?: number
    loadComplete?: number
    firstPaint?: number
    firstContentfulPaint?: number
    firstInputDelay?: number
  }
  customMetrics: {
    // Custom application metrics
    queryTime?: number
    renderTime?: number
    ttfb?: number // Time to first byte
  }
  resourceMetrics: {
    totalResources: number
    totalSize: number
    criticalPath: number
  }
}

const metricsBuffer: PerformanceMetrics[] = []
const MAX_BUFFER_SIZE = 100

/**
 * Record a performance metric
 */
export function recordMetric(metric: PerformanceMetrics) {
  metricsBuffer.push(metric)
  
  // Keep buffer size under control
  if (metricsBuffer.length > MAX_BUFFER_SIZE) {
    metricsBuffer.shift()
  }

  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.debug('[Performance]', metric.routeName, metric.navigationTiming)
  }
}

/**
 * Get core web vitals using Performance Observer
 */
export function observeCoreWebVitals(callback: (metric: any) => void) {
  try {
    // Observe Largest Contentful Paint (LCP)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1]
      callback({
        metric: 'LCP',
        value: lastEntry.renderTime || lastEntry.loadTime,
      })
    })
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

    // Observe First Input Delay (FID) / Interaction to Next Paint (INP)
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback({
          metric: entry.name === 'first-input' ? 'FID' : 'INP',
          value: entry.processingDuration,
        })
      }
    })
    try {
      fidObserver.observe({ entryTypes: ['first-input', 'interaction'] })
    } catch (e) {
      // Fallback for browsers that don't support interaction
      fidObserver.observe({ entryTypes: ['first-input'] })
    }

    // Observe Cumulative Layout Shift (CLS)
    const clsObserver = new PerformanceObserver((list) => {
      let clsValue = 0
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value
        }
      }
      callback({
        metric: 'CLS',
        value: clsValue,
      })
    })
    clsObserver.observe({ entryTypes: ['layout-shift'] })
  } catch (error) {
    console.warn('Could not observe core web vitals:', error)
  }
}

/**
 * Measure page load performance
 */
export function measurePageLoad(routeName: string) {
  if (typeof window === 'undefined' || !window.performance) {
    return
  }

  const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const paintEntries = performance.getEntriesByType('paint')

  const metric: PerformanceMetrics = {
    timestamp: new Date().toISOString(),
    routeName,
    navigationTiming: {},
    customMetrics: {},
    resourceMetrics: {
      totalResources: performance.getEntriesByType('resource').length,
      totalSize: 0,
      criticalPath: navigationTiming?.domContentLoadedEventEnd ? navigationTiming.domContentLoadedEventEnd - navigationTiming.fetchStart : 0,
    },
  }

  if (navigationTiming) {
    metric.navigationTiming = {
      domContentLoaded: navigationTiming.domContentLoadedEventEnd - navigationTiming.domContentLoadedEventStart,
      loadComplete: navigationTiming.loadEventEnd - navigationTiming.loadEventStart,
      ttfb: navigationTiming.responseStart - navigationTiming.fetchStart,
    }
  }

  for (const paint of paintEntries) {
    if (paint.name === 'first-paint') {
      metric.navigationTiming.firstPaint = paint.startTime
    } else if (paint.name === 'first-contentful-paint') {
      metric.navigationTiming.firstContentfulPaint = paint.startTime
    }
  }

  // Calculate total resource size
  const resources = performance.getEntriesByType('resource')
  for (const resource of resources) {
    metric.resourceMetrics.totalSize += (resource as PerformanceResourceTiming).transferSize || 0
  }

  recordMetric(metric)
}

/**
 * Get average metrics for a route
 */
export function getAverageMetrics(routeName: string): Partial<PerformanceMetrics> | null {
  const routeMetrics = metricsBuffer.filter(m => m.routeName === routeName)
  
  if (routeMetrics.length === 0) {
    return null
  }

  const avgMetric: Partial<PerformanceMetrics> = {
    routeName,
    navigationTiming: {},
    customMetrics: {},
    resourceMetrics: {
      totalResources: 0,
      totalSize: 0,
      criticalPath: 0,
    },
  }

  // Calculate averages
  for (const metric of routeMetrics) {
    if (metric.navigationTiming.domContentLoaded) {
      (avgMetric.navigationTiming as any).domContentLoaded = 
        ((avgMetric.navigationTiming as any).domContentLoaded || 0) + metric.navigationTiming.domContentLoaded
    }
    if (metric.navigationTiming.loadComplete) {
      (avgMetric.navigationTiming as any).loadComplete = 
        ((avgMetric.navigationTiming as any).loadComplete || 0) + metric.navigationTiming.loadComplete
    }
    if (metric.resourceMetrics.totalSize) {
      (avgMetric.resourceMetrics as any).totalSize += metric.resourceMetrics.totalSize
    }
  }

  const count = routeMetrics.length
  if ((avgMetric.navigationTiming as any).domContentLoaded) {
    (avgMetric.navigationTiming as any).domContentLoaded /= count
  }
  if ((avgMetric.navigationTiming as any).loadComplete) {
    (avgMetric.navigationTiming as any).loadComplete /= count
  }
  if ((avgMetric.resourceMetrics as any).totalSize) {
    (avgMetric.resourceMetrics as any).totalSize /= count
  }

  return avgMetric
}

/**
 * Export metrics for analytics (in production, send to monitoring service)
 */
export function exportMetrics(): PerformanceMetrics[] {
  return [...metricsBuffer]
}

/**
 * Clear all recorded metrics
 */
export function clearMetrics() {
  metricsBuffer.length = 0
}
