import { Link } from 'react-router';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { getAppBaseUrl } from '../../lib/api';

export function HeroSection() {
  const appUrl = getAppBaseUrl();
  const scrollToDemo = () => {
    const element = document.getElementById('demo');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-20 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text Content */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Správa hypoték na autopilotu. Od dokumentu k bance za minuty, ne hodiny.
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              AI vytáhne data z občanky, daňového přiznání i výpisů. Vy se soustředíte na klienty.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              {appUrl ? (
                <a href={`${appUrl}/register`}>
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                    Vyzkoušet zdarma
                  </Button>
                </a>
              ) : (
                <Link to="/register">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                    Vyzkoušet zdarma
                  </Button>
                </Link>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={scrollToDemo}
                className="w-full sm:w-auto"
              >
                Podívat se, jak to funguje
              </Button>
            </div>

            {/* Trust Bar */}
            <div className="border-t pt-8">
              <p className="text-sm text-gray-500 mb-4">Používají hypoteční poradci po celé ČR</p>
              <div className="flex flex-wrap items-center gap-6">
                <Badge variant="outline" className="text-gray-600 border-gray-300">
                  KB
                </Badge>
                <Badge variant="outline" className="text-gray-600 border-gray-300">
                  ČSOB
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                  AI-powered OCR
                </Badge>
              </div>
            </div>
          </div>

          {/* Visual Mockup */}
          <div className="relative">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-8 shadow-2xl">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=600&fit=crop"
                alt="HypoManažer Dashboard"
                className="w-full rounded-lg shadow-lg"
              />
            </div>
            {/* Floating mobile mockup */}
            <div className="absolute -bottom-8 -left-8 w-48 hidden lg:block">
              <div className="bg-white rounded-2xl shadow-2xl p-3">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&h=600&fit=crop"
                  alt="Klientský portál"
                  className="w-full rounded-lg"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}