import React, { Suspense, useState, useEffect, lazy } from 'react';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { NotificationsProvider } from "./components/Notifications/NotificationsProvider";
import EnhancedErrorBoundary from "./components/EnhancedErrorBoundary";
import { setupGlobalErrorHandlers } from "./utils/errorHandling";
import OrderProcessorInitializer from "./components/OrderProcessorInitializer";
import AccessibilityProvider from "./components/Accessibility/AccessibilityProvider";
import { FullPageLoader } from "./components/ui/full-page-loader";
import { LoadingSpinner } from "./components/ui/loading-spinner";
import ErrorPage from "./components/ErrorPage";
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
const PrivacyPolicy = lazy(() => import('./components/legal/PrivacyPolicy'));

// Create query client with optimized settings
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
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
    return <FullPageLoader />;
  }

  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <NotificationsProvider>
            <AccessibilityProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <main id="main" className="flex-1 w-full max-w-[2000px] mx-auto px-4 sm:px-6 lg:px-8" tabIndex={-1}>
                  <Toaster />
                  <Sonner />
                  <Suspense fallback={
                    <div className="container py-6 flex items-center justify-center min-h-[60vh]" aria-live="polite">
                      <LoadingSpinner size="lg" />
                    </div>
                  }>
                    <EnhancedErrorBoundary>
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
                        <Route path="/404" element={<ErrorPage statusCode={404} title="Page Not Found" description="The page you are looking for doesn't exist or has been moved." />} />
                        <Route path="/500" element={<ErrorPage statusCode={500} title="Server Error" description="We're experiencing some issues. Please try again later." />} />
                        <Route path="/403" element={<ErrorPage statusCode={403} title="Access Denied" description="You don't have permission to access this resource." />} />
                        <Route path="/privacy" element={<PrivacyPolicy />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </EnhancedErrorBoundary>
                  </Suspense>
                  <OrderProcessorInitializer />
                </main>
                <Footer />
              </div>
            </AccessibilityProvider>
          </NotificationsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
