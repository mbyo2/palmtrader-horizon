
import React, { Suspense, useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Markets from "./pages/Markets";
import Watchlist from "./pages/Watchlist";
import Portfolio from "./pages/Portfolio";
import IPO from "./pages/IPO";
import IPODetails from "./pages/IPODetails";
import Crypto from "./pages/Crypto";
import Onboarding from "./pages/Onboarding";
import AccountSettings from "./pages/AccountSettings";
import { NotificationsProvider } from "./components/Notifications/NotificationsProvider";
import { toast } from "sonner";
import ErrorBoundary from "./components/ErrorBoundary";
import { useOrderProcessor } from './hooks/useOrderProcessor';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  },
});

// Component to initialize order processor
const OrderProcessorInitializer = () => {
  useOrderProcessor();
  return null;
};

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    // Add global error handler
    const handleError = (event: ErrorEvent) => {
      console.error("Global error:", event.error);
      toast.error("Something went wrong. Please try refreshing the page.");
    };

    window.addEventListener('error', handleError);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('error', handleError);
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
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TooltipProvider>
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
                      <OrderProcessorInitializer />
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
                      </Routes>
                    </ErrorBoundary>
                  </Suspense>
                </main>
                <Footer />
              </div>
            </NotificationsProvider>
          </TooltipProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
