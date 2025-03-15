# Mockups da Interface do Usuário - CardVault

Este documento apresenta os mockups conceituais para a interface do usuário do CardVault, o sistema de gerenciamento de gift cards. Os mockups foram projetados para serem intuitivos, eficientes e alinhados com os requisitos do projeto.

## Estrutura Geral da Interface

A interface do CardVault seguirá um layout moderno com menu lateral e área de conteúdo principal. Abaixo está a representação textual da estrutura geral:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Usuário ▼   🔔  ⚙️  │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Dashboard │                                                            │
│            │                                                            │
│  Gift Cards│                    ÁREA DE CONTEÚDO PRINCIPAL              │
│            │                                                            │
│ Fornecedores                                                            │
│            │                                                            │
│ Transações │                                                            │
│            │                                                            │
│ Relatórios │                                                            │
│            │                                                            │
│  Usuários  │                                                            │
│            │                                                            │
│ Configurações                                                           │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

## Mockups das Telas Principais

### 1. Tela de Login

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                                                                         │
│                              CARDVAULT                                  │
│                                                                         │
│                       Gerenciamento de Gift Cards                       │
│                                                                         │
│                                                                         │
│                  ┌─────────────────────────────────┐                    │
│                  │ Email                           │                    │
│                  └─────────────────────────────────┘                    │
│                                                                         │
│                  ┌─────────────────────────────────┐                    │
│                  │ Senha                           │                    │
│                  └─────────────────────────────────┘                    │
│                                                                         │
│                  ┌─────────────────────────────────┐                    │
│                  │           ENTRAR                │                    │
│                  └─────────────────────────────────┘                    │
│                                                                         │
│                      Esqueceu sua senha?                                │
│                                                                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2. Dashboard (Painel Principal)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Admin ▼   🔔  ⚙️     │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│ ► Dashboard│                     DASHBOARD                              │
│            │                                                            │
│  Gift Cards│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│            │  │              │  │              │  │              │     │
│ Fornecedores  │  Gift Cards  │  │ Fornecedores │  │ Transações   │     │
│            │  │     125      │  │      18      │  │     342      │     │
│ Transações │  │              │  │              │  │              │     │
│            │  └──────────────┘  └──────────────┘  └──────────────┘     │
│ Relatórios │                                                            │
│            │  ┌──────────────────────────────────────────────────┐     │
│  Usuários  │  │                                                  │     │
│            │  │             GIFT CARDS POR FORNECEDOR            │     │
│ Configurações │                   [GRÁFICO]                      │     │
│            │  │                                                  │     │
│            │  └──────────────────────────────────────────────────┘     │
│            │                                                            │
│            │  ┌─────────────────────┐  ┌─────────────────────────┐     │
│            │  │                     │  │                         │     │
│            │  │  SALDO DISPONÍVEL   │  │  TRANSAÇÕES RECENTES    │     │
│            │  │      R$ 12.450      │  │      [LISTA]            │     │
│            │  │                     │  │                         │     │
│            │  └─────────────────────┘  └─────────────────────────┘     │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 3. Lista de Gift Cards

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Admin ▼   🔔  ⚙️     │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Dashboard │                    GIFT CARDS                              │
│            │                                                            │
│ ► Gift Cards ┌─────────────────┐ ┌────────────────┐ ┌──────────────┐   │
│            │ │ Todos (125)     │ │ Fornecedor ▼   │ │    Buscar    │   │
│ Fornecedores └─────────────────┘ └────────────────┘ └──────────────┘   │
│            │                                                            │
│ Transações │ ┌─────────────────────────────────────────────────────┐   │
│            │ │                                                     │   │
│ Relatórios │ │  CÓDIGO    FORNECEDOR    VALOR    SALDO    STATUS   │   │
│            │ │                                                     │   │
│  Usuários  │ │  GC001     Amazon        $100     $75      Ativo    │   │
│            │ │                                                     │   │
│ Configurações │  GC002     Netflix       $50      $0       Zerado   │   │
│            │ │                                                     │   │
│            │ │  GC003     Spotify       $25      $25      Ativo    │   │
│            │ │                                                     │   │
│            │ │  GC004     Steam         $200     $150     Ativo    │   │
│            │ │                                                     │   │
│            │ │  GC005     Uber          $75      $30      Ativo    │   │
│            │ │                                                     │   │
│            │ └─────────────────────────────────────────────────────┘   │
│            │                                                            │
│            │ ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│            │ │ Anterior  │  │  1 2 3 4  │  │ Próxima   │               │
│            │ └───────────┘  └───────────┘  └───────────┘               │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 4. Detalhes do Gift Card

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Admin ▼   🔔  ⚙️     │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Dashboard │                DETALHES DO GIFT CARD                       │
│            │                                                            │
│ ► Gift Cards  ┌─────────────────────────────────────────────────────┐   │
│            │  │                                                     │   │
│ Fornecedores  │  Código: GC001                 Status: Ativo        │   │
│            │  │  Fornecedor: Amazon            Data Cadastro: 10/03/2025│
│ Transações │  │  Valor Inicial: $100           Criado por: João Silva   │
│            │  │  Saldo Atual: $75              Validade: 10/03/2026     │
│ Relatórios │  │                                                     │   │
│            │  └─────────────────────────────────────────────────────┘   │
│  Usuários  │                                                            │
│            │  ┌─────────────────────────────────────────────────────┐   │
│ Configurações │                 HISTÓRICO DE TRANSAÇÕES                 │
│            │  │                                                     │   │
│            │  │  DATA        VALOR    USUÁRIO       DESCRIÇÃO       │   │
│            │  │                                                     │   │
│            │  │  12/03/2025  $10      Maria Costa   Compra de livro │   │
│            │  │                                                     │   │
│            │  │  11/03/2025  $15      João Silva    Assinatura      │   │
│            │  │                                                     │   │
│            │  └─────────────────────────────────────────────────────┘   │
│            │                                                            │
│            │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│            │  │ Nova Transação│  │ Editar Card   │  │ Compartilhar  │   │
│            │  └───────────────┘  └───────────────┘  └───────────────┘   │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 5. Nova Transação

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Admin ▼   🔔  ⚙️     │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Dashboard │                   NOVA TRANSAÇÃO                           │
│            │                                                            │
│ ► Gift Cards  ┌─────────────────────────────────────────────────────┐   │
│            │  │                                                     │   │
│ Fornecedores  │  Gift Card: GC001 - Amazon                          │   │
│            │  │  Saldo Disponível: $75                              │   │
│            │  │                                                     │   │
│ Transações │  │  Valor da Transação: ┌────────────────────┐         │   │
│            │  │                      │ $                  │         │   │
│ Relatórios │  │                      └────────────────────┘         │   │
│            │  │                                                     │   │
│  Usuários  │  │  Descrição:          ┌────────────────────┐         │   │
│            │  │                      │                    │         │   │
│ Configurações │                      └────────────────────┘         │   │
│            │  │                                                     │   │
│            │  │  Comprovante:        ┌────────────────────┐         │   │
│            │  │                      │ Selecionar arquivo │         │   │
│            │  │                      └────────────────────┘         │   │
│            │  │                                                     │   │
│            │  └─────────────────────────────────────────────────────┘   │
│            │                                                            │
│            │  ┌───────────────┐  ┌───────────────┐                      │
│            │  │    Cancelar   │  │    Confirmar  │                      │
│            │  └───────────────┘  └───────────────┘                      │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 6. Lista de Fornecedores

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Admin ▼   🔔  ⚙️     │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Dashboard │                   FORNECEDORES                             │
│            │                                                            │
│  Gift Cards│  ┌─────────────────┐                 ┌──────────────────┐  │
│            │  │ Novo Fornecedor │                 │      Buscar      │  │
│ ►Fornecedores └─────────────────┘                 └──────────────────┘  │
│            │                                                            │
│ Transações │  ┌─────────────────────────────────────────────────────┐   │
│            │  │                                                     │   │
│ Relatórios │  │  NOME       GIFT CARDS    SALDO TOTAL    STATUS     │   │
│            │  │                                                     │   │
│  Usuários  │  │  Amazon        25           $1,250        Ativo     │   │
│            │  │                                                     │   │
│ Configurações │  Netflix       10            $500         Ativo     │   │
│            │  │                                                     │   │
│            │  │  Spotify        5            $125         Ativo     │   │
│            │  │                                                     │   │
│            │  │  Steam         15           $2,000        Ativo     │   │
│            │  │                                                     │   │
│            │  │  Uber          20           $1,500        Ativo     │   │
│            │  │                                                     │   │
│            │  └─────────────────────────────────────────────────────┘   │
│            │                                                            │
│            │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│            │  │ Anterior  │  │  1 2 3    │  │ Próxima   │               │
│            │  └───────────┘  └───────────┘  └───────────┘               │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 7. Detalhes do Fornecedor

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Admin ▼   🔔  ⚙️     │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Dashboard │                DETALHES DO FORNECEDOR                      │
│            │                                                            │
│  Gift Cards│  ┌─────────────────────────────────────────────────────┐   │
│            │  │                                                     │   │
│ ►Fornecedores │  Nome: Amazon                  Status: Ativo        │   │
│            │  │  Website: www.amazon.com       Data Cadastro: 05/03/2025│
│ Transações │  │  Gift Cards: 25                Saldo Total: $1,250  │   │
│            │  │                                                     │   │
│ Relatórios │  └─────────────────────────────────────────────────────┘   │
│            │                                                            │
│  Usuários  │  ┌─────────────────────────────────────────────────────┐   │
│            │  │                 GIFT CARDS DISPONÍVEIS                  │
│ Configurações │                                                     │   │
│            │  │  CÓDIGO    VALOR INICIAL    SALDO ATUAL    STATUS   │   │
│            │  │                                                     │   │
│            │  │  GC001        $100            $75           Ativo   │   │
│            │  │                                                     │   │
│            │  │  GC010        $50             $50           Ativo   │   │
│            │  │                                                     │   │
│            │  │  GC015        $200            $125          Ativo   │   │
│            │  │                                                     │   │
│            │  └─────────────────────────────────────────────────────┘   │
│            │                                                            │
│            │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐   │
│            │  │ Novo Gift Card│  │ Editar Fornec.│  │   Relatório   │   │
│            │  └───────────────┘  └───────────────┘  └───────────────┘   │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 8. Relatórios

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Admin ▼   🔔  ⚙️     │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Dashboard │                     RELATÓRIOS                             │
│            │                                                            │
│  Gift Cards│  ┌─────────────────────────────────────────────────────┐   │
│            │  │                                                     │   │
│ Fornecedores  │  Tipo de Relatório:                                 │   │
│            │  │  ○ Saldo de Gift Cards    ○ Transações              │   │
│ Transações │  │  ○ Fornecedores           ○ Usuários                │   │
│            │  │                                                     │   │
│ ►Relatórios│  │  Período:                                           │   │
│            │  │  De: [__/__/____]         Até: [__/__/____]         │   │
│  Usuários  │  │                                                     │   │
│            │  │  Filtros Adicionais:                                │   │
│ Configurações │  Fornecedor: [Todos ▼]                              │   │
│            │  │  Status: [Todos ▼]                                  │   │
│            │  │                                                     │   │
│            │  │  Formato de Saída:                                  │   │
│            │  │  ○ PDF    ○ CSV    ○ Excel                          │   │
│            │  │                                                     │   │
│            │  └─────────────────────────────────────────────────────┘   │
│            │                                                            │
│            │  ┌───────────────┐  ┌───────────────┐                      │
│            │  │    Cancelar   │  │     Gerar     │                      │
│            │  └───────────────┘  └───────────────┘                      │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 9. Gerenciamento de Usuários (Admin)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Admin ▼   🔔  ⚙️     │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Dashboard │                     USUÁRIOS                               │
│            │                                                            │
│  Gift Cards│  ┌─────────────────┐                 ┌──────────────────┐  │
│            │  │  Novo Usuário   │                 │      Buscar      │  │
│ Fornecedores └─────────────────┘                 └──────────────────┘  │
│            │                                                            │
│ Transações │  ┌─────────────────────────────────────────────────────┐   │
│            │  │                                                     │   │
│ Relatórios │  │  NOME         EMAIL             TIPO      STATUS    │   │
│            │  │                                                     │   │
│ ► Usuários │  │  João Silva   joao@email.com    Admin     Ativo    │   │
│            │  │                                                     │   │
│ Configurações │  Maria Costa  maria@email.com    Usuário   Ativo    │   │
│            │  │                                                     │   │
│            │  │  Carlos Gomes carlos@email.com   Usuário   Ativo    │   │
│            │  │                                                     │   │
│            │  │  Ana Souza    ana@email.com      Usuário   Inativo  │   │
│            │  │                                                     │   │
│            │  │  Pedro Santos pedro@email.com    Usuário   Ativo    │   │
│            │  │                                                     │   │
│            │  └─────────────────────────────────────────────────────┘   │
│            │                                                            │
│            │  ┌───────────┐  ┌───────────┐  ┌───────────┐               │
│            │  │ Anterior  │  │  1 2 3    │  │ Próxima   │               │
│            │  └───────────┘  └───────────┘  └───────────┘               │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 10. Configurações do Sistema

```
┌─────────────────────────────────────────────────────────────────────────┐
│ CARDVAULT                                         Admin ▼   🔔  ⚙️     │
├────────────┬────────────────────────────────────────────────────────────┤
│            │                                                            │
│  Dashboard │                   CONFIGURAÇÕES                            │
│            │                                                            │
│  Gift Cards│  ┌─────────────────────────────────────────────────────┐   │
│            │  │                                                     │   │
│ Fornecedores  │  Configurações Gerais                               │   │
│            │  │  □ Exigir 2FA para todos os usuários                │   │
│ Transações │  │  □ Notificar sobre gift cards próximos do vencimento│   │
│            │  │  □ Permitir compartilhamento de gift cards          │   │
│ Relatórios │  │                                                     │   │
│            │  │  Notificações por Email                             │   │
│  Usuários  │  │  □ Nova transação                                   │   │
│            │  │  □ Novo gift card                                   │   │
│►Configurações │  □ Saldo baixo                                      │   │
│            │  │                                                     │   │
│            │  │  Segurança                                          │   │
│            │  │  Tempo de expiração da sessão: [30 minutos ▼]       │   │
│            │  │  Tentativas de login antes do bloqueio: [5 ▼]       │   │
│            │  │                                                     │   │
│            │  └─────────────────────────────────────────────────────┘   │
│            │                                                            │
│            │  ┌───────────────┐  ┌───────────────┐                      │
│            │  │    Cancelar   │  │     Salvar    │                      │
│            │  └───────────────┘  └───────────────┘                      │
│            │                                                            │
└────────────┴────────────────────────────────────────────────────────────┘
```

## Fluxos de Navegação Principais

### 1. Fluxo de Cadastro de Gift Card

```
Dashboard → Gift Cards → Novo Gift Card → Preencher Formulário → Confirmar → Detalhes do Gift Card
```

### 2. Fluxo de Registro de Transação

```
Dashboard → Gift Cards → Selecionar Gift Card → Detalhes do Gift Card → Nova Transação → Preencher Dados → Confirmar
```

### 3. Fluxo de Geração de Relatório

```
Dashboard → Relatórios → Selecionar Tipo → Definir Parâmetros → Gerar → Download/Visualização
```

## Design System

Para garantir consistência visual em toda a aplicação, recomendamos o seguinte design system:

### Cores

- **Primária**: #3498db (Azul)
- **Secundária**: #2ecc71 (Verde)
- **Alerta**: #e74c3c (Vermelho)
- **Aviso**: #f39c12 (Laranja)
- **Neutro**: #ecf0f1 (Cinza claro)
- **Texto**: #2c3e50 (Azul escuro)
- **Fundo**: #ffffff (Branco)

### Tipografia

- **Fonte Principal**: Roboto
- **Títulos**: Roboto Bold, 24px/20px/18px
- **Corpo de Texto**: Roboto Regular, 16px
- **Pequeno**: Roboto Light, 14px

### Componentes

- **Botões Primários**: Fundo azul (#3498db), texto branco, cantos arredondados
- **Botões Secundários**: Contorno azul, texto azul, fundo transparente
- **Campos de Formulário**: Contorno cinza, foco em azul
- **Tabelas**: Cabeçalho com fundo cinza claro, linhas alternadas em branco e cinza muito claro
- **Cards**: Sombra suave, cantos arredondados, padding interno consistente

## Considerações de Responsividade

O design será responsivo, adaptando-se a diferentes tamanhos de tela:

1. **Desktop**: Layout completo conforme mockups acima
2. **Tablet**: Menu lateral colapsável, ajuste de colunas em tabelas
3. **Mobile**: Menu em hamburger, visualização simplificada de tabelas, formulários em layout vertical

## Considerações de Acessibilidade

1. **Contraste**: Alto contraste entre texto e fundo
2. **Tamanho de Fonte**: Ajustável para usuários com necessidades visuais
3. **Navegação por Teclado**: Suporte completo para navegação sem mouse
4. **Textos Alternativos**: Para todas as imagens e ícones
5. **ARIA Labels**: Para melhorar a experiência com leitores de tela

## Próximos Passos para o Design

1. **Prototipagem Interativa**: Desenvolver protótipos clicáveis usando Figma ou Adobe XD
2. **Testes de Usabilidade**: Validar o design com potenciais usuários
3. **Refinamento**: Ajustar o design com base no feedback recebido
4. **Documentação do Design System**: Criar guia de estilo detalhado para desenvolvedores

Estes mockups representam uma visão inicial da interface do CardVault, focando na usabilidade e eficiência para o gerenciamento de gift cards. O design final pode ser refinado com base em feedback de usuários e requisitos adicionais identificados durante o desenvolvimento.
