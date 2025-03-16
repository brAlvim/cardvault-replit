import {
  users, fornecedores, giftCards, transacoes, tags, giftCardTags,
  type User, type InsertUser,
  type Fornecedor, type InsertFornecedor,
  type GiftCard, type InsertGiftCard,
  type Transacao, type InsertTransacao,
  type Tag, type InsertTag,
  type GiftCardTag, type InsertGiftCardTag
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Fornecedor methods (substitui Collection)
  getFornecedores(userId: number): Promise<Fornecedor[]>;
  getFornecedor(id: number): Promise<Fornecedor | undefined>;
  createFornecedor(fornecedor: InsertFornecedor): Promise<Fornecedor>;
  updateFornecedor(id: number, fornecedor: Partial<InsertFornecedor>): Promise<Fornecedor | undefined>;
  deleteFornecedor(id: number): Promise<boolean>;

  // Gift Card methods (substitui Card)
  getGiftCards(userId: number, fornecedorId?: number): Promise<GiftCard[]>;
  getGiftCard(id: number): Promise<GiftCard | undefined>;
  createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard>;
  updateGiftCard(id: number, giftCard: Partial<InsertGiftCard>): Promise<GiftCard | undefined>;
  deleteGiftCard(id: number): Promise<boolean>;
  getGiftCardsVencimento(userId: number, dias: number): Promise<GiftCard[]>;
  getGiftCardsByTag(tagId: number): Promise<GiftCard[]>;
  searchGiftCards(userId: number, searchTerm: string): Promise<GiftCard[]>;

  // Transação methods (novo)
  getTransacoes(giftCardId: number): Promise<Transacao[]>;
  getTransacao(id: number): Promise<Transacao | undefined>;
  createTransacao(transacao: InsertTransacao): Promise<Transacao>;
  updateTransacao(id: number, transacao: Partial<InsertTransacao>): Promise<Transacao | undefined>;
  deleteTransacao(id: number): Promise<boolean>;

  // Tag methods
  getTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  
  // Gift Card Tag methods
  addTagToGiftCard(giftCardId: number, tagId: number): Promise<GiftCardTag>;
  removeTagFromGiftCard(giftCardId: number, tagId: number): Promise<boolean>;
  getGiftCardTags(giftCardId: number): Promise<Tag[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private fornecedores: Map<number, Fornecedor>;
  private giftCards: Map<number, GiftCard>;
  private transacoes: Map<number, Transacao>;
  private tags: Map<number, Tag>;
  private giftCardTags: Map<number, GiftCardTag>;
  
  private userId: number;
  private fornecedorId: number;
  private giftCardId: number;
  private transacaoId: number;
  private tagId: number;
  private giftCardTagId: number;

  constructor() {
    this.users = new Map();
    this.fornecedores = new Map();
    this.giftCards = new Map();
    this.transacoes = new Map();
    this.tags = new Map();
    this.giftCardTags = new Map();
    
    this.userId = 1;
    this.fornecedorId = 1;
    this.giftCardId = 1;
    this.transacaoId = 1;
    this.tagId = 1;
    this.giftCardTagId = 1;
    
    // Initialize with demo data
    this.initializeDemoData();
  }

  private initializeDemoData() {
    // Create demo user
    const demoUser: InsertUser = {
      username: "demo",
      password: "password123",
      email: "demo@example.com",
      avatarUrl: "https://i.pravatar.cc/40?img=68"
    };
    this.createUser(demoUser).then(user => {
      // Fornecedores (anteriormente collections)
      const fornecedores: InsertFornecedor[] = [
        { nome: "Amazon", descricao: "Gift Cards da Amazon", website: "https://www.amazon.com", logo: "https://logo.clearbit.com/amazon.com", status: "ativo", userId: user.id },
        { nome: "Netflix", descricao: "Gift Cards para assinatura Netflix", website: "https://www.netflix.com", logo: "https://logo.clearbit.com/netflix.com", status: "ativo", userId: user.id },
        { nome: "Spotify", descricao: "Gift Cards para assinatura Spotify", website: "https://www.spotify.com", logo: "https://logo.clearbit.com/spotify.com", status: "ativo", userId: user.id },
        { nome: "Steam", descricao: "Gift Cards para compras na Steam", website: "https://store.steampowered.com", logo: "https://logo.clearbit.com/steampowered.com", status: "ativo", userId: user.id }
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
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userId++;
    const timestamp = new Date();
    const newUser = { ...user, id, createdAt: timestamp };
    this.users.set(id, newUser);
    return newUser;
  }

  // Fornecedor methods (substitui Collection)
  async getFornecedores(userId: number): Promise<Fornecedor[]> {
    return Array.from(this.fornecedores.values()).filter(
      (fornecedor) => fornecedor.userId === userId
    );
  }

  async getFornecedor(id: number): Promise<Fornecedor | undefined> {
    return this.fornecedores.get(id);
  }

  async createFornecedor(fornecedor: InsertFornecedor): Promise<Fornecedor> {
    const id = this.fornecedorId++;
    const timestamp = new Date();
    const newFornecedor = { ...fornecedor, id, createdAt: timestamp };
    this.fornecedores.set(id, newFornecedor);
    return newFornecedor;
  }

  async updateFornecedor(id: number, fornecedorData: Partial<InsertFornecedor>): Promise<Fornecedor | undefined> {
    const fornecedor = this.fornecedores.get(id);
    if (!fornecedor) return undefined;
    
    const updatedFornecedor = { ...fornecedor, ...fornecedorData };
    this.fornecedores.set(id, updatedFornecedor);
    return updatedFornecedor;
  }

  async deleteFornecedor(id: number): Promise<boolean> {
    return this.fornecedores.delete(id);
  }

  // Gift Card methods (substitui Card)
  async getGiftCards(userId: number, fornecedorId?: number): Promise<GiftCard[]> {
    let giftCards = Array.from(this.giftCards.values()).filter(
      (giftCard) => giftCard.userId === userId
    );
    
    if (fornecedorId) {
      giftCards = giftCards.filter(giftCard => giftCard.fornecedorId === fornecedorId);
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
      };
    });
    
    return giftCardsComValorPendente;
  }

  async getGiftCard(id: number): Promise<GiftCard | undefined> {
    const giftCard = this.giftCards.get(id);
    
    if (giftCard) {
      // Busca as transações associadas ao gift card para calcular o valor pendente
      const transacoes = Array.from(this.transacoes.values()).filter(
        transacao => transacao.giftCardId === id && transacao.status === "Concluída"
      );
      
      // Calcula o valor total das transações
      const valorTotalTransacoes = transacoes.reduce((total, transacao) => total + transacao.valor, 0);
      
      // Atualiza o valor pendente como valorInicial - valorTotalTransacoes
      const valorPendente = Math.max(0, giftCard.valorInicial - valorTotalTransacoes);
      
      // Retorna o gift card com o valor pendente atualizado
      return {
        ...giftCard,
        valorPendente
      };
    }
    
    return giftCard;
  }

  async createGiftCard(giftCard: InsertGiftCard): Promise<GiftCard> {
    const id = this.giftCardId++;
    const timestamp = new Date();
    const newGiftCard = { ...giftCard, id, createdAt: timestamp, updatedAt: timestamp };
    this.giftCards.set(id, newGiftCard);
    return newGiftCard;
  }

  async updateGiftCard(id: number, giftCardData: Partial<InsertGiftCard>): Promise<GiftCard | undefined> {
    const giftCard = this.giftCards.get(id);
    if (!giftCard) return undefined;
    
    const timestamp = new Date();
    const updatedGiftCard = { ...giftCard, ...giftCardData, updatedAt: timestamp };
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
    
    const giftCards = Array.from(this.giftCards.values()).filter(
      (giftCard) => 
        giftCard.userId === userId && 
        giftCard.dataValidade && 
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
      };
    });
    
    return giftCardsComValorPendente;
  }

  async getGiftCardsByTag(tagId: number): Promise<GiftCard[]> {
    const giftCardTagRelations = Array.from(this.giftCardTags.values()).filter(
      (relation) => relation.tagId === tagId
    );
    
    const giftCardIds = giftCardTagRelations.map(relation => relation.giftCardId);
    const giftCards = Array.from(this.giftCards.values()).filter(
      (giftCard) => giftCardIds.includes(giftCard.id)
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
      };
    });
    
    return giftCardsComValorPendente;
  }

  async searchGiftCards(userId: number, searchTerm: string): Promise<GiftCard[]> {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    const giftCards = Array.from(this.giftCards.values()).filter(
      (giftCard) => 
        giftCard.userId === userId &&
        (
          giftCard.codigo.toLowerCase().includes(lowerCaseSearchTerm) ||
          giftCard.observacoes?.toLowerCase().includes(lowerCaseSearchTerm) ||
          giftCard.status.toLowerCase().includes(lowerCaseSearchTerm)
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
      };
    });
    
    return giftCardsComValorPendente;
  }

  // Transação methods
  async getTransacoes(giftCardId: number): Promise<Transacao[]> {
    return Array.from(this.transacoes.values()).filter(
      (transacao) => transacao.giftCardId === giftCardId
    );
  }

  async getTransacao(id: number): Promise<Transacao | undefined> {
    return this.transacoes.get(id);
  }

  async createTransacao(transacao: InsertTransacao): Promise<Transacao> {
    console.log("Criando transação:", transacao);
    const id = this.transacaoId++;
    
    // Define valores padrão para campos obrigatórios
    if (!transacao.status) transacao.status = "concluida";
    if (!transacao.dataTransacao) transacao.dataTransacao = new Date();
    
    // Cria a transação com os dados recebidos
    const newTransacao = { ...transacao, id };
    console.log("Nova transação processada:", newTransacao);
    
    // Verifica se temos giftCardIds (múltiplos gift cards)
    let giftCardIdsArray: number[] = [];
    
    if (newTransacao.giftCardIds) {
      // Converte a string de IDs para array de números
      giftCardIdsArray = newTransacao.giftCardIds
        .split(',')
        .map(id => parseInt(id))
        .filter(id => !isNaN(id));
      console.log("Gift cards processados:", giftCardIdsArray);
    } else {
      // Compatibilidade com formato antigo
      giftCardIdsArray = [newTransacao.giftCardId];
      newTransacao.giftCardIds = String(newTransacao.giftCardId);
      console.log("Usando gift card principal:", newTransacao.giftCardId);
    }
    
    // Salva a transação
    this.transacoes.set(id, newTransacao);
    console.log("Transação salva com ID:", id);
    
    // Atualiza o saldo de todos os gift cards envolvidos se a transação for concluída
    // Nota: A verificação estava com "Concluída" com acento, mas no código está como "concluida"
    if ((transacao.status === "concluida" || transacao.status === "Concluída") && giftCardIdsArray.length > 0) {
      console.log("Atualizando saldos dos gift cards para transação concluída");
      
      // Distribui o valor proporcionalmente entre os gift cards
      const valorPorGiftCard = transacao.valor / giftCardIdsArray.length;
      console.log("Valor por gift card:", valorPorGiftCard);
      
      for (const giftCardId of giftCardIdsArray) {
        const giftCard = this.giftCards.get(giftCardId);
        if (giftCard) {
          const novoSaldo = Math.max(0, giftCard.saldoAtual - valorPorGiftCard);
          // Aqui também estamos normalizando o formato do status
          const status = novoSaldo <= 0 ? "zerado" : "ativo";
          console.log(`Gift card ${giftCardId}: saldo antigo = ${giftCard.saldoAtual}, novo = ${novoSaldo}`);
          this.updateGiftCard(giftCard.id, { saldoAtual: novoSaldo, status });
        } else {
          console.error(`Gift card ${giftCardId} não encontrado!`);
        }
      }
    } else {
      console.log(`Não atualizando saldos. Status = ${transacao.status}, GiftCards = ${giftCardIdsArray.length}`);
    }
    
    return newTransacao;
  }

  async updateTransacao(id: number, transacaoData: Partial<InsertTransacao>): Promise<Transacao | undefined> {
    const transacao = this.transacoes.get(id);
    if (!transacao) return undefined;
    
    const updatedTransacao = { ...transacao, ...transacaoData };
    this.transacoes.set(id, updatedTransacao);
    
    // Se mudou o status, processa as alterações de saldo em todos os gift cards
    if (transacaoData.status) {
      // Obter array de IDs de gift cards
      let giftCardIdsArray: number[] = [];
      
      if (transacao.giftCardIds) {
        // Converte a string de IDs para array de números
        giftCardIdsArray = transacao.giftCardIds
          .split(',')
          .map(id => parseInt(id))
          .filter(id => !isNaN(id));
      } else {
        // Compatibilidade com formato antigo
        giftCardIdsArray = [transacao.giftCardId];
      }
      
      // Calcula o valor por gift card
      const valorPorGiftCard = transacao.valor / giftCardIdsArray.length;
      
      // Processa cada gift card
      for (const giftCardId of giftCardIdsArray) {
        const giftCard = this.giftCards.get(giftCardId);
        if (giftCard) {
          let novoSaldo = giftCard.saldoAtual;
          
          // Se mudou de não-concluída para concluída
          if (transacao.status !== "Concluída" && transacaoData.status === "Concluída") {
            novoSaldo = Math.max(0, giftCard.saldoAtual - valorPorGiftCard);
          }
          // Se mudou de concluída para cancelada
          else if (transacao.status === "Concluída" && transacaoData.status === "Cancelada") {
            novoSaldo = giftCard.saldoAtual + valorPorGiftCard;
          }
          
          const status = novoSaldo <= 0 ? "Zerado" : "Ativo";
          this.updateGiftCard(giftCard.id, { saldoAtual: novoSaldo, status });
        }
      }
    }
    
    return updatedTransacao;
  }

  async deleteTransacao(id: number): Promise<boolean> {
    // Não deveria apagar transações, apenas marcar como canceladas
    const transacao = this.transacoes.get(id);
    if (transacao && transacao.status === "Concluída") {
      // Se estiver deletando uma transação concluída, devolve o saldo para todos os gift cards
      
      // Obter array de IDs de gift cards
      let giftCardIdsArray: number[] = [];
      
      if (transacao.giftCardIds) {
        // Converte a string de IDs para array de números
        giftCardIdsArray = transacao.giftCardIds
          .split(',')
          .map(id => parseInt(id))
          .filter(id => !isNaN(id));
      } else {
        // Compatibilidade com formato antigo
        giftCardIdsArray = [transacao.giftCardId];
      }
      
      // Calcula o valor por gift card
      const valorPorGiftCard = transacao.valor / giftCardIdsArray.length;
      
      // Devolve o saldo para cada gift card
      for (const giftCardId of giftCardIdsArray) {
        const giftCard = this.giftCards.get(giftCardId);
        if (giftCard) {
          const novoSaldo = giftCard.saldoAtual + valorPorGiftCard;
          const status = "Ativo"; // Se está devolvendo valor, sempre volta a ficar ativo
          this.updateGiftCard(giftCard.id, { saldoAtual: novoSaldo, status });
        }
      }
    }
    return this.transacoes.delete(id);
  }

  // Tag methods
  async getTags(): Promise<Tag[]> {
    return Array.from(this.tags.values());
  }

  async getTag(id: number): Promise<Tag | undefined> {
    return this.tags.get(id);
  }

  async createTag(tag: InsertTag): Promise<Tag> {
    const id = this.tagId++;
    const newTag = { ...tag, id };
    this.tags.set(id, newTag);
    return newTag;
  }

  // Gift Card Tag methods
  async addTagToGiftCard(giftCardId: number, tagId: number): Promise<GiftCardTag> {
    const id = this.giftCardTagId++;
    const newGiftCardTag = { id, giftCardId, tagId };
    this.giftCardTags.set(id, newGiftCardTag);
    return newGiftCardTag;
  }

  async removeTagFromGiftCard(giftCardId: number, tagId: number): Promise<boolean> {
    const giftCardTagToRemove = Array.from(this.giftCardTags.values()).find(
      (giftCardTag) => giftCardTag.giftCardId === giftCardId && giftCardTag.tagId === tagId
    );
    
    if (giftCardTagToRemove) {
      return this.giftCardTags.delete(giftCardTagToRemove.id);
    }
    
    return false;
  }

  async getGiftCardTags(giftCardId: number): Promise<Tag[]> {
    const giftCardTagRelations = Array.from(this.giftCardTags.values()).filter(
      (relation) => relation.giftCardId === giftCardId
    );
    
    const tagIds = giftCardTagRelations.map(relation => relation.tagId);
    return Array.from(this.tags.values()).filter(
      (tag) => tagIds.includes(tag.id)
    );
  }
}

export const storage = new MemStorage();
