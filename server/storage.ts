import {
  empresas, perfis, users, fornecedores, giftCards, transacoes, tags, giftCardTags,
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
    let fornecedores = Array.from(this.fornecedores.values()).filter(
      (fornecedor) => fornecedor.userId === userId
    );
    
    // Se for especificado um empresaId, filtramos por ele
    if (empresaId) {
      fornecedores = fornecedores.filter(
        (fornecedor) => fornecedor.empresaId === empresaId
      );
      console.log("Filtrando fornecedores por empresaId:", empresaId);
      console.log("Fornecedores encontrados após filtro:", fornecedores.length);
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
            
            Promise.all(fornecedores.map(f => this.createFornecedor(f))).then(() => {
              console.log("Dados demo inicializados com sucesso");
            });
          });
        });
    });
  }
}

export const storage = new MemStorage();