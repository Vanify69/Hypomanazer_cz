import { useState } from 'react';
import { Link } from 'react-router';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardHeader } from '../components/ui/card';
import { Eye, EyeOff, Lock, Shield, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { login, redirectToApp } from '../lib/api';

export function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error('Vyplňte prosím všechna pole');
      return;
    }

    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      toast.success('Přihlášení úspěšné!');
      redirectToApp(data.token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Přihlášení se nezdařilo');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            HM
          </div>
          <span className="text-2xl font-bold text-gray-900">HypoManažer</span>
        </Link>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center pb-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Přihlaste se do HypoManažera</h1>
            <p className="text-gray-600">Vítejte zpět!</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="vas@email.cz"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="password">Heslo</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    Zapomněli jste heslo?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                />
                <label htmlFor="remember" className="text-sm text-gray-700 cursor-pointer">
                  Zapamatovat si mě
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
                    Přihlašování…
                  </>
                ) : (
                  'Přihlásit se'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Nemáte účet?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                  Zaregistrujte se zdarma
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-center gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Lock size={16} />
            <span>Šifrované připojení</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield size={16} />
            <span>GDPR v souladu s EU</span>
          </div>
        </div>
      </div>
    </div>
  );
}
