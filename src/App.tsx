
import React from 'react';
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
import { NotificationsProvider } from "./components/Notifications/NotificationsProvider";

const queryClient = new QueryClient();

function App() {
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
                  <Routes>
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    <Route path="/markets" element={<Markets />} />
                    <Route path="/watchlist" element={<Watchlist />} />
                    <Route path="/portfolio" element={<Portfolio />} />
                    <Route path="/ipo" element={<IPO />} />
                    <Route path="/ipo/:id" element={<IPODetails />} />
                    <Route path="/crypto" element={<Crypto />} />
                  </Routes>
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
