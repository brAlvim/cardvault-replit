import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2, Plus, Edit, Trash2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

// Definição do esquema de validação do formulário
const supplierFormSchema = z.object({
  nome: z.string().min(1, "O nome é obrigatório"),
  descricao: z.string().optional().nullable(),
  website: z.string().url("Digite uma URL válida").optional().nullable(),
  logo: z.string().url("Digite uma URL válida").optional().nullable(),
  status: z.string().default("ativo"),
  userId: z.number().optional(),
  empresaId: z.number().optional(),
});

// Tipo para o formulário
type SupplierFormValues = z.infer<typeof supplierFormSchema>;

// Interface para o tipo de Supplier
interface Supplier {
  id: number;
  nome: string;
  descricao: string | null;
  website: string | null;
  logo: string | null;
  desconto: number | null;
  status: string;
  userId: number;
  empresaId: number;
  createdAt: string;
  updatedAt: string | null;
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const [openModal, setOpenModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  // Formulário para supplier
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      website: "",
      logo: "",
      status: "ativo",
    },
  });

  // Consulta para obter a lista de suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/suppliers");
      return res.json();
    },
  });

  // Mutação para criar novos suppliers
  const createSupplierMutation = useMutation({
    mutationFn: async (newSupplier: SupplierFormValues) => {
      const res = await apiRequest("POST", "/api/suppliers", newSupplier);
      
      // Verificar explicitamente códigos de resposta
      if (res.status === 403) {
        throw new Error("Você não tem permissão para criar fornecedores");
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Falha ao criar o fornecedor");
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Supplier criado com sucesso",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setOpenModal(false);
      form.reset();
    },
    onError: (error: any) => {
      // Mensagens mais amigáveis para erros de criação
      let description = error.message || "Ocorreu um erro ao criar o fornecedor.";
      
      if (description.includes("permissão")) {
        description = "Seu perfil atual não tem permissão para criar fornecedores. Entre em contato com um administrador.";
      } else if (description.includes("já existe")) {
        description = "Já existe um fornecedor com este nome. Por favor, use um nome diferente.";
      } else if (description.includes("campos obrigatórios")) {
        description = "Por favor, preencha todos os campos obrigatórios antes de salvar.";
      } else if (description.includes("401") || description.includes("autenticação")) {
        description = "Sua sessão expirou. Por favor, faça login novamente para continuar.";
      }
      
      toast({
        title: "Erro ao criar fornecedor",
        description: description,
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar suppliers
  const updateSupplierMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SupplierFormValues }) => {
      const res = await apiRequest("PUT", `/api/suppliers/${id}`, data);
      
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
      toast({
        title: "Supplier atualizado com sucesso",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setOpenModal(false);
      setEditingSupplier(null);
      form.reset();
    },
    onError: (error: any) => {
      // Mensagens mais amigáveis para erros de atualização
      let description = error.message || "Ocorreu um erro ao atualizar o fornecedor.";
      
      if (description.includes("permissão")) {
        description = "Seu perfil atual não tem permissão para editar fornecedores. Entre em contato com um administrador.";
      } else if (description.includes("já existe")) {
        description = "Já existe um fornecedor com este nome. Por favor, use um nome diferente.";
      } else if (description.includes("campos obrigatórios")) {
        description = "Por favor, preencha todos os campos obrigatórios antes de salvar.";
      } else if (description.includes("401") || description.includes("autenticação")) {
        description = "Sua sessão expirou. Por favor, faça login novamente para continuar.";
      } else if (description.includes("403")) {
        description = "Acesso negado. Você não tem permissão para esta ação.";
      }
      
      toast({
        title: "Erro ao atualizar fornecedor",
        description: description,
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir suppliers
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/suppliers/${id}`);
      
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
      toast({
        title: "Supplier excluído com sucesso",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      setDeleteConfirmOpen(false);
      setSupplierToDelete(null);
    },
    onError: (error: any) => {
      // Mensagens mais amigáveis para erros de exclusão
      let description = error.message || "Ocorreu um erro ao excluir o fornecedor.";
      
      if (description.includes("permissão")) {
        description = "Seu perfil atual não tem permissão para excluir fornecedores. Entre em contato com um administrador.";
      } else if (description.includes("gift card") || description.includes("associado")) {
        description = "Este fornecedor possui gift cards associados e não pode ser excluído. Remova os gift cards primeiro.";
      } else if (description.includes("403")) {
        description = "Acesso negado. Você não tem permissão para esta ação.";
      }
      
      toast({
        title: "Erro ao excluir fornecedor",
        description: description,
        variant: "destructive",
      });
    },
  });

  // Mutação para mudar o status de suppliers (ativo/inativo)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PUT", `/api/suppliers/${id}`, { status });
      
      // Verificar explicitamente códigos de resposta
      if (res.status === 403) {
        throw new Error("Você não tem permissão para modificar este fornecedor");
      } else if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Falha ao ${status === 'ativo' ? 'ativar' : 'desativar'} o fornecedor`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status atualizado com sucesso",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: (error: any) => {
      // Mensagens mais amigáveis para erros comuns
      let description = error.message || "Ocorreu um erro ao atualizar o status do fornecedor.";
      
      if (description.includes("permissão")) {
        description = "Seu perfil atual não tem permissão para ativar ou desativar fornecedores. Entre em contato com um administrador.";
      } else if (description.includes("401") || description.includes("autenticação")) {
        description = "Sua sessão expirou. Por favor, faça login novamente para continuar.";
      } else if (description.includes("403")) {
        description = "Acesso negado. Você não tem permissão para esta ação.";
      } else if (description.includes("404")) {
        description = "Fornecedor não encontrado. A página pode ter sido atualizada.";
      }
      
      toast({
        title: "Erro ao atualizar status",
        description: description,
        variant: "destructive",
      });
    },
  });

  // Submeter o formulário
  const onSubmit = (data: SupplierFormValues) => {
    // Adicionando o ID do usuário logado (assumindo que temos um usuário demo com ID 1)
    const supplierData = {
      ...data,
      userId: 1,  // Demo user ID
      empresaId: 1, // Demo company ID
    };

    if (editingSupplier) {
      updateSupplierMutation.mutate({ id: editingSupplier.id, data: supplierData });
    } else {
      createSupplierMutation.mutate(supplierData);
    }
  };

  // Configurar o formulário para edição
  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    form.reset({
      nome: supplier.nome,
      descricao: supplier.descricao,
      website: supplier.website,
      logo: supplier.logo,
      status: supplier.status,
    });
    setOpenModal(true);
  };

  // Configurar a exclusão
  const handleDeleteClick = (supplier: Supplier) => {
    setSupplierToDelete(supplier);
    setDeleteConfirmOpen(true);
  };

  // Confirmar a exclusão
  const confirmDelete = () => {
    if (supplierToDelete) {
      deleteSupplierMutation.mutate(supplierToDelete.id);
    }
  };

  // Alternar o status ativo/inativo
  const handleToggleStatus = (supplier: Supplier) => {
    const newStatus = supplier.status === 'ativo' ? 'inativo' : 'ativo';
    updateStatusMutation.mutate({ id: supplier.id, status: newStatus });
  };

  // Resetar o formulário ao fechar o modal
  useEffect(() => {
    if (!openModal) {
      form.reset();
      setEditingSupplier(null);
    }
  }, [openModal, form]);

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Fornecedores de Gift Cards</h1>
        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus size={16} />
              Novo Fornecedor de Gift Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSupplier ? "Editar Fornecedor" : "Adicionar Fornecedor"}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nome do fornecedor" />
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
                          {...field}
                          value={field.value || ""}
                          placeholder="Descrição do fornecedor"
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
                          {...field}
                          value={field.value || ""}
                          placeholder="https://www.exemplo.com"
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
                          {...field}
                          value={field.value || ""}
                          placeholder="https://logo.exemplo.com/logo.png"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2">
                      <FormLabel>Ativo</FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value === "ativo"}
                          onCheckedChange={(checked) => {
                            field.onChange(checked ? "ativo" : "inativo");
                          }}
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
                    onClick={() => setOpenModal(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    disabled={createSupplierMutation.isPending || updateSupplierMutation.isPending}
                  >
                    {(createSupplierMutation.isPending || updateSupplierMutation.isPending) && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Salvar
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Fornecedores de Gift Cards</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : suppliers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum fornecedor de gift card cadastrado. Clique em "Novo Fornecedor" para adicionar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Website</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.map((supplier: Supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {supplier.logo && (
                            <img
                              src={supplier.logo}
                              alt={supplier.nome}
                              className="h-6 w-6 rounded"
                            />
                          )}
                          {supplier.nome}
                        </div>
                      </TableCell>
                      <TableCell>
                        {supplier.website ? (
                          <a
                            href={supplier.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:underline"
                          >
                            {new URL(supplier.website).hostname}
                          </a>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={supplier.status === "ativo" ? "default" : "secondary"}
                        >
                          {supplier.status === "ativo" ? "Ativo" : "Inativo"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleToggleStatus(supplier)}
                            title={
                              supplier.status === "ativo"
                                ? "Desativar fornecedor"
                                : "Ativar fornecedor"
                            }
                          >
                            {supplier.status === "ativo" ? (
                              <X className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditSupplier(supplier)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(supplier)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isto irá excluir permanentemente o
              fornecedor {supplierToDelete?.nome}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteSupplierMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}