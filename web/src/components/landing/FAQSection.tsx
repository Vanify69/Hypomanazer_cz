import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

export function FAQSection() {
  const faqs = [
    {
      question: 'Jaké dokumenty HypoManažer podporuje?',
      answer:
        'Občanské průkazy (přední i zadní strana), daňová přiznání fyzických osob, bankovní výpisy (až 6 měsíců).',
    },
    {
      question: 'Jak přesná je AI extrakce?',
      answer:
        'Systém kombinuje OCR a AI validaci. Přesnost nad 95 % u standardních dokumentů. Vše si můžete ručně upravit.',
    },
    {
      question: 'Mohu to zkusit zdarma?',
      answer:
        'Ano. Plán Starter je zdarma navždy s 30 stránkami ke zpracování měsíčně. Placené plány mají 14denní trial bez kreditní karty.',
    },
    {
      question: 'Co jsou stránky ke zpracování?',
      answer:
        'Každý nahraný dokument má určitý počet stránek. Občanka = 2 stránky, daňové přiznání = 2–4 stránky, bankovní výpis = 1–2 stránky. Při zpracování AI analyzuje každou stránku a vytáhne z ní data.',
    },
    {
      question: 'Co se stane, když mi dojdou stránky?',
      answer:
        'Stávající případy a data zůstanou přístupné. Nové dokumenty nebudou zpracovány, dokud nedokoupíte stránky nebo nový měsíc neobnoví váš limit. Dokup je okamžitý.',
    },
    {
      question: 'Funguje to na mobilním telefonu?',
      answer:
        'Ano. Aplikace je plně responzivní. Klientský portál je optimalizovaný primárně pro mobil.',
    },
    {
      question: 'Jaké banky podporuje browser extension?',
      answer: 'Aktuálně KB a ČSOB, další banky přidáváme průběžně.',
    },
    {
      question: 'Jsou data v bezpečí?',
      answer:
        'Ano. Komunikace je šifrovaná, data jsou uložena na zabezpečených serverech v EU. Klienti odsouhlasují GDPR souhlas.',
    },
  ];

  return (
    <section id="faq" className="bg-gray-50 scroll-mt-20">
      <div className="max-w-[1200px] mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-16">
          Často kladené otázky
        </h2>

        <div className="max-w-3xl mx-auto">
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white rounded-lg border-2 border-gray-200 px-6"
              >
                <AccordionTrigger className="text-left hover:no-underline">
                  <span className="font-semibold text-gray-900">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-gray-600">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
