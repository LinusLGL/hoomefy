import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { BrandMark } from '@/components/layout/BrandMark';
import { useIsHaunted } from '@/features/haunting/hauntingStore';
import { ROUTES } from '@/utils/constants';

export default function NotFoundPage() {
  const haunted = useIsHaunted();
  return (
    <div className="min-h-screen flex items-center justify-center gradient-hero px-4">
      <div className="max-w-2xl w-full text-center space-y-8 animate-fade-in">
        {/* Ghost Icon */}
        <div className="flex justify-center">
          <span className="text-accent"><BrandMark iconOnly iconClassName="w-32 h-32" /></span>
        </div>

        {/* Error Message */}
        <div className="space-y-4">
          <h1 className="text-8xl font-bold text-accent font-heading">404</h1>
          <h2 className="text-4xl font-bold text-ivory font-heading">Page Not Found</h2>
          <p className="text-xl text-ivory/70">
            {haunted
              ? 'This page was never here. Neither, perhaps, were you.'
              : "We couldn't find the page you were looking for. It may have moved or no longer exists."}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-8">
          <Link
            to={ROUTES.home}
            className="
              inline-flex items-center gap-2
              bg-amber-600 hover:bg-amber-700
              text-on-accent font-semibold
              px-6 py-3 rounded-md
              shadow-lg hover:shadow-xl
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-navy-900
            "
          >
            <Home className="w-5 h-5" />
            Back to Home
          </Link>
          <Link
            to={ROUTES.studio}
            className="
              inline-flex items-center gap-2
              bg-transparent border-2 border-amber-600
              text-accent hover:bg-amber-600 hover:text-on-accent
              font-semibold px-6 py-3 rounded-md
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-amber-500
            "
          >
            Design Your Room
          </Link>
        </div>
      </div>
    </div>
  );
}
