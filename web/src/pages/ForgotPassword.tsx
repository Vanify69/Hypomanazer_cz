import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Mail, ArrowLeft, Check } from 'lucide-react';
import { toast } from 'sonner';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (email) {
      // Mock sending email
      setEmailSent(true);
      toast.success('Odkaz pro obnovení hesla byl odeslán');
    } else {
      toast.error('Zadejte prosím e-mail');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            HM
          </div>
          <span className="text-2xl font-bold text-gray-900">HypoManažer</span>
        </Link>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center pb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Obnovení hesla</h1>
            <p className="text-gray-600">
              Zadejte svůj e-mail a my vám pošleme odkaz pro nastavení nového hesla.
            </p>
          </CardHeader>
          <CardContent>
            {!emailSent ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="vas@email.cz"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Odeslat odkaz pro obnovení
                </Button>

                <div className="text-center">
                  <Link
                    to="/login"
                    className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center gap-2"
                  >
                    <ArrowLeft size={16} />
                    Zpět na přihlášení
                  </Link>
                </div>
              </form>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-blue-600" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Check className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">E-mail odeslán</h3>
                </div>
                <p className="text-gray-600 mb-6">
                  Odkaz pro obnovení hesla jsme odeslali na adresu{' '}
                  <strong>{email}</strong>. Zkontrolujte i složku spam.
                </p>
                <Link to="/login">
                  <Button variant="outline" className="w-full">
                    Zpět na přihlášení
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {!emailSent && (
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Nemáte účet?{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                Zaregistrujte se zdarma
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}