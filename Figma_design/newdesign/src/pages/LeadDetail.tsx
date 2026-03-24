import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArrowLeft, Save, Trash2, Phone, Mail, FileCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Lead, LeadStatus } from '../lib/types';
import { toast } from 'sonner@2.0.3';

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<Lead | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadedLeads = localStorage.getItem('leads');
    if (loadedLeads) {
      const leads: Lead[] = JSON.parse(loadedLeads);
      const foundLead = leads.find(l => l.id === id);
      if (foundLead) {
        setLead(foundLead);
      } else {
        toast.error('Lead nebyl nalezen');
        navigate('/leads');
      }
    } else {
      navigate('/leads');
    }
  }, [id, navigate]);

  const handleSave = () => {
    if (!lead) return;

    const loadedLeads = localStorage.getItem('leads');
    if (loadedLeads) {
      const leads: Lead[] = JSON.parse(loadedLeads);
      const index = leads.findIndex(l => l.id === id);
      if (index !== -1) {
        leads[index] = lead;
        localStorage.setItem('leads', JSON.stringify(leads));
        toast.success('Lead byl úspěšně aktualizován');
        setIsEditing(false);
      }
    }
  };

  const handleDelete = () => {
    if (!confirm('Opravdu chcete smazat tento lead?')) return;

    const loadedLeads = localStorage.getItem('leads');
    if (loadedLeads) {
      const leads: Lead[] = JSON.parse(loadedLeads);
      const filtered = leads.filter(l => l.id !== id);
      localStorage.setItem('leads', JSON.stringify(filtered));
      toast.success('Lead byl smazán');
      navigate('/leads');
    }
  };

  const handleConvertToCase = () => {
    if (!lead) return;
    // Přesměrování na nový případ s předvyplněnými daty
    navigate('/new-case', { state: { fromLead: lead } });
  };

  const getStatusBadge = (status: LeadStatus) => {
    const variants: Record<LeadStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      DRAFT: { label: 'Koncept', variant: 'outline' },
      SENT: { label: 'Odesláno', variant: 'secondary' },
      OPENED: { label: 'Otevřeno', variant: 'default' },
      IN_PROGRESS: { label: 'Zpracovává se', variant: 'default' },
      SUBMITTED: { label: 'Podklady odevzdány', variant: 'default' },
      CONVERTED: { label: 'Převedeno', variant: 'default' },
    };
    return variants[status];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('cs-CZ', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <p>Načítání...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
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
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">
                  {lead.jmeno} {lead.prijmeni}
                </h1>
                <Badge variant={getStatusBadge(lead.status).variant}>
                  {getStatusBadge(lead.status).label}
                </Badge>
              </div>
              <p className="text-gray-600">Detail leadu</p>
            </div>
            <div className="flex gap-2">
              {lead.status === 'SUBMITTED' && !lead.naviazanyPripad && (
                <Button onClick={handleConvertToCase}>
                  <FileCheck className="h-4 w-4 mr-2" />
                  Převést na případ
                </Button>
              )}
              {!isEditing ? (
                <Button onClick={() => setIsEditing(true)} variant="outline">
                  Upravit
                </Button>
              ) : (
                <>
                  <Button onClick={() => setIsEditing(false)} variant="outline">
                    Zrušit
                  </Button>
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    Uložit
                  </Button>
                </>
              )}
              <Button onClick={handleDelete} variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Smazat
              </Button>
            </div>
          </div>
        </div>

        {/* Kontaktní informace */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Kontaktní informace</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="jmeno">Jméno</Label>
                {isEditing ? (
                  <Input
                    id="jmeno"
                    value={lead.jmeno}
                    onChange={(e) => setLead({ ...lead, jmeno: e.target.value })}
                  />
                ) : (
                  <p className="mt-2">{lead.jmeno}</p>
                )}
              </div>
              <div>
                <Label htmlFor="prijmeni">Příjmení</Label>
                {isEditing ? (
                  <Input
                    id="prijmeni"
                    value={lead.prijmeni}
                    onChange={(e) => setLead({ ...lead, prijmeni: e.target.value })}
                  />
                ) : (
                  <p className="mt-2">{lead.prijmeni}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telefon">Telefon</Label>
                {isEditing ? (
                  <Input
                    id="telefon"
                    value={lead.telefon}
                    onChange={(e) => setLead({ ...lead, telefon: e.target.value })}
                  />
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <p>{lead.telefon}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `tel:${lead.telefon}`}
                    >
                      <Phone className="h-3 w-3 mr-1" />
                      Zavolat
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    value={lead.email}
                    onChange={(e) => setLead({ ...lead, email: e.target.value })}
                  />
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <p>{lead.email}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.location.href = `mailto:${lead.email}`}
                    >
                      <Mail className="h-3 w-3 mr-1" />
                      Napsat
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Informace o leadu */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Informace o leadu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="zdroj">Zdroj</Label>
                {isEditing ? (
                  <Select
                    value={lead.zdroj}
                    onValueChange={(value) => setLead({ ...lead, zdroj: value })}
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
                ) : (
                  <p className="mt-2">{lead.zdroj}</p>
                )}
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                {isEditing ? (
                  <Select
                    value={lead.status}
                    onValueChange={(value) => setLead({ ...lead, status: value as LeadStatus })}
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
                      <SelectItem value="CONVERTED">Převedeno</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="mt-2">
                    <Badge variant={getStatusBadge(lead.status).variant}>
                      {getStatusBadge(lead.status).label}
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Vytvořeno</Label>
                <p className="mt-2">{formatDate(lead.datumVytvoreni)}</p>
              </div>
              {lead.datumOdevzdaniPodkladu && (
                <div>
                  <Label>Podklady odevzdány</Label>
                  <p className="mt-2 text-green-600 font-medium">
                    {formatDate(lead.datumOdevzdaniPodkladu)}
                  </p>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="poznamka">Poznámka</Label>
              {isEditing ? (
                <Textarea
                  id="poznamka"
                  value={lead.poznamka || ''}
                  onChange={(e) => setLead({ ...lead, poznamka: e.target.value })}
                  rows={4}
                />
              ) : (
                <p className="mt-2">{lead.poznamka || 'Žádná poznámka'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {lead.naviazanyPripad && (
          <Card>
            <CardHeader>
              <CardTitle>Navázaný případ</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2">Tento lead byl převeden na případ.</p>
              <Button onClick={() => navigate(`/case/${lead.naviazanyPripad}`)}>
                Zobrazit případ
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
