import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

const loginSchema = z.object({
  email: z.string().email({ message: "Por favor, informe um email válido" }),
  password: z.string().min(1, { message: "Por favor, informe sua senha" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    try {
      // Usar a função apiRequest atualizada
      const response = await apiRequest('POST', '/api/auth/login', {
        email: data.email,
        password: data.password,
      });

      // Verificar se a resposta deu certo
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Credenciais inválidas";
        
        try {
          // Tentar converter para JSON se possível
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          // Se não for JSON, usar texto completo
          console.error("Resposta de erro não é JSON:", errorText);
        }
        
        throw new Error(errorMessage);
      }

      // Se chegou aqui, a resposta é ok
      const userData = await response.json();
      
      // Armazenar dados do usuário e token no localStorage
      localStorage.setItem("user", JSON.stringify(userData.user));
      localStorage.setItem("token", userData.token);
      localStorage.setItem("empresaId", userData.user.empresaId.toString());
      
      // Limpar e recarregar o cliente de consulta para refletir o novo estado de autenticação
      queryClient.clear();
      
      toast({
        title: "Login realizado com sucesso",
        description: `Bem-vindo(a) ${userData.user.nome || userData.user.email.split('@')[0]}!`,
      });
      
      // Redirecionar para o dashboard
      setLocation("/dashboard");
    } catch (error: any) {
      console.error("Erro durante login:", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message || "Verifique suas credenciais e tente novamente",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src="/logo.svg" alt="CardVault Logo" className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold">CardVault</CardTitle>
          <CardDescription>
            Faça login para acessar sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="Digite seu email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Digite sua senha" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Aguarde..." : "Entrar"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col gap-2 text-sm text-gray-500">
          <p>
            Não tem acesso? Entre em contato com o administrador da sua empresa.
          </p>
          <div className="text-xs p-2 bg-slate-100 rounded-md">
            <p className="font-semibold text-center mb-1">Credenciais de Teste</p>
            <p>Email: <span className="font-mono">demo@example.com</span></p>
            <p>Senha: <span className="font-mono">password123</span></p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}