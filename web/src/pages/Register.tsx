import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Eye, EyeOff, Lock, Shield, Clock, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { register, redirectToApp } from '../lib/api';

export function Register() {
  const [searchParams] = useSearchParams();
  const plan = searchParams.get('plan');

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    agreeToTerms: false,
  });

  const getPasswordStrength = (password: string) => {
    if (password.length === 0) return { strength: 0, label: '', color: '' };
    if (password.length < 6) return { strength: 1, label: 'Slabé', color: 'bg-red-500' };
    if (password.length < 10) return { strength: 2, label: 'Střední', color: 'bg-yellow-500' };
    return { strength: 3, label: 'Silné', color: 'bg-green-500' };
  };

  const passwordStrength = getPasswordStrength(formData.password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.agreeToTerms) {
      toast.error('Musíte souhlasit s obchodními podmínkami');
      return;
    }

    if (formData.password !== formData.passwordConfirm) {
      toast.error('Hesla se neshodují');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Heslo musí mít alespoň 6 znaků');
      return;
    }

    setLoading(true);
    try {
      const data = await register(
        formData.email.trim(),
        formData.password,
        formData.name.trim() || undefined,
      );
      toast.success('Účet byl úspěšně vytvořen!');
      redirectToApp(data.token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Registrace se nezdařila');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            HM
          </div>
          <span className="text-2xl font-bold text-gray-900">HypoManažer</span>
        </Link>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center pb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Vytvořte si účet zdarma
            </h1>
            <p className="text-gray-600">30 sekund a můžete začít. Žádná kreditní karta.</p>
            {plan === 'pro' && (
              <div className="mt-4 inline-block bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold">
                Plán Profesionál — 14 dní zdarma
              </div>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="name">Jméno a příjmení</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Jan Novák"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="jan@email.cz"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={loading}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Telefon (volitelné)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+420 777 888 999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Heslo</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {formData.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded ${
                            i <= passwordStrength.strength
                              ? passwordStrength.color
                              : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-600">{passwordStrength.label}</p>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="passwordConfirm">Heslo znovu</Label>
                <div className="relative">
                  <Input
                    id="passwordConfirm"
                    type={showPasswordConfirm ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={formData.passwordConfirm}
                    onChange={(e) => setFormData({ ...formData, passwordConfirm: e.target.value })}
                    disabled={loading}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswordConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={formData.agreeToTerms}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, agreeToTerms: checked as boolean })
                  }
                />
                <label htmlFor="terms" className="text-sm text-gray-700 cursor-pointer">
                  Souhlasím s{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    obchodními podmínkami
                  </a>{' '}
                  a{' '}
                  <a href="#" className="text-blue-600 hover:underline">
                    zpracováním osobních údajů
                  </a>
                </label>
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Vytváření účtu…
                  </>
                ) : (
                  'Vytvořit účet zdarma'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Již máte účet?{' '}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Přihlaste se
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="bg-white rounded-lg p-4 text-center">
            <Lock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-gray-700">Šifrované připojení</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <Shield className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-gray-700">GDPR v souladu s EU</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <Clock className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-gray-700">Založení za 30 sekund</p>
          </div>
          <div className="bg-white rounded-lg p-4 text-center">
            <Check className="w-6 h-6 text-blue-600 mx-auto mb-2" />
            <p className="text-gray-700">Starter zdarma navždy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
