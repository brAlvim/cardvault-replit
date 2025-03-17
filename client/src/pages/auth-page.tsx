import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Key, Lock, Store, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(3, { message: "Nome de usuário deve ter pelo menos 3 caracteres" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
});

const registerSchema = z.object({
  username: z.string().min(3, { message: "Nome de usuário deve ter pelo menos 3 caracteres" }),
  nome: z.string().min(2, { message: "Nome completo deve ter pelo menos 2 caracteres" }),
  email: z.string().email({ message: "Email inválido" }),
  password: z.string().min(6, { message: "Senha deve ter pelo menos 6 caracteres" }),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "As senhas não conferem",
});

type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<string>("login");
  const [, navigate] = useLocation();
  const { user, isAuthenticated, login } = useAuth();
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (user && isAuthenticated) {
      navigate("/");
    }
  }, [user, isAuthenticated, navigate]);

  // Login form
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      nome: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onLoginSubmit = async (data: LoginFormValues) => {
    await login(data);
  };

  const onRegisterSubmit = async (data: RegisterFormValues) => {
    // Aqui enviaria os dados para a API, mas por enquanto apenas exibe um toast
    toast({
      title: "Registro não disponível",
      description: "Por enquanto, use o usuário demo para acessar o sistema.",
      variant: "default",
    });
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
      {/* Left column - Auth forms */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              CardVault
            </h1>
            <h2 className="mt-2 text-sm text-gray-600">
              Gerencie seus gift cards de forma inteligente
            </h2>
          </div>

          <Card className="shadow-lg">
            <CardHeader>
              <Tabs
                defaultValue={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Login</TabsTrigger>
                  <TabsTrigger value="register">Cadastro</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-4">
                  <CardTitle>Entrar na sua conta</CardTitle>
                  <CardDescription>
                    Acesse o sistema com seu usuário e senha
                  </CardDescription>
                </TabsContent>

                <TabsContent value="register" className="mt-4">
                  <CardTitle>Criar nova conta</CardTitle>
                  <CardDescription>
                    Cadastre-se para gerenciar seus gift cards
                  </CardDescription>
                </TabsContent>
              </Tabs>
            </CardHeader>

            <CardContent>
              {activeTab === "login" ? (
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuário</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-400">
                                <User size={16} />
                              </span>
                              <Input
                                className="pl-9"
                                type="text"
                                placeholder="Seu nome de usuário"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-400">
                                <Lock size={16} />
                              </span>
                              <Input
                                className="pl-9"
                                type="password"
                                placeholder="Sua senha"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full">
                      Entrar
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...registerForm}>
                  <form
                    onSubmit={registerForm.handleSubmit(onRegisterSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usuário</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-400">
                                <User size={16} />
                              </span>
                              <Input
                                className="pl-9"
                                type="text"
                                placeholder="Escolha um nome de usuário"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="nome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Seu nome completo"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="seu.email@exemplo.com"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-400">
                                <Lock size={16} />
                              </span>
                              <Input
                                className="pl-9"
                                type="password"
                                placeholder="Escolha uma senha"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirmar Senha</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-400">
                                <Key size={16} />
                              </span>
                              <Input
                                className="pl-9"
                                type="password"
                                placeholder="Confirme sua senha"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit" className="w-full">
                      Cadastrar
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>

            <CardFooter className="flex justify-center text-sm text-gray-600">
              {activeTab === "login" ? (
                <p>
                  Ainda não tem uma conta?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-blue-600"
                    onClick={() => setActiveTab("register")}
                  >
                    Cadastre-se
                  </Button>
                </p>
              ) : (
                <p>
                  Já tem uma conta?{" "}
                  <Button
                    variant="link"
                    className="p-0 h-auto text-blue-600"
                    onClick={() => setActiveTab("login")}
                  >
                    Faça login
                  </Button>
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Right column - Hero section */}
      <div className="hidden lg:flex flex-1 relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-800 flex flex-col justify-center items-center p-12 text-white">
          <div className="max-w-lg space-y-8">
            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tighter">
                Gerencie seus gift cards de forma inteligente
              </h2>
              <p className="text-blue-100 text-lg">
                CardVault permite que você organize seus gift cards, 
                acompanhe saldos, e receba alertas de vencimento. 
                Nunca mais perca um centavo!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">Monitore Saldos</h3>
                  <p className="text-blue-200 text-sm">
                    Acompanhe o saldo disponível em todos os seus gift cards
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="bg-white/10 p-2 rounded-lg">
                  <Store className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-medium">Múltiplos Fornecedores</h3>
                  <p className="text-blue-200 text-sm">
                    Organize gift cards de diferentes lojas e serviços
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}