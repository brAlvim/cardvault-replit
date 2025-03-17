import {
  Empresa, InsertEmpresa,
  Perfil, InsertPerfil,
  User, InsertUser,
  Fornecedor, InsertFornecedor,
  GiftCard, InsertGiftCard,
  Transacao, InsertTransacao,
  Tag, InsertTag,
  GiftCardTag, InsertGiftCardTag,
} from "@shared/schema";
import { z } from "zod";

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

  // Gift Card methods (substitui Card)
  getGiftCards(userId: number, fornecedorId?: number, empresaId?: number): Promise<GiftCard[]>;
  getGiftCardsByEmpresa(empresaId: number): Promise<GiftCard[]>;
  getGiftCard(id: number, empresaId?: number): Promise<GiftCard | undefined>;
  createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard>;
  updateGiftCard(id: number, giftCard: Partial<InsertGiftCard>): Promise<GiftCard | undefined>;
  deleteGiftCard(id: number): Promise<boolean>;
  getGiftCardsVencimento(userId: number, dias: number): Promise<GiftCard[]>;
  getGiftCardsByTag(tagId: number): Promise<GiftCard[]>;
  searchGiftCards(userId: number, searchTerm: string): Promise<GiftCard[]>;

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
  addTagToGiftCard(giftCardId: number, tagId: number): Promise<GiftCardTag>;
  removeTagFromGiftCard(giftCardId: number, tagId: number): Promise<boolean>;
  getGiftCardTags(giftCardId: number, empresaId?: number): Promise<Tag[]>;
}

// Implementação da interface IStorage utilizando memória (sem banco de dados)
class MemStorage implements IStorage {
  private empresas: Map<number, Empresa> = new Map();
  private perfis: Map<number, Perfil> = new Map();
  private users: Map<number, User> = new Map();
  private fornecedores: Map<number, Fornecedor> = new Map();
  private giftCards: Map<number, GiftCard> = new Map();
  private transacoes: Map<number, Transacao> = new Map();
  private tags: Map<number, Tag> = new Map();
  private giftCardTags: Map<number, GiftCardTag> = new Map();
  
  // IDs para geração automática
  private empresaId: number = 1;
  private perfilId: number = 1;
  private userId: number = 1;
  private fornecedorId: number = 1;
  private giftCardId: number = 1;
  private transacaoId: number = 1;
  private tagId: number = 1;
  private giftCardTagId: number = 1;
  
  constructor() {
    this.initializeDemoData();
  }

  // Implementação das funções corrigidas para fornecedores
  
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

  // Esta função apenas para teste - será excluída depois
  private initializeDemoData() {
    // Inicialização mínima apenas para testes
    console.log("Inicializando dados demo simplificados");
  }
}

export const storage = new MemStorage();