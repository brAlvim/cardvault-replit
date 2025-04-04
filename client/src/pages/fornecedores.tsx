import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Fornecedor, InsertFornecedor } from "@shared/schema";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Store, Plus, Pencil, Trash2, FileWarning, Power, PowerOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Esquema de validação para o formulário de fornecedor
const fornecedorFormSchema = z.object({
  nome: z.string().min(2, { message: "Nome deve ter pelo menos 2 caracteres" }),
  descricao: z.string().optional(),
  website: z.string()
    .transform(val => {
      // Se o valor estiver vazio, retorna vazio
      if (!val) return "";
      // Se a URL já começa com http:// ou https://, retorna o valor original
      if (val.startsWith('http://') || val.startsWith('https://')) return val;
      // Caso contrário, adiciona https:// na frente
      return `https://${val}`;
    })
    .optional()
    .or(z.literal("")),
  logo: z.string().optional().or(z.literal("")),
  userId: z.number(),
});

type FornecedorFormValues = z.infer<typeof fornecedorFormSchema>;

export default function FornecedoresPage() {
  const { toast } = useToast();
  const { user } = useAuth(); // Usar o hook de autenticação para obter o usuário atual
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Fornecedor | null>(null);
  const [giftCardCounts, setGiftCardCounts] = useState<Record<number, number>>({});

  // Fornecedores query
  const {
    data: fornecedores = [],
    isLoading: isLoadingFornecedores,
    error: fornecedoresError,
  } = useQuery<Fornecedor[]>({
    queryKey: [`/api/fornecedores`],
    // Não passamos o userId na queryKey porque o endpoint já usa o userId do usuário autenticado
    enabled: !!user,
  });

  // Buscar gift cards para contar quantos existem por fornecedor
  const { data: giftCards = [] } = useQuery<any[]>({
    queryKey: [`/api/gift-cards?userId=${user?.id}`],
    enabled: !!user,
  });

  // Contar número de gift cards por fornecedor
  useEffect(() => {
    if (giftCards && giftCards.length > 0) {
      const counts: Record<number, number> = {};
      giftCards.forEach((card: any) => {
        counts[card.fornecedorId] = (counts[card.fornecedorId] || 0) + 1;
      });
      setGiftCardCounts(counts);
    }
  }, [giftCards]);

  // Formulário de criar/editar fornecedor
  const form = useForm<FornecedorFormValues>({
    resolver: zodResolver(fornecedorFormSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      website: "",
      logo: "",
      userId: user?.id || 0, // Usar 0 como placeholder temporário, será atualizado quando o usuário for carregado
    },
  });

  // Atualizar o userId quando o usuário é carregado
  useEffect(() => {
    if (user?.id) {
      form.setValue("userId", user.id);
    }
  }, [user, form]);

  // Atualizar formulário quando selecionamos um fornecedor para editar
  useEffect(() => {
    if (selectedFornecedor) {
      form.reset({
        nome: selectedFornecedor.nome,
        descricao: selectedFornecedor.descricao || "",
        website: selectedFornecedor.website || "",
        logo: selectedFornecedor.logo || "",
        userId: selectedFornecedor.userId,
      });
    } else {
      form.reset({
        nome: "",
        descricao: "",
        website: "",
        logo: "",
        userId: user?.id || 0,
      });
    }
  }, [selectedFornecedor, form, user]);

  // Mutation para criar fornecedor
  const createFornecedorMutation = useMutation({
    mutationFn: (newFornecedor: FornecedorFormValues) => {
      return apiRequest("POST", "/api/fornecedores", {
        ...newFornecedor,
        status: "ativo" // Define status como ativo por padrão
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fornecedores`] });
      toast({
        title: "Fornecedor criado com sucesso",
        description: "O novo fornecedor foi adicionado ao sistema.",
      });
      setIsFormOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar fornecedor",
        description: error.message || "Ocorreu um erro ao criar o fornecedor.",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar fornecedor
  const updateFornecedorMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<FornecedorFormValues> }) => {
      const res = await apiRequest("PUT", `/api/fornecedores/${id}`, data);
      
      // Verificar explicitamente códigos de resposta
      if (res.status === 403) {
        throw new Error("Você não tem permissão para modificar este fornecedor");
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao atualizar o fornecedor");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fornecedores`] });
      toast({
        title: "Fornecedor atualizado com sucesso",
        description: "As informações do fornecedor foram atualizadas.",
      });
      setIsFormOpen(false);
      setSelectedFornecedor(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar fornecedor",
        description: error.message || "Ocorreu um erro ao atualizar o fornecedor.",
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir fornecedor
  const deleteFornecedorMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/fornecedores/${id}`);
      
      // Verificar explicitamente códigos de resposta
      if (res.status === 403) {
        throw new Error("Você não tem permissão para excluir este fornecedor");
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao excluir o fornecedor");
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/fornecedores`] });
      toast({
        title: "Fornecedor excluído com sucesso",
        description: "O fornecedor foi removido do sistema.",
      });
      setIsDeleteDialogOpen(false);
      setSelectedFornecedor(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir fornecedor",
        description: error.message || "Ocorreu um erro ao excluir o fornecedor.",
        variant: "destructive",
      });
    },
  });

  // Mutation para alternar status do fornecedor
  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, novoStatus }: { id: number; novoStatus: string }) => {
      const res = await apiRequest("PUT", `/api/fornecedores/${id}`, { status: novoStatus });
      
      // Verificar explicitamente códigos de resposta
      if (res.status === 403) {
        throw new Error("Você não tem permissão para modificar este fornecedor");
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Falha ao ${novoStatus === 'ativo' ? 'ativar' : 'desativar'} o fornecedor`);
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/fornecedores`] });
      toast({
        title: data.status === "ativo" ? "Fornecedor ativado" : "Fornecedor desativado",
        description: data.status === "ativo" 
          ? "O fornecedor foi ativado com sucesso."
          : "O fornecedor foi desativado com sucesso.",
      });
    },
    onError: (error: any) => {
      // Mensagens mais amigáveis para erros comuns
      let description = error.message || "Ocorreu um erro ao alterar o status do fornecedor.";
      
      if (description.includes("permissão")) {
        description = "Seu perfil atual não tem permissão para ativar ou desativar fornecedores. Entre em contato com um administrador.";
      } else if (description.includes("401") || description.includes("autenticação")) {
        description = "Sua sessão expirou. Por favor, faça login novamente para continuar.";
      }
      
      toast({
        title: "Erro ao alterar status do fornecedor",
        description: description,
        variant: "destructive",
      });
    },
  });

  // Handler de submit do formulário
  const onSubmit = (data: FornecedorFormValues) => {
    if (selectedFornecedor) {
      // Editar fornecedor existente
      updateFornecedorMutation.mutate({
        id: selectedFornecedor.id,
        data,
      });
    } else {
      // Criar novo fornecedor
      createFornecedorMutation.mutate(data);
    }
  };

  // Abrir modal para criar novo fornecedor
  const handleNewFornecedor = () => {
    setSelectedFornecedor(null);
    setIsFormOpen(true);
  };

  // Abrir modal para editar fornecedor
  const handleEditFornecedor = (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    setIsFormOpen(true);
  };

  // Abrir confirmação de exclusão
  const handleDeleteClick = (fornecedor: Fornecedor) => {
    setSelectedFornecedor(fornecedor);
    setIsDeleteDialogOpen(true);
  };

  // Confirmar exclusão
  const confirmDelete = () => {
    if (selectedFornecedor) {
      deleteFornecedorMutation.mutate(selectedFornecedor.id);
    }
  };

  // Alternar status do fornecedor (ativo/inativo)
  const handleToggleStatus = (fornecedor: Fornecedor) => {
    // Status está sempre em minúsculo no banco de dados
    const novoStatus = fornecedor.status === "ativo" ? "inativo" : "ativo";
    console.log(`Alterando status de ${fornecedor.nome} de ${fornecedor.status} para ${novoStatus}`);
    toggleStatusMutation.mutate({
      id: fornecedor.id,
      novoStatus: novoStatus
    });
  };

  return (
    <div className="container p-4 mx-auto">
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold flex items-center">
                <Store className="mr-2 h-6 w-6" />
                Gerenciar Fornecedores
              </CardTitle>
              <CardDescription>
                Adicione, edite ou remova fornecedores de gift cards
              </CardDescription>
            </div>
            <Button onClick={handleNewFornecedor}>
              <Plus className="mr-2 h-4 w-4" /> Novo Fornecedor
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingFornecedores ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando fornecedores...</p>
            </div>
          ) : fornecedoresError ? (
            <div className="text-center py-8 text-red-500 flex flex-col items-center">
              <FileWarning className="h-10 w-10 mb-2" />
              <p>Erro ao carregar fornecedores.</p>
              <p className="text-sm text-muted-foreground">
                {(fornecedoresError as Error).message || "Tente novamente mais tarde"}
              </p>
            </div>
          ) : fornecedores.length === 0 ? (
            <div className="text-center py-8 border rounded-lg bg-slate-50">
              <Store className="h-10 w-10 mx-auto text-slate-400 mb-2" />
              <h3 className="text-lg font-medium">Nenhum fornecedor cadastrado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Adicione seu primeiro fornecedor para começar a gerenciar gift cards
              </p>
              <Button onClick={handleNewFornecedor}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar Fornecedor
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Gift Cards</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fornecedores.map((fornecedor: Fornecedor) => (
                  <TableRow key={fornecedor.id}>
                    <TableCell className="font-medium">
                      <Link 
                        to={`/fornecedores/${fornecedor.id}`}
                        className="text-primary hover:underline cursor-pointer"
                      >
                        {fornecedor.nome}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {fornecedor.descricao
                        ? fornecedor.descricao.length > 60
                          ? `${fornecedor.descricao.substring(0, 60)}...`
                          : fornecedor.descricao
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {fornecedor.website ? (
                        <a
                          href={fornecedor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          {(() => {
                            try {
                              return new URL(fornecedor.website).hostname;
                            } catch (e) {
                              // Fallback caso a URL seja inválida
                              return fornecedor.website.replace('https://', '').replace('http://', '');
                            }
                          })()}
                        </a>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {giftCardCounts[fornecedor.id] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={fornecedor.status === "ativo" ? "default" : "secondary"}
                        className={
                          fornecedor.status === "ativo" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {fornecedor.status === "ativo" ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(fornecedor)}
                          className={
                            fornecedor.status === "ativo"
                              ? "text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              : "text-green-600 hover:text-green-700 hover:bg-green-50"
                          }
                          title={fornecedor.status === "ativo" ? "Desativar fornecedor" : "Ativar fornecedor"}
                        >
                          {fornecedor.status === "ativo" ? (
                            <PowerOff className="h-4 w-4" />
                          ) : (
                            <Power className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditFornecedor(fornecedor)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteClick(fornecedor)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal de Formulário */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {selectedFornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
            <DialogDescription>
              {selectedFornecedor
                ? "Edite as informações do fornecedor conforme necessário."
                : "Preencha os dados para adicionar um novo fornecedor de gift cards."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Fornecedor*</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Amazon, Steam, Netflix" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Uma breve descrição sobre este fornecedor"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="logo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL do Logo</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="https://exemplo.com/logo.png"
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsFormOpen(false);
                    setSelectedFornecedor(null);
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={createFornecedorMutation.isPending || updateFornecedorMutation.isPending}
                >
                  {(createFornecedorMutation.isPending || updateFornecedorMutation.isPending) ? (
                    "Salvando..."
                  ) : selectedFornecedor ? (
                    "Atualizar Fornecedor"
                  ) : (
                    "Adicionar Fornecedor"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de Confirmação de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor {selectedFornecedor?.nome}?
              {(giftCardCounts[selectedFornecedor?.id || 0] || 0) > 0 && (
                <div className="mt-2 text-red-500 font-medium">
                  Atenção: Este fornecedor possui {giftCardCounts[selectedFornecedor?.id || 0]} gift cards associados.
                  A exclusão do fornecedor não removerá os gift cards.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteFornecedorMutation.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}