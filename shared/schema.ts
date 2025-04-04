import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, date, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Empresa schema (multi-tenant)
export const empresas = pgTable("empresas", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  email: text("email").notNull(),
  telefone: text("telefone"),
  plano: text("plano").default("basico").notNull(), // basico, profissional, empresarial
  status: text("status").default("ativo").notNull(), // ativo, inativo, pendente, bloqueado
  dataExpiracao: timestamp("data_expiracao"),
  logoUrl: text("logo_url"),
  corPrimaria: text("cor_primaria"),
  endereco: text("endereco"),
  cidade: text("cidade"),
  estado: text("estado"),
  cep: text("cep"),
  limiteUsuarios: integer("limite_usuarios").default(5),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// Perfil de usuário (role)
export const perfis = pgTable("perfis", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull().unique(), // admin, gerente, usuario, convidado
  descricao: text("descricao"),
  permissoes: jsonb("permissoes").notNull().$type<string[]>(), // Lista de permissões: "fornecedor.criar", "transacao.visualizar", etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
});

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  perfilId: integer("perfil_id").notNull().default(3), // Padrão: usuario normal (3)
  status: text("status").notNull().default("ativo"), // ativo, inativo, bloqueado
  ultimoLogin: timestamp("ultimo_login"),
  tokenReset: text("token_reset"),
  dataExpiracaoToken: timestamp("data_expiracao_token"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  empresaId: integer("empresa_id").notNull().default(1), // ID da empresa a que o usuário pertence
  nome: text("nome"), // Nome completo do usuário
});

// Fornecedor schema (replaces collections)
export const fornecedores = pgTable("fornecedores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  website: text("website"),
  logo: text("logo"),
  status: text("status").default("ativo").notNull(), // 'ativo', 'inativo'
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  empresaId: integer("empresa_id").notNull().default(1), // ID da empresa a que o fornecedor pertence
});

// Suppliers schema (fornecedores de gift cards)
export const suppliers = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"), // CNPJ do fornecedor
  email: text("email"), // Email de contato
  telefone: text("telefone"), // Telefone de contato
  endereco: text("endereco"), // Endereço completo
  cidade: text("cidade"), // Cidade
  estado: text("estado"), // Estado/UF
  descricao: text("descricao"),
  website: text("website"),
  logo: text("logo"),
  desconto: doublePrecision("desconto"), // Percentual de desconto padrão
  observacoes: text("observacoes"), // Observações adicionais
  status: text("status").default("ativo").notNull(), // 'ativo', 'inativo'
  userId: integer("user_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  empresaId: integer("empresa_id").notNull().default(1), // ID da empresa a que o supplier pertence
});

// Gift Card schema (replaces cards)
export const giftCards = pgTable("gift_cards", {
  id: serial("id").primaryKey(),
  codigo: text("codigo").notNull(),
  valorInicial: doublePrecision("valor_inicial").notNull(),
  saldoAtual: doublePrecision("saldo_atual").notNull(),
  dataValidade: timestamp("data_validade"), // Alterado de date para timestamp
  status: text("status").default("ativo").notNull(), // 'ativo', 'expirado', 'zerado'
  fornecedorId: integer("fornecedor_id").notNull(),
  supplierId: integer("supplier_id"), // Novo campo: ID do supplier (fornecedor do gift card)
  userId: integer("user_id").notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at"),
  empresaId: integer("empresa_id").notNull().default(1), // ID da empresa a que o gift card pertence
  
  // Novos campos para controle detalhado de gift cards
  comprador: text("comprador"), // Nome do usuário atual
  login: text("login"),
  dataCompra: timestamp("data_compra").defaultNow(), // Por padrão, data atual
  ordemCompra: text("ordem_compra"),
  percentualDesconto: doublePrecision("percentual_desconto"),
  valorPago: doublePrecision("valor_pago"),
  valorPendente: doublePrecision("valor_pendente"),
  gcNumber: text("gc_number"),
  gcPass: text("gc_pass"),
  ordemUsado: text("ordem_usado"),
});

// Transações schema (nova tabela)
export const transacoes = pgTable("transacoes", {
  id: serial("id").primaryKey(),
  giftCardId: integer("gift_card_id").notNull(), // ID do gift card principal (mantido para compatibilidade)
  giftCardIds: text("gift_card_ids").notNull(), // Lista de IDs de gift cards separados por vírgula (novo)
  valor: doublePrecision("valor").notNull(),
  descricao: text("descricao").notNull(),
  userId: integer("user_id").notNull(),
  dataTransacao: timestamp("data_transacao").defaultNow().notNull(),
  comprovante: text("comprovante"),
  status: text("status").default("concluida").notNull(), // 'concluida', 'pendente', 'cancelada', 'refund'
  motivoCancelamento: text("motivo_cancelamento"),
  valorRefund: doublePrecision("valor_refund"), // Valor do reembolso quando o status é 'refund'
  motivoRefund: text("motivo_refund"), // Motivo do reembolso
  refundDe: integer("refund_de"), // ID da transação original que está sendo reembolsada
  ordemInterna: text("ordem_interna"), // Número da ordem interna (Amazon)
  ordemCompra: text("ordem_compra"), // Número da ordem do fornecedor
  nomeUsuario: text("nome_usuario"), // Nome do usuário que realizou a transação
  empresaId: integer("empresa_id").notNull().default(1), // ID da empresa a que a transação pertence
});

// Tag schema
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  empresaId: integer("empresa_id").notNull().default(1), // ID da empresa a que a tag pertence
});

// Gift Card tags relationship
export const giftCardTags = pgTable("gift_card_tags", {
  id: serial("id").primaryKey(),
  giftCardId: integer("gift_card_id").notNull(),
  tagId: integer("tag_id").notNull(),
});

// Insert Schemas
export const insertPerfilSchema = createInsertSchema(perfis).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  ultimoLogin: true,
  tokenReset: true,
  dataExpiracaoToken: true,
});

export const insertFornecedorSchema = createInsertSchema(fornecedores).omit({
  id: true,
  createdAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGiftCardSchema = createInsertSchema(giftCards)
  .omit({
    id: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    // Permite que a dataValidade venha como string e seja convertida para Date
    dataValidade: z.union([
      z.date(),
      z.string().transform((str) => new Date(str)),
      z.null()
    ]).optional().nullable(),
    
    // Permite que a dataCompra venha como string e seja convertida para Date
    dataCompra: z.union([
      z.date(),
      z.string().transform((str) => new Date(str)),
      z.null()
    ]).optional().nullable()
  });

// Ajuste no schema para permitir que a dataTransacao seja definida como string ou Date
export const insertTransacaoSchema = createInsertSchema(transacoes)
  .omit({
    id: true,
    dataTransacao: true, // Removemos completamente do schema original
  })
  .extend({
    // Definição mais flexível para aceitar string ou objeto Date
    dataTransacao: z
      .union([
        z.string(),
        z.date(),
        z.instanceof(Date)
      ])
      .nullable()
      .transform((val) => {
        // Se for null ou undefined, retorna a data atual
        if (!val) return new Date();
        
        // Se já for um objeto Date, retorna diretamente
        if (val instanceof Date) return val;
        
        try {
          // Tenta converter para Date se for string
          const date = new Date(val as string);
          // Verifica se é uma data válida
          if (isNaN(date.getTime())) {
            console.log("Data inválida, usando data atual:", val);
            return new Date();
          }
          return date;
        } catch (e) {
          console.error("Erro ao converter data:", e);
          return new Date();
        }
      })
      .default(() => new Date().toISOString())
  });

export const insertTagSchema = createInsertSchema(tags).omit({
  id: true
});

export const insertGiftCardTagSchema = createInsertSchema(giftCardTags).omit({
  id: true
});

// Types
export type Perfil = typeof perfis.$inferSelect;
export type InsertPerfil = z.infer<typeof insertPerfilSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Fornecedor = typeof fornecedores.$inferSelect;
export type InsertFornecedor = z.infer<typeof insertFornecedorSchema>;

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;

export type GiftCard = typeof giftCards.$inferSelect;
export type InsertGiftCard = z.infer<typeof insertGiftCardSchema>;

export type Transacao = typeof transacoes.$inferSelect;
export type InsertTransacao = z.infer<typeof insertTransacaoSchema>;

export type Tag = typeof tags.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;

export type GiftCardTag = typeof giftCardTags.$inferSelect;
export type InsertGiftCardTag = z.infer<typeof insertGiftCardTagSchema>;
