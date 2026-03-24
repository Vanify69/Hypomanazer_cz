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
import { LeadStatus } from '../lib/types';
import { toast } from 'sonner@2.0.3';

export function NewLead() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    jmeno: '',
    prijmeni: '',
    telefon: '',
    email: '',
    status: 'DRAFT' as LeadStatus,
    zdroj: 'Web',
    poznamka: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.jmeno || !formData.prijmeni || !formData.telefon || !formData.email) {
      toast.error('Vyplňte všechna povinná pole');
      return;
    }

    // Načtení existujících leadů
    const existingLeads = localStorage.getItem('leads');
    const leads = existingLeads ? JSON.parse(existingLeads) : [];

    // Vytvoření nového leadu
    const newLead = {
      id: `lead-${Date.now()}`,
      ...formData,
      datumVytvoreni: new Date().toISOString(),
    };

    // Uložení
    leads.push(newLead);
    localStorage.setItem('leads', JSON.stringify(leads));

    toast.success('Lead byl úspěšně vytvořen');
    navigate('/leads');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/leads')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zpět na leady
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nový lead</h1>
          <p className="text-gray-600">Vytvořte nového potenciálního klienta</p>
        </div>

        {/* Formulář */}
        <form onSubmit={handleSubmit}>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Základní informace</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="jmeno">Jméno *</Label>
                  <Input
                    id="jmeno"
                    value={formData.jmeno}
                    onChange={(e) => setFormData({ ...formData, jmeno: e.target.value })}
                    placeholder="Jan"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="prijmeni">Příjmení *</Label>
                  <Input
                    id="prijmeni"
                    value={formData.prijmeni}
                    onChange={(e) => setFormData({ ...formData, prijmeni: e.target.value })}
                    placeholder="Novák"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="telefon">Telefon *</Label>
                  <Input
                    id="telefon"
                    type="tel"
                    value={formData.telefon}
                    onChange={(e) => setFormData({ ...formData, telefon: e.target.value })}
                    placeholder="+420 777 123 456"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="jan.novak@email.cz"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="zdroj">Zdroj</Label>
                  <Select
                    value={formData.zdroj}
                    onValueChange={(value) => setFormData({ ...formData, zdroj: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Web">Web</SelectItem>
                      <SelectItem value="Doporučení">Doporučení</SelectItem>
                      <SelectItem value="Reklama - Facebook">Reklama - Facebook</SelectItem>
                      <SelectItem value="Reklama - Google">Reklama - Google</SelectItem>
                      <SelectItem value="Telefonát">Telefonát</SelectItem>
                      <SelectItem value="Email">Email</SelectItem>
                      <SelectItem value="Osobní kontakt">Osobní kontakt</SelectItem>
                      <SelectItem value="Jiný">Jiný</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value) => setFormData({ ...formData, status: value as LeadStatus })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Koncept</SelectItem>
                      <SelectItem value="SENT">Odesláno</SelectItem>
                      <SelectItem value="OPENED">Otevřeno</SelectItem>
                      <SelectItem value="IN_PROGRESS">Zpracovává se</SelectItem>
                      <SelectItem value="SUBMITTED">Podklady odevzdány</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="poznamka">Poznámka</Label>
                <Textarea
                  id="poznamka"
                  value={formData.poznamka}
                  onChange={(e) => setFormData({ ...formData, poznamka: e.target.value })}
                  placeholder="Zájem o hypotéku na byt 3+1..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Akční tlačítka */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/leads')}
            >
              Zrušit
            </Button>
            <Button type="submit">
              <Save className="h-4 w-4 mr-2" />
              Vytvořit lead
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
