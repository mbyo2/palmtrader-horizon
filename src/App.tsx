import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"
import { NotificationsProvider } from '@mantine/notifications';
import { AuthProvider } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navigation/Navbar';
import { Footer } from '@/components/Footer';
import Home from '@/pages/Home';
import Markets from '@/pages/Markets';
import Portfolio from '@/pages/Portfolio';
import Watchlist from '@/pages/Watchlist';
import Crypto from '@/pages/Crypto';
import IPO from '@/pages/IPO';
import AfricanMarkets from '@/pages/AfricanMarkets';
import Admin from '@/pages/Admin';
import EnhancedErrorBoundary from '@/components/ErrorHandling/EnhancedErrorBoundary';

import KYC from "@/pages/KYC";
import Transfers from "@/pages/Transfers";

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationsProvider>
            <EnhancedErrorBoundary>
              <div className="min-h-screen bg-background">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/markets" element={<Markets />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/crypto" element={<Crypto />} />
                    <Route path="/ipo" element={<IPO />} />
                    <Route path="/african-markets" element={<AfricanMarkets />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/kyc" element={<KYC />} />
                    <Route path="/transfers" element={<Transfers />} />
                  </Routes>
                </main>
                <Footer />
                <Toaster />
              </div>
            </EnhancedErrorBoundary>
          </NotificationsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
