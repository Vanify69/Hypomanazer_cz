import { FileText, LayoutDashboard, Link2, Users, Calendar, Chrome } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export function FeaturesSection() {
  const features = [
    {
      icon: FileText,
      title: 'AI Extrakce dokumentů',
      description:
        'Nahrajte občanku, daňové přiznání nebo bankovní výpisy. AI rozpozná typ dokumentu a vytáhne všechna data — jméno, rodné číslo, adresu, příjmy, výdaje, daňové řádky 2–7 včetně Přílohy 1.',
      image: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop',
    },
    {
      icon: LayoutDashboard,
      title: 'Správa případů a pipeline',
      description:
        'Sledujte každý případ od prvního kontaktu po podpis smlouvy. Statusy: Nový, Data vytažena, Odesláno do banky, Schváleno, Podepsáno, Uzavřeno.',
      image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&h=400&fit=crop',
    },
    {
      icon: Link2,
      title: 'Klientský portál',
      description:
        'Vygenerujte unikátní odkaz a pošlete ho klientovi přes SMS nebo e-mail. Klient nahraje OP, daňové přiznání i výpisy z mobilu. Vy vidíte progress v reálném čase.',
      image: 'https://images.unsplash.com/photo-1556742400-b5a32c13b8ee?w=600&h=400&fit=crop',
    },
    {
      icon: Users,
      title: 'Správa leadů a tipařů',
      description:
        'Evidujte leady podle zdroje — vlastní, tipař, marketplace. Spravujte tipaře — realitky, pojišťovny, developery. Každý tipař má vlastní odkaz pro zadávání leadů.',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=600&h=400&fit=crop',
    },
    {
      icon: Calendar,
      title: 'Kalendář a připomínky',
      description:
        'Plánujte schůzky, úkoly, hovory a připomínky. Propojte události s případy nebo leady. Měsíční, týdenní i denní pohled.',
      image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=600&h=400&fit=crop',
    },
    {
      icon: Chrome,
      title: 'Rozšíření do prohlížeče',
      description:
        'Vyplňte žádost v bance jedním kliknutím. Chrome rozšíření načte data z aktivního případu a automaticky vyplní formuláře bank.',
      image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop',
    },
  ];

  return (
    <section id="funkce" className="bg-white scroll-mt-20">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-4">
          Všechno, co hypoteční poradce potřebuje.
        </h2>
        <p className="text-xl text-center text-gray-600 mb-16">Na jednom místě.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-xl transition-shadow">
              <div className="h-48 overflow-hidden bg-gray-100">
                <ImageWithFallback
                  src={feature.image}
                  alt={feature.title}
                  className="w-full h-full object-cover"
                />
              </div>
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}