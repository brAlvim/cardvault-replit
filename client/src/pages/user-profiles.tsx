import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, Check, Edit, Trash2, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Tipos
interface Perfil {
  id: number;
  nome: string;
  descricao: string;
  permissoes: string[];
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  nome: string;
  perfilId: number;
  perfilNome: string;
  ativo: boolean;
  status?: string; // Opcional para compatibilidade
  lastLogin: string;
}

// Schema do formulário de perfil
const perfilFormSchema = z.object({
  nome: z.string().min(2, {
    message: "Nome deve ter pelo menos 2 caracteres.",
  }),
  descricao: z.string().min(5, {
    message: "Descrição deve ter pelo menos 5 caracteres.",
  }),
  permissoes: z.array(z.string()).nonempty({
    message: "Selecione pelo menos uma permissão.",
  }),
  ativo: z.boolean().default(true),
});

// Schema do formulário de usuário
const userFormSchema = z.object({
  username: z.string().min(3, {
    message: "Username deve ter pelo menos 3 caracteres.",
  }),
  email: z.string().email({
    message: "Email inválido.",
  }),
  nome: z.string().min(3, {
    message: "Nome deve ter pelo menos 3 caracteres.",
  }),
  password: z.string().min(6, {
    message: "Senha deve ter pelo menos 6 caracteres.",
  }).optional(),
  perfilId: z.number({
    required_error: "Selecione um perfil.",
  }),
  ativo: z.boolean().default(true),
});

type PerfilFormValues = z.infer<typeof perfilFormSchema>;
type UserFormValues = z.infer<typeof userFormSchema>;

export default function UserProfilesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("perfis");
  const [openPerfilDialog, setOpenPerfilDialog] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState<Perfil | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirmPerfil, setDeleteConfirmPerfil] = useState<Perfil | null>(null);
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);

  // Lista de permissões disponíveis
  const availablePermissions = [
    { id: "view_dashboard", label: "Visualizar Dashboard" },
    { id: "manage_giftcards", label: "Gerenciar Gift Cards" },
    { id: "manage_providers", label: "Gerenciar Fornecedores" },
    { id: "manage_transactions", label: "Gerenciar Transações" },
    { id: "manage_users", label: "Gerenciar Usuários" },
    { id: "manage_profiles", label: "Gerenciar Perfis" },
    { id: "view_reports", label: "Visualizar Relatórios" },
    { id: "export_data", label: "Exportar Dados" },
    { id: "view_all_users", label: "Ver Todos os Usuários" },
    { id: "approve_transactions", label: "Aprovar Transações" }
  ];

  // Formulário de perfil
  const perfilForm = useForm<PerfilFormValues>({
    resolver: zodResolver(perfilFormSchema),
    defaultValues: {
      nome: "",
      descricao: "",
      permissoes: [],
      ativo: true,
    },
  });

  // Formulário de usuário
  const userForm = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      username: "",
      email: "",
      nome: "",
      password: "",
      perfilId: 0,
      ativo: true,
    },
  });

  // Consultas para buscar perfis e usuários
  const { data: perfis = [], isLoading: perfisLoading, error: perfisError } = useQuery({
    queryKey: ['/api/perfis'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/perfis');
      if (!response.ok) {
        throw new Error('Erro ao buscar perfis');
      }
      const data = await response.json();
      console.log('Perfis recebidos:', data);
      // Garantir que data é um array
      return Array.isArray(data) ? data : [];
    }
  });

  const { data: users = [], isLoading: usersLoading, error: usersError } = useQuery({
    queryKey: ['/api/users'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/users');
      if (!response.ok) {
        throw new Error('Erro ao buscar usuários');
      }
      const data = await response.json();
      console.log('Usuários recebidos:', data);
      // Mapear os dados para garantir as propriedades corretas
      return Array.isArray(data) ? data.map(user => ({
        ...user,
        ativo: user.ativo || user.status === 'ativo', // Garantir que campo ativo existe
        perfilNome: user.perfilNome || (perfis.find(p => p.id === user.perfilId)?.nome || 'Desconhecido')
      })) : [];
    }
  });

  // Mutations para criar/editar/excluir perfis
  const createPerfilMutation = useMutation({
    mutationFn: async (newPerfil: PerfilFormValues) => {
      const response = await apiRequest('POST', '/api/perfis', newPerfil);
      if (!response.ok) {
        throw new Error('Erro ao criar perfil');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perfis'] });
      setOpenPerfilDialog(false);
      perfilForm.reset();
      toast({
        title: "Sucesso!",
        description: "Perfil criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar perfil",
        description: error.message || "Ocorreu um erro ao criar o perfil.",
        variant: "destructive",
      });
    }
  });

  const updatePerfilMutation = useMutation({
    mutationFn: async (updatedPerfil: { id: number, data: Partial<PerfilFormValues> }) => {
      const response = await apiRequest('PUT', `/api/perfis/${updatedPerfil.id}`, updatedPerfil.data);
      if (!response.ok) {
        throw new Error('Erro ao atualizar perfil');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perfis'] });
      setOpenPerfilDialog(false);
      setEditingPerfil(null);
      perfilForm.reset();
      toast({
        title: "Sucesso!",
        description: "Perfil atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message || "Ocorreu um erro ao atualizar o perfil.",
        variant: "destructive",
      });
    }
  });

  const deletePerfilMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/perfis/${id}`);
      if (!response.ok) {
        throw new Error('Erro ao excluir perfil');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/perfis'] });
      setDeleteConfirmPerfil(null);
      toast({
        title: "Sucesso!",
        description: "Perfil excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir perfil",
        description: error.message || "Ocorreu um erro ao excluir o perfil.",
        variant: "destructive",
      });
    }
  });

  // Mutations para criar/editar/excluir usuários
  const createUserMutation = useMutation({
    mutationFn: async (newUser: UserFormValues) => {
      const response = await apiRequest('POST', '/api/users', newUser);
      if (!response.ok) {
        throw new Error('Erro ao criar usuário');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setOpenUserDialog(false);
      userForm.reset();
      toast({
        title: "Sucesso!",
        description: "Usuário criado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar usuário",
        description: error.message || "Ocorreu um erro ao criar o usuário.",
        variant: "destructive",
      });
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async (updatedUser: { id: number, data: Partial<UserFormValues> }) => {
      const response = await apiRequest('PUT', `/api/users/${updatedUser.id}`, updatedUser.data);
      if (!response.ok) {
        throw new Error('Erro ao atualizar usuário');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setOpenUserDialog(false);
      setEditingUser(null);
      userForm.reset();
      toast({
        title: "Sucesso!",
        description: "Usuário atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar usuário",
        description: error.message || "Ocorreu um erro ao atualizar o usuário.",
        variant: "destructive",
      });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/users/${id}`);
      if (!response.ok) {
        throw new Error('Erro ao excluir usuário');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDeleteConfirmUser(null);
      toast({
        title: "Sucesso!",
        description: "Usuário excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Ocorreu um erro ao excluir o usuário.",
        variant: "destructive",
      });
    }
  });

  // Handlers para formulários e ações
  const onPerfilSubmit = (data: PerfilFormValues) => {
    if (editingPerfil) {
      updatePerfilMutation.mutate({ id: editingPerfil.id, data });
    } else {
      createPerfilMutation.mutate(data);
    }
  };

  const onUserSubmit = (data: UserFormValues) => {
    if (editingUser) {
      // Criar uma cópia sem incluir a senha se estiver vazia
      const userData = { ...data };
      if (!userData.password || userData.password === "") {
        const { password, ...restData } = userData;
        updateUserMutation.mutate({ id: editingUser.id, data: restData });
      } else {
        updateUserMutation.mutate({ id: editingUser.id, data: userData });
      }
    } else {
      createUserMutation.mutate(data);
    }
  };

  const handleEditPerfil = (perfil: Perfil) => {
    setEditingPerfil(perfil);
    perfilForm.reset({
      nome: perfil.nome,
      descricao: perfil.descricao,
      permissoes: perfil.permissoes,
      ativo: perfil.ativo,
    });
    setOpenPerfilDialog(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    userForm.reset({
      username: user.username,
      email: user.email,
      nome: user.nome,
      password: "", // Não mostrar a senha no formulário de edição
      perfilId: user.perfilId,
      ativo: user.ativo,
    });
    setOpenUserDialog(true);
  };

  const handleDeletePerfil = (perfil: Perfil) => {
    setDeleteConfirmPerfil(perfil);
  };

  const handleDeleteUser = (user: User) => {
    setDeleteConfirmUser(user);
  };

  const confirmDeletePerfil = () => {
    if (deleteConfirmPerfil) {
      deletePerfilMutation.mutate(deleteConfirmPerfil.id);
    }
  };

  const confirmDeleteUser = () => {
    if (deleteConfirmUser) {
      deleteUserMutation.mutate(deleteConfirmUser.id);
    }
  };

  const handleAddPerfil = () => {
    setEditingPerfil(null);
    perfilForm.reset({
      nome: "",
      descricao: "",
      permissoes: [],
      ativo: true,
    });
    setOpenPerfilDialog(true);
  };

  const handleAddUser = () => {
    setEditingUser(null);
    userForm.reset({
      username: "",
      email: "",
      nome: "",
      password: "",
      perfilId: perfis.length > 0 ? perfis[0].id : 0,
      ativo: true,
    });
    setOpenUserDialog(true);
  };

  // Formatação de data
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Gerenciamento de Usuários e Perfis</h1>
      
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="perfis">Perfis</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
        </TabsList>

        {/* Tab de Perfis */}
        <TabsContent value="perfis">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Perfis de Acesso</span>
                <Button onClick={handleAddPerfil}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Perfil
                </Button>
              </CardTitle>
              <CardDescription>
                Gerencie os perfis de acesso e suas permissões no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {perfisError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>
                    Ocorreu um erro ao carregar os perfis.
                  </AlertDescription>
                </Alert>
              ) : perfisLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Permissões</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Criado em</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {perfis.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
                            Nenhum perfil encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        perfis.map((perfil: Perfil) => (
                          <TableRow key={perfil.id}>
                            <TableCell className="font-medium">{perfil.nome}</TableCell>
                            <TableCell>{perfil.descricao}</TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1">
                                {perfil.permissoes.map((perm) => (
                                  <span 
                                    key={perm} 
                                    className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full"
                                  >
                                    {perm}
                                  </span>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                perfil.ativo 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {perfil.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(perfil.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditPerfil(perfil)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeletePerfil(perfil)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Usuários */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <span>Usuários</span>
                <Button onClick={handleAddUser}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
              </CardTitle>
              <CardDescription>
                Gerencie os usuários do sistema e seus perfis de acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersError ? (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro</AlertTitle>
                  <AlertDescription>
                    Ocorreu um erro ao carregar os usuários.
                  </AlertDescription>
                </Alert>
              ) : usersLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Username</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Perfil</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Último Login</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-4 text-muted-foreground">
                            Nenhum usuário encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        users.map((user: User) => (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">{user.nome}</TableCell>
                            <TableCell>{user.username}</TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                                {user.perfilNome || (perfis.find(p => p.id === user.perfilId)?.nome || 'Desconhecido')}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.ativo || user.status === 'ativo'
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {user.ativo || user.status === 'ativo' ? 'Ativo' : 'Inativo'}
                              </span>
                            </TableCell>
                            <TableCell>{formatDate(user.lastLogin)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleEditUser(user)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleDeleteUser(user)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Perfil */}
      <Dialog open={openPerfilDialog} onOpenChange={setOpenPerfilDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingPerfil ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
            <DialogDescription>
              {editingPerfil 
                ? 'Edite as informações e permissões do perfil selecionado.' 
                : 'Preencha as informações para criar um novo perfil de acesso.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...perfilForm}>
            <form onSubmit={perfilForm.handleSubmit(onPerfilSubmit)} className="space-y-4">
              <FormField
                control={perfilForm.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome do perfil" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={perfilForm.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Input placeholder="Descrição do perfil" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={perfilForm.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Ativo</FormLabel>
                      <FormDescription>
                        O perfil estará disponível para atribuição a usuários
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div>
                <FormLabel className="block mb-2">Permissões</FormLabel>
                <div className="grid grid-cols-2 gap-4">
                  {availablePermissions.map((permission) => (
                    <FormField
                      key={permission.id}
                      control={perfilForm.control}
                      name="permissoes"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value?.includes(permission.id)}
                              onCheckedChange={(checked) => {
                                const current = Array.isArray(field.value) ? [...field.value] : [];
                                return checked
                                  ? field.onChange([...current, permission.id])
                                  : field.onChange(current.filter((value) => value !== permission.id));
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal text-sm">
                            {permission.label}
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  ))}
                </div>
                <FormMessage className="mt-2">
                  {perfilForm.formState.errors.permissoes?.message}
                </FormMessage>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenPerfilDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingPerfil ? 'Salvar Alterações' : 'Criar Perfil'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Usuário */}
      <Dialog open={openUserDialog} onOpenChange={setOpenUserDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingUser 
                ? 'Edite as informações do usuário selecionado.' 
                : 'Preencha as informações para criar um novo usuário.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...userForm}>
            <form onSubmit={userForm.handleSubmit(onUserSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={userForm.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input placeholder="Username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={userForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="Email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={userForm.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{editingUser ? 'Nova Senha (opcional)' : 'Senha'}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={editingUser ? "Deixe em branco para manter a atual" : "Senha"} 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="perfilId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Perfil</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={field.value}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      >
                        <option value="" disabled>Selecione um perfil</option>
                        {perfis.map((perfil: Perfil) => (
                          <option key={perfil.id} value={perfil.id}>
                            {perfil.nome}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={userForm.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Ativo</FormLabel>
                      <FormDescription>
                        O usuário poderá acessar o sistema
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setOpenUserDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão de perfil */}
      <Dialog open={!!deleteConfirmPerfil} onOpenChange={(open) => !open && setDeleteConfirmPerfil(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o perfil "{deleteConfirmPerfil?.nome}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteConfirmPerfil(null)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDeletePerfil}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão de usuário */}
      <Dialog open={!!deleteConfirmUser} onOpenChange={(open) => !open && setDeleteConfirmUser(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário "{deleteConfirmUser?.nome}"?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setDeleteConfirmUser(null)}
            >
              Cancelar
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDeleteUser}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}