import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPinOff, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function NotFoundPage() {
  usePageTitle('Page Not Found');
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center"
    >
      <MapPinOff className="h-20 w-20 text-white/20 mb-6" />
      <h1 className="text-3xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-white/40 mb-8 max-w-md">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link to="/">
        <Button variant="primary">
          <Home className="h-4 w-4" />
          Back to Home
        </Button>
      </Link>
    </motion.div>
  );
}
