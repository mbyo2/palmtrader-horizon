
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          ui: ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog', '@radix-ui/react-aspect-ratio', 
               '@radix-ui/react-avatar', '@radix-ui/react-checkbox', '@radix-ui/react-collapsible', 
               '@radix-ui/react-context-menu', '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', 
               '@radix-ui/react-hover-card', '@radix-ui/react-label', '@radix-ui/react-menubar', 
               '@radix-ui/react-navigation-menu', '@radix-ui/react-popover', '@radix-ui/react-progress', 
               '@radix-ui/react-radio-group', '@radix-ui/react-scroll-area', '@radix-ui/react-select', 
               '@radix-ui/react-separator', '@radix-ui/react-slider', '@radix-ui/react-slot', 
               '@radix-ui/react-switch', '@radix-ui/react-tabs', '@radix-ui/react-toast', 
               '@radix-ui/react-toggle', '@radix-ui/react-toggle-group', '@radix-ui/react-tooltip'],
          supabase: ['@supabase/auth-helpers-react', '@supabase/auth-ui-react', '@supabase/auth-ui-shared', '@supabase/supabase-js'],
          charts: ['recharts'],
          tanstack: ['@tanstack/react-query'],
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
      }
    },
    sourcemap: false,
    reportCompressedSize: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom'],
    exclude: []
  },
}));
