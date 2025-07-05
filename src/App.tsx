
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from '@/hooks/useAuth';
import { ThemeProvider } from "next-themes";
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 2,
    },
  },
});

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <ErrorBoundary>
              <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
                <Navbar />
                <main className="flex-1">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/markets" element={<Markets />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/crypto" element={<Crypto />} />
                    <Route path="/ipo" element={<IPO />} />
                    <Route path="/african-markets" element={<AfricanMarkets />} />
                    <Route path="/banking" element={<Banking />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/kyc" element={<KYC />} />
                    <Route path="/verification" element={<Verification />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/transfers" element={<Transfers />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/account-settings" element={<AccountSettings />} />
                    <Route path="/help" element={<Help />} />
                  </Routes>
                </main>
                <Footer />
                <Toaster />
              </div>
            </ErrorBoundary>
          </AuthProvider>
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
