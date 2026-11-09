import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';

interface PageLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
}

export default function PageLayout({
  children,
  showHeader = true,
  showFooter = true,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-navy-900">
      {showHeader && <Header />}
      <main className="flex-1">{children}</main>
      {showFooter && <Footer />}
    </div>
  );
}
