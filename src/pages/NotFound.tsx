import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error('404 Error: User attempted to access non-existent route:', location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold">Page Not Found</h1>
        <p className="mb-4 text-xl text-gray-600">The page you're looking for doesn't exist.</p>
        <a href="/" className="text-blue-500 underline hover:text-blue-700">
          Go back home
        </a>
      </div>
    </div>
  );
};

export default NotFound;