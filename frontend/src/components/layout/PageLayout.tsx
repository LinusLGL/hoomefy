import { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import { cn } from '@/utils/cn';

interface PageLayoutProps {
  children: ReactNode;
  showHeader?: boolean;
  showFooter?: boolean;
  /**
   * On laptop and desktop screens (1024px and wider) make the page exactly one screen tall: the header stays,
   * the footer is dropped and the page never scrolls (the content is expected to fit). Smaller screens keep the
   * normal scrolling page and footer.
   */
  fit?: boolean;
}

export default function PageLayout({
  children,
  showHeader = true,
  showFooter = true,
  fit = false,
}: PageLayoutProps) {
  return (
    <div data-page-layout="" className={cn('min-h-screen flex flex-col bg-navy-900', fit && 'lg:h-dvh lg:min-h-0 lg:overflow-hidden')}>
      {showHeader && <Header />}
      <main className={cn('flex-1', fit && 'lg:min-h-0')}>{children}</main>
      {showFooter && (fit ? <div className="lg:hidden"><Footer /></div> : <Footer />)}
    </div>
  );
}
