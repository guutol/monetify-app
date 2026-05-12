# Monetify

Monetify é um SaaS desenvolvido para transformar fotos simples de produtos em imagens profissionais com o uso de Inteligência Artificial.

A proposta do projeto é ajudar vendedores de marketplaces, redes sociais e lojas online a criarem imagens com aparência mais comercial, aumentando a confiança do comprador e melhorando a apresentação dos produtos sem depender de ensaio fotográfico profissional.

## Sobre o projeto

O Monetify permite que o usuário envie uma imagem de um produto, escolha um estilo de geração e visualize uma prévia antes de liberar a imagem final.

O projeto foi desenvolvido como uma aplicação fullstack, com foco em produto real, experiência do usuário, segurança básica, integração com serviços externos e arquitetura preparada para futuras melhorias.

Entre os principais recursos implementados estão autenticação, upload de imagens, geração com IA, armazenamento privado em nuvem, histórico de gerações, sistema de créditos, prévia com marca d’água e desbloqueio da imagem final após pagamento.

## Funcionalidades

- Landing page responsiva
- Autenticação com Google
- Upload de imagem de produto
- Geração de imagens com Inteligência Artificial
- Presets de estilos para diferentes tipos de imagem
- Prévia com marca d’água
- Desbloqueio da imagem final após pagamento
- Histórico de imagens geradas
- Sistema de créditos e pacotes
- Dashboard básico do usuário
- Armazenamento privado de imagens
- Acesso seguro às imagens por URLs temporárias
- Integração com gateway de pagamento
- Webhooks para confirmação de pagamento
- Separação entre ambiente de desenvolvimento e produção
- Controle de acesso por usuário
- Fluxo de geração em modo mock para desenvolvimento

## Tecnologias utilizadas

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Next.js
- API Routes
- Prisma ORM
- PostgreSQL
- Auth.js / NextAuth
- Zod

### Integrações

- OpenAI Images API
- AWS S3
- Mercado Pago
- Google OAuth

### Ferramentas

- Docker
- ESLint
- Vercel
- Git
- GitHub

## Arquitetura geral

O projeto utiliza uma arquitetura fullstack baseada no Next.js, centralizando frontend, backend e rotas de API em uma única aplicação.

A aplicação é dividida em algumas camadas principais:

- Interface do usuário com páginas públicas e área autenticada
- Rotas de API para geração, pagamento, imagens, créditos e webhooks
- Camada de serviços para regras de negócio
- Banco de dados PostgreSQL acessado via Prisma
- Armazenamento privado de imagens em nuvem
- Integrações externas para IA, autenticação e pagamentos

## Fluxo principal

1. O usuário acessa a landing page.
2. Entra na área de geração.
3. Faz upload da imagem do produto.
4. Escolhe um estilo de imagem.
5. Gera uma prévia com marca d’água.
6. Caso goste do resultado, realiza o pagamento.
7. Após a confirmação do pagamento, a imagem final é liberada.
8. O usuário pode acessar suas imagens pelo histórico.

## Segurança e boas práticas

Algumas práticas aplicadas no projeto:

- Variáveis sensíveis mantidas fora do repositório
- Arquivo `.env.example` apenas com campos de exemplo
- Bucket privado para armazenamento de imagens
- Acesso às imagens por URLs temporárias
- Validação de dados no backend
- Proteção de rotas autenticadas
- Separação entre ambiente de desenvolvimento e produção
- Confirmação de pagamentos via webhook
- Controle de acesso por usuário nas imagens e pedidos
- Bloqueio de download sem marca d’água enquanto o pedido não estiver pago
- Uso de modo mock para testes locais sem consumir APIs externas

## Estrutura do projeto

```bash
monetify-app/
├── prisma/              # Schema e migrations do banco de dados
├── public/              # Arquivos públicos
├── src/
│   ├── app/             # Rotas, páginas e APIs do Next.js
│   ├── components/      # Componentes reutilizáveis
│   ├── config/          # Configurações da aplicação
│   ├── lib/             # Bibliotecas, helpers e integrações
│   ├── services/        # Regras de negócio
│   └── types/           # Tipagens auxiliares
├── .env.example         # Exemplo de variáveis de ambiente
├── package.json
└── README.md
```

## Como rodar o projeto localmente

### Pré-requisitos

Antes de começar, você precisa ter instalado:

- Node.js
- npm
- Docker
- Git

### Clone o repositório

```bash
git clone https://github.com/guutol/monetify-app.git
cd monetify-app
```

### Instale as dependências

```bash
npm install
```

### Configure as variáveis de ambiente

Copie o arquivo de exemplo:

```bash
cp .env.example .env.local
```

No Windows PowerShell, você também pode usar:

```powershell
Copy-Item .env.example .env.local
```

Depois preencha as variáveis necessárias no arquivo `.env.local`.

Para desenvolvimento, é possível manter:

```env
USE_MOCK_IMAGE=true
```

Assim o projeto pode simular a geração de imagens sem chamar a API real de IA.

### Suba o banco de dados

```bash
docker compose up -d
```

### Rode as migrations do Prisma

```bash
npx prisma migrate dev
```

### Inicie o servidor de desenvolvimento

```bash
npm run dev
```

Acesse no navegador:

```bash
http://localhost:3000
```

## Scripts disponíveis

### Rodar em desenvolvimento

```bash
npm run dev
```

Inicia o servidor de desenvolvimento.

### Gerar build

```bash
npm run build
```

Gera a build de produção.

### Rodar em produção

```bash
npm run start
```

Inicia a aplicação em modo produção.

### Rodar lint

```bash
npm run lint
```

Executa a verificação de lint do projeto.

## Variáveis de ambiente

O projeto utiliza variáveis de ambiente para configurar banco de dados, autenticação, APIs externas, armazenamento e pagamentos.

As variáveis necessárias estão listadas no arquivo:

```bash
.env.example
```

Principais grupos de configuração:

- Banco de dados
- Auth.js / NextAuth
- Google OAuth
- OpenAI
- AWS S3
- Mercado Pago
- Configurações públicas da aplicação
- Ferramentas de desenvolvimento

## Banco de dados

O banco de dados utilizado é PostgreSQL, com Prisma ORM para modelagem, migrations e acesso aos dados.

O projeto possui entidades relacionadas a usuários, pedidos, imagens geradas, créditos, pacotes e registros necessários para autenticação.

Para aplicar as migrations localmente:

```bash
npx prisma migrate dev
```

Para visualizar e manipular os dados pelo Prisma Studio:

```bash
npx prisma studio
```

## Autenticação

A autenticação é feita com Auth.js / NextAuth, utilizando login com Google OAuth.

O sistema protege páginas e rotas que exigem usuário autenticado, como geração de imagens, histórico, pagamentos e dashboard.

## Geração de imagens

A geração de imagens utiliza integração com API de Inteligência Artificial.

O usuário envia uma imagem de referência do produto, escolhe um estilo e o sistema gera imagens com aparência mais profissional.

Durante o desenvolvimento, o projeto também possui um modo mock:

```env
USE_MOCK_IMAGE=true
```

Esse modo permite testar o fluxo sem consumir créditos ou chamadas reais de APIs externas.

## Armazenamento de imagens

As imagens são armazenadas em bucket privado no AWS S3.

O acesso às imagens não é público diretamente. O sistema gera URLs temporárias para visualização ou download, respeitando as regras de acesso do usuário e do pedido.

## Pagamentos

O projeto possui integração com gateway de pagamento para processar compras e desbloqueio de imagens finais.

O fluxo de pagamento utiliza webhooks para confirmar o status do pagamento e liberar o acesso à imagem final após a confirmação.

## Créditos e pacotes

Além da compra individual, o projeto possui estrutura para sistema de créditos e pacotes.

Com isso, o usuário pode comprar pacotes de gerações e utilizar créditos para gerar novas imagens dentro da plataforma.

## Status do projeto

O Monetify está em fase de MVP.

As principais funcionalidades do fluxo já foram implementadas:

- Upload de imagem
- Geração com IA
- Prévia com marca d’água
- Pagamento
- Desbloqueio da imagem final
- Histórico de gerações
- Sistema de créditos
- Armazenamento privado
- Autenticação
- Dashboard básico

Possíveis melhorias futuras incluem:

- Novos estilos de imagem
- Expansão para nichos específicos
- Melhorias no dashboard
- Novos métodos de pagamento
- Recursos adicionais para vendedores
- Otimizações no fluxo de geração
- Melhorias na experiência mobile
- Melhorias no sistema de créditos
- Área administrativa para acompanhamento de pedidos

## Aprendizados

Durante o desenvolvimento deste projeto, foram aplicados conceitos como:

- Desenvolvimento fullstack com Next.js
- Integração com APIs externas
- Modelagem de banco de dados com Prisma
- Autenticação OAuth
- Upload e armazenamento privado de arquivos
- Controle de acesso por usuário
- Webhooks de pagamento
- Organização de regras de negócio
- Separação de ambientes
- Construção de um MVP com foco em produto real
- Boas práticas de segurança com variáveis de ambiente
- Validação de dados no backend
- Desenvolvimento orientado a produto

## Autor

Desenvolvido por Gustavo Bomfim.

- GitHub: [@guutol](https://github.com/guutol)
- LinkedIn: https://www.linkedin.com/in/gustavo-bomfimpp/
