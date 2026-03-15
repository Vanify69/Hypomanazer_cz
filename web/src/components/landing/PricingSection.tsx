import { Link } from 'react-router';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Badge } from '../ui/badge';
import { Check, X } from 'lucide-react';
import { getAppBaseUrl } from '../../lib/api';

export function PricingSection() {
  const appUrl = getAppBaseUrl();
  const plans = [
    {
      name: 'Starter',
      price: '0 Kč',
      period: 'měsíc',
      popular: false,
      features: [
        { text: '30 stránek ke zpracování měsíčně', included: true },
        { text: 'Dokup stránek: 1,50 Kč / stránka', included: true },
        { text: '2 aktivní případy', included: true },
        { text: '1 aktivní intake odkaz', included: true },
        { text: 'Až 10 leadů', included: true },
        { text: '1 žadatel na případ', included: true },
        { text: 'Základní kalendář', included: true },
        { text: 'Bez správy tipařů', included: false },
        { text: 'Bez browser extension', included: false },
        { text: 'Bez exportu do Excel kalkulaček', included: false },
      ],
      cta: 'Začít zdarma',
      ctaLink: '/register',
    },
    {
      name: 'Profesionál',
      price: '399 Kč',
      period: 'měsíc',
      popular: true,
      features: [
        { text: '250 stránek ke zpracování měsíčně', included: true },
        { text: 'Dokup stránek: 1 Kč / stránka', included: true },
        { text: 'Neomezené případy', included: true },
        { text: 'Neomezené intake odkazy', included: true },
        { text: 'Neomezené leady', included: true },
        { text: 'Až 4 žadatelé na případ', included: true },
        { text: 'Neomezení tipařé', included: true },
        { text: 'Plný kalendář s připomínkami', included: true },
        { text: 'Browser extension', included: true },
        { text: 'Export do Excel kalkulaček bank', included: true },
        { text: 'ARES obohacení dat', included: true },
        { text: 'E-mailová podpora', included: true },
      ],
      cta: 'Vyzkoušet 14 dní zdarma',
      ctaLink: '/register?plan=pro',
    },
    {
      name: 'Tým',
      price: '299 Kč',
      period: 'uživatel / měsíc',
      subtitle: 'minimum 3 uživatelé',
      popular: false,
      features: [
        { text: '200 stránek ke zpracování na uživatele', included: true },
        { text: 'Dokup stránek: 0,80 Kč / stránka', included: true },
        { text: 'Vše z plánu Profesionál', included: true },
        { text: 'E-mailová a telefonní podpora', included: true },
      ],
      cta: 'Kontaktujte nás',
      ctaLink: 'mailto:info@hypomanazer.cz',
    },
  ];

  return (
    <section id="cenik" className="bg-gray-50 scroll-mt-20">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
          Začněte zdarma. Plaťte, až vám to vydělá.
        </h2>
        <p className="text-xl text-center text-gray-600 mb-16">
          Vyberte si plán, který vám vyhovuje
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {plans.map((plan, index) => (
            <Card
              key={index}
              className={`relative ${
                plan.popular
                  ? 'border-2 border-blue-600 shadow-2xl scale-105'
                  : 'border-2 border-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600 text-white px-4 py-1">Nejoblíbenější</Badge>
                </div>
              )}
              <CardHeader className="text-center pb-8 pt-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                {plan.subtitle && <p className="text-sm text-gray-500 mb-4">{plan.subtitle}</p>}
                <div className="mb-4">
                  <span className="text-4xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-600"> / {plan.period}</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      ) : (
                        <X className="w-5 h-5 text-gray-300 flex-shrink-0 mt-0.5" />
                      )}
                      <span
                        className={feature.included ? 'text-gray-700' : 'text-gray-400 line-through'}
                      >
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
                {plan.ctaLink.startsWith('mailto:') ? (
                  <a href={plan.ctaLink} className="block">
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                ) : appUrl ? (
                  <a href={`${appUrl}${plan.ctaLink}`} className="block">
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                ) : (
                  <Link to={plan.ctaLink}>
                    <Button
                      className={`w-full ${
                        plan.popular
                          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                          : 'bg-gray-900 hover:bg-gray-800 text-white'
                      }`}
                    >
                      {plan.cta}
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-3xl mx-auto space-y-4 text-center text-sm text-gray-600">
          <p>
            Všechny placené plány mají 14denní bezplatné zkušební období. Žádná kreditní karta na začátek.
            Potřebujete víc stránek? Dokupte kdykoliv přímo v aplikaci.
          </p>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="font-semibold text-gray-900 mb-2">Co jsou stránky ke zpracování?</p>
            <p>
              Každý nahraný dokument má určitý počet stránek. Občanka = 2 stránky, daňové přiznání = 2–4
              stránky, bankovní výpis = 1–2 stránky za měsíc. AI analyzuje každou stránku a vytáhne z ní
              data.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}