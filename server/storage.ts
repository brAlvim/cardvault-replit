import {
  empresas, perfis, users, fornecedores, suppliers, giftCards, transacoes, tags, giftCardTags,
  Perfil, InsertPerfil, 
  User, InsertUser,
  Fornecedor, InsertFornecedor,
  Supplier, InsertSupplier,
  GiftCard, InsertGiftCard,
  Transacao, InsertTransacao,
  Tag, InsertTag,
  GiftCardTag, InsertGiftCardTag,
} from "@shared/schema";
import { z } from "zod";
import { db } from "./db";
import { eq, and, like, or, desc, sql, gt, lt, lte } from "drizzle-orm";

// Esquema de empresa (omitido durante a estrutura inicial)
export const insertEmpresaSchema = z.object({
  nome: z.string(),
  cnpj: z.string(),
  email: z.string().email(),
  telefone: z.string(),
  plano: z.string(),
  status: z.string(),
  dataExpiracao: z.date(),
  logoUrl: z.string().optional(),
  corPrimaria: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  limiteUsuarios: z.number().optional(),
});

export type Empresa = typeof empresas.$inferSelect;
export type InsertEmpresa = z.infer<typeof insertEmpresaSchema>;

export interface IStorage {
  // Empresa methods
  getEmpresas(): Promise<Empresa[]>;
  getEmpresa(id: number): Promise<Empresa | undefined>;
  getEmpresaByNome(nome: string): Promise<Empresa | undefined>;
  createEmpresa(empresa: InsertEmpresa): Promise<Empresa>;
  updateEmpresa(id: number, empresa: Partial<InsertEmpresa>): Promise<Empresa | undefined>;
  deleteEmpresa(id: number): Promise<boolean>;
  
  // Perfil methods
  getPerfis(): Promise<Perfil[]>;
  getPerfil(id: number): Promise<Perfil | undefined>;
  getPerfilByNome(nome: string): Promise<Perfil | undefined>;
  createPerfil(perfil: InsertPerfil): Promise<Perfil>;
  updatePerfil(id: number, perfil: Partial<InsertPerfil>): Promise<Perfil | undefined>;
  deletePerfil(id: number): Promise<boolean>;

  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByEmpresa(empresaId: number): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  updateUserLastLogin(id: number): Promise<User | undefined>;
  updateUserPasswordResetToken(id: number, token: string): Promise<User | undefined>;

  // Fornecedor methods (substitui Collection)
  getFornecedores(userId: number, empresaId?: number): Promise<Fornecedor[]>;
  getFornecedor(id: number, empresaId?: number): Promise<Fornecedor | undefined>;
  getFornecedoresByEmpresa(empresaId: number): Promise<Fornecedor[]>;
  createFornecedor(fornecedor: InsertFornecedor): Promise<Fornecedor>;
  updateFornecedor(id: number, fornecedor: Partial<InsertFornecedor>): Promise<Fornecedor | undefined>;
  deleteFornecedor(id: number): Promise<boolean>;
  
  // Supplier methods (fornecedores de gift cards)
  getSuppliers(userId: number, empresaId?: number): Promise<Supplier[]>;
  getSupplier(id: number, empresaId?: number): Promise<Supplier | undefined>;
  getSuppliersByEmpresa(empresaId: number): Promise<Supplier[]>;
  createSupplier(supplier: InsertSupplier): Promise<Supplier>;
  updateSupplier(id: number, supplier: Partial<InsertSupplier>): Promise<Supplier | undefined>;
  deleteSupplier(id: number): Promise<boolean>;

  // Gift Card methods (substitui Card)
  getGiftCards(userId: number, fornecedorId?: number, empresaId?: number, perfilId?: number): Promise<GiftCard[]>;
  getGiftCardsByEmpresa(empresaId: number): Promise<GiftCard[]>;
  getGiftCard(id: number, empresaId?: number): Promise<GiftCard | undefined>;
  createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard>;
  updateGiftCard(id: number, giftCard: Partial<InsertGiftCard>): Promise<GiftCard | undefined>;
  deleteGiftCard(id: number): Promise<boolean>;
  getGiftCardsVencimento(userId: number, dias: number, perfilId?: number): Promise<GiftCard[]>;
  getGiftCardsByTag(tagId: number, empresaId?: number, userId?: number, perfilId?: number): Promise<GiftCard[]>;
  searchGiftCards(userId: number, searchTerm: string, perfilId?: number): Promise<GiftCard[]>;

  // Transação methods (novo)
  getTransacoes(giftCardId: number, empresaId?: number): Promise<Transacao[]>;
  getTransacoesByEmpresa(empresaId: number): Promise<Transacao[]>;
  getTransacao(id: number, empresaId?: number): Promise<Transacao | undefined>;
  createTransacao(transacao: InsertTransacao): Promise<Transacao>;
  updateTransacao(id: number, transacao: Partial<InsertTransacao>): Promise<Transacao | undefined>;
  deleteTransacao(id: number): Promise<boolean>;

  // Tag methods
  getTags(empresaId?: number): Promise<Tag[]>;
  getTag(id: number, empresaId?: number): Promise<Tag | undefined>;
  getTagsByEmpresa(empresaId: number): Promise<Tag[]>; 
  createTag(tag: InsertTag): Promise<Tag>;
  
  // Gift Card Tag methods
  addTagToGiftCard(giftCardId: number, tagId: number, empresaId?: number, userId?: number, perfilId?: number): Promise<GiftCardTag>;
  removeTagFromGiftCard(giftCardId: number, tagId: number, empresaId?: number, userId?: number, perfilId?: number): Promise<boolean>;
  getGiftCardTags(giftCardId: number, empresaId?: number, userId?: number, perfilId?: number): Promise<Tag[]>;
}

// Implementação da interface IStorage utilizando memória (sem banco de dados)
class MemStorage implements IStorage {
  private empresas: Map<number, Empresa> = new Map();
  private perfis: Map<number, Perfil> = new Map();
  private users: Map<number, User> = new Map();
  private fornecedores: Map<number, Fornecedor> = new Map();
  private suppliers: Map<number, Supplier> = new Map();
  private giftCards: Map<number, GiftCard> = new Map();
  private transacoes: Map<number, Transacao> = new Map();
  private tags: Map<number, Tag> = new Map();
  private giftCardTags: Map<number, GiftCardTag> = new Map();
  
  // IDs para geração automática
  private empresaId: number = 1;
  private perfilId: number = 1;
  private userId: number = 1;
  private fornecedorId: number = 1;
  private supplierId: number = 1;
  private giftCardId: number = 1;
  private transacaoId: number = 1;
  private tagId: number = 1;
  private giftCardTagId: number = 1;
  
  constructor() {
    this.initializeDemoData();
  }
  
  // Empresa methods
  async getEmpresas(): Promise<Empresa[]> {
    return Array.from(this.empresas.values());
  }

  async getEmpresa(id: number): Promise<Empresa | undefined> {
    return this.empresas.get(id);
  }

  async getEmpresaByNome(nome: string): Promise<Empresa | undefined> {
    return Array.from(this.empresas.values()).find(
      (empresa) => empresa.nome === nome
    );
  }

  async createEmpresa(empresa: InsertEmpresa): Promise<Empresa> {
    const id = this.empresaId++;
    const timestamp = new Date();
    const newEmpresa: Empresa = { 
      id, 
      nome: empresa.nome,
      cnpj: empresa.cnpj,
      email: empresa.email,
      telefone: empresa.telefone,
      plano: empresa.plano,
      status: empresa.status,
      dataExpiracao: empresa.dataExpiracao,
      logoUrl: empresa.logoUrl || null,
      corPrimaria: empresa.corPrimaria || null,
      endereco: empresa.endereco || null,
      cidade: empresa.cidade || null,
      estado: empresa.estado || null,
      cep: empresa.cep || null,
      limiteUsuarios: empresa.limiteUsuarios || 5,
      createdAt: timestamp,
      updatedAt: null
    };
    this.empresas.set(id, newEmpresa);
    return newEmpresa;
  }

  async updateEmpresa(id: number, empresaData: Partial<InsertEmpresa>): Promise<Empresa | undefined> {
    const empresa = this.empresas.get(id);
    if (!empresa) return undefined;
    
    const timestamp = new Date();
    const updatedEmpresa: Empresa = { 
      ...empresa,
      nome: empresaData.nome !== undefined ? empresaData.nome : empresa.nome,
      cnpj: empresaData.cnpj !== undefined ? empresaData.cnpj : empresa.cnpj,
      email: empresaData.email !== undefined ? empresaData.email : empresa.email,
      telefone: empresaData.telefone !== undefined ? empresaData.telefone : empresa.telefone,
      plano: empresaData.plano !== undefined ? empresaData.plano : empresa.plano,
      status: empresaData.status !== undefined ? empresaData.status : empresa.status,
      dataExpiracao: empresaData.dataExpiracao !== undefined ? empresaData.dataExpiracao : empresa.dataExpiracao,
      logoUrl: empresaData.logoUrl !== undefined ? empresaData.logoUrl : empresa.logoUrl,
      corPrimaria: empresaData.corPrimaria !== undefined ? empresaData.corPrimaria : empresa.corPrimaria,
      endereco: empresaData.endereco !== undefined ? empresaData.endereco : empresa.endereco,
      cidade: empresaData.cidade !== undefined ? empresaData.cidade : empresa.cidade,
      estado: empresaData.estado !== undefined ? empresaData.estado : empresa.estado,
      cep: empresaData.cep !== undefined ? empresaData.cep : empresa.cep,
      limiteUsuarios: empresaData.limiteUsuarios !== undefined ? empresaData.limiteUsuarios : empresa.limiteUsuarios,
      updatedAt: timestamp
    };
    this.empresas.set(id, updatedEmpresa);
    return updatedEmpresa;
  }

  async deleteEmpresa(id: number): Promise<boolean> {
    return this.empresas.delete(id);
  }
  
  // Perfil methods
  async getPerfis(): Promise<Perfil[]> {
    return Array.from(this.perfis.values());
  }

  async getPerfil(id: number): Promise<Perfil | undefined> {
    return this.perfis.get(id);
  }

  async getPerfilByNome(nome: string): Promise<Perfil | undefined> {
    return Array.from(this.perfis.values()).find(
      (perfil) => perfil.nome === nome
    );
  }

  async createPerfil(perfil: InsertPerfil): Promise<Perfil> {
    const id = this.perfilId++;
    const timestamp = new Date();
    const newPerfil: Perfil = { 
      id, 
      nome: perfil.nome,
      descricao: perfil.descricao,
      permissoes: perfil.permissoes || [],
      ativo: perfil.ativo !== undefined ? perfil.ativo : true,
      createdAt: timestamp,
      updatedAt: null
    };
    this.perfis.set(id, newPerfil);
    return newPerfil;
  }

  async updatePerfil(id: number, perfilData: Partial<InsertPerfil>): Promise<Perfil | undefined> {
    const perfil = this.perfis.get(id);
    if (!perfil) return undefined;
    
    const timestamp = new Date();
    const updatedPerfil: Perfil = { 
      ...perfil,
      nome: perfilData.nome !== undefined ? perfilData.nome : perfil.nome,
      descricao: perfilData.descricao !== undefined ? perfilData.descricao : perfil.descricao,
      permissoes: perfilData.permissoes !== undefined ? perfilData.permissoes : perfil.permissoes,
      ativo: perfilData.ativo !== undefined ? perfilData.ativo : perfil.ativo,
      updatedAt: timestamp
    };
    this.perfis.set(id, updatedPerfil);
    return updatedPerfil;
  }

  async deletePerfil(id: number): Promise<boolean> {
    return this.perfis.delete(id);
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }

  async getUsersByEmpresa(empresaId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.empresaId === empresaId
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const timestamp = new Date();
    const newUser: User = { 
      id, 
      username: user.username,
      password: user.password,
      email: user.email,
      nome: user.nome,
      empresaId: user.empresaId,
      perfilId: user.perfilId,
      avatarUrl: user.avatarUrl || null,
      status: user.status || "ativo",
      resetPasswordToken: null,
      resetPasswordExpires: null,
      lastLogin: null,
      createdAt: timestamp,
      updatedAt: null
    };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const timestamp = new Date();
    const updatedUser: User = { 
      ...user,
      username: userData.username !== undefined ? userData.username : user.username,
      password: userData.password !== undefined ? userData.password : user.password,
      email: userData.email !== undefined ? userData.email : user.email,
      nome: userData.nome !== undefined ? userData.nome : user.nome,
      empresaId: userData.empresaId !== undefined ? userData.empresaId : user.empresaId,
      perfilId: userData.perfilId !== undefined ? userData.perfilId : user.perfilId,
      avatarUrl: userData.avatarUrl !== undefined ? userData.avatarUrl : user.avatarUrl,
      status: userData.status !== undefined ? userData.status : user.status,
      updatedAt: timestamp
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const timestamp = new Date();
    const updatedUser: User = { 
      ...user,
      lastLogin: timestamp,
      updatedAt: timestamp
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPasswordResetToken(id: number, token: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const timestamp = new Date();
    const expireDate = new Date(timestamp);
    expireDate.setHours(expireDate.getHours() + 1); // Token válido por 1 hora
    
    const updatedUser: User = { 
      ...user,
      resetPasswordToken: token,
      resetPasswordExpires: expireDate,
      updatedAt: timestamp
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Fornecedor methods (anteriormente collections)
  async getFornecedores(userId: number, empresaId?: number): Promise<Fornecedor[]> {
    // FILTRO DE SEGURANÇA - ISOLAMENTO ESTRITO DE DADOS POR USUÁRIO
    // Aplicar filtro rigoroso para garantir que o usuário só veja fornecedores QUE ELE CRIOU
    let fornecedores = Array.from(this.fornecedores.values());
    
    console.log(`[SEGURANÇA ESTRITA] Filtrando fornecedores para userId: ${userId}`);
    console.log(`[SEGURANÇA ESTRITA] Total de fornecedores antes do filtro: ${fornecedores.length}`);
    
    // IMPORTANTE: SOMENTE retornar os fornecedores que o próprio usuário criou
    fornecedores = fornecedores.filter(
      (fornecedor) => fornecedor.userId === userId
    );
    
    console.log(`[SEGURANÇA ESTRITA] Fornecedores após filtro de userId: ${fornecedores.length}`);
    
    // Se for especificado um empresaId, filtramos adicionalmente por ele
    if (empresaId) {
      fornecedores = fornecedores.filter(
        (fornecedor) => fornecedor.empresaId === empresaId
      );
      console.log(`[SEGURANÇA ESTRITA] Após filtro adicional de empresaId ${empresaId}: ${fornecedores.length}`);
    }
    
    return fornecedores;
  }

  async getFornecedor(id: number, empresaId?: number): Promise<Fornecedor | undefined> {
    const fornecedor = this.fornecedores.get(id);
    
    // Verifica se o fornecedor pertence à empresa especificada
    if (fornecedor && empresaId && fornecedor.empresaId !== empresaId) {
      return undefined;
    }
    
    return fornecedor;
  }

  async getFornecedoresByEmpresa(empresaId: number, userId?: number): Promise<Fornecedor[]> {
    console.log(`[SEGURANÇA] Buscando fornecedores para empresaId: ${empresaId}, userId: ${userId || 'não especificado'}`);
    const fornecedores = Array.from(this.fornecedores.values());
    console.log(`[SEGURANÇA] Total de fornecedores no sistema: ${fornecedores.length}`);
    
    // Aplicar filtro rigoroso de segurança
    let result = fornecedores.filter(
      (fornecedor) => fornecedor.empresaId === empresaId
    );
    
    // Se um userId for especificado, aplicamos filtro adicional
    // para garantir isolamento estrito por usuário
    if (userId) {
      result = result.filter(
        (fornecedor) => fornecedor.userId === userId
      );
      console.log(`[SEGURANÇA ESTRITA] Aplicando filtro adicional por userId: ${userId}`);
    }
    
    console.log(`[SEGURANÇA] Fornecedores encontrados após filtros: ${result.length}`);
    return result;
  }

  async createFornecedor(fornecedor: InsertFornecedor): Promise<Fornecedor> {
    const id = this.fornecedorId++;
    const timestamp = new Date();
    const newFornecedor: Fornecedor = { 
      id, 
      nome: fornecedor.nome,
      descricao: fornecedor.descricao || null,
      website: fornecedor.website || null,
      logo: fornecedor.logo || null,
      status: fornecedor.status,
      userId: fornecedor.userId,
      empresaId: fornecedor.empresaId || 1, // Adicionar empresaId (empresa padrão = 1 se não fornecido)
      createdAt: timestamp
    };
    this.fornecedores.set(id, newFornecedor);
    return newFornecedor;
  }

  async updateFornecedor(id: number, fornecedorData: Partial<InsertFornecedor>): Promise<Fornecedor | undefined> {
    const fornecedor = this.fornecedores.get(id);
    if (!fornecedor) return undefined;
    
    const updatedFornecedor: Fornecedor = { 
      ...fornecedor,
      nome: fornecedorData.nome !== undefined ? fornecedorData.nome : fornecedor.nome,
      descricao: fornecedorData.descricao !== undefined ? fornecedorData.descricao : fornecedor.descricao,
      website: fornecedorData.website !== undefined ? fornecedorData.website : fornecedor.website,
      logo: fornecedorData.logo !== undefined ? fornecedorData.logo : fornecedor.logo,
      status: fornecedorData.status !== undefined ? fornecedorData.status : fornecedor.status,
      userId: fornecedorData.userId !== undefined ? fornecedorData.userId : fornecedor.userId,
      empresaId: fornecedorData.empresaId !== undefined ? fornecedorData.empresaId : fornecedor.empresaId,
    };
    this.fornecedores.set(id, updatedFornecedor);
    return updatedFornecedor;
  }

  async deleteFornecedor(id: number): Promise<boolean> {
    return this.fornecedores.delete(id);
  }
  
  // Supplier methods (fornecedores de gift cards)
  async getSuppliers(userId: number, empresaId?: number): Promise<Supplier[]> {
    // Aplicar filtro rigoroso para garantir isolamento de dados por usuário
    let suppliers = Array.from(this.suppliers.values());
    
    // Filtro primário: o supplier DEVE ter sido criado pelo usuário
    suppliers = suppliers.filter(
      (supplier) => supplier.userId === userId
    );
    
    // Se for especificado um empresaId, filtramos adicionalmente por ele
    if (empresaId) {
      suppliers = suppliers.filter(
        (supplier) => supplier.empresaId === empresaId
      );
      console.log(`[SEGURANÇA] Filtrando suppliers por empresaId: ${empresaId}, encontrados: ${suppliers.length}`);
    }
    
    return suppliers;
  }

  async getSupplier(id: number, empresaId?: number): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    
    // Verifica se o supplier pertence à empresa especificada
    if (supplier && empresaId && supplier.empresaId !== empresaId) {
      return undefined;
    }
    
    return supplier;
  }

  async getSuppliersByEmpresa(empresaId: number): Promise<Supplier[]> {
    const suppliers = Array.from(this.suppliers.values());
    
    const result = suppliers.filter(
      (supplier) => supplier.empresaId === empresaId
    );
    
    return result;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const id = this.supplierId++;
    const timestamp = new Date();
    const newSupplier: Supplier = { 
      id, 
      nome: supplier.nome,
      cnpj: supplier.cnpj || null,
      email: supplier.email || null,
      telefone: supplier.telefone || null,
      endereco: supplier.endereco || null,
      cidade: supplier.cidade || null,
      estado: supplier.estado || null,
      website: supplier.website || null,
      logo: supplier.logo || null,
      desconto: supplier.desconto || 0,
      observacoes: supplier.observacoes || null,
      status: supplier.status || "ativo",
      userId: supplier.userId,
      empresaId: supplier.empresaId || 1,
      createdAt: timestamp,
      updatedAt: null
    };
    this.suppliers.set(id, newSupplier);
    return newSupplier;
  }

  async updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const supplier = this.suppliers.get(id);
    if (!supplier) return undefined;
    
    const timestamp = new Date();
    const updatedSupplier: Supplier = { 
      ...supplier,
      nome: supplierData.nome !== undefined ? supplierData.nome : supplier.nome,
      cnpj: supplierData.cnpj !== undefined ? supplierData.cnpj : supplier.cnpj,
      email: supplierData.email !== undefined ? supplierData.email : supplier.email,
      telefone: supplierData.telefone !== undefined ? supplierData.telefone : supplier.telefone,
      endereco: supplierData.endereco !== undefined ? supplierData.endereco : supplier.endereco,
      cidade: supplierData.cidade !== undefined ? supplierData.cidade : supplier.cidade,
      estado: supplierData.estado !== undefined ? supplierData.estado : supplier.estado,
      website: supplierData.website !== undefined ? supplierData.website : supplier.website,
      logo: supplierData.logo !== undefined ? supplierData.logo : supplier.logo,
      desconto: supplierData.desconto !== undefined ? supplierData.desconto : supplier.desconto,
      observacoes: supplierData.observacoes !== undefined ? supplierData.observacoes : supplier.observacoes,
      status: supplierData.status !== undefined ? supplierData.status : supplier.status,
      userId: supplierData.userId !== undefined ? supplierData.userId : supplier.userId,
      empresaId: supplierData.empresaId !== undefined ? supplierData.empresaId : supplier.empresaId,
      updatedAt: timestamp
    };
    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    return this.suppliers.delete(id);
  }

  // Gift Card methods (anteriormente cards)
  async getGiftCards(userId: number, fornecedorId?: number, empresaId?: number, perfilId?: number): Promise<GiftCard[]> {
    // Aplicar filtro rigoroso de usuário e empresa para garantir isolamento de dados
    let giftCards = Array.from(this.giftCards.values());
    
    // Registrar para fins de segurança e auditoria
    console.log(`[SEGURANÇA] Obtendo gift cards para usuário ID ${userId}, perfil ID ${perfilId || 'não especificado'}, empresa ID ${empresaId || 'não especificada'}`);
    
    // Filtro primário: o gift card DEVE pertencer à empresa do usuário
    giftCards = giftCards.filter(giftCard => 
      // Garantir que o card pertença à empresa especificada, se fornecida
      (empresaId ? giftCard.empresaId === empresaId : true)
    );
    
    // Aplicar filtro adicional com base no perfil do usuário
    // Se o perfil não for especificado ou se for um perfil não-administrativo (não 1 e não 2),
    // mostrar apenas os gift cards do próprio usuário
    if (!perfilId || (perfilId !== 1 && perfilId !== 2)) {
      console.log(`[SEGURANÇA] Aplicando restrição de usuário ID ${userId} (perfil ${perfilId || 'não especificado'} não é admin/gerente)`);
      giftCards = giftCards.filter(giftCard => giftCard.userId === userId);
    } 
    // Para gerentes (perfilId === 2), já garantimos que estamos filtrando pela empresaId acima
    // Para admins (perfilId === 1), não aplicamos restrições adicionais
    
    // Aplicar filtro por fornecedor, se especificado
    if (fornecedorId) {
      giftCards = giftCards.filter(giftCard => giftCard.fornecedorId === fornecedorId);
    }
    
    console.log(`[SEGURANÇA] Retornando ${giftCards.length} gift cards para o usuário ${userId}, empresa ${empresaId || 'não especificada'}`);
    
    // Para cada gift card, calculamos o valor pendente
    const giftCardsComValorPendente = giftCards.map((giftCard) => {
      const transacoes = Array.from(this.transacoes.values()).filter(
        transacao => transacao.giftCardId === giftCard.id && transacao.status === "Concluída"
      );
      
      // Calcula o valor total das transações
      const valorTotalTransacoes = transacoes.reduce((total, transacao) => total + transacao.valor, 0);
      
      // Atualiza o valor pendente como valorInicial - valorTotalTransacoes
      const valorPendente = Math.max(0, giftCard.valorInicial - valorTotalTransacoes);
      
      return {
        ...giftCard,
        valorPendente
      } as GiftCard;
    });
    
    return giftCardsComValorPendente;
  }

  async getGiftCardsByEmpresa(empresaId: number): Promise<GiftCard[]> {
    // Filtro estrito por empresa para garantir isolamento de dados
    console.log(`[SEGURANÇA] Buscando gift cards para empresa ${empresaId}`);
    
    let giftCards = Array.from(this.giftCards.values()).filter(
      (giftCard) => giftCard.empresaId === empresaId
    );
    
    console.log(`[SEGURANÇA] Encontrados ${giftCards.length} gift cards para empresa ${empresaId}`);
    
    // Para cada gift card, calculamos o valor pendente
    const giftCardsComValorPendente = giftCards.map((giftCard) => {
      const transacoes = Array.from(this.transacoes.values()).filter(
        transacao => transacao.giftCardId === giftCard.id && transacao.status === "Concluída"
      );
      
      // Calcula o valor total das transações
      const valorTotalTransacoes = transacoes.reduce((total, transacao) => total + transacao.valor, 0);
      
      // Atualiza o valor pendente como valorInicial - valorTotalTransacoes
      const valorPendente = Math.max(0, giftCard.valorInicial - valorTotalTransacoes);
      
      return {
        ...giftCard,
        valorPendente
      } as GiftCard;
    });
    
    return giftCardsComValorPendente;
  }

  async getGiftCard(id: number, empresaId?: number): Promise<GiftCard | undefined> {
    const giftCard = this.giftCards.get(id);
    
    // Verifica se o gift card pertence à empresa especificada
    if (giftCard && empresaId && giftCard.empresaId !== empresaId) {
      return undefined;
    }
    
    if (giftCard) {
      const transacoes = Array.from(this.transacoes.values()).filter(
        transacao => transacao.giftCardId === giftCard.id && transacao.status === "Concluída"
      );
      
      // Calcula o valor total das transações
      const valorTotalTransacoes = transacoes.reduce((total, transacao) => total + transacao.valor, 0);
      
      // Atualiza o valor pendente como valorInicial - valorTotalTransacoes
      const valorPendente = Math.max(0, giftCard.valorInicial - valorTotalTransacoes);
      
      return {
        ...giftCard,
        valorPendente
      } as GiftCard;
    }
    
    return undefined;
  }
  
  async createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard> {
    const id = this.giftCardId++;
    const timestamp = new Date();
    
    // Garantir tratamento adequado dos valores específicos para economia e pagamento
    const valorInicial = giftCard.valorInicial;
    const valorPago = giftCard.valorPago !== undefined ? giftCard.valorPago : valorInicial;
    const percentualDesconto = giftCard.percentualDesconto !== undefined ? giftCard.percentualDesconto : 0;
    
    const newGiftCard: GiftCard = {
      id,
      codigo: giftCard.codigo,
      valorInicial: valorInicial,
      saldoAtual: giftCard.saldoAtual || valorInicial,
      dataValidade: giftCard.dataValidade || null,
      fornecedorId: giftCard.fornecedorId,
      userId: giftCard.userId,
      empresaId: giftCard.empresaId,
      status: giftCard.status || "ativo",
      pin: giftCard.pin || null,
      observacoes: giftCard.observacoes || null,
      categorias: giftCard.categorias || null,
      imagemUrl: giftCard.imagemUrl || null,
      dataCadastro: timestamp,
      ultimaAtualizacao: null,
      dataUtilizacao: null,
      dataRecarga: null,
      valorRecarga: null,
      ordemCompra: giftCard.ordemCompra || null,
      ordemInterna: giftCard.ordemInterna || null,
      ordemUsado: null,
      createdAt: timestamp,
      updatedAt: null,
      valorPendente: giftCard.valorPendente !== undefined ? giftCard.valorPendente : valorInicial,
      valorPago: valorPago,
      percentualDesconto: percentualDesconto,
      comprador: giftCard.comprador || null,
      login: giftCard.login || null,
      dataCompra: giftCard.dataCompra || timestamp,
      gcNumber: giftCard.gcNumber || null,
      gcPass: giftCard.gcPass || null,
      supplierId: giftCard.supplierId || null
    };
    this.giftCards.set(id, newGiftCard);
    return newGiftCard;
  }
  
  async updateGiftCard(id: number, giftCardData: Partial<InsertGiftCard>): Promise<GiftCard | undefined> {
    const giftCard = this.giftCards.get(id);
    if (!giftCard) return undefined;
    
    const timestamp = new Date();
    const updatedGiftCard: GiftCard = {
      ...giftCard,
      codigo: giftCardData.codigo !== undefined ? giftCardData.codigo : giftCard.codigo,
      valorInicial: giftCardData.valorInicial !== undefined ? giftCardData.valorInicial : giftCard.valorInicial,
      saldoAtual: giftCardData.saldoAtual !== undefined ? giftCardData.saldoAtual : giftCard.saldoAtual,
      dataValidade: giftCardData.dataValidade !== undefined ? giftCardData.dataValidade : giftCard.dataValidade,
      fornecedorId: giftCardData.fornecedorId !== undefined ? giftCardData.fornecedorId : giftCard.fornecedorId,
      userId: giftCardData.userId !== undefined ? giftCardData.userId : giftCard.userId,
      empresaId: giftCardData.empresaId !== undefined ? giftCardData.empresaId : giftCard.empresaId,
      status: giftCardData.status !== undefined ? giftCardData.status : giftCard.status,
      pin: giftCardData.pin !== undefined ? giftCardData.pin : giftCard.pin,
      observacoes: giftCardData.observacoes !== undefined ? giftCardData.observacoes : giftCard.observacoes,
      categorias: giftCardData.categorias !== undefined ? giftCardData.categorias : giftCard.categorias,
      imagemUrl: giftCardData.imagemUrl !== undefined ? giftCardData.imagemUrl : giftCard.imagemUrl,
      ordemCompra: giftCardData.ordemCompra !== undefined ? giftCardData.ordemCompra : giftCard.ordemCompra,
      ordemInterna: giftCardData.ordemInterna !== undefined ? giftCardData.ordemInterna : giftCard.ordemInterna,
      valorPago: giftCardData.valorPago !== undefined ? giftCardData.valorPago : giftCard.valorPago,
      valorPendente: giftCardData.valorPendente !== undefined ? giftCardData.valorPendente : giftCard.valorPendente,
      percentualDesconto: giftCardData.percentualDesconto !== undefined ? giftCardData.percentualDesconto : giftCard.percentualDesconto,
      supplierId: giftCardData.supplierId !== undefined ? giftCardData.supplierId : giftCard.supplierId,
      updatedAt: timestamp
    };
    this.giftCards.set(id, updatedGiftCard);
    return updatedGiftCard;
  }
  
  async deleteGiftCard(id: number): Promise<boolean> {
    return this.giftCards.delete(id);
  }
  
  async searchGiftCards(userId: number, searchTerm: string, perfilId?: number): Promise<GiftCard[]> {
    const lowercaseSearchTerm = searchTerm.toLowerCase();
    // Passa o perfilId para garantir a aplicação das restrições baseadas em perfil
    const giftCards = await this.getGiftCards(userId, undefined, undefined, perfilId);
    
    return giftCards.filter(giftCard => {
      // Busca no código, observações, etc.
      return giftCard.codigo.toLowerCase().includes(lowercaseSearchTerm) ||
             (giftCard.observacoes && giftCard.observacoes.toLowerCase().includes(lowercaseSearchTerm)) ||
             (giftCard.ordemCompra && giftCard.ordemCompra.toLowerCase().includes(lowercaseSearchTerm)) ||
             (giftCard.ordemInterna && giftCard.ordemInterna.toLowerCase().includes(lowercaseSearchTerm));
    });
  }
  
  async getGiftCardsVencimento(userId: number, dias: number, perfilId?: number): Promise<GiftCard[]> {
    const dataAtual = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() + dias);
    
    // Passamos o perfilId para aplicar as restrições adequadas
    const giftCards = await this.getGiftCards(userId, undefined, undefined, perfilId);
    
    return giftCards.filter(giftCard => {
      if (!giftCard.dataValidade) return false;
      
      const dataValidade = new Date(giftCard.dataValidade);
      return dataValidade >= dataAtual && dataValidade <= dataLimite;
    });
  }
  
  async getGiftCardsByTag(tagId: number, empresaId?: number, userId?: number, perfilId?: number): Promise<GiftCard[]> {
    // Registrar para fins de auditoria
    console.log(`[SEGURANÇA] Buscando gift cards com tag ${tagId}, empresaId: ${empresaId || 'não especificado'}, userId: ${userId || 'não especificado'}, perfilId: ${perfilId || 'não especificado'}`);
    
    // Encontra todos os GiftCardTag com o tagId fornecido
    const giftCardTags = Array.from(this.giftCardTags.values()).filter(
      giftCardTag => giftCardTag.tagId === tagId
    );
    
    // Para cada giftCardId, encontrar o gift card correspondente
    const giftCardIds = giftCardTags.map(tag => tag.giftCardId);
    
    // Aplicar filtros de segurança para garantir isolamento de dados
    let giftCards = Array.from(this.giftCards.values()).filter(
      giftCard => giftCardIds.includes(giftCard.id)
    );
    
    // Se um empresaId for fornecido, filtrar adicionalmente por ele
    if (empresaId) {
      giftCards = giftCards.filter(giftCard => giftCard.empresaId === empresaId);
    }
    
    // Aplicar filtros baseados no perfil do usuário
    // Se não for admin (perfilId 1) ou gerente (perfilId 2), restringir apenas aos gift cards do próprio usuário
    if (userId && perfilId && perfilId !== 1 && perfilId !== 2) {
      giftCards = giftCards.filter(giftCard => giftCard.userId === userId);
    } 
    // Se for gerente (perfilId 2), já filtramos por empresa
    // Para usuários comuns e convidados, sempre filtrar por userId
    else if (userId && !perfilId) {
      giftCards = giftCards.filter(giftCard => giftCard.userId === userId);
    }
    
    console.log(`[SEGURANÇA] Retornando ${giftCards.length} gift cards para tag ${tagId}`);
    
    return giftCards;
  }
  
  // Transações
  async getTransacoes(giftCardId: number, empresaId?: number): Promise<Transacao[]> {
    let transacoes = Array.from(this.transacoes.values()).filter(
      transacao => transacao.giftCardId === giftCardId
    );
    
    // Se for especificado um empresaId, filtramos por ele
    if (empresaId) {
      transacoes = transacoes.filter(transacao => transacao.empresaId === empresaId);
    }
    
    // Ordenar por data mais recente
    return transacoes.sort((a, b) => 
      new Date(b.dataTransacao).getTime() - new Date(a.dataTransacao).getTime()
    );
  }
  
  async getTransacoesByEmpresa(empresaId: number): Promise<Transacao[]> {
    return Array.from(this.transacoes.values()).filter(
      transacao => transacao.empresaId === empresaId
    );
  }
  
  async getTransacao(id: number, empresaId?: number): Promise<Transacao | undefined> {
    const transacao = this.transacoes.get(id);
    
    // Verifica se a transação pertence à empresa especificada
    if (transacao && empresaId && transacao.empresaId !== empresaId) {
      return undefined;
    }
    
    return transacao;
  }
  
  async createTransacao(transacao: InsertTransacao): Promise<Transacao> {
    const id = this.transacaoId++;
    const timestamp = new Date();
    const newTransacao: Transacao = {
      id,
      giftCardId: transacao.giftCardId,
      giftCardIds: transacao.giftCardIds,
      userId: transacao.userId,
      empresaId: transacao.empresaId,
      valor: transacao.valor,
      dataTransacao: transacao.dataTransacao || timestamp,
      descricao: transacao.descricao,
      status: transacao.status || "pendente", // Corrigido para minúsculas
      comprovante: transacao.comprovante || null,
      motivoCancelamento: transacao.motivoCancelamento || null,
      ordemCompra: transacao.ordemCompra || null,
      ordemInterna: transacao.ordemInterna || null,
      nomeUsuario: transacao.nomeUsuario || null,
      refundDe: transacao.refundDe || null,
      valorRefund: transacao.valorRefund || null,
      motivoRefund: transacao.motivoRefund || null,
      createdAt: timestamp,
      updatedAt: null
    };
    this.transacoes.set(id, newTransacao);
    
    // Atualizar o saldo do gift card se a transação for concluída
    if (newTransacao.status === "concluida") {
      // Atualizar o gift card principal
      const giftCard = this.giftCards.get(newTransacao.giftCardId);
      if (giftCard) {
        const novoSaldo = Math.max(0, giftCard.saldoAtual - newTransacao.valor);
        this.updateGiftCard(giftCard.id, { saldoAtual: novoSaldo });
      }
      
      // Verificar se temos mais gift cards na lista giftCardIds
      if (newTransacao.giftCardIds && newTransacao.giftCardIds !== String(newTransacao.giftCardId)) {
        const idsArray = newTransacao.giftCardIds.split(',').map(id => parseInt(id.trim()));
        
        // Atualizar cada gift card adicional na lista
        for (const gcId of idsArray) {
          if (gcId !== newTransacao.giftCardId) { // Evitar atualizar o mesmo cartão duas vezes
            const additionalGiftCard = this.giftCards.get(gcId);
            if (additionalGiftCard) {
              const novoSaldo = Math.max(0, additionalGiftCard.saldoAtual - newTransacao.valor);
              this.updateGiftCard(additionalGiftCard.id, { saldoAtual: novoSaldo });
            }
          }
        }
      }
    }
    
    return newTransacao;
  }
  
  async updateTransacao(id: number, transacaoData: Partial<InsertTransacao>): Promise<Transacao | undefined> {
    const transacao = this.transacoes.get(id);
    if (!transacao) return undefined;
    
    const oldStatus = transacao.status;
    const timestamp = new Date();
    const updatedTransacao: Transacao = {
      ...transacao,
      valor: transacaoData.valor !== undefined ? transacaoData.valor : transacao.valor,
      dataTransacao: transacaoData.dataTransacao !== undefined ? transacaoData.dataTransacao : transacao.dataTransacao,
      descricao: transacaoData.descricao !== undefined ? transacaoData.descricao : transacao.descricao,
      status: transacaoData.status !== undefined ? transacaoData.status : transacao.status,
      comprovante: transacaoData.comprovante !== undefined ? transacaoData.comprovante : transacao.comprovante,
      motivoCancelamento: transacaoData.motivoCancelamento !== undefined ? transacaoData.motivoCancelamento : transacao.motivoCancelamento,
      ordemCompra: transacaoData.ordemCompra !== undefined ? transacaoData.ordemCompra : transacao.ordemCompra,
      ordemInterna: transacaoData.ordemInterna !== undefined ? transacaoData.ordemInterna : transacao.ordemInterna,
      nomeUsuario: transacaoData.nomeUsuario !== undefined ? transacaoData.nomeUsuario : transacao.nomeUsuario,
      refundDe: transacaoData.refundDe !== undefined ? transacaoData.refundDe : transacao.refundDe,
      valorRefund: transacaoData.valorRefund !== undefined ? transacaoData.valorRefund : transacao.valorRefund,
      motivoRefund: transacaoData.motivoRefund !== undefined ? transacaoData.motivoRefund : transacao.motivoRefund,
      updatedAt: timestamp
    };
    this.transacoes.set(id, updatedTransacao);
    
    // Se o status mudou para "concluida", atualizar o saldo do gift card
    if (oldStatus !== "concluida" && updatedTransacao.status === "concluida") {
      // Atualizar o gift card principal
      const giftCard = this.giftCards.get(updatedTransacao.giftCardId);
      if (giftCard) {
        const novoSaldo = Math.max(0, giftCard.saldoAtual - updatedTransacao.valor);
        this.updateGiftCard(giftCard.id, { saldoAtual: novoSaldo });
      }
      
      // Verificar se temos mais gift cards na lista giftCardIds
      if (updatedTransacao.giftCardIds && updatedTransacao.giftCardIds !== String(updatedTransacao.giftCardId)) {
        const idsArray = updatedTransacao.giftCardIds.split(',').map(id => parseInt(id.trim()));
        
        // Atualizar cada gift card adicional na lista
        for (const gcId of idsArray) {
          if (gcId !== updatedTransacao.giftCardId) { // Evitar atualizar o mesmo cartão duas vezes
            const additionalGiftCard = this.giftCards.get(gcId);
            if (additionalGiftCard) {
              const novoSaldo = Math.max(0, additionalGiftCard.saldoAtual - updatedTransacao.valor);
              this.updateGiftCard(additionalGiftCard.id, { saldoAtual: novoSaldo });
            }
          }
        }
      }
    }
    // Se o status mudou de "concluida" para outro estado, restaurar o saldo
    else if (oldStatus === "concluida" && updatedTransacao.status !== "concluida") {
      // Restaurar o saldo do gift card principal
      const giftCard = this.giftCards.get(updatedTransacao.giftCardId);
      if (giftCard) {
        const novoSaldo = giftCard.saldoAtual + updatedTransacao.valor;
        this.updateGiftCard(giftCard.id, { saldoAtual: novoSaldo });
      }
      
      // Verificar se temos mais gift cards na lista giftCardIds
      if (updatedTransacao.giftCardIds && updatedTransacao.giftCardIds !== String(updatedTransacao.giftCardId)) {
        const idsArray = updatedTransacao.giftCardIds.split(',').map(id => parseInt(id.trim()));
        
        // Restaurar o saldo de cada gift card adicional na lista
        for (const gcId of idsArray) {
          if (gcId !== updatedTransacao.giftCardId) { // Evitar atualizar o mesmo cartão duas vezes
            const additionalGiftCard = this.giftCards.get(gcId);
            if (additionalGiftCard) {
              const novoSaldo = additionalGiftCard.saldoAtual + updatedTransacao.valor;
              this.updateGiftCard(additionalGiftCard.id, { saldoAtual: novoSaldo });
            }
          }
        }
      }
    }
    
    return updatedTransacao;
  }
  
  async deleteTransacao(id: number): Promise<boolean> {
    const transacao = this.transacoes.get(id);
    if (!transacao) return false;
    
    // Se for uma transação concluída, restaurar o saldo do gift card
    if (transacao.status === "concluida") {
      // Restaurar o saldo do gift card principal
      const giftCard = this.giftCards.get(transacao.giftCardId);
      if (giftCard) {
        const novoSaldo = giftCard.saldoAtual + transacao.valor;
        this.updateGiftCard(giftCard.id, { saldoAtual: novoSaldo });
      }
      
      // Verificar se temos mais gift cards na lista giftCardIds
      if (transacao.giftCardIds && transacao.giftCardIds !== String(transacao.giftCardId)) {
        const idsArray = transacao.giftCardIds.split(',').map(id => parseInt(id.trim()));
        
        // Restaurar o saldo de cada gift card adicional na lista
        for (const gcId of idsArray) {
          if (gcId !== transacao.giftCardId) { // Evitar atualizar o mesmo cartão duas vezes
            const additionalGiftCard = this.giftCards.get(gcId);
            if (additionalGiftCard) {
              const novoSaldo = additionalGiftCard.saldoAtual + transacao.valor;
              this.updateGiftCard(additionalGiftCard.id, { saldoAtual: novoSaldo });
            }
          }
        }
      }
    }
    
    return this.transacoes.delete(id);
  }

  // Tags
  async getTags(empresaId?: number): Promise<Tag[]> {
    let tags = Array.from(this.tags.values());
    
    // Se empresaId for fornecido, filtrar por empresa
    if (empresaId) {
      tags = tags.filter(tag => tag.empresaId === empresaId);
    }
    
    return tags;
  }
  
  async getTag(id: number, empresaId?: number): Promise<Tag | undefined> {
    const tag = this.tags.get(id);
    
    // Verifica se a tag pertence à empresa especificada
    if (tag && empresaId && tag.empresaId !== empresaId) {
      return undefined;
    }
    
    return tag;
  }
  
  async getTagsByEmpresa(empresaId: number): Promise<Tag[]> {
    return Array.from(this.tags.values()).filter(
      tag => tag.empresaId === empresaId
    );
  }
  
  async createTag(tag: InsertTag): Promise<Tag> {
    const id = this.tagId++;
    const timestamp = new Date();
    const newTag: Tag = {
      id,
      nome: tag.nome,
      cor: tag.cor || "#cccccc",
      empresaId: tag.empresaId,
      descricao: tag.descricao || null,
      createdAt: timestamp,
      updatedAt: null
    };
    this.tags.set(id, newTag);
    return newTag;
  }
  
  // Gift Card Tags (relacionamento entre gift cards e tags)
  async getGiftCardTags(giftCardId: number, empresaId?: number): Promise<Tag[]> {
    // Log para auditoria de segurança
    console.log(`[SEGURANÇA] Buscando tags para gift card ${giftCardId}, empresaId: ${empresaId || 'não especificado'}`);
    
    // Verificar primeiro se o gift card existe e é da empresa correta (se empresaId for fornecido)
    if (empresaId) {
      const giftCard = await this.getGiftCard(giftCardId);
      if (!giftCard || giftCard.empresaId !== empresaId) {
        console.log(`[SEGURANÇA] Gift card ${giftCardId} não pertence à empresa ${empresaId} ou não existe`);
        return []; // Retorna array vazio se o gift card não pertencer à empresa
      }
    }
    
    // Encontra os relacionamentos para este gift card
    const giftCardTagRelations = Array.from(this.giftCardTags.values()).filter(
      rel => rel.giftCardId === giftCardId
    );
    
    // Extrai os IDs das tags
    const tagIds = giftCardTagRelations.map(rel => rel.tagId);
    
    // Busca as tags pelo ID
    let tags = Array.from(this.tags.values()).filter(
      tag => tagIds.includes(tag.id)
    );
    
    // Se empresaId for fornecido, filtrar as tags por empresa
    if (empresaId) {
      tags = tags.filter(tag => tag.empresaId === empresaId);
    }
    
    console.log(`[SEGURANÇA] Retornando ${tags.length} tags para gift card ${giftCardId}`);
    
    return tags;
  }
  
  async addTagToGiftCard(giftCardId: number, tagId: number, empresaId?: number): Promise<GiftCardTag> {
    // Log para auditoria de segurança
    console.log(`[SEGURANÇA] Adicionando tag ${tagId} ao gift card ${giftCardId}, empresaId: ${empresaId || 'não especificado'}`);
    
    // Verificar se o gift card e a tag pertencem à mesma empresa, se empresaId fornecido
    if (empresaId) {
      const giftCard = await this.getGiftCard(giftCardId);
      const tag = await this.getTag(tagId);
      
      if (!giftCard || giftCard.empresaId !== empresaId) {
        console.log(`[SEGURANÇA] Gift card ${giftCardId} não pertence à empresa ${empresaId}`);
        throw new Error(`Gift card não pertence à empresa ${empresaId}`);
      }
      
      if (!tag || tag.empresaId !== empresaId) {
        console.log(`[SEGURANÇA] Tag ${tagId} não pertence à empresa ${empresaId}`);
        throw new Error(`Tag não pertence à empresa ${empresaId}`);
      }
    }
    
    // Verificar se o relacionamento já existe
    const existingRelation = Array.from(this.giftCardTags.values()).find(
      rel => rel.giftCardId === giftCardId && rel.tagId === tagId
    );
    
    if (existingRelation) {
      return existingRelation;
    }
    
    const id = this.giftCardTagId++;
    const timestamp = new Date();
    const newGiftCardTag: GiftCardTag = {
      id,
      giftCardId,
      tagId,
      createdAt: timestamp
    };
    
    this.giftCardTags.set(id, newGiftCardTag);
    console.log(`[SEGURANÇA] Tag ${tagId} adicionada com sucesso ao gift card ${giftCardId}`);
    return newGiftCardTag;
  }
  
  async removeTagFromGiftCard(giftCardId: number, tagId: number, empresaId?: number): Promise<boolean> {
    // Log para auditoria de segurança
    console.log(`[SEGURANÇA] Removendo tag ${tagId} do gift card ${giftCardId}, empresaId: ${empresaId || 'não especificado'}`);
    
    // Verificar se o gift card e a tag pertencem à mesma empresa, se empresaId fornecido
    if (empresaId) {
      const giftCard = await this.getGiftCard(giftCardId);
      const tag = await this.getTag(tagId);
      
      if (!giftCard || giftCard.empresaId !== empresaId) {
        console.log(`[SEGURANÇA] Gift card ${giftCardId} não pertence à empresa ${empresaId}`);
        throw new Error(`Gift card não pertence à empresa ${empresaId}`);
      }
      
      if (!tag || tag.empresaId !== empresaId) {
        console.log(`[SEGURANÇA] Tag ${tagId} não pertence à empresa ${empresaId}`);
        throw new Error(`Tag não pertence à empresa ${empresaId}`);
      }
    }

    // Encontrar o relacionamento
    const relation = Array.from(this.giftCardTags.values()).find(
      rel => rel.giftCardId === giftCardId && rel.tagId === tagId
    );
    
    if (!relation) {
      console.log(`[SEGURANÇA] Relação entre gift card ${giftCardId} e tag ${tagId} não encontrada`);
      return false;
    }
    
    const result = this.giftCardTags.delete(relation.id);
    console.log(`[SEGURANÇA] Tag ${tagId} removida ${result ? 'com sucesso' : 'sem sucesso'} do gift card ${giftCardId}`);
    return result;
  }

  // Inicialização dos dados demo
  private initializeDemoData() {
    // Inicializa dados da empresa
    const demoEmpresa: InsertEmpresa = {
      nome: "CardVault Inc.",
      cnpj: "12.345.678/0001-99",
      email: "contato@cardvault.com",
      telefone: "+55 11 1234-5678",
      plano: "empresarial",
      status: "ativo",
      dataExpiracao: new Date("2026-12-31"),
      logoUrl: "https://logo.cardvault.com/logo.png",
      corPrimaria: "#4361ee",
      endereco: "Av. Paulista, 1000",
      cidade: "São Paulo",
      estado: "SP",
      cep: "01310-100",
      limiteUsuarios: 50
    };
    
    this.createEmpresa(demoEmpresa).then(empresa => {
      console.log("Empresa demo criada com ID:", empresa.id);
      
      // Criar perfis padrão
      const perfisData: InsertPerfil[] = [
        {
          nome: "admin",
          descricao: "Administrador do sistema com acesso total",
          permissoes: [
            "user.view", "user.create", "user.edit", "user.delete",
            "perfil.view", "perfil.create", "perfil.edit", "perfil.delete",
            "fornecedor.view", "fornecedor.create", "fornecedor.edit", "fornecedor.delete",
            "giftcard.view", "giftcard.create", "giftcard.edit", "giftcard.delete",
            "transacao.view", "transacao.create", "transacao.edit", "transacao.delete",
            "tag.view", "tag.create", "tag.edit", "tag.delete",
            "relatorio.view", "relatorio.export"
          ]
        },
        {
          nome: "gerente",
          descricao: "Gerente com acesso a relatórios e gerenciamento de equipe",
          permissoes: [
            "user.view",
            "fornecedor.view", "fornecedor.create", "fornecedor.edit",
            "giftcard.view", "giftcard.create", "giftcard.edit",
            "transacao.view", "transacao.create", "transacao.edit",
            "tag.view", "tag.create", "tag.edit",
            "relatorio.view", "relatorio.export"
          ]
        },
        {
          nome: "usuario",
          descricao: "Usuário regular com acesso básico",
          permissoes: [
            "fornecedor.view",
            "giftcard.view", "giftcard.create", "giftcard.edit",
            "transacao.view", "transacao.create",
            "tag.view", "tag.create"
          ]
        },
        {
          nome: "convidado",
          descricao: "Usuário com acesso somente leitura",
          permissoes: [
            "fornecedor.view",
            "giftcard.view",
            "transacao.view",
            "tag.view"
          ]
        }
      ];
      
      // Criar perfis no sistema
      Promise.all(perfisData.map(perfil => this.createPerfil(perfil)))
        .then(perfis => {
          // Create demo user
          const demoUser: InsertUser = {
            username: "demo",
            password: "password123",
            email: "demo@example.com",
            nome: "Administrador Demo",
            empresaId: 1, // Empresa criada anteriormente
            avatarUrl: "https://i.pravatar.cc/40?img=68",
            perfilId: perfis[0].id, // Administrador
            status: "ativo"
          };
          
          this.createUser(demoUser).then(user => {
            // Fornecedores (anteriormente collections)
            const fornecedores: InsertFornecedor[] = [
              { nome: "Amazon", descricao: "Gift Cards da Amazon", website: "https://www.amazon.com", logo: "https://logo.clearbit.com/amazon.com", status: "ativo", userId: user.id, empresaId: user.empresaId },
              { nome: "Netflix", descricao: "Gift Cards para assinatura Netflix", website: "https://www.netflix.com", logo: "https://logo.clearbit.com/netflix.com", status: "ativo", userId: user.id, empresaId: user.empresaId },
              { nome: "Spotify", descricao: "Gift Cards para assinatura Spotify", website: "https://www.spotify.com", logo: "https://logo.clearbit.com/spotify.com", status: "ativo", userId: user.id, empresaId: user.empresaId },
              { nome: "Steam", descricao: "Gift Cards para compras na Steam", website: "https://store.steampowered.com", logo: "https://logo.clearbit.com/steampowered.com", status: "ativo", userId: user.id, empresaId: user.empresaId }
            ];
            
            // Criar fornecedores
            Promise.all(fornecedores.map(f => this.createFornecedor(f))).then(() => {
              // Criar suppliers (fornecedores de gift cards)
              const suppliers: InsertSupplier[] = [
                { 
                  nome: "Amazon Brasil", 
                  cnpj: "15.436.940/0001-03", 
                  email: "parceiros@amazon.com.br", 
                  telefone: "+55 11 4134-4000",
                  endereco: "Av. Presidente Juscelino Kubitschek, 2041",
                  cidade: "São Paulo",
                  estado: "SP",
                  website: "https://www.amazon.com.br",
                  logo: "https://logo.clearbit.com/amazon.com.br",
                  desconto: 8.5,
                  observacoes: "Desconto aplicado em todas as compras de gift cards",
                  status: "ativo",
                  userId: user.id,
                  empresaId: user.empresaId
                },
                { 
                  nome: "Netflix Brasil", 
                  cnpj: "13.590.585/0001-99", 
                  email: "empresas@netflix.com.br", 
                  telefone: "+55 11 4800-0800",
                  endereco: "Av. das Nações Unidas, 14171",
                  cidade: "São Paulo",
                  estado: "SP",
                  website: "https://www.netflix.com/br",
                  logo: "https://logo.clearbit.com/netflix.com",
                  desconto: 5.0,
                  observacoes: "Gift cards com desconto para planos anuais",
                  status: "ativo",
                  userId: user.id,
                  empresaId: user.empresaId
                },
                { 
                  nome: "Spotify Brasil", 
                  cnpj: "17.004.143/0001-53", 
                  email: "b2b@spotify.com.br", 
                  telefone: "+55 11 3500-5000",
                  endereco: "Rua Wisard, 305",
                  cidade: "São Paulo",
                  estado: "SP",
                  website: "https://www.spotify.com/br",
                  logo: "https://logo.clearbit.com/spotify.com",
                  desconto: 10.0,
                  observacoes: "Assinaturas com 10% de desconto para empresas",
                  status: "ativo",
                  userId: user.id,
                  empresaId: user.empresaId
                },
                { 
                  nome: "Valve Corporation", 
                  cnpj: null, 
                  email: "b2b@steampowered.com", 
                  telefone: "+1 425-889-9642",
                  endereco: "10400 NE 4th St",
                  cidade: "Bellevue",
                  estado: "WA",
                  website: "https://store.steampowered.com",
                  logo: "https://logo.clearbit.com/steampowered.com",
                  desconto: 3.0,
                  observacoes: "Programas de desconto para compras em volume",
                  status: "ativo",
                  userId: user.id,
                  empresaId: user.empresaId
                }
              ];
              
              // Criar suppliers no sistema
              Promise.all(suppliers.map(s => this.createSupplier(s))).then(() => {
                console.log("Dados demo inicializados com sucesso");
              });
            });
          });
        });
    });
  }
}

// Implementação da interface IStorage utilizando banco de dados PostgreSQL
class DatabaseStorage implements IStorage {
  constructor() {
    // Inicializar dados de demonstração quando instanciado
    this.initializeDemoData().catch(err => {
      console.error("Erro ao inicializar dados de demonstração:", err);
    });
  }
  // Empresa methods
  async getEmpresas(): Promise<Empresa[]> {
    return await db.select().from(empresas);
  }

  async getEmpresa(id: number): Promise<Empresa | undefined> {
    const [empresa] = await db.select().from(empresas).where(eq(empresas.id, id));
    return empresa;
  }

  async getEmpresaByNome(nome: string): Promise<Empresa | undefined> {
    const [empresa] = await db.select().from(empresas).where(eq(empresas.nome, nome));
    return empresa;
  }

  async createEmpresa(empresa: InsertEmpresa): Promise<Empresa> {
    const [newEmpresa] = await db.insert(empresas).values({
      nome: empresa.nome,
      cnpj: empresa.cnpj,
      email: empresa.email,
      telefone: empresa.telefone,
      plano: empresa.plano,
      status: empresa.status,
      dataExpiracao: empresa.dataExpiracao,
      logoUrl: empresa.logoUrl || null,
      corPrimaria: empresa.corPrimaria || null,
      endereco: empresa.endereco || null,
      cidade: empresa.cidade || null,
      estado: empresa.estado || null,
      cep: empresa.cep || null,
      limiteUsuarios: empresa.limiteUsuarios || 5
    }).returning();
    return newEmpresa;
  }

  async updateEmpresa(id: number, empresaData: Partial<InsertEmpresa>): Promise<Empresa | undefined> {
    const [updatedEmpresa] = await db.update(empresas)
      .set({
        ...empresaData,
        updatedAt: new Date()
      })
      .where(eq(empresas.id, id))
      .returning();
    return updatedEmpresa;
  }

  async deleteEmpresa(id: number): Promise<boolean> {
    const result = await db.delete(empresas).where(eq(empresas.id, id));
    return result.rowCount > 0;
  }
  
  // Perfil methods
  async getPerfis(): Promise<Perfil[]> {
    return await db.select().from(perfis);
  }

  async getPerfil(id: number): Promise<Perfil | undefined> {
    const [perfil] = await db.select().from(perfis).where(eq(perfis.id, id));
    return perfil;
  }

  async getPerfilByNome(nome: string): Promise<Perfil | undefined> {
    const [perfil] = await db.select().from(perfis).where(eq(perfis.nome, nome));
    return perfil;
  }

  async createPerfil(perfil: InsertPerfil): Promise<Perfil> {
    const [newPerfil] = await db.insert(perfis).values(perfil).returning();
    return newPerfil;
  }

  async updatePerfil(id: number, perfilData: Partial<InsertPerfil>): Promise<Perfil | undefined> {
    const [updatedPerfil] = await db.update(perfis)
      .set({
        ...perfilData,
        updatedAt: new Date()
      })
      .where(eq(perfis.id, id))
      .returning();
    return updatedPerfil;
  }

  async deletePerfil(id: number): Promise<boolean> {
    const result = await db.delete(perfis).where(eq(perfis.id, id));
    return result.rowCount > 0;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsersByEmpresa(empresaId: number): Promise<User[]> {
    return await db.select().from(users).where(eq(users.empresaId, empresaId));
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values({
      username: user.username,
      password: user.password,
      email: user.email,
      nome: user.nome || null,
      avatarUrl: user.avatarUrl || null,
      perfilId: user.perfilId || 3,
      empresaId: user.empresaId || 1,
      status: user.status || "ativo"
    }).returning();
    return newUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set({
        ...userData,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount > 0;
  }

  async updateUserLastLogin(id: number): Promise<User | undefined> {
    const now = new Date();
    const [updatedUser] = await db.update(users)
      .set({
        ultimoLogin: now,
        updatedAt: now
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserPasswordResetToken(id: number, token: string): Promise<User | undefined> {
    const now = new Date();
    const expireDate = new Date(now);
    expireDate.setHours(expireDate.getHours() + 1); // Token válido por 1 hora
    
    const [updatedUser] = await db.update(users)
      .set({
        tokenReset: token,
        dataExpiracaoToken: expireDate,
        updatedAt: now
      })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  // Fornecedor methods (substitui Collection)
  async getFornecedores(userId: number, empresaId?: number): Promise<Fornecedor[]> {
    console.log(`[AUDITORIA - STORAGE] getFornecedores chamado com userId: ${userId}, empresaId: ${empresaId}`);
    
    // ISOLAMENTO CRÍTICO: Sempre requerer userId como filtro obrigatório
    if (!userId) {
      console.error(`[SEGURANÇA CRÍTICA] Tentativa de acesso sem userId`);
      return []; // Retornar array vazio se não houver userId - bloqueio de segurança
    }
    
    let query = db.select().from(fornecedores).where(eq(fornecedores.userId, userId));
    
    if (empresaId) {
      query = query.where(eq(fornecedores.empresaId, empresaId));
    }
    
    const results = await query;
    console.log(`[AUDITORIA - STORAGE] getFornecedores retornou ${results.length} registros`);
    
    return results;
  }

  async getFornecedor(id: number, empresaId?: number): Promise<Fornecedor | undefined> {
    let query = db.select().from(fornecedores).where(eq(fornecedores.id, id));
    
    if (empresaId) {
      query = query.where(eq(fornecedores.empresaId, empresaId));
    }
    
    const [fornecedor] = await query;
    return fornecedor;
  }

  async getFornecedoresByEmpresa(empresaId: number, userId?: number): Promise<Fornecedor[]> {
    // PATCH DE SEGURANÇA: Implementar filtragem rigorosa por userId
    let query = db.select().from(fornecedores).where(eq(fornecedores.empresaId, empresaId));
    
    // Se um userId for fornecido, aplicar isolamento estrito para mostrar apenas dados do próprio usuário
    if (userId) {
      console.log(`[SEGURANÇA CRÍTICA] Aplicando filtro de userId: ${userId} em getFornecedoresByEmpresa`);
      query = query.where(eq(fornecedores.userId, userId));
    }
    
    return await query;
  }

  async createFornecedor(fornecedor: InsertFornecedor): Promise<Fornecedor> {
    const [newFornecedor] = await db.insert(fornecedores).values({
      nome: fornecedor.nome,
      descricao: fornecedor.descricao || null,
      website: fornecedor.website || null,
      logo: fornecedor.logo || null,
      status: fornecedor.status || "ativo",
      userId: fornecedor.userId,
      empresaId: fornecedor.empresaId || 1
    }).returning();
    return newFornecedor;
  }

  async updateFornecedor(id: number, fornecedorData: Partial<InsertFornecedor>): Promise<Fornecedor | undefined> {
    const [updatedFornecedor] = await db.update(fornecedores)
      .set(fornecedorData)
      .where(eq(fornecedores.id, id))
      .returning();
    return updatedFornecedor;
  }

  async deleteFornecedor(id: number): Promise<boolean> {
    const result = await db.delete(fornecedores).where(eq(fornecedores.id, id));
    return result.rowCount > 0;
  }
  
  // Supplier methods (fornecedores de gift cards)
  async getSuppliers(userId: number, empresaId?: number): Promise<Supplier[]> {
    let query = db.select().from(suppliers).where(eq(suppliers.userId, userId));
    
    if (empresaId) {
      query = query.where(eq(suppliers.empresaId, empresaId));
    }
    
    return await query;
  }

  async getSupplier(id: number, empresaId?: number): Promise<Supplier | undefined> {
    let query = db.select().from(suppliers).where(eq(suppliers.id, id));
    
    if (empresaId) {
      query = query.where(eq(suppliers.empresaId, empresaId));
    }
    
    const [supplier] = await query;
    return supplier;
  }

  async getSuppliersByEmpresa(empresaId: number, userId?: number): Promise<Supplier[]> {
    // PATCH DE SEGURANÇA: Adicionar filtro rigoroso por userId
    let query = db.select().from(suppliers).where(eq(suppliers.empresaId, empresaId));
    
    // Se um userId for fornecido, aplicar isolamento estrito para mostrar apenas dados do próprio usuário
    if (userId) {
      console.log(`[SEGURANÇA CRÍTICA] Aplicando filtro de userId: ${userId} em getSuppliersByEmpresa`);
      query = query.where(eq(suppliers.userId, userId));
    }
    
    return await query;
  }

  async createSupplier(supplier: InsertSupplier): Promise<Supplier> {
    const [newSupplier] = await db.insert(suppliers).values({
      nome: supplier.nome,
      cnpj: supplier.cnpj || null,
      email: supplier.email || null,
      telefone: supplier.telefone || null,
      endereco: supplier.endereco || null,
      cidade: supplier.cidade || null,
      estado: supplier.estado || null,
      descricao: supplier.descricao || null,
      website: supplier.website || null,
      logo: supplier.logo || null,
      desconto: supplier.desconto || null,
      observacoes: supplier.observacoes || null,
      status: supplier.status || "ativo",
      userId: supplier.userId,
      empresaId: supplier.empresaId || 1
    }).returning();
    return newSupplier;
  }

  async updateSupplier(id: number, supplierData: Partial<InsertSupplier>): Promise<Supplier | undefined> {
    const [updatedSupplier] = await db.update(suppliers)
      .set({
        ...supplierData,
        updatedAt: new Date()
      })
      .where(eq(suppliers.id, id))
      .returning();
    return updatedSupplier;
  }

  async deleteSupplier(id: number): Promise<boolean> {
    const result = await db.delete(suppliers).where(eq(suppliers.id, id));
    return result.rowCount > 0;
  }

  // Gift Card methods (substitui Card)
  async getGiftCards(userId: number, fornecedorId?: number, empresaId?: number): Promise<GiftCard[]> {
    console.log(`[AUDITORIA - STORAGE] getGiftCards chamado com userId: ${userId}, fornecedorId: ${fornecedorId || 'não informado'}, empresaId: ${empresaId || 'não informado'}`);
    
    // ISOLAMENTO CRÍTICO: Sempre requerer userId como filtro obrigatório
    if (!userId) {
      console.error(`[SEGURANÇA CRÍTICA] Tentativa de acesso a gift cards sem userId!`);
      return []; // Retornar array vazio se não houver userId - bloqueio de segurança
    }
    
    try {
      // Preparar as condições de filtro
      let conditions = [eq(giftCards.userId, userId)];
      
      // Adicionar filtro de fornecedor se especificado
      if (fornecedorId) {
        console.log(`[AUDITORIA - STORAGE] Aplicando filtro adicional por fornecedorId: ${fornecedorId}`);
        conditions.push(eq(giftCards.fornecedorId, fornecedorId));
      }
      
      // Adicionar filtro de empresa se especificado
      if (empresaId) {
        console.log(`[AUDITORIA - STORAGE] Aplicando filtro adicional por empresaId: ${empresaId}`);
        conditions.push(eq(giftCards.empresaId, empresaId));
      }
      
      // Aplicar todas as condições de uma vez usando and()
      const query = db.select()
        .from(giftCards)
        .where(and(...conditions))
        .orderBy(desc(giftCards.createdAt));
      
      const results = await query;
      console.log(`[AUDITORIA - STORAGE] getGiftCards retornou ${results.length} registros para o usuário ${userId}`);
      
      // SEGURANÇA: Verificação dupla para garantir que todos os registros pertencem ao usuário
      const filteredResults = results.filter(card => card.userId === userId);
      
      // Se houver discrepância, emitir alerta de segurança
      if (filteredResults.length !== results.length) {
        console.error(`[ALERTA DE SEGURANÇA] Detectada discrepância! Filtro SQL retornou ${results.length} cards, mas apenas ${filteredResults.length} pertencem ao usuário ${userId}`);
        console.error(`[SEGURANÇA] IDs dos gift cards na discrepância: ${results.filter(card => card.userId !== userId).map(card => card.id).join(', ')}`);
      }
      
      console.log(`[SEGURANÇA] Encontrados ${filteredResults.length} gift cards do usuário ${userId}`);
      if (filteredResults.length > 0) {
        console.log(`[SEGURANÇA] IDs dos gift cards: ${filteredResults.map(card => card.id).join(', ')}`);
      } else {
        console.log(`[SEGURANÇA] IDs dos gift cards: nenhum`);
      }
      
      return filteredResults; // Retornar apenas dados que pertencem ao usuário autenticado
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar gift cards: ${error}`);
      return []; // Em caso de erro, retornar array vazio para evitar vazamento de dados
    }
  }

  async getGiftCardsByEmpresa(empresaId: number, userId?: number): Promise<GiftCard[]> {
    // PATCH DE SEGURANÇA: Adicionar filtro rigoroso por userId
    console.log(`[AUDITORIA - STORAGE] getGiftCardsByEmpresa chamado com empresaId: ${empresaId}, userId: ${userId || 'não informado'}`);
    
    try {
      // Preparar as condições de filtro
      let conditions = [eq(giftCards.empresaId, empresaId)];
      
      // Se um userId for fornecido, aplicar isolamento estrito para mostrar apenas dados do próprio usuário
      if (userId) {
        console.log(`[SEGURANÇA CRÍTICA] Aplicando filtro de userId: ${userId} em getGiftCardsByEmpresa`);
        conditions.push(eq(giftCards.userId, userId));
      }
      
      // Aplicar todas as condições com and()
      const query = db.select()
        .from(giftCards)
        .where(and(...conditions))
        .orderBy(desc(giftCards.createdAt));
      
      const results = await query;
      console.log(`[AUDITORIA - STORAGE] getGiftCardsByEmpresa retornou ${results.length} registros para empresa ${empresaId}${userId ? ` e usuário ${userId}` : ''}`);
      
      // SEGURANÇA: Verificação dupla para garantir isolamento quando userId especificado
      if (userId) {
        const filteredResults = results.filter(card => card.userId === userId);
        
        // Se houver discrepância, emitir alerta de segurança
        if (filteredResults.length !== results.length) {
          console.error(`[ALERTA DE SEGURANÇA] Detectada discrepância! Filtro SQL retornou ${results.length} cards, mas apenas ${filteredResults.length} pertencem ao usuário ${userId}`);
          return filteredResults; // Retornar apenas dados que pertencem ao usuário autenticado
        }
      }
      
      return results;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar gift cards por empresa: ${error}`);
      return []; // Em caso de erro, retornar array vazio para evitar vazamento de dados
    }
  }

  async getGiftCard(id: number, empresaId?: number): Promise<GiftCard | undefined> {
    console.log(`[AUDITORIA - STORAGE] getGiftCard chamado com id: ${id}, empresaId: ${empresaId || 'não informado'}`);
    
    try {
      // Preparar as condições de filtro
      let conditions = [eq(giftCards.id, id)];
      
      // Se um empresaId for fornecido, adicionar ao filtro
      if (empresaId) {
        console.log(`[SEGURANÇA] Aplicando filtro de empresaId: ${empresaId} em getGiftCard`);
        conditions.push(eq(giftCards.empresaId, empresaId));
      }
      
      // Aplicar todas as condições com and()
      const query = db.select()
        .from(giftCards)
        .where(and(...conditions));
      
      const [giftCard] = await query;
      
      // Registrar resultado da consulta para auditoria
      if (giftCard) {
        console.log(`[AUDITORIA - STORAGE] getGiftCard encontrou gift card id=${id}, empresaId=${giftCard.empresaId}, userId=${giftCard.userId}`);
      } else {
        console.log(`[AUDITORIA - STORAGE] getGiftCard não encontrou gift card com id=${id}${empresaId ? ` e empresaId=${empresaId}` : ''}`);
      }
      
      return giftCard;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar gift card: ${error}`);
      return undefined;
    }
  }

  async createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard> {
    const [newGiftCard] = await db.insert(giftCards).values({
      codigo: giftCard.codigo,
      valorInicial: giftCard.valorInicial,
      saldoAtual: giftCard.saldoAtual || giftCard.valorInicial,
      dataValidade: giftCard.dataValidade || null,
      status: giftCard.status || "ativo",
      fornecedorId: giftCard.fornecedorId,
      supplierId: giftCard.supplierId || null,
      userId: giftCard.userId,
      observacoes: giftCard.observacoes || null,
      empresaId: giftCard.empresaId || 1,
      comprador: giftCard.comprador || null,
      login: giftCard.login || null,
      dataCompra: giftCard.dataCompra || new Date(),
      ordemCompra: giftCard.ordemCompra || null,
      percentualDesconto: giftCard.percentualDesconto || null,
      valorPago: giftCard.valorPago || giftCard.valorInicial,
      valorPendente: giftCard.valorPendente || giftCard.valorInicial,
      gcNumber: giftCard.gcNumber || null,
      gcPass: giftCard.gcPass || null,
      ordemUsado: giftCard.ordemUsado || null
    }).returning();
    return newGiftCard;
  }

  async updateGiftCard(id: number, giftCardData: Partial<InsertGiftCard>): Promise<GiftCard | undefined> {
    const [updatedGiftCard] = await db.update(giftCards)
      .set({
        ...giftCardData,
        updatedAt: new Date()
      })
      .where(eq(giftCards.id, id))
      .returning();
    return updatedGiftCard;
  }

  async deleteGiftCard(id: number): Promise<boolean> {
    const result = await db.delete(giftCards).where(eq(giftCards.id, id));
    return result.rowCount > 0;
  }

  async getGiftCardsVencimento(userId: number, dias: number, empresaId?: number): Promise<GiftCard[]> {
    console.log(`[AUDITORIA - STORAGE] getGiftCardsVencimento chamado com userId: ${userId}, dias: ${dias}, empresaId: ${empresaId || 'não informado'}`);
    
    try {
      const hoje = new Date();
      const limite = new Date();
      limite.setDate(hoje.getDate() + dias);
      
      // Preparar as condições de filtro
      let conditions = [
        eq(giftCards.userId, userId),
        eq(giftCards.status, "ativo"),
        sql`${giftCards.dataValidade} IS NOT NULL`,
        lte(giftCards.dataValidade, limite)
      ];
      
      // Se um empresaId for fornecido, adicionar ao filtro
      if (empresaId) {
        console.log(`[SEGURANÇA] Aplicando filtro de empresaId: ${empresaId} em getGiftCardsVencimento`);
        conditions.push(eq(giftCards.empresaId, empresaId));
      }
      
      // Aplicar todas as condições com and()
      const query = db.select()
        .from(giftCards)
        .where(and(...conditions))
        .orderBy(giftCards.dataValidade);
      
      const results = await query;
      console.log(`[AUDITORIA - STORAGE] getGiftCardsVencimento retornou ${results.length} registros para usuário ${userId}`);
      
      return results;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar gift cards a vencer: ${error}`);
      return []; // Em caso de erro, retornar array vazio para evitar vazamento de dados
    }
  }

  async getGiftCardsByTag(tagId: number, empresaId?: number, userId?: number): Promise<GiftCard[]> {
    // PATCH DE SEGURANÇA: Adicionar filtro rigoroso por userId
    let query = db.select({
      giftCard: giftCards
    })
    .from(giftCards)
    .innerJoin(giftCardTags, eq(giftCards.id, giftCardTags.giftCardId))
    .where(eq(giftCardTags.tagId, tagId));
    
    // Adicionar filtros condicionais para empresaId e userId
    if (empresaId) {
      query = query.where(eq(giftCards.empresaId, empresaId));
    }
    
    // Se um userId for fornecido, aplicar isolamento estrito para mostrar apenas dados do próprio usuário
    if (userId) {
      console.log(`[SEGURANÇA CRÍTICA] Aplicando filtro de userId: ${userId} em getGiftCardsByTag`);
      query = query.where(eq(giftCards.userId, userId));
    }
    
    return await query
      .orderBy(desc(giftCards.createdAt))
      .then(rows => rows.map(row => row.giftCard));
  }

  async searchGiftCards(userId: number, searchTerm: string, empresaId?: number): Promise<GiftCard[]> {
    console.log(`[AUDITORIA - STORAGE] searchGiftCards chamado com userId: ${userId}, searchTerm: ${searchTerm}, empresaId: ${empresaId || 'não informado'}`);
    
    try {
      const term = `%${searchTerm}%`;
      
      // Preparar as condições de filtro
      let conditions = [
        eq(giftCards.userId, userId),
        or(
          like(giftCards.codigo, term),
          like(giftCards.observacoes, term)
        )
      ];
      
      // Se um empresaId for fornecido, adicionar ao filtro
      if (empresaId) {
        console.log(`[SEGURANÇA] Aplicando filtro de empresaId: ${empresaId} em searchGiftCards`);
        conditions.push(eq(giftCards.empresaId, empresaId));
      }
      
      // Aplicar todas as condições com and()
      const query = db.select()
        .from(giftCards)
        .where(and(...conditions))
        .orderBy(desc(giftCards.createdAt));
      
      const results = await query;
      console.log(`[AUDITORIA - STORAGE] searchGiftCards retornou ${results.length} registros para usuário ${userId}`);
      
      return results;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao pesquisar gift cards: ${error}`);
      return []; // Em caso de erro, retornar array vazio para evitar vazamento de dados
    }
  }

  // Transação methods (novo)
  async getTransacoes(giftCardId: number, empresaId?: number): Promise<Transacao[]> {
    console.log(`[AUDITORIA - STORAGE] getTransacoes chamado com giftCardId: ${giftCardId}, empresaId: ${empresaId || 'não informado'}`);
    
    try {
      // Preparar as condições de filtro
      let conditions = [eq(transacoes.giftCardId, giftCardId)];
      
      // Se um empresaId for fornecido, adicionar ao filtro
      if (empresaId) {
        console.log(`[SEGURANÇA] Aplicando filtro de empresaId: ${empresaId} em getTransacoes`);
        conditions.push(eq(transacoes.empresaId, empresaId));
      }
      
      // Aplicar todas as condições com and()
      const query = db.select()
        .from(transacoes)
        .where(and(...conditions))
        .orderBy(desc(transacoes.dataTransacao));
      
      const results = await query;
      console.log(`[AUDITORIA - STORAGE] getTransacoes retornou ${results.length} registros para giftCardId ${giftCardId}`);
      
      return results;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar transações: ${error}`);
      return []; // Em caso de erro, retornar array vazio para evitar vazamento de dados
    }
  }

  async getTransacoesByEmpresa(empresaId: number, userId?: number): Promise<Transacao[]> {
    // PATCH DE SEGURANÇA: Adicionar filtro rigoroso por userId
    console.log(`[AUDITORIA - STORAGE] getTransacoesByEmpresa chamado com empresaId: ${empresaId}, userId: ${userId || 'não informado'}`);
    
    try {
      // Preparar as condições de filtro
      let conditions = [eq(transacoes.empresaId, empresaId)];
      
      // Se um userId for fornecido, aplicar isolamento estrito para mostrar apenas dados do próprio usuário
      if (userId) {
        console.log(`[SEGURANÇA CRÍTICA] Aplicando filtro de userId: ${userId} em getTransacoesByEmpresa`);
        conditions.push(eq(transacoes.userId, userId));
      }
      
      // Aplicar todas as condições com and()
      const query = db.select()
        .from(transacoes)
        .where(and(...conditions))
        .orderBy(desc(transacoes.dataTransacao));
      
      const results = await query;
      console.log(`[AUDITORIA - STORAGE] getTransacoesByEmpresa retornou ${results.length} registros para empresa ${empresaId}${userId ? ` e usuário ${userId}` : ''}`);
      
      // SEGURANÇA: Verificação dupla para garantir isolamento quando userId especificado
      if (userId) {
        const filteredResults = results.filter(transacao => transacao.userId === userId);
        
        // Se houver discrepância, emitir alerta de segurança
        if (filteredResults.length !== results.length) {
          console.error(`[ALERTA DE SEGURANÇA] Detectada discrepância! Filtro SQL retornou ${results.length} transações, mas apenas ${filteredResults.length} pertencem ao usuário ${userId}`);
          return filteredResults; // Retornar apenas dados que pertencem ao usuário autenticado
        }
      }
      
      return results;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar transações por empresa: ${error}`);
      return []; // Em caso de erro, retornar array vazio para evitar vazamento de dados
    }
  }

  async getTransacao(id: number, empresaId?: number): Promise<Transacao | undefined> {
    console.log(`[AUDITORIA - STORAGE] getTransacao chamado com id: ${id}, empresaId: ${empresaId || 'não informado'}`);
    
    try {
      // Preparar as condições de filtro
      let conditions = [eq(transacoes.id, id)];
      
      // Se um empresaId for fornecido, adicionar ao filtro
      if (empresaId) {
        console.log(`[SEGURANÇA] Aplicando filtro de empresaId: ${empresaId} em getTransacao`);
        conditions.push(eq(transacoes.empresaId, empresaId));
      }
      
      // Aplicar todas as condições com and()
      const query = db.select()
        .from(transacoes)
        .where(and(...conditions));
      
      const [transacao] = await query;
      
      // Registrar resultado da consulta para auditoria
      if (transacao) {
        console.log(`[AUDITORIA - STORAGE] getTransacao encontrou transação id=${id}, empresaId=${transacao.empresaId}, userId=${transacao.userId}`);
      } else {
        console.log(`[AUDITORIA - STORAGE] getTransacao não encontrou transação com id=${id}${empresaId ? ` e empresaId=${empresaId}` : ''}`);
      }
      
      return transacao;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar transação: ${error}`);
      return undefined;
    }
  }

  async createTransacao(transacao: InsertTransacao): Promise<Transacao> {
    const [newTransacao] = await db.insert(transacoes).values({
      giftCardId: transacao.giftCardId,
      giftCardIds: transacao.giftCardIds,
      valor: transacao.valor,
      descricao: transacao.descricao,
      userId: transacao.userId,
      dataTransacao: transacao.dataTransacao || new Date(),
      comprovante: transacao.comprovante || null,
      status: transacao.status || "concluida",
      motivoCancelamento: transacao.motivoCancelamento || null,
      valorRefund: transacao.valorRefund || null,
      motivoRefund: transacao.motivoRefund || null,
      refundDe: transacao.refundDe || null,
      ordemInterna: transacao.ordemInterna || null,
      ordemCompra: transacao.ordemCompra || null,
      nomeUsuario: transacao.nomeUsuario || null,
      empresaId: transacao.empresaId || 1
    }).returning();
    
    // Atualizar o saldo do gift card se a transação for concluída
    if (newTransacao.status.toLowerCase() === "concluida") {
      console.log(`Atualizando saldo do gift card ${newTransacao.giftCardId} após transação concluída`);
      // Buscar o gift card atual
      const [giftCard] = await db.select()
        .from(giftCards)
        .where(eq(giftCards.id, newTransacao.giftCardId));
      
      if (giftCard) {
        console.log(`Gift card encontrado: ${giftCard.codigo}, saldo atual: ${giftCard.saldoAtual}`);
        // Calcular o novo saldo e atualizar
        const novoSaldo = Math.max(0, giftCard.saldoAtual - newTransacao.valor);
        console.log(`Novo saldo calculado: ${novoSaldo}`);
        
        // Atualizar no banco de dados
        await db.update(giftCards)
          .set({ 
            saldoAtual: novoSaldo,
            status: novoSaldo > 0 ? "ativo" : "zerado",
            dataUltimoUso: newTransacao.dataTransacao
          })
          .where(eq(giftCards.id, newTransacao.giftCardId));
        
        console.log(`Saldo atualizado com sucesso para: ${novoSaldo}`);
      }
    }
    
    return newTransacao;
  }

  async updateTransacao(id: number, transacaoData: Partial<InsertTransacao>): Promise<Transacao | undefined> {
    // Buscar a transação original para comparar o status
    const [transacaoOriginal] = await db.select()
      .from(transacoes)
      .where(eq(transacoes.id, id));
    
    if (!transacaoOriginal) {
      return undefined;
    }
    
    const [updatedTransacao] = await db.update(transacoes)
      .set(transacaoData)
      .where(eq(transacoes.id, id))
      .returning();
    
    // Se o status mudou, atualizar o saldo do gift card conforme necessário
    if (transacaoData.status && transacaoData.status !== transacaoOriginal.status) {
      // Buscar o gift card
      const [giftCard] = await db.select()
        .from(giftCards)
        .where(eq(giftCards.id, transacaoOriginal.giftCardId));
      
      if (giftCard) {
        console.log(`Atualizando saldo do gift card ${giftCard.id} devido a mudança de status da transação`);
        console.log(`Status original: ${transacaoOriginal.status}, Novo status: ${transacaoData.status}`);
        
        let novoSaldo = giftCard.saldoAtual;
        
        // Se a transação mudou para "concluida", subtrair o valor do saldo
        if (transacaoData.status.toLowerCase() === "concluida" && 
            transacaoOriginal.status.toLowerCase() !== "concluida") {
          novoSaldo = Math.max(0, giftCard.saldoAtual - transacaoOriginal.valor);
          console.log(`Transação concluída: diminuindo saldo para ${novoSaldo}`);
        }
        
        // Se a transação era "concluida" e agora é "cancelada", devolver o valor ao saldo
        if (transacaoData.status.toLowerCase() === "cancelada" && 
            transacaoOriginal.status.toLowerCase() === "concluida") {
          novoSaldo = giftCard.saldoAtual + transacaoOriginal.valor;
          console.log(`Transação cancelada: aumentando saldo para ${novoSaldo}`);
        }
        
        // Atualizar o gift card
        await db.update(giftCards)
          .set({ 
            saldoAtual: novoSaldo,
            status: novoSaldo > 0 ? "ativo" : "zerado",
            dataUltimoUso: transacaoData.status.toLowerCase() === "concluida" ? new Date() : giftCard.dataUltimoUso
          })
          .where(eq(giftCards.id, giftCard.id));
        
        console.log(`Saldo atualizado com sucesso para: ${novoSaldo}`);
      }
    }
    
    return updatedTransacao;
  }

  async deleteTransacao(id: number): Promise<boolean> {
    const result = await db.delete(transacoes).where(eq(transacoes.id, id));
    return result.rowCount > 0;
  }

  // Tag methods
  async getTags(empresaId?: number): Promise<Tag[]> {
    console.log(`[AUDITORIA - STORAGE] getTags chamado com empresaId: ${empresaId || 'não informado'}`);
    
    try {
      // Preparar as condições de filtro
      let conditions = [];
      
      // Se um empresaId for fornecido, adicionar ao filtro
      if (empresaId) {
        console.log(`[SEGURANÇA] Aplicando filtro de empresaId: ${empresaId} em getTags`);
        conditions.push(eq(tags.empresaId, empresaId));
      }
      
      // Aplicar consulta com ou sem condições
      let query = db.select().from(tags);
      
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }
      
      const results = await query;
      console.log(`[AUDITORIA - STORAGE] getTags retornou ${results.length} registros${empresaId ? ` para empresa ${empresaId}` : ''}`);
      
      return results;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar tags: ${error}`);
      return []; // Em caso de erro, retornar array vazio para evitar vazamento de dados
    }
  }

  async getTag(id: number, empresaId?: number): Promise<Tag | undefined> {
    console.log(`[AUDITORIA - STORAGE] getTag chamado com id: ${id}, empresaId: ${empresaId || 'não informado'}`);
    
    try {
      // Preparar as condições de filtro
      let conditions = [eq(tags.id, id)];
      
      // Se um empresaId for fornecido, adicionar ao filtro
      if (empresaId) {
        console.log(`[SEGURANÇA] Aplicando filtro de empresaId: ${empresaId} em getTag`);
        conditions.push(eq(tags.empresaId, empresaId));
      }
      
      // Aplicar todas as condições com and()
      const query = db.select()
        .from(tags)
        .where(and(...conditions));
      
      const [tag] = await query;
      
      // Registrar resultado da consulta para auditoria
      if (tag) {
        console.log(`[AUDITORIA - STORAGE] getTag encontrou tag id=${id}, empresaId=${tag.empresaId}`);
      } else {
        console.log(`[AUDITORIA - STORAGE] getTag não encontrou tag com id=${id}${empresaId ? ` e empresaId=${empresaId}` : ''}`);
      }
      
      return tag;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar tag: ${error}`);
      return undefined;
    }
  }

  async getTagsByEmpresa(empresaId: number): Promise<Tag[]> {
    console.log(`[AUDITORIA - STORAGE] getTagsByEmpresa chamado com empresaId: ${empresaId}`);
    
    try {
      // Aplicar filtro de empresaId usando and() para manter a consistência
      const query = db.select()
        .from(tags)
        .where(and(eq(tags.empresaId, empresaId)));
      
      const results = await query;
      console.log(`[AUDITORIA - STORAGE] getTagsByEmpresa retornou ${results.length} registros para empresa ${empresaId}`);
      
      return results;
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar tags por empresa: ${error}`);
      return []; // Em caso de erro, retornar array vazio para evitar vazamento de dados
    }
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const [newTag] = await db.insert(tags).values({
      nome: tag.nome,
      empresaId: tag.empresaId || 1
    }).returning();
    return newTag;
  }
  
  // Gift Card Tag methods
  async addTagToGiftCard(giftCardId: number, tagId: number, empresaId?: number, userId?: number, perfilId?: number): Promise<GiftCardTag> {
    // PATCH DE SEGURANÇA: Verificar acesso ao gift card e tag antes de associar
    if (empresaId || userId) {
      console.log(`[SEGURANÇA CRÍTICA] Verificando permissões em addTagToGiftCard - empresaId: ${empresaId}, userId: ${userId}, perfilId: ${perfilId}`);
      
      // Verificar se o gift card pertence ao usuário e empresa corretos
      let giftCardQuery = db.select()
        .from(giftCards)
        .where(eq(giftCards.id, giftCardId));
      
      if (empresaId) {
        giftCardQuery = giftCardQuery.where(eq(giftCards.empresaId, empresaId));
      }
      
      // Aplicar isolamento por usuário para perfis não privilegiados (3=usuario, 4=convidado)
      if (userId && (perfilId === 3 || perfilId === 4)) {
        giftCardQuery = giftCardQuery.where(eq(giftCards.userId, userId));
      }
      
      const giftCardExists = await giftCardQuery;
      if (giftCardExists.length === 0) {
        console.log(`[SEGURANÇA] Tentativa bloqueada: Gift card ID ${giftCardId} não pertence ao usuário ID ${userId} ou empresa ID ${empresaId}`);
        throw new Error("Gift card não encontrado ou sem permissão de acesso");
      }
      
      // Verificar se a tag pertence à empresa correta
      if (empresaId) {
        const tagExists = await db.select()
          .from(tags)
          .where(and(
            eq(tags.id, tagId),
            eq(tags.empresaId, empresaId)
          ));
          
        if (tagExists.length === 0) {
          console.log(`[SEGURANÇA] Tentativa bloqueada: Tag ID ${tagId} não pertence à empresa ID ${empresaId}`);
          throw new Error("Tag não encontrada ou sem permissão de acesso");
        }
      }
    }
    
    // Se passou pelas verificações de segurança, associar a tag ao gift card
    const [giftCardTag] = await db.insert(giftCardTags).values({
      giftCardId: giftCardId,
      tagId: tagId
    }).returning();
    
    return giftCardTag;
  }

  async removeTagFromGiftCard(giftCardId: number, tagId: number, empresaId?: number, userId?: number, perfilId?: number): Promise<boolean> {
    // PATCH DE SEGURANÇA: Verificar acesso ao gift card antes de remover a tag
    if (empresaId || userId) {
      console.log(`[SEGURANÇA CRÍTICA] Verificando permissões em removeTagFromGiftCard - empresaId: ${empresaId}, userId: ${userId}, perfilId: ${perfilId}`);
      
      // Verificar se o gift card pertence ao usuário e empresa corretos
      let giftCardQuery = db.select()
        .from(giftCards)
        .where(eq(giftCards.id, giftCardId));
      
      if (empresaId) {
        giftCardQuery = giftCardQuery.where(eq(giftCards.empresaId, empresaId));
      }
      
      // Aplicar isolamento por usuário para perfis não privilegiados (3=usuario, 4=convidado)
      if (userId && (perfilId === 3 || perfilId === 4)) {
        giftCardQuery = giftCardQuery.where(eq(giftCards.userId, userId));
      }
      
      const giftCardExists = await giftCardQuery;
      if (giftCardExists.length === 0) {
        console.log(`[SEGURANÇA] Tentativa bloqueada: Gift card ID ${giftCardId} não pertence ao usuário ID ${userId} ou empresa ID ${empresaId}`);
        throw new Error("Gift card não encontrado ou sem permissão de acesso");
      }
    }
    
    // Se passou pelas verificações de segurança, remover a associação
    const result = await db.delete(giftCardTags)
      .where(and(
        eq(giftCardTags.giftCardId, giftCardId),
        eq(giftCardTags.tagId, tagId)
      ));
    return result.rowCount > 0;
  }

  async getGiftCardTags(giftCardId: number, empresaId?: number, userId?: number, perfilId?: number): Promise<Tag[]> {
    console.log(`[AUDITORIA - STORAGE] getGiftCardTags chamado com giftCardId: ${giftCardId}, empresaId: ${empresaId || 'não informado'}, userId: ${userId || 'não informado'}, perfilId: ${perfilId || 'não informado'}`);
    
    try {
      // Preparar as condições de filtro
      let conditions = [eq(giftCardTags.giftCardId, giftCardId)];
      
      // Filtro por empresaId
      if (empresaId) {
        console.log(`[SEGURANÇA] Aplicando filtro de empresaId: ${empresaId} em getGiftCardTags`);
        conditions.push(eq(tags.empresaId, empresaId));
      }
      
      // Se um userId for fornecido, aplicar isolamento estrito para mostrar apenas dados do próprio usuário
      // A menos que o usuário tenha um perfil privilegiado
      if (userId && (perfilId === 3 || perfilId === 4)) { // Considerando 3 = "usuario" e 4 = "convidado"
        console.log(`[SEGURANÇA CRÍTICA] Aplicando filtro de userId: ${userId} em getGiftCardTags para perfil: ${perfilId}`);
        conditions.push(eq(giftCards.userId, userId));
      }
      
      // Executar a consulta com todas as condições aplicadas usando and()
      const query = db
        .select({
          tag: tags
        })
        .from(tags)
        .innerJoin(giftCardTags, eq(tags.id, giftCardTags.tagId))
        .innerJoin(giftCards, eq(giftCards.id, giftCardTags.giftCardId))
        .where(and(...conditions));
      
      const results = await query;
      console.log(`[AUDITORIA - STORAGE] getGiftCardTags retornou ${results.length} tags para giftCardId ${giftCardId}`);
      
      return results.map(r => r.tag);
    } catch (error) {
      console.error(`[ERRO CRÍTICO] Falha ao buscar tags do gift card: ${error}`);
      return []; // Em caso de erro, retornar array vazio para evitar vazamento de dados
    }
  }

  // Método para inicializar os dados de demonstração
  async initializeDemoData() {
    console.log("Inicializando dados de demonstração no banco de dados...");
    
    try {
      // Verificar se já existem dados no banco
      const empresaCount = await db.select({ count: sql<number>`count(*)` }).from(empresas);
      const hasData = empresaCount[0].count > 0;
      
      if (hasData) {
        console.log("Dados já existem no banco, pulando inicialização.");
        return;
      }
      
      // Inicializa empresa demo
      const [empresa] = await db.insert(empresas).values({
        nome: "CardVault Inc.",
        cnpj: "12.345.678/0001-99",
        email: "contato@cardvault.com",
        telefone: "+55 11 1234-5678",
        plano: "empresarial",
        status: "ativo",
        dataExpiracao: new Date("2026-12-31"),
        logoUrl: "https://logo.cardvault.com/logo.png"
      }).returning();
      
      console.log("Empresa demo criada com ID:", empresa.id);
      
      // Inicializa perfis
      await db.insert(perfis).values([
        {
          nome: "admin",
          descricao: "Administrador do sistema",
          permissoes: ["*"]
        },
        {
          nome: "gerente",
          descricao: "Gerente de departamento",
          permissoes: [
            "fornecedor.*",
            "giftcard.*",
            "transacao.*",
            "relatorio.*",
            "usuario.visualizar"
          ]
        },
        {
          nome: "usuario",
          descricao: "Usuário comum",
          permissoes: [
            "fornecedor.visualizar",
            "giftcard.visualizar",
            "giftcard.criar",
            "transacao.visualizar",
            "transacao.criar"
          ]
        },
        {
          nome: "convidado",
          descricao: "Usuário convidado (somente visualização)",
          permissoes: [
            "fornecedor.visualizar",
            "giftcard.visualizar",
            "transacao.visualizar"
          ]
        }
      ]);
      
      // Inicializa usuário demo
      await db.insert(users).values({
        username: "demo",
        password: "$2b$10$2rvbmAa5cJmDxFBclqnS4.Y9I2xXQib06w5FUAF5mlIc.08wZHyxa", // senha: password
        email: "demo@cardvault.com",
        nome: "Usuário Demo",
        perfilId: 1,
        empresaId: empresa.id
      });
      
      // Inicializa fornecedores demo
      const [fornecedor1] = await db.insert(fornecedores).values({
        nome: "Amazon",
        descricao: "Gift cards da Amazon",
        website: "https://www.amazon.com.br",
        logo: "https://logo.amazon.com/logo.png",
        status: "ativo",
        userId: 1,
        empresaId: empresa.id
      }).returning();
      
      // Inicializa gift cards demo
      await db.insert(giftCards).values([
        {
          codigo: "AMZN-1234-5678",
          valorInicial: 100,
          saldoAtual: 75,
          dataValidade: new Date("2025-12-31"),
          status: "ativo",
          fornecedorId: fornecedor1.id,
          userId: 1,
          empresaId: empresa.id,
          percentualDesconto: 5
        },
        {
          codigo: "TESTE123",
          valorInicial: 200,
          saldoAtual: 150,
          dataValidade: new Date("2025-12-31"),
          status: "Ativo",
          fornecedorId: fornecedor1.id,
          userId: 1,
          empresaId: empresa.id,
          percentualDesconto: 5
        }
      ]);
      
      console.log("Dados demo inicializados com sucesso");
    } catch (error) {
      console.error("Erro ao inicializar dados demo:", error);
      throw error;
    }
  }
}

// Criar instância de DatabaseStorage em vez de MemStorage
export const storage = new DatabaseStorage();