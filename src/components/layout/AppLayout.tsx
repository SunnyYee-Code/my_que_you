import React from 'react';
import DesktopHeader from './DesktopHeader';
import MobileTabBar from './MobileTabBar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <DesktopHeader />
      <main className="pb-20 md:pb-6">
        <div className="max-w-5xl mx-auto px-4 md:px-6 lg:px-8 py-4 md:py-6">
          {children}
        </div>
      </main>
      <footer className="hidden md:block text-center py-4 text-xs text-muted-foreground border-t">
        本平台仅供娱乐约局，禁止赌博
      </footer>
      <MobileTabBar />
    </div>
  );
}
