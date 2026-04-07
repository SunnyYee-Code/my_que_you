import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor chunks
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@radix-ui')) {
            return 'vendor-radix';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          if (id.includes('node_modules/supabase') || id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          
          // App chunks - large pages that benefit from lazy loading
          if (id.includes('src/pages/Admin.tsx')) {
            return 'page-admin';
          }
          if (id.includes('src/pages/GroupCreate.tsx')) {
            return 'page-group-create';
          }
          if (id.includes('src/pages/Settings.tsx')) {
            return 'page-settings';
          }
          if (id.includes('src/pages/GroupDetail.tsx')) {
            return 'page-group-detail';
          }
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
}));


