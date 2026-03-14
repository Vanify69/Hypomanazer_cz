import { Upload, Sparkles, Check, Send } from 'lucide-react';

export function HowItWorksSection() {
  const steps = [
    {
      icon: Upload,
      title: 'Nahrajte dokumenty',
      description: 'Nahraje je klient přes portál, nebo vy ručně. Podporujeme OP, daňová přiznání a bankovní výpisy.',
    },
    {
      icon: Sparkles,
      title: 'AI vytáhne data',
      description: 'Automatická detekce typu dokumentu. AI extrahuje jméno, příjmy, výdaje, daňové řádky — vše během sekund.',
    },
    {
      icon: Check,
      title: 'Zkontrolujte a doplňte',
      description: 'Přehledný detail případu se záložkami. Editujte cokoliv, přidejte spolužadatele, obohatte data z ARES.',
    },
    {
      icon: Send,
      title: 'Odešlete do banky',
      description: 'Exportujte do Excelu pro kalkulačky bank, nebo použijte browser extension pro přímé vyplnění formulářů.',
    },
  ];

  return (
    <section className="bg-gray-50">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
          Od dokumentu k bance ve 4 krocích
        </h2>

        <div className="relative">
          {/* Desktop Timeline */}
          <div className="hidden md:block absolute top-24 left-0 right-0 h-1 bg-blue-200">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-400"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                {/* Step Number */}
                <div className="flex flex-col items-center md:items-start mb-6">
                  <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 z-10 relative">
                    <step.icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute top-0 left-8 md:left-8 w-8 h-8 bg-white rounded-full border-4 border-blue-600 flex items-center justify-center font-bold text-blue-600 z-20">
                    {index + 1}
                  </div>
                </div>

                {/* Step Content */}
                <div className="text-center md:text-left">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}