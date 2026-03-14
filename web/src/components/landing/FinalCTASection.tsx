import { Link } from 'react-router';
import { Button } from '../ui/button';

export function FinalCTASection() {
  return (
    <section className="bg-gradient-to-br from-blue-600 to-blue-700">
      <div className="max-w-[1200px] mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">
          Přestaňte přepisovat. Začněte zprostředkovávat.
        </h2>
        <p className="text-xl text-blue-100 mb-8">
          Založte si účet za 30 sekund. Žádná kreditní karta.
        </p>
        <Link to="/register">
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 text-lg px-8 py-6">
            Vyzkoušet HypoManažer zdarma
          </Button>
        </Link>
      </div>
    </section>
  );
}