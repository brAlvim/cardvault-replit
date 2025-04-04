import {
  Perfil,
  InsertPerfil,
  User,
  InsertUser,
  Fornecedor,
  InsertFornecedor,
  GiftCard,
  InsertGiftCard,
  Transacao,
  InsertTransacao,
  Tag,
  InsertTag,
  GiftCardTag,
  InsertGiftCardTag,
  empresas,
} from "@shared/schema";
import { z } from "zod";

// Criamos um schema de inserção para a empresa
export const insertEmpresaSchema = z.object({
  nome: z.string(),
  cnpj: z.string().optional(),
  email: z.string().email(),
  telefone: z.string().optional(),
  plano: z.string().default("basico"),
  status: z.string().default("ativo"),
  dataExpiracao: z.date().optional(),
  logoUrl: z.string().optional(),
  corPrimaria: z.string().optional(),
  endereco: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  limiteUsuarios: z.number().default(5),
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

export class MemStorage implements IStorage {
  private empresas: Map<number, Empresa> = new Map();
  private perfis: Map<number, Perfil> = new Map();
  private users: Map<number, User> = new Map();
  private fornecedores: Map<number, Fornecedor> = new Map();
  private giftCards: Map<number, GiftCard> = new Map();
  private transacoes: Map<number, Transacao> = new Map();
  private tags: Map<number, Tag> = new Map();
  private giftCardTags: Map<number, GiftCardTag> = new Map();
  
  private empresaId: number = 1;
  private perfilId: number = 1;
  private userId: number = 1;
  private fornecedorId: number = 1;
  private giftCardId: number = 1;
  private transacaoId: number = 1;
  private tagId: number = 1;
  private giftCardTagId: number = 1;

  constructor() {
    // Initialize with demo data
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
      cnpj: empresa.cnpj || null,
      email: empresa.email,
      telefone: empresa.telefone || null,
      plano: empresa.plano || "basico",
      status: empresa.status || "ativo",
      dataExpiracao: empresa.dataExpiracao || null,
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
    // Não permitir excluir se houver usuários associados
    const usuarios = Array.from(this.users.values()).filter(
      (user) => user.empresaId === id
    );
    
    if (usuarios.length > 0) {
      return false;
    }
    
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
      descricao: perfil.descricao || null,
      permissoes: perfil.permissoes,
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
      updatedAt: timestamp 
    };
    this.perfis.set(id, updatedPerfil);
    return updatedPerfil;
  }

  async deletePerfil(id: number): Promise<boolean> {
    // Não permitir excluir se houver usuários associados
    const usuarios = Array.from(this.users.values()).filter(
      (user) => user.perfilId === id
    );
    
    if (usuarios.length > 0) {
      return false;
    }
    
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
      avatarUrl: user.avatarUrl || null,
      perfilId: user.perfilId || 3, // Perfil padrão = usuário regular
      status: user.status || "ativo",
      nome: user.nome || null,
      empresaId: user.empresaId || 1, // Empresa padrão = 1
      ultimoLogin: null,
      tokenReset: null,
      dataExpiracaoToken: null,
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
      avatarUrl: userData.avatarUrl !== undefined ? userData.avatarUrl : user.avatarUrl,
      perfilId: userData.perfilId !== undefined ? userData.perfilId : user.perfilId,
      status: userData.status !== undefined ? userData.status : user.status,
      nome: userData.nome !== undefined ? userData.nome : user.nome,
      empresaId: userData.empresaId !== undefined ? userData.empresaId : user.empresaId,
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
      ultimoLogin: timestamp, 
      updatedAt: timestamp 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPasswordResetToken(id: number, token: string): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const timestamp = new Date();
    // Token expira em 24h
    const dataExpiracao = new Date(timestamp);
    dataExpiracao.setHours(dataExpiracao.getHours() + 24);
    
    const updatedUser: User = { 
      ...user, 
      tokenReset: token,
      dataExpiracaoToken: dataExpiracao,
      updatedAt: timestamp 
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Fornecedor methods (anteriormente collections)
  async getFornecedores(userId: number, empresaId?: number): Promise<Fornecedor[]> {
    let fornecedores = Array.from(this.fornecedores.values()).filter(
      (fornecedor) => fornecedor.userId === userId
    );
    
    // Se for especificado um empresaId, filtramos por ele
    if (empresaId) {
      fornecedores = fornecedores.filter(
        (fornecedor) => fornecedor.empresaId === empresaId
      );
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
  
  async getFornecedoresByEmpresa(empresaId: number): Promise<Fornecedor[]> {
    console.log("Buscando fornecedores para empresaId:", empresaId);
    const fornecedores = Array.from(this.fornecedores.values());
    console.log("Total de fornecedores no sistema:", fornecedores.length);
    console.log("Detalhes dos fornecedores:", fornecedores.map(f => ({ id: f.id, nome: f.nome, empresaId: f.empresaId })));
    
    const result = fornecedores.filter(
      (fornecedor) => fornecedor.empresaId === empresaId
    );
    
    console.log("Fornecedores encontrados após filtro:", result.length);
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

  // Gift Card methods (anteriormente cards)
  async getGiftCards(userId: number, fornecedorId?: number, empresaId?: number): Promise<GiftCard[]> {
    let giftCards = Array.from(this.giftCards.values()).filter(
      (giftCard) => giftCard.userId === userId
    );
    
    if (fornecedorId) {
      giftCards = giftCards.filter(giftCard => giftCard.fornecedorId === fornecedorId);
    }
    
    // Se for especificado um empresaId, filtramos por ele
    if (empresaId) {
      giftCards = giftCards.filter(giftCard => giftCard.empresaId === empresaId);
    }
    
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
    let giftCards = Array.from(this.giftCards.values()).filter(
      (giftCard) => giftCard.empresaId === empresaId
    );
    
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
    const newGiftCard: GiftCard = { 
      id,
      codigo: giftCard.codigo,
      valorInicial: giftCard.valorInicial,
      saldoAtual: giftCard.saldoAtual,
      dataValidade: giftCard.dataValidade || null,
      status: giftCard.status,
      fornecedorId: giftCard.fornecedorId,
      userId: giftCard.userId,
      empresaId: giftCard.empresaId || 1, // Empresa padrão = 1 se não for fornecida
      observacoes: giftCard.observacoes || null,
      createdAt: timestamp,
      updatedAt: null,
      dataCadastro: timestamp,
      dataCompra: giftCard.dataCompra || null,
      dataAtivacao: giftCard.dataAtivacao || null,
      dataUltimoUso: null,
      dataCancelamento: null,
      motivoCancelamento: null,
      codigoOrdemCompra: giftCard.codigoOrdemCompra || null,
      desconto: giftCard.desconto || null,
      ordemUsado: giftCard.ordemUsado || null
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
      status: giftCardData.status !== undefined ? giftCardData.status : giftCard.status,
      fornecedorId: giftCardData.fornecedorId !== undefined ? giftCardData.fornecedorId : giftCard.fornecedorId,
      observacoes: giftCardData.observacoes !== undefined ? giftCardData.observacoes : giftCard.observacoes,
      dataCompra: giftCardData.dataCompra !== undefined ? giftCardData.dataCompra : giftCard.dataCompra,
      dataAtivacao: giftCardData.dataAtivacao !== undefined ? giftCardData.dataAtivacao : giftCard.dataAtivacao,
      codigoOrdemCompra: giftCardData.codigoOrdemCompra !== undefined ? giftCardData.codigoOrdemCompra : giftCard.codigoOrdemCompra,
      desconto: giftCardData.desconto !== undefined ? giftCardData.desconto : giftCard.desconto,
      ordemUsado: giftCardData.ordemUsado !== undefined ? giftCardData.ordemUsado : giftCard.ordemUsado,
      updatedAt: timestamp 
    };
    this.giftCards.set(id, updatedGiftCard);
    return updatedGiftCard;
  }

  async deleteGiftCard(id: number): Promise<boolean> {
    return this.giftCards.delete(id);
  }

  async getGiftCardsVencimento(userId: number, dias: number): Promise<GiftCard[]> {
    const hoje = new Date();
    const dataLimite = new Date(hoje);
    dataLimite.setDate(dataLimite.getDate() + dias);
    
    let giftCards = Array.from(this.giftCards.values()).filter(
      (giftCard) => 
        giftCard.userId === userId && 
        giftCard.dataValidade !== null &&
        giftCard.dataValidade <= dataLimite
    );
    
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
  
  async getGiftCardsByTag(tagId: number): Promise<GiftCard[]> {
    const giftCardTagRelations = Array.from(this.giftCardTags.values()).filter(
      relation => relation.tagId === tagId
    );
    
    const giftCardIds = giftCardTagRelations.map(relation => relation.giftCardId);
    
    let giftCards = Array.from(this.giftCards.values()).filter(
      giftCard => giftCardIds.includes(giftCard.id)
    );
    
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

  async searchGiftCards(userId: number, searchTerm: string): Promise<GiftCard[]> {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    
    let giftCards = Array.from(this.giftCards.values()).filter(
      (giftCard) => 
        giftCard.userId === userId && 
        (
          giftCard.codigo.toLowerCase().includes(lowerCaseSearchTerm) ||
          (giftCard.observacoes && giftCard.observacoes.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (giftCard.codigoOrdemCompra && giftCard.codigoOrdemCompra.toLowerCase().includes(lowerCaseSearchTerm))
        )
    );
    
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
  
  // Transacoes methods
  async getTransacoes(giftCardId: number, empresaId?: number): Promise<Transacao[]> {
    let transacoes = Array.from(this.transacoes.values()).filter(
      (transacao) => transacao.giftCardId === giftCardId
    );
    
    // Se for especificado um empresaId, filtramos por ele
    if (empresaId) {
      transacoes = transacoes.filter(
        (transacao) => transacao.empresaId === empresaId
      );
    }
    
    return transacoes;
  }
  
  async getTransacoesByEmpresa(empresaId: number): Promise<Transacao[]> {
    return Array.from(this.transacoes.values()).filter(
      (transacao) => transacao.empresaId === empresaId
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
    
    // Se for uma transação com ID já existente, verificamos se é um reembolso
    if (transacao.refundDe) {
      const transacaoOriginal = this.transacoes.get(transacao.refundDe);
      if (transacaoOriginal) {
        // Marca a transação original como reembolsada
        this.updateTransacao(transacaoOriginal.id, {
          status: "Reembolsada"
        });
        
        // Se a transação original atualizou um gift card, precisamos atualizar o saldo de volta
        const giftCard = this.giftCards.get(transacaoOriginal.giftCardId);
        if (giftCard) {
          const valorAtualizado = giftCard.saldoAtual + transacaoOriginal.valor;
          this.updateGiftCard(giftCard.id, {
            saldoAtual: valorAtualizado,
            status: valorAtualizado > 0 ? "ativo" : "zerado"
          });
        }
      }
    }
    
    // Se a transação for "Concluída", atualizamos o saldo do gift card
    if (transacao.status === "Concluída") {
      const giftCard = this.giftCards.get(transacao.giftCardId);
      if (giftCard) {
        const valorAtualizado = Math.max(0, giftCard.saldoAtual - transacao.valor);
        this.updateGiftCard(giftCard.id, {
          saldoAtual: valorAtualizado,
          status: valorAtualizado > 0 ? "ativo" : "zerado",
          dataUltimoUso: timestamp
        });
      }
    }
    
    const newTransacao: Transacao = {
      id,
      giftCardId: transacao.giftCardId,
      giftCardIds: transacao.giftCardIds || String(transacao.giftCardId),
      valor: transacao.valor,
      descricao: transacao.descricao,
      userId: transacao.userId,
      empresaId: transacao.empresaId || 1, // Empresa padrão = 1 se não for fornecida
      dataTransacao: transacao.dataTransacao || timestamp,
      status: transacao.status,
      comprovante: transacao.comprovante || null,
      motivoCancelamento: transacao.motivoCancelamento || null,
      refundDe: transacao.refundDe || null,
      motivoRefund: transacao.motivoRefund || null,
      valorRefund: transacao.valorRefund || null,
      ordemInterna: transacao.ordemInterna || null,
      ordemCompra: transacao.ordemCompra || null,
      nomeUsuario: transacao.nomeUsuario || null
    };
    
    this.transacoes.set(id, newTransacao);
    return newTransacao;
  }

  async updateTransacao(id: number, transacaoData: Partial<InsertTransacao>): Promise<Transacao | undefined> {
    const transacao = this.transacoes.get(id);
    if (!transacao) return undefined;
    
    const timestamp = new Date();
    
    // Se estiver alterando o status para "Concluída", atualizamos o saldo do gift card
    if (transacaoData.status === "Concluída" && transacao.status !== "Concluída") {
      const giftCard = this.giftCards.get(transacao.giftCardId);
      if (giftCard) {
        const valorAtualizado = Math.max(0, giftCard.saldoAtual - transacao.valor);
        this.updateGiftCard(giftCard.id, {
          saldoAtual: valorAtualizado,
          status: valorAtualizado > 0 ? "ativo" : "zerado",
          dataUltimoUso: timestamp
        });
      }
    }
    
    // Se estiver alterando o status para "Cancelada", revertemos o saldo do gift card, se aplicável
    if (transacaoData.status === "Cancelada" && transacao.status === "Concluída") {
      const giftCard = this.giftCards.get(transacao.giftCardId);
      if (giftCard) {
        const valorAtualizado = giftCard.saldoAtual + transacao.valor;
        this.updateGiftCard(giftCard.id, {
          saldoAtual: valorAtualizado,
          status: "ativo"
        });
      }
    }
    
    const updatedTransacao: Transacao = {
      ...transacao,
      descricao: transacaoData.descricao !== undefined ? transacaoData.descricao : transacao.descricao,
      valor: transacaoData.valor !== undefined ? transacaoData.valor : transacao.valor,
      status: transacaoData.status !== undefined ? transacaoData.status : transacao.status,
      comprovante: transacaoData.comprovante !== undefined ? transacaoData.comprovante : transacao.comprovante,
      motivoCancelamento: transacaoData.motivoCancelamento !== undefined ? transacaoData.motivoCancelamento : transacao.motivoCancelamento,
      refundDe: transacaoData.refundDe !== undefined ? transacaoData.refundDe : transacao.refundDe,
      motivoRefund: transacaoData.motivoRefund !== undefined ? transacaoData.motivoRefund : transacao.motivoRefund,
      valorRefund: transacaoData.valorRefund !== undefined ? transacaoData.valorRefund : transacao.valorRefund,
      ordemInterna: transacaoData.ordemInterna !== undefined ? transacaoData.ordemInterna : transacao.ordemInterna,
      ordemCompra: transacaoData.ordemCompra !== undefined ? transacaoData.ordemCompra : transacao.ordemCompra,
      nomeUsuario: transacaoData.nomeUsuario !== undefined ? transacaoData.nomeUsuario : transacao.nomeUsuario
    };
    
    this.transacoes.set(id, updatedTransacao);
    return updatedTransacao;
  }

  async deleteTransacao(id: number): Promise<boolean> {
    const transacao = this.transacoes.get(id);
    if (transacao && transacao.status === "Concluída") {
      // Se for uma transação concluída, restauramos o saldo do gift card
      const giftCard = this.giftCards.get(transacao.giftCardId);
      if (giftCard) {
        const valorAtualizado = giftCard.saldoAtual + transacao.valor;
        this.updateGiftCard(giftCard.id, {
          saldoAtual: valorAtualizado,
          status: "ativo"
        });
      }
    }
    
    return this.transacoes.delete(id);
  }
  
  // Tag methods
  async getTags(empresaId?: number): Promise<Tag[]> {
    let tags = Array.from(this.tags.values());
    
    // Se for especificado um empresaId, filtramos por ele
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
      (tag) => tag.empresaId === empresaId
    );
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const id = this.tagId++;
    const timestamp = new Date();
    const newTag: Tag = { 
      id, 
      nome: tag.nome,
      empresaId: tag.empresaId || 1, // Empresa padrão = 1 se não for fornecida
      createdAt: timestamp 
    };
    this.tags.set(id, newTag);
    return newTag;
  }
  
  // Gift Card Tag methods
  async addTagToGiftCard(giftCardId: number, tagId: number): Promise<GiftCardTag> {
    // Verificar se a relação já existe
    const existe = Array.from(this.giftCardTags.values()).find(
      rel => rel.giftCardId === giftCardId && rel.tagId === tagId
    );
    
    if (existe) {
      return existe;
    }
    
    const id = this.giftCardTagId++;
    const newRelation: GiftCardTag = {
      id,
      giftCardId,
      tagId,
      createdAt: new Date()
    };
    
    this.giftCardTags.set(id, newRelation);
    return newRelation;
  }
  
  async removeTagFromGiftCard(giftCardId: number, tagId: number): Promise<boolean> {
    const relation = Array.from(this.giftCardTags.values()).find(
      rel => rel.giftCardId === giftCardId && rel.tagId === tagId
    );
    
    if (relation) {
      return this.giftCardTags.delete(relation.id);
    }
    
    return false;
  }
  
  async getGiftCardTags(giftCardId: number, empresaId?: number): Promise<Tag[]> {
    const relations = Array.from(this.giftCardTags.values()).filter(
      rel => rel.giftCardId === giftCardId
    );
    
    const tagIds = relations.map(rel => rel.tagId);
    
    let tags = Array.from(this.tags.values()).filter(
      tag => tagIds.includes(tag.id)
    );
    
    // Se for especificado um empresaId, filtramos por ele
    if (empresaId) {
      tags = tags.filter(tag => tag.empresaId === empresaId);
    }
    
    return tags;
  }

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
          
          Promise.all(fornecedores.map(f => this.createFornecedor(f))).then(fornecedorInstances => {
            // Create tags
            const tagNames = ["Entretenimento", "Música", "Jogos", "Compras Online", "Streaming", "Presente", "Expirado", "Mensal"];
            Promise.all(tagNames.map(nome => this.createTag({ nome }))).then(tagInstances => {

              // Gift Cards (anteriormente cards)
              const today = new Date();
              const oneMonthFromNow = new Date(today);
              oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
              
              const threeMonthsFromNow = new Date(today);
              threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
              
              const demoGiftCards: InsertGiftCard[] = [
                {
                  codigo: "GC001",
                  valorInicial: 100.00,
                  saldoAtual: 75.00,
                  dataValidade: oneMonthFromNow,
                  status: "ativo",
                  fornecedorId: fornecedorInstances[0].id, // Amazon
                  userId: user.id,
                  empresaId: user.empresaId,
                  observacoes: "Gift card para compras de livros"
                },
                {
                  codigo: "GC002",
                  valorInicial: 50.00,
                  saldoAtual: 0.00,
                  dataValidade: threeMonthsFromNow,
                  status: "zerado",
                  fornecedorId: fornecedorInstances[1].id, // Netflix
                  userId: user.id,
                  empresaId: user.empresaId,
                  observacoes: "Gift card para renovação da assinatura"
                },
                {
                  codigo: "GC003",
                  valorInicial: 25.00,
                  saldoAtual: 25.00,
                  dataValidade: threeMonthsFromNow,
                  status: "ativo",
                  fornecedorId: fornecedorInstances[2].id, // Spotify
                  userId: user.id,
                  empresaId: user.empresaId,
                  observacoes: "Gift card para assinatura premium"
                },
                {
                  codigo: "GC004",
                  valorInicial: 200.00,
                  saldoAtual: 150.00,
                  dataValidade: threeMonthsFromNow,
                  status: "ativo",
                  fornecedorId: fornecedorInstances[3].id, // Steam
                  userId: user.id,
                  empresaId: user.empresaId,
                  observacoes: "Gift card para as compras da Steam Summer Sale"
                }
              ];

              Promise.all(demoGiftCards.map(giftCard => this.createGiftCard(giftCard))).then(giftCardInstances => {
                // Transações
                const twoWeeksAgo = new Date(today);
                twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
                
                const oneWeekAgo = new Date(today);
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                const demoTransacoes: InsertTransacao[] = [
                  {
                    giftCardId: giftCardInstances[0].id, // Amazon GC
                    giftCardIds: String(giftCardInstances[0].id),
                    valor: 25.00,
                    descricao: "Compra de livros",
                    userId: user.id,
                    empresaId: user.empresaId,
                    dataTransacao: twoWeeksAgo,
                    status: "Concluída",
                    comprovante: null,
                    motivoCancelamento: null,
                    ordemInterna: null,
                    ordemCompra: null,
                    nomeUsuario: null
                  },
                  {
                    giftCardId: giftCardInstances[1].id, // Netflix GC
                    giftCardIds: String(giftCardInstances[1].id),
                    valor: 50.00,
                    descricao: "Assinatura anual",
                    userId: user.id,
                    empresaId: user.empresaId,
                    dataTransacao: oneWeekAgo,
                    status: "Concluída",
                    comprovante: null,
                    motivoCancelamento: null,
                    ordemInterna: null,
                    ordemCompra: null,
                    nomeUsuario: null
                  },
                  {
                    giftCardId: giftCardInstances[3].id, // Steam GC
                    giftCardIds: String(giftCardInstances[3].id),
                    valor: 50.00,
                    descricao: "Compra de jogo novo",
                    userId: user.id,
                    empresaId: user.empresaId,
                    dataTransacao: new Date(),
                    status: "Concluída",
                    comprovante: null,
                    motivoCancelamento: null,
                    ordemInterna: null,
                    ordemCompra: null,
                    nomeUsuario: null
                  }
                ];

                Promise.all(demoTransacoes.map(transacao => this.createTransacao(transacao))).then(transacaoInstances => {
                  // Add tags to gift cards
                  this.addTagToGiftCard(giftCardInstances[0].id, tagInstances[3].id); // Amazon - Compras Online
                  this.addTagToGiftCard(giftCardInstances[0].id, tagInstances[5].id); // Amazon - Presente
                  
                  this.addTagToGiftCard(giftCardInstances[1].id, tagInstances[0].id); // Netflix - Entretenimento
                  this.addTagToGiftCard(giftCardInstances[1].id, tagInstances[4].id); // Netflix - Streaming
                  this.addTagToGiftCard(giftCardInstances[1].id, tagInstances[7].id); // Netflix - Mensal
                  
                  this.addTagToGiftCard(giftCardInstances[2].id, tagInstances[1].id); // Spotify - Música
                  this.addTagToGiftCard(giftCardInstances[2].id, tagInstances[4].id); // Spotify - Streaming
                  this.addTagToGiftCard(giftCardInstances[2].id, tagInstances[7].id); // Spotify - Mensal
                  
                  this.addTagToGiftCard(giftCardInstances[3].id, tagInstances[2].id); // Steam - Jogos
                  this.addTagToGiftCard(giftCardInstances[3].id, tagInstances[5].id); // Steam - Presente
                });
              });
            });
          });
        });
      });
  }
}

export const storage = new MemStorage();