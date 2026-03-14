import { Clock, FolderOpen, Smartphone } from 'lucide-react';
import { Card, CardContent } from '../ui/card';

export function ProblemSolutionSection() {
  const items = [
    {
      icon: Clock,
      problem: 'Ruční přepisování dat z OP, daňových přiznání a výpisů',
      solution: 'AI/OCR extrakce — nahrajte dokument, data jsou vytažena automaticky',
    },
    {
      icon: FolderOpen,
      problem: 'Chaotická správa dokumentů a případů v Excelu',
      solution: 'Přehledný dashboard s případy, statusy a pipeline',
    },
    {
      icon: Smartphone,
      problem: 'Honění klientů kvůli chybějícím dokumentům',
      solution: 'Klientský portál — pošlete link, klient nahraje vše sám',
    },
  ];

  return (
    <section className="bg-gray-50">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
          Kolik hodin týdně trávíte přepisováním dat?
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <Card key={index} className="border-2 hover:border-blue-600 transition-all">
              <CardContent className="p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                  <item.icon className="w-8 h-8 text-blue-600" />
                </div>
                <div className="mb-4">
                  <p className="text-sm font-semibold text-red-600 mb-2">Problém:</p>
                  <p className="text-gray-700">{item.problem}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-600 mb-2">Řešení:</p>
                  <p className="text-gray-900 font-medium">{item.solution}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}