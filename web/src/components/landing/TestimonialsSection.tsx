import { Card, CardContent } from '../ui/card';
import { Star } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

export function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Petr Novák',
      company: 'HypoMax s.r.o.',
      image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=faces',
      quote: 'Dříve jsem přepisoval data z daňáku hodinu. Teď to mám za 30 sekund.',
    },
    {
      name: 'Jana Svobodová',
      company: 'Finance Pro',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=faces',
      quote: 'Intake portál mi ušetřil desítky telefonátů s klienty o chybějící dokumenty.',
    },
    {
      name: 'Martin Dvořák',
      company: 'Hypoteční Centrum Praha',
      image: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces',
      quote: 'Browser extension pro vyplňování formulářů bank je game changer.',
    },
  ];

  const stats = [
    { value: '500+', label: 'zpracovaných případů' },
    { value: '10 000+', label: 'extrahovaných dokumentů' },
    { value: '85%', label: 'úspora času na administrativě' },
  ];

  return (
    <section className="bg-white">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
          Co říkají hypoteční poradci
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="border-2 hover:border-blue-600 transition-all">
              <CardContent className="p-8">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">"{testimonial.quote}"</p>
                <div className="flex items-center gap-3">
                  <ImageWithFallback
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.company}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center text-white">
            {stats.map((stat, index) => (
              <div key={index}>
                <p className="text-4xl md:text-5xl font-bold mb-2">{stat.value}</p>
                <p className="text-blue-100">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}