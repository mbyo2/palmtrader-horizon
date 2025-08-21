// Production-safe console utilities
// Only logs in development mode to avoid console spam in production

export const devConsole = {
  log: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(...args);
    }
  },
  
  error: (...args: any[]) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  info: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args);
    }
  }
};

// Performance timing utility
export const performanceTimer = {
  start: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.time(label);
    }
  },
  
  end: (label: string) => {
    if (process.env.NODE_ENV === 'development') {
      console.timeEnd(label);
    }
  }
};