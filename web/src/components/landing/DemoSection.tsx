import { Link } from 'react-router';
import { Button } from '../ui/button';
import { Play } from 'lucide-react';
import { getAppBaseUrl } from '../../lib/api';

export function DemoSection() {
  const appUrl = getAppBaseUrl();
  return (
    <section id="demo" className="bg-white scroll-mt-20">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
          Podívejte se, jak HypoManažer pracuje za vás
        </h2>
        <p className="text-xl text-center text-gray-600 mb-12">
          60sekundové video ukazující celý workflow
        </p>

        {/* Video Placeholder */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="relative aspect-video bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl overflow-hidden shadow-2xl">
            <div className="absolute inset-0 flex items-center justify-center">
              <button className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform">
                <Play className="w-10 h-10 text-blue-600 ml-1" fill="currentColor" />
              </button>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/50 to-transparent">
              <p className="text-white font-semibold text-lg">
                Od nahrání dokumentu po odeslání do banky za 2 minuty
              </p>
            </div>
          </div>
        </div>

        <div className="text-center">
          {appUrl ? (
            <a href={`${appUrl}/register`}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Vyzkoušet zdarma
              </Button>
            </a>
          ) : (
            <Link to="/register">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Vyzkoušet zdarma
              </Button>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}