// Performance optimization utilities

// Lazy load images with Intersection Observer
export const lazyLoadImages = () => {
  if (typeof window === 'undefined') return;

  const images = document.querySelectorAll('img[data-src]');
  
  const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = img.dataset.src!;
        img.removeAttribute('data-src');
        imageObserver.unobserve(img);
      }
    });
  }, {
    rootMargin: '50px 0px',
    threshold: 0.01
  });

  images.forEach(img => imageObserver.observe(img));
};

// Debounce function for expensive operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Throttle function for rate limiting
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Prefetch critical resources
export const prefetchResources = (urls: string[]) => {
  if (typeof window === 'undefined') return;

  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);
  });
};

// Preconnect to external domains
export const preconnectDomains = (domains: string[]) => {
  if (typeof window === 'undefined') return;

  domains.forEach(domain => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = domain;
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

// Web Vitals monitoring
export const reportWebVitals = (onPerfEntry?: (metric: any) => void) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

// Memory leak detection
export const detectMemoryLeaks = () => {
  if (typeof window === 'undefined' || !performance.memory) return;

  const checkMemory = () => {
    const used = performance.memory.usedJSHeapSize;
    const total = performance.memory.totalJSHeapSize;
    const limit = performance.memory.jsHeapSizeLimit;
    
    const percentUsed = (used / limit) * 100;
    
    if (percentUsed > 90) {
      console.warn(`High memory usage detected: ${percentUsed.toFixed(2)}%`);
      
      // Send to monitoring service
      if (window.gtag) {
        window.gtag('event', 'high_memory_usage', {
          event_category: 'Performance',
          event_label: 'Memory',
          value: Math.round(percentUsed)
        });
      }
    }
  };

  // Check every 30 seconds
  setInterval(checkMemory, 30000);
};

// Request idle callback polyfill
export const requestIdleCallback = 
  window.requestIdleCallback ||
  function (cb: IdleRequestCallback) {
    const start = Date.now();
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      } as IdleDeadline);
    }, 1);
  };

// Cancel idle callback polyfill
export const cancelIdleCallback = 
  window.cancelIdleCallback ||
  function (id: number) {
    clearTimeout(id);
  };

// Defer non-critical work
export const deferWork = (work: () => void) => {
  requestIdleCallback((deadline) => {
    while (deadline.timeRemaining() > 0) {
      work();
      break;
    }
  });
};

// Virtual scrolling helper
export class VirtualScroller<T> {
  private items: T[];
  private itemHeight: number;
  private containerHeight: number;
  private overscan: number;

  constructor(items: T[], itemHeight: number, containerHeight: number, overscan = 3) {
    this.items = items;
    this.itemHeight = itemHeight;
    this.containerHeight = containerHeight;
    this.overscan = overscan;
  }

  getVisibleRange(scrollTop: number): { start: number; end: number; items: T[] } {
    const start = Math.max(0, Math.floor(scrollTop / this.itemHeight) - this.overscan);
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const end = Math.min(this.items.length, start + visibleCount + this.overscan * 2);

    return {
      start,
      end,
      items: this.items.slice(start, end)
    };
  }

  getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }
}

// Resource hints based on user interaction
export const adaptiveLoading = () => {
  if (typeof window === 'undefined') return;

  // Network speed detection
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  
  if (connection) {
    const updateStrategy = () => {
      const effectiveType = connection.effectiveType;
      
      // Adjust based on connection speed
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        // Disable auto-play videos, high-res images
        document.body.classList.add('low-bandwidth');
      } else if (effectiveType === '3g') {
        // Moderate quality
        document.body.classList.add('medium-bandwidth');
      } else {
        // Full quality
        document.body.classList.add('high-bandwidth');
      }
    };

    updateStrategy();
    connection.addEventListener('change', updateStrategy);
  }

  // Save data detection
  if ('saveData' in connection && connection.saveData) {
    document.body.classList.add('save-data-mode');
  }
};

// Service Worker registration with update handling
export const registerServiceWorker = async () => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    
    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (!newWorker) return;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
          // New service worker activated, show update prompt
          if (window.confirm('New version available! Reload to update?')) {
            window.location.reload();
          }
        }
      });
    });
  } catch (error) {
    console.error('Service Worker registration failed:', error);
  }
};

// Performance marks and measures
export class PerformanceTracker {
  private marks: Map<string, number> = new Map();

  mark(name: string) {
    this.marks.set(name, performance.now());
    performance.mark(name);
  }

  measure(name: string, startMark: string, endMark?: string) {
    if (!this.marks.has(startMark)) return;

    const duration = endMark 
      ? (this.marks.get(endMark) || performance.now()) - this.marks.get(startMark)!
      : performance.now() - this.marks.get(startMark)!;

    performance.measure(name, startMark, endMark);

    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`);
    }

    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        event_category: 'Performance',
        name,
        value: Math.round(duration)
      });
    }

    return duration;
  }

  clear() {
    this.marks.clear();
    performance.clearMarks();
    performance.clearMeasures();
  }
}

// Export singleton instance
export const performanceTracker = new PerformanceTracker();

// Initialize performance optimizations
export const initializePerformance = () => {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Lazy load images
  lazyLoadImages();

  // Preconnect to external domains
  preconnectDomains([
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
    process.env.NEXT_PUBLIC_API_URL || 'https://api.logos-ecosystem.com',
    'https://js.stripe.com'
  ]);

  // Adaptive loading based on network
  adaptiveLoading();

  // Memory leak detection in development
  if (process.env.NODE_ENV === 'development') {
    detectMemoryLeaks();
  }

  // Report web vitals
  reportWebVitals((metric) => {
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', metric.name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    }
  });
};