
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from "next-themes";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import PullToRefresh from './components/Mobile/PullToRefresh';
import SwipeNavigation from './components/Mobile/SwipeNavigation';
import { usePullToRefresh } from './hooks/usePullToRefresh';
import { useIsMobile } from './hooks/use-mobile';
import Home from '@/pages/Home';
import Markets from '@/pages/Markets';
import Portfolio from '@/pages/Portfolio';
import Watchlist from '@/pages/Watchlist';
import Crypto from '@/pages/Crypto';
import IPO from '@/pages/IPO';
import AfricanMarkets from '@/pages/AfricanMarkets';
import Admin from '@/pages/Admin';
import Auth from '@/pages/Auth';
import Settings from '@/pages/Settings';
import AccountSettings from '@/pages/AccountSettings';
import Help from '@/pages/Help';
import Banking from '@/pages/Banking';
import ErrorBoundary from '@/components/ErrorBoundary';
import KYC from "@/pages/KYC";
import Verification from "@/pages/Verification";
import Profile from "@/pages/Profile";
import Transfers from "@/pages/Transfers";
import NotFound from "@/pages/NotFound";
import IPODetails from "@/pages/IPODetails";
import Onboarding from "@/pages/Onboarding";
import PWASettings from "@/pages/PWASettings";
import { APIService } from '@/services/APIService';
import NotificationsProvider from '@/components/Notifications/NotificationsProvider';
import AccessibilityProvider from '@/components/Accessibility/AccessibilityProvider';
import OrderProcessorInitializer from '@/components/OrderProcessorInitializer';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Terms from '@/pages/Terms';
import Cookies from '@/pages/Cookies';
import Compliance from '@/pages/Compliance';
import OptionsTrading from '@/pages/OptionsTrading';
import MobileTrade from '@/pages/MobileTrade';
import { setupGlobalErrorHandlers } from '@/utils/errorHandling';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function AppContent() {
  const { handleRefresh } = usePullToRefresh();
  const isMobile = useIsMobile();

  const content = (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <main className="flex-1" id="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/markets" element={<Markets />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/crypto" element={<Crypto />} />
          <Route path="/ipo" element={<IPO />} />
          <Route path="/ipo/:id" element={<IPODetails />} />
          <Route path="/african-markets" element={<AfricanMarkets />} />
          <Route path="/banking" element={<Banking />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/kyc" element={<KYC />} />
          <Route path="/verification" element={<Verification />} />
          <Route path="/compliance" element={<Compliance />} />
          <Route path="/options-trading" element={<OptionsTrading />} />
          <Route path="/trade/:symbol" element={<MobileTrade />} />
          <Route path="/verify" element={<Verification />} />
          <Route path="/support" element={<Help />} />
          <Route path="/upgrade" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/cookies" element={<Cookies />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/transfers" element={<Transfers />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/account-settings" element={<AccountSettings />} />
          <Route path="/pwa-settings" element={<PWASettings />} />
          <Route path="/help" element={<Help />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <Toaster />
      <OrderProcessorInitializer />
    </div>
  );

  if (isMobile) {
    return (
      <SwipeNavigation>
        <PullToRefresh onRefresh={handleRefresh}>
          {content}
        </PullToRefresh>
      </SwipeNavigation>
    );
  }

  return content;
}

function App() {
  // Initialize services on app mount
  React.useEffect(() => {
    APIService.initialize();
    
    // Set up global error handling
    const cleanup = setupGlobalErrorHandlers();
    
    return cleanup;
  }, []);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <AccessibilityProvider>
              <NotificationsProvider>
                <ErrorBoundary>
                  <AppContent />
                </ErrorBoundary>
              </NotificationsProvider>
            </AccessibilityProvider>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
