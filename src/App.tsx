
import React, { Suspense, useState, useEffect, lazy } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { NotificationsProvider } from "./components/Notifications/NotificationsProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import { setupGlobalErrorHandlers } from "./utils/errorHandling";

// Components
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

// Lazy-loaded Pages
const Index = lazy(() => import('./pages/Index'));
const Auth = lazy(() => import('./pages/Auth'));
const Markets = lazy(() => import('./pages/Markets'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const IPO = lazy(() => import('./pages/IPO'));
const IPODetails = lazy(() => import('./pages/IPODetails'));
const Crypto = lazy(() => import('./pages/Crypto'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const Banking = lazy(() => import('./pages/Banking'));
const NotFound = lazy(() => import('./pages/NotFound'));

// Custom hook for order processing
const OrderProcessorInitializer = lazy(() => import('./components/OrderProcessorInitializer'));

// Create query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      cacheTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Register service worker for caching and offline support
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js')
          .then(registration => {
            console.log('Service Worker registered with scope:', registration.scope);
          })
          .catch(error => {
            console.error('Service Worker registration failed:', error);
          });
      });
    }

    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    // Add global error handler
    const cleanup = setupGlobalErrorHandlers();

    return () => {
      clearTimeout(timer);
      cleanup();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-foreground/80">Loading Palm Cacia...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NotificationsProvider>
            <div className="min-h-screen flex flex-col">
              <Navbar />
              <main className="flex-1">
                <Toaster />
                <Sonner />
                <Suspense fallback={
                  <div className="container py-6 flex items-center justify-center min-h-[60vh]">
                    <div className="text-center space-y-4">
                      <div className="w-12 h-12 mx-auto border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-foreground/80">Loading...</p>
                    </div>
                  </div>
                }>
                  <ErrorBoundary>
                    <Routes>
                      <Route path="/" element={<Index />} />
                      <Route path="/auth" element={<Auth />} />
                      <Route path="/markets" element={<Markets />} />
                      <Route path="/watchlist" element={<Watchlist />} />
                      <Route path="/portfolio" element={<Portfolio />} />
                      <Route path="/ipo" element={<IPO />} />
                      <Route path="/ipo/:id" element={<IPODetails />} />
                      <Route path="/crypto" element={<Crypto />} />
                      <Route path="/onboarding" element={<Onboarding />} />
                      <Route path="/settings" element={<AccountSettings />} />
                      <Route path="/banking" element={<Banking />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
                  </ErrorBoundary>
                </Suspense>
              </main>
              <Footer />
            </div>
          </NotificationsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
