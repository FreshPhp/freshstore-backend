import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);

  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phone: '',
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(loginData);
      toast.success('Login realizado com sucesso!');
      navigate('/products');
    } catch (error) {
      toast.error('Credenciais inválidas');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await register(registerData);
      toast.success('Conta criada com sucesso!');
      navigate('/products');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative"
      data-testid="auth-page"
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage:
            'url(https://images.unsplash.com/photo-1761344175797-047f049c9b32?crop=entropy&cs=srgb&fm=jpg&q=85)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/80" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-md w-full"
      >
        <div className="glass p-8 rounded-3xl border border-white/10 neon-glow">
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center justify-center space-x-2 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center neon-glow">
                <span className="text-white font-bold text-2xl">S</span>
              </div>
            </Link>
            <h2 className="text-3xl font-heading font-bold text-white">Bem-vindo</h2>
            <p className="text-white/60 mt-2">Entre ou crie sua conta</p>
          </div>

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-white/5">
              <TabsTrigger value="login" data-testid="login-tab">
                Login
              </TabsTrigger>
              <TabsTrigger value="register" data-testid="register-tab">
                Cadastro
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-white mb-2">
                    Email
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="bg-black/50 border-white/10 text-white h-12"
                    required
                    data-testid="login-email-input"
                  />
                </div>

                <div>
                  <Label htmlFor="login-password" className="text-white mb-2">
                    Senha
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="bg-black/50 border-white/10 text-white h-12"
                    required
                    data-testid="login-password-input"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 text-lg font-bold neon-glow transition-all duration-300 mt-6"
                  data-testid="login-submit-button"
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName" className="text-white mb-2">
                      Nome
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="João"
                      value={registerData.firstName}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, firstName: e.target.value })
                      }
                      className="bg-black/50 border-white/10 text-white h-12"
                      required
                      data-testid="register-firstname-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-white mb-2">
                      Sobrenome
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Silva"
                      value={registerData.lastName}
                      onChange={(e) =>
                        setRegisterData({ ...registerData, lastName: e.target.value })
                      }
                      className="bg-black/50 border-white/10 text-white h-12"
                      required
                      data-testid="register-lastname-input"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-email" className="text-white mb-2">
                    Email
                  </Label>
                  <Input
                    id="register-email"
                    type="email"
                    placeholder="seu@email.com"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="bg-black/50 border-white/10 text-white h-12"
                    required
                    data-testid="register-email-input"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white mb-2">
                    Telefone (opcional)
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={registerData.phone}
                    onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                    className="bg-black/50 border-white/10 text-white h-12"
                    data-testid="register-phone-input"
                  />
                </div>

                <div>
                  <Label htmlFor="register-password" className="text-white mb-2">
                    Senha
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="••••••••"
                    value={registerData.password}
                    onChange={(e) =>
                      setRegisterData({ ...registerData, password: e.target.value })
                    }
                    className="bg-black/50 border-white/10 text-white h-12"
                    required
                    data-testid="register-password-input"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-full py-6 text-lg font-bold neon-glow transition-all duration-300 mt-6"
                  data-testid="register-submit-button"
                >
                  {loading ? 'Criando conta...' : 'Criar Conta'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </motion.div>
    </div>
  );
}