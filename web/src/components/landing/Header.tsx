import { Link } from 'react-router';
import { Button } from '../ui/button';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { getAppBaseUrl } from '../../lib/api';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const appUrl = getAppBaseUrl();

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      setMobileMenuOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-[1200px] mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              HM
            </div>
            <span className="text-xl font-bold text-gray-900">HypoManažer</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('funkce')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Funkce
            </button>
            <button
              onClick={() => scrollToSection('cenik')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Ceník
            </button>
            <button
              onClick={() => scrollToSection('faq')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              FAQ
            </button>
          </nav>

          {/* Desktop CTA – v produkci odkaz na hlavní aplikaci */}
          <div className="hidden md:flex items-center gap-4">
            {appUrl ? (
              <>
                <a href={`${appUrl}/login`} className="text-gray-600 hover:text-gray-900 transition-colors">
                  Přihlásit se
                </a>
                <a href={`${appUrl}/register`}>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Vyzkoušet zdarma
                  </Button>
                </a>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors">
                  Přihlásit se
                </Link>
                <Link to="/register">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Vyzkoušet zdarma
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            <nav className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection('funkce')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-left"
              >
                Funkce
              </button>
              <button
                onClick={() => scrollToSection('cenik')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-left"
              >
                Ceník
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="text-gray-600 hover:text-gray-900 transition-colors text-left"
              >
                FAQ
              </button>
              {appUrl ? (
                <>
                  <a href={`${appUrl}/login`} className="text-gray-600 hover:text-gray-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Přihlásit se
                  </a>
                  <a href={`${appUrl}/register`} onClick={() => setMobileMenuOpen(false)}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                      Vyzkoušet zdarma
                    </Button>
                  </a>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-600 hover:text-gray-900 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                    Přihlásit se
                  </Link>
                  <Link to="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white w-full">
                      Vyzkoušet zdarma
                    </Button>
                  </Link>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}