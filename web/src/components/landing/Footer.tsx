import { Link } from 'react-router';
import { Facebook, Linkedin, Mail, Phone } from 'lucide-react';

export function Footer() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo a popis */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                HM
              </div>
              <span className="text-xl font-bold text-white">HypoManažer</span>
            </div>
            <p className="text-sm text-gray-400">
              Správa hypoték na autopilotu pro profesionální zprostředkovatele.
            </p>
          </div>

          {/* Navigace */}
          <div>
            <h3 className="font-semibold text-white mb-4">Navigace</h3>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => scrollToSection('funkce')}
                className="text-sm text-gray-400 hover:text-white transition-colors text-left"
              >
                Funkce
              </button>
              <button
                onClick={() => scrollToSection('cenik')}
                className="text-sm text-gray-400 hover:text-white transition-colors text-left"
              >
                Ceník
              </button>
              <button
                onClick={() => scrollToSection('faq')}
                className="text-sm text-gray-400 hover:text-white transition-colors text-left"
              >
                FAQ
              </button>
              <Link to="/register" className="text-sm text-gray-400 hover:text-white transition-colors">
                Registrace
              </Link>
            </div>
          </div>

          {/* Kontakt */}
          <div>
            <h3 className="font-semibold text-white mb-4">Kontakt</h3>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:info@hypomanazer.cz"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <Mail size={16} />
                info@hypomanazer.cz
              </a>
              <a
                href="tel:+420777888999"
                className="text-sm text-gray-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <Phone size={16} />
                +420 777 888 999
              </a>
            </div>
          </div>

          {/* Právní */}
          <div>
            <h3 className="font-semibold text-white mb-4">Právní</h3>
            <div className="flex flex-col gap-2">
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Obchodní podmínky
              </a>
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                Ochrana osobních údajů
              </a>
              <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">
                GDPR
              </a>
            </div>
          </div>
        </div>

        {/* Spodní část */}
        <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © 2026 HypoManažer. Všechna práva vyhrazena.
          </p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Linkedin size={20} />
            </a>
            <a
              href="https://www.facebook.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              <Facebook size={20} />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}