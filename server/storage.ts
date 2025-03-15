import {
  users, collections, cards, tags, cardTags,
  type User, type InsertUser,
  type Collection, type InsertCollection,
  type Card, type InsertCard,
  type Tag, type InsertTag,
  type CardTag, type InsertCardTag
} from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Collection methods
  getCollections(userId: number): Promise<Collection[]>;
  getCollection(id: number): Promise<Collection | undefined>;
  createCollection(collection: InsertCollection): Promise<Collection>;
  updateCollection(id: number, collection: Partial<InsertCollection>): Promise<Collection | undefined>;
  deleteCollection(id: number): Promise<boolean>;

  // Card methods
  getCards(userId: number, collectionId?: number): Promise<Card[]>;
  getCard(id: number): Promise<Card | undefined>;
  createCard(card: InsertCard): Promise<Card>;
  updateCard(id: number, card: Partial<InsertCard>): Promise<Card | undefined>;
  deleteCard(id: number): Promise<boolean>;
  getFavoriteCards(userId: number): Promise<Card[]>;
  getCardsByTag(tagId: number): Promise<Card[]>;
  searchCards(userId: number, searchTerm: string): Promise<Card[]>;

  // Tag methods
  getTags(): Promise<Tag[]>;
  getTag(id: number): Promise<Tag | undefined>;
  createTag(tag: InsertTag): Promise<Tag>;
  
  // Card Tag methods
  addTagToCard(cardId: number, tagId: number): Promise<CardTag>;
  removeTagFromCard(cardId: number, tagId: number): Promise<boolean>;
  getCardTags(cardId: number): Promise<Tag[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private collections: Map<number, Collection>;
  private cards: Map<number, Card>;
  private tags: Map<number, Tag>;
  private cardTags: Map<number, CardTag>;
  
  private userId: number;
  private collectionId: number;
  private cardId: number;
  private tagId: number;
  private cardTagId: number;

  constructor() {
    this.users = new Map();
    this.collections = new Map();
    this.cards = new Map();
    this.tags = new Map();
    this.cardTags = new Map();
    
    this.userId = 1;
    this.collectionId = 1;
    this.cardId = 1;
    this.tagId = 1;
    this.cardTagId = 1;
    
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
    const user = this.createUser(demoUser);

    // Create collections
    const collections = [
      { name: "Pokémon TCG", description: "Pokémon Trading Card Game collection", userId: user.id },
      { name: "Magic: The Gathering", description: "Magic: The Gathering card collection", userId: user.id },
      { name: "Yu-Gi-Oh!", description: "Yu-Gi-Oh! card collection", userId: user.id }
    ];
    
    const collectionInstances = collections.map(c => this.createCollection(c));

    // Create tags
    const tagNames = ["Rare", "Common", "Foil", "Pokémon", "Fire", "Water", "Magic", "Yu-Gi-Oh", "Favorite", "Mythic"];
    const tagInstances = tagNames.map(name => this.createTag({ name }));

    // Create some cards
    const demoCards: InsertCard[] = [
      {
        name: "Pikachu V",
        imageUrl: "https://images.unsplash.com/photo-1628694647734-bf4aedeede1e?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        rarity: "Rare",
        setName: "Vivid Voltage",
        setNumber: "#43/185",
        price: 12.99,
        condition: "Near Mint",
        description: "Electric-type Pokémon with the V mechanic.",
        purchasePrice: 10.00,
        purchaseDate: new Date("2023-01-15"),
        isFavorite: false,
        collectionId: collectionInstances[0].id,
        userId: user.id
      },
      {
        name: "Charizard GX",
        imageUrl: "https://images.unsplash.com/photo-1607686204117-6774de20fc21?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        rarity: "Ultra Rare",
        setName: "Hidden Fates",
        setNumber: "#9/68",
        price: 89.99,
        condition: "Near Mint",
        description: "Stage 2 Pokémon. Evolves from Charmeleon. This Fire/Dragon type Pokémon features the GX mechanic from the Sun & Moon era.",
        notes: "Purchased at local card shop. Considering getting it graded by PSA.",
        purchasePrice: 65.00,
        purchaseDate: new Date("2023-01-15"),
        isFavorite: true,
        collectionId: collectionInstances[0].id,
        userId: user.id
      },
      {
        name: "Jace, the Mind Sculptor",
        imageUrl: "https://images.unsplash.com/photo-1627627256672-027a4613d028?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        rarity: "Mythic Rare",
        setName: "Worldwake",
        setNumber: "#31/145",
        price: 124.50,
        condition: "Near Mint",
        description: "Legendary planeswalker with powerful card advantage abilities.",
        purchasePrice: 100.00,
        purchaseDate: new Date("2022-11-10"),
        isFavorite: false,
        collectionId: collectionInstances[1].id,
        userId: user.id
      },
      {
        name: "Blue-Eyes White Dragon",
        imageUrl: "https://images.unsplash.com/photo-1627627256634-a0856ffaa5df?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        rarity: "Ultra Rare",
        setName: "Legend of Blue Eyes",
        setNumber: "#001",
        price: 75.00,
        condition: "Lightly Played",
        description: "Legendary dragon with 3000 ATK and 2500 DEF.",
        purchasePrice: 60.00,
        purchaseDate: new Date("2022-12-20"),
        isFavorite: false,
        collectionId: collectionInstances[2].id,
        userId: user.id
      },
      {
        name: "Mewtwo EX",
        imageUrl: "https://images.unsplash.com/photo-1607686204116-11ad8f92eabd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        rarity: "Rare",
        setName: "XY Breakthrough",
        setNumber: "#62/162",
        price: 22.50,
        condition: "Near Mint",
        description: "Powerful Psychic-type Pokémon with the EX mechanic.",
        purchasePrice: 18.00,
        purchaseDate: new Date("2023-02-05"),
        isFavorite: false,
        collectionId: collectionInstances[0].id,
        userId: user.id
      },
      {
        name: "Black Lotus",
        imageUrl: "https://images.unsplash.com/photo-1607686204109-e34e13f8e97d?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80",
        rarity: "Power Nine",
        setName: "Alpha",
        setNumber: "#232",
        price: 150000.00,
        condition: "Good",
        description: "The most valuable Magic: The Gathering card ever printed.",
        notes: "The crown jewel of my collection. Kept in a protective case.",
        purchasePrice: 120000.00,
        purchaseDate: new Date("2020-06-15"),
        isFavorite: true,
        collectionId: collectionInstances[1].id,
        userId: user.id
      }
    ];

    const cardInstances = demoCards.map(card => this.createCard(card));

    // Add tags to cards
    this.addTagToCard(cardInstances[0].id, tagInstances[0].id); // Pikachu - Rare
    this.addTagToCard(cardInstances[0].id, tagInstances[3].id); // Pikachu - Pokémon
    
    this.addTagToCard(cardInstances[1].id, tagInstances[0].id); // Charizard - Rare
    this.addTagToCard(cardInstances[1].id, tagInstances[3].id); // Charizard - Pokémon
    this.addTagToCard(cardInstances[1].id, tagInstances[4].id); // Charizard - Fire
    this.addTagToCard(cardInstances[1].id, tagInstances[8].id); // Charizard - Favorite
    
    this.addTagToCard(cardInstances[2].id, tagInstances[9].id); // Jace - Mythic
    this.addTagToCard(cardInstances[2].id, tagInstances[6].id); // Jace - Magic
    
    this.addTagToCard(cardInstances[3].id, tagInstances[0].id); // Blue-Eyes - Rare
    this.addTagToCard(cardInstances[3].id, tagInstances[7].id); // Blue-Eyes - Yu-Gi-Oh
    
    this.addTagToCard(cardInstances[4].id, tagInstances[0].id); // Mewtwo - Rare
    this.addTagToCard(cardInstances[4].id, tagInstances[3].id); // Mewtwo - Pokémon
    
    this.addTagToCard(cardInstances[5].id, tagInstances[0].id); // Black Lotus - Rare
    this.addTagToCard(cardInstances[5].id, tagInstances[6].id); // Black Lotus - Magic
    this.addTagToCard(cardInstances[5].id, tagInstances[8].id); // Black Lotus - Favorite
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

  // Collection methods
  async getCollections(userId: number): Promise<Collection[]> {
    return Array.from(this.collections.values()).filter(
      (collection) => collection.userId === userId
    );
  }

  async getCollection(id: number): Promise<Collection | undefined> {
    return this.collections.get(id);
  }

  async createCollection(collection: InsertCollection): Promise<Collection> {
    const id = this.collectionId++;
    const timestamp = new Date();
    const newCollection = { ...collection, id, createdAt: timestamp };
    this.collections.set(id, newCollection);
    return newCollection;
  }

  async updateCollection(id: number, collectionData: Partial<InsertCollection>): Promise<Collection | undefined> {
    const collection = this.collections.get(id);
    if (!collection) return undefined;
    
    const updatedCollection = { ...collection, ...collectionData };
    this.collections.set(id, updatedCollection);
    return updatedCollection;
  }

  async deleteCollection(id: number): Promise<boolean> {
    return this.collections.delete(id);
  }

  // Card methods
  async getCards(userId: number, collectionId?: number): Promise<Card[]> {
    let cards = Array.from(this.cards.values()).filter(
      (card) => card.userId === userId
    );
    
    if (collectionId) {
      cards = cards.filter(card => card.collectionId === collectionId);
    }
    
    return cards;
  }

  async getCard(id: number): Promise<Card | undefined> {
    return this.cards.get(id);
  }

  async createCard(card: InsertCard): Promise<Card> {
    const id = this.cardId++;
    const timestamp = new Date();
    const newCard = { ...card, id, createdAt: timestamp };
    this.cards.set(id, newCard);
    return newCard;
  }

  async updateCard(id: number, cardData: Partial<InsertCard>): Promise<Card | undefined> {
    const card = this.cards.get(id);
    if (!card) return undefined;
    
    const updatedCard = { ...card, ...cardData };
    this.cards.set(id, updatedCard);
    return updatedCard;
  }

  async deleteCard(id: number): Promise<boolean> {
    return this.cards.delete(id);
  }

  async getFavoriteCards(userId: number): Promise<Card[]> {
    return Array.from(this.cards.values()).filter(
      (card) => card.userId === userId && card.isFavorite
    );
  }

  async getCardsByTag(tagId: number): Promise<Card[]> {
    const cardTagRelations = Array.from(this.cardTags.values()).filter(
      (relation) => relation.tagId === tagId
    );
    
    const cardIds = cardTagRelations.map(relation => relation.cardId);
    return Array.from(this.cards.values()).filter(
      (card) => cardIds.includes(card.id)
    );
  }

  async searchCards(userId: number, searchTerm: string): Promise<Card[]> {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return Array.from(this.cards.values()).filter(
      (card) => 
        card.userId === userId &&
        (
          card.name.toLowerCase().includes(lowerCaseSearchTerm) ||
          card.setName.toLowerCase().includes(lowerCaseSearchTerm) ||
          card.rarity.toLowerCase().includes(lowerCaseSearchTerm) ||
          card.description?.toLowerCase().includes(lowerCaseSearchTerm) ||
          card.notes?.toLowerCase().includes(lowerCaseSearchTerm)
        )
    );
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

  // Card Tag methods
  async addTagToCard(cardId: number, tagId: number): Promise<CardTag> {
    const id = this.cardTagId++;
    const newCardTag = { id, cardId, tagId };
    this.cardTags.set(id, newCardTag);
    return newCardTag;
  }

  async removeTagFromCard(cardId: number, tagId: number): Promise<boolean> {
    const cardTagToRemove = Array.from(this.cardTags.values()).find(
      (cardTag) => cardTag.cardId === cardId && cardTag.tagId === tagId
    );
    
    if (cardTagToRemove) {
      return this.cardTags.delete(cardTagToRemove.id);
    }
    
    return false;
  }

  async getCardTags(cardId: number): Promise<Tag[]> {
    const cardTagRelations = Array.from(this.cardTags.values()).filter(
      (relation) => relation.cardId === cardId
    );
    
    const tagIds = cardTagRelations.map(relation => relation.tagId);
    return Array.from(this.tags.values()).filter(
      (tag) => tagIds.includes(tag.id)
    );
  }
}

export const storage = new MemStorage();
