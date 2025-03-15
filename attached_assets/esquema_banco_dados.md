# Esquema de Banco de Dados - CardVault

Este documento detalha o esquema de banco de dados proposto para o CardVault, o sistema de gerenciamento de gift cards. O esquema foi projetado para suportar todas as funcionalidades descritas nos requisitos e na arquitetura do sistema.

## Visão Geral do Esquema

O banco de dados do CardVault será implementado utilizando uma abordagem híbrida:
- PostgreSQL para dados relacionais (gift cards, transações, fornecedores)
- MongoDB para dados não-relacionais (logs, configurações)
- Redis para cache e sessões

## Modelo Entidade-Relacionamento

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│    Usuário    │       │  Fornecedor   │       │   Gift Card   │
├───────────────┤       ├───────────────┤       ├───────────────┤
│ id            │       │ id            │       │ id            │
│ nome          │       │ nome          │       │ codigo        │
│ email         │       │ descricao     │       │ valor_inicial │
│ senha         │       │ website       │       │ saldo_atual   │
│ telefone      │       │ logo          │       │ data_validade │
│ tipo          │       │ data_cadastro │       │ status        │
│ status        │       │ status        │       │ fornecedor_id │
│ data_cadastro │       └───────┬───────┘       │ criado_por    │
└───────┬───────┘               │               │ data_cadastro │
        │                       │               └───────┬───────┘
        │                       │                       │
        │                       │                       │
        │                       │                       │
┌───────▼───────┐       ┌───────▼───────┐       ┌───────▼───────┐
│   Permissão   │       │ Configuração  │       │   Transação   │
├───────────────┤       │  Fornecedor   │       ├───────────────┤
│ id            │       ├───────────────┤       │ id            │
│ usuario_id    │       │ id            │       │ gift_card_id  │
│ recurso       │       │ fornecedor_id │       │ valor         │
│ nivel_acesso  │       │ chave         │       │ descricao     │
│ concedido_por │       │ valor         │       │ usuario_id    │
│ data_concessao│       │ data_cadastro │       │ data_transacao│
└───────────────┘       └───────────────┘       │ comprovante   │
                                                └───────────────┘
```

## Detalhamento das Tabelas

### 1. Usuários

```sql
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    tipo VARCHAR(20) NOT NULL, -- 'admin', 'usuario_comum'
    status VARCHAR(20) NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo', 'bloqueado'
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_acesso TIMESTAMP,
    tentativas_login INTEGER DEFAULT 0,
    dois_fatores_ativo BOOLEAN DEFAULT FALSE,
    dois_fatores_segredo VARCHAR(100),
    token_recuperacao VARCHAR(100),
    token_expiracao TIMESTAMP
);
```

### 2. Permissões

```sql
CREATE TABLE permissoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    recurso VARCHAR(50) NOT NULL, -- 'gift_card', 'fornecedor', 'relatorio', etc.
    nivel_acesso VARCHAR(20) NOT NULL, -- 'leitura', 'escrita', 'admin'
    concedido_por INTEGER REFERENCES usuarios(id),
    data_concessao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (usuario_id, recurso)
);
```

### 3. Fornecedores

```sql
CREATE TABLE fornecedores (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    website VARCHAR(255),
    logo VARCHAR(255),
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo'
    criado_por INTEGER REFERENCES usuarios(id),
    atualizado_por INTEGER REFERENCES usuarios(id),
    data_atualizacao TIMESTAMP
);
```

### 4. Configurações de Fornecedores

```sql
CREATE TABLE configuracoes_fornecedores (
    id SERIAL PRIMARY KEY,
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id) ON DELETE CASCADE,
    chave VARCHAR(50) NOT NULL,
    valor TEXT NOT NULL,
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP,
    UNIQUE (fornecedor_id, chave)
);
```

### 5. Gift Cards

```sql
CREATE TABLE gift_cards (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) NOT NULL,
    valor_inicial DECIMAL(10, 2) NOT NULL,
    saldo_atual DECIMAL(10, 2) NOT NULL,
    data_validade DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ativo', -- 'ativo', 'inativo', 'expirado', 'zerado'
    fornecedor_id INTEGER NOT NULL REFERENCES fornecedores(id),
    criado_por INTEGER NOT NULL REFERENCES usuarios(id),
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_atualizacao TIMESTAMP,
    atualizado_por INTEGER REFERENCES usuarios(id),
    observacoes TEXT,
    UNIQUE (codigo, fornecedor_id)
);
```

### 6. Transações

```sql
CREATE TABLE transacoes (
    id SERIAL PRIMARY KEY,
    gift_card_id INTEGER NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
    valor DECIMAL(10, 2) NOT NULL,
    descricao TEXT,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    data_transacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    comprovante VARCHAR(255),
    referencia_externa VARCHAR(100),
    ip_origem VARCHAR(45),
    dispositivo VARCHAR(255),
    status VARCHAR(20) NOT NULL DEFAULT 'concluida', -- 'concluida', 'pendente', 'cancelada'
    motivo_cancelamento TEXT
);
```

### 7. Logs de Atividades

```sql
CREATE TABLE logs_atividades (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    acao VARCHAR(50) NOT NULL,
    entidade VARCHAR(50) NOT NULL, -- 'usuario', 'gift_card', 'fornecedor', etc.
    entidade_id INTEGER,
    dados_anteriores JSONB,
    dados_novos JSONB,
    ip VARCHAR(45),
    data_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 8. Relatórios Salvos

```sql
CREATE TABLE relatorios_salvos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) NOT NULL, -- 'saldo', 'transacoes', 'fornecedor', etc.
    parametros JSONB NOT NULL,
    formato VARCHAR(20) NOT NULL, -- 'pdf', 'csv', 'excel'
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    compartilhado BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultima_execucao TIMESTAMP
);
```

### 9. Notificações

```sql
CREATE TABLE notificacoes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    titulo VARCHAR(100) NOT NULL,
    mensagem TEXT NOT NULL,
    tipo VARCHAR(20) NOT NULL, -- 'alerta', 'informacao', 'sucesso', 'erro'
    lida BOOLEAN DEFAULT FALSE,
    data_criacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_leitura TIMESTAMP
);
```

### 10. Permissões de Gift Cards

```sql
CREATE TABLE permissoes_gift_cards (
    id SERIAL PRIMARY KEY,
    gift_card_id INTEGER NOT NULL REFERENCES gift_cards(id) ON DELETE CASCADE,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    nivel_acesso VARCHAR(20) NOT NULL, -- 'leitura', 'uso', 'administracao'
    concedido_por INTEGER NOT NULL REFERENCES usuarios(id),
    data_concessao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_expiracao TIMESTAMP,
    UNIQUE (gift_card_id, usuario_id)
);
```

## Índices Recomendados

Para otimizar o desempenho do banco de dados, recomendamos a criação dos seguintes índices:

```sql
-- Índices para tabela de usuários
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX idx_usuarios_status ON usuarios(status);

-- Índices para tabela de gift cards
CREATE INDEX idx_gift_cards_fornecedor ON gift_cards(fornecedor_id);
CREATE INDEX idx_gift_cards_codigo ON gift_cards(codigo);
CREATE INDEX idx_gift_cards_status ON gift_cards(status);
CREATE INDEX idx_gift_cards_criado_por ON gift_cards(criado_por);

-- Índices para tabela de transações
CREATE INDEX idx_transacoes_gift_card ON transacoes(gift_card_id);
CREATE INDEX idx_transacoes_usuario ON transacoes(usuario_id);
CREATE INDEX idx_transacoes_data ON transacoes(data_transacao);

-- Índices para tabela de logs
CREATE INDEX idx_logs_usuario ON logs_atividades(usuario_id);
CREATE INDEX idx_logs_entidade ON logs_atividades(entidade, entidade_id);
CREATE INDEX idx_logs_data ON logs_atividades(data_hora);

-- Índices para tabela de permissões
CREATE INDEX idx_permissoes_usuario ON permissoes(usuario_id);
CREATE INDEX idx_permissoes_recurso ON permissoes(recurso);
```

## Considerações para MongoDB

Para dados não-relacionais, como logs detalhados e configurações do sistema, utilizaremos MongoDB com as seguintes coleções:

### 1. Coleção de Logs Detalhados

```javascript
{
  "_id": ObjectId(),
  "timestamp": ISODate(),
  "level": "info|warn|error|debug",
  "source": "api|frontend|background",
  "message": "Descrição detalhada",
  "user_id": 123,
  "ip": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "request": {
    "method": "GET|POST|PUT|DELETE",
    "path": "/api/gift-cards",
    "query": {},
    "body": {}
  },
  "response": {
    "status": 200,
    "body": {}
  },
  "execution_time": 123, // em ms
  "metadata": {}
}
```

### 2. Coleção de Configurações do Sistema

```javascript
{
  "_id": ObjectId(),
  "key": "email_settings",
  "value": {
    "smtp_server": "smtp.example.com",
    "port": 587,
    "username": "user",
    "password": "encrypted_password",
    "from_email": "noreply@cardvault.com",
    "from_name": "CardVault"
  },
  "description": "Configurações do servidor de email",
  "updated_at": ISODate(),
  "updated_by": 1
}
```

## Considerações para Redis

Redis será utilizado para:

1. **Armazenamento de Sessões**:
   ```
   session:{session_id} -> { user_data, permissions, expiry }
   ```

2. **Cache de Dados Frequentemente Acessados**:
   ```
   gift_card:{id} -> { gift_card_data }
   fornecedor:{id} -> { fornecedor_data }
   ```

3. **Rate Limiting**:
   ```
   rate_limit:{ip} -> { count, reset_time }
   ```

4. **Filas de Tarefas**:
   ```
   queue:emails -> [ { to, subject, body }, ... ]
   queue:reports -> [ { report_id, parameters }, ... ]
   ```

## Estratégia de Migração e Versionamento

Para garantir a evolução controlada do esquema de banco de dados, recomendamos:

1. Utilizar uma ferramenta de migração como Flyway ou Liquibase
2. Versionar todas as alterações de esquema
3. Implementar migrações automatizadas no pipeline de CI/CD
4. Manter scripts de rollback para cada migração

## Considerações de Segurança

1. **Criptografia de Dados Sensíveis**:
   - Senhas armazenadas com hash + salt (bcrypt)
   - Códigos de gift cards criptografados em repouso
   - Dados pessoais criptografados quando necessário

2. **Auditoria**:
   - Todas as alterações em dados sensíveis são registradas na tabela de logs
   - Registros de acesso são mantidos para fins de auditoria

3. **Backup e Recuperação**:
   - Backups incrementais diários
   - Backups completos semanais
   - Testes de recuperação regulares

## Considerações para MVP

Para o MVP inicial, recomendamos:

1. Implementar apenas as tabelas essenciais:
   - usuarios
   - fornecedores
   - gift_cards
   - transacoes
   - permissoes

2. Simplificar alguns esquemas removendo campos não essenciais

3. Utilizar apenas PostgreSQL inicialmente, adiando a implementação de MongoDB e Redis para versões futuras

Este esquema de banco de dados fornece uma base sólida para o CardVault, permitindo o armazenamento e recuperação eficientes de todos os dados necessários para as funcionalidades do sistema.
