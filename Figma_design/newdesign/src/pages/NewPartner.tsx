import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { PartnerType } from '../lib/types';
import { toast } from 'sonner@2.0.3';

export function NewPartner() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nazev: '',
    typ: 'REALITKA' as PartnerType,
    regCislo: '',
    telefon: '',
    email: '',
    osoba: '',
    poznamka: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.nazev) {
      toast.error('Vyplňte název');
      return;
    }

    // Načtení existujících tipařů
    const existingPartners = localStorage.getItem('partners');
    const partners = existingPartners ? JSON.parse(existingPartners) : [];

    // Vytvoření nového tipaře
    const newPartner = {
      id: `partner-${Date.now()}`,
      nazev: formData.nazev,
      typ: formData.typ,
      regCislo: formData.regCislo || undefined,
      kontakt: {
        telefon: formData.telefon || undefined,
        email: formData.email || undefined,
        osoba: formData.osoba || undefined,
      },
      pocetLeadu: 0,
      datumVytvoreni: new Date().toISOString(),
      poznamka: formData.poznamka || undefined,
    };

    // Uložení
    partners.push(newPartner);
    localStorage.setItem('partners', JSON.stringify(partners));

    toast.success('Tipař byl úspěšně vytvořen');
    navigate('/partners');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/partners')}
            className="mb-4 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na tipaře
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Nový tipař</h1>
          <p className="text-gray-600 dark:text-gray-400">Přidejte nového partnera, který vám přivádí leady</p>
        </div>

        {/* Formulář */}
        <form onSubmit={handleSubmit}>
          <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Základní informace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="nazev" className="dark:text-gray-300">Název / Jméno *</Label>
                <Input
                  id="nazev"
                  value={formData.nazev}
                  onChange={(e) => setFormData({ ...formData, nazev: e.target.value })}
                  placeholder="RE/MAX Prague nebo Jan Novák"
                  required
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="typ" className="dark:text-gray-300">Typ *</Label>
                  <Select
                    value={formData.typ}
                    onValueChange={(value) => setFormData({ ...formData, typ: value as PartnerType })}
                  >
                    <SelectTrigger className="dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                      <SelectItem value="REALITKA">Realitní kancelář</SelectItem>
                      <SelectItem value="DEVELOPER">Developer</SelectItem>
                      <SelectItem value="POJISTOVAK">Pojišťovací agent</SelectItem>
                      <SelectItem value="FINANCNI_PORADCE">Finanční poradce</SelectItem>
                      <SelectItem value="JINÝ">Jiný</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="regCislo" className="dark:text-gray-300">IČ / Reg. číslo</Label>
                  <Input
                    id="regCislo"
                    value={formData.regCislo}
                    onChange={(e) => setFormData({ ...formData, regCislo: e.target.value })}
                    placeholder="12345678"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Kontaktní informace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="osoba" className="dark:text-gray-300">Kontaktní osoba</Label>
                <Input
                  id="osoba"
                  value={formData.osoba}
                  onChange={(e) => setFormData({ ...formData, osoba: e.target.value })}
                  placeholder="Jana Nováková"
                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefon" className="dark:text-gray-300">Telefon</Label>
                  <Input
                    id="telefon"
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    placeholder="+420 777 123 456"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div>
                  <Label htmlFor="email" className="dark:text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="info@example.cz"
                    className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6 dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="dark:text-white">Poznámka</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                id="poznamka"
                value={formData.poznamka}
                onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
                placeholder="Doplňující informace o partnerovi..."
                rows={4}
                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </CardContent>
          </Card>

          {/* Akční tlačítka */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/partners')}
              className="flex-1 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Zrušit
            </Button>
            <Button type="submit" className="flex-1 dark:bg-blue-600 dark:hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Uložit tipaře
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
