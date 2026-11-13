# Projetaí — Gestão de Projetos com Classificação Cynefin

Sistema web desenvolvido com **HTML, CSS e JavaScript** no front-end, **Node.js + Express.js** no back-end
e persistência em banco relacional **SQLite**.

## Tecnologias
| Camada | Tecnologia |
|---|---|
| Interface | HTML5, CSS3, JavaScript (puro, sem frameworks) |
| Gráficos | Canvas API + CSS (sem bibliotecas) |
| Servidor | Node.js + Express.js |
| Banco de dados | SQLite (node:sqlite (modulo nativo do Node.js)) |

## Como executar
```bash
npm install
npm start
```
Acesse: **http://localhost:3000**

O banco `projetai.db` é criado e populado automaticamente na primeira execução.

## Acesso (dados de exemplo)
| E-mail | Senha |
|---|---|
| admin@projetai.com | admin123 |
| ana@projetai.com | 123456 |
| carlos@projetai.com | 123456 |

## Requisitos
- **Node.js 23.4 ou superior** (voce esta com Node 24 — perfeito). O banco SQLite usa o
  modulo nativo `node:sqlite`, embutido no proprio Node.js, entao **nao ha compilacao
  de modulos nativos** no `npm install` (nada de node-gyp / Visual Studio Build Tools).
- As unicas dependencias sao `express`, `express-session` e `bcryptjs` — todas 100% JavaScript.

## Segurança implementada (v1.1)
1. **Hash de senhas (bcrypt)** — nenhuma senha é armazenada em texto puro; o seed e o
   cadastro/edição de membros geram hash bcrypt (custo 10) antes de gravar no banco.
2. **Sessão real no servidor (express-session)** — cookie `httpOnly` + `sameSite: lax`,
   com expiração de 8 horas. O login persiste após recarregar a página (F5) via rota
   `/api/me` e o logout destrói a sessão no servidor (`/api/logout`).
3. **Rotas protegidas** — todas as rotas da API (exceto login) exigem sessão autenticada
   e retornam `401 Unauthorized` caso contrário.
4. **Validação no servidor** — campos obrigatórios, formato de e-mail, valores permitidos,
   limite de caracteres e integridade referencial (projeto existente) são validados no
   backend, com respostas `400 Bad Request` detalhando o erro.

> **Atenção:** se você já executou a versão 1.0, apague o arquivo `projetai.db` antes de
> iniciar, para que o banco seja recriado com as senhas em hash bcrypt.

## Funcionalidades
- **Login** com validação de e-mail e senha
- **Dashboard** com indicadores, gráficos (Canvas puro) e projetos recentes
- **Projetos** — CRUD completo com exclusão em cascata
- **Riscos** — CRUD com nível calculado pela matriz probabilidade × impacto
- **Tarefas** — CRUD com filtro por projeto
- **Equipe** — CRUD de usuários
- **Cynefin** — questionário de 10 perguntas, resultado com domínio predominante,
  distribuição percentual e histórico de classificações

## Estrutura
```
projetai/
├── server.js          # API REST (Express)
├── database.js        # Criação do banco e seed (SQLite)
├── package.json
└── public/
    ├── index.html     # SPA (telas: login, dashboard, projetos, riscos, tarefas, cynefin, equipe, config)
    ├── css/style.css  # Tema dark (GitHub style) + light
    └── js/
        ├── api.js     # Camada de acesso à API
        ├── charts.js  # Gráficos em Canvas puro
        └── app.js     # Lógica da aplicação
```

## v1.2.0
- Removida a função de internacionalização (seletor de idioma PT/EN/ES). O sistema agora é exclusivamente em Português (BR), eliminando traduções parciais.

## v1.3.0
- Correcao: alteracao de senha em Configuracoes agora funciona (gravada com hash bcrypt no usuario logado).
- Novo: tela de detalhe do projeto (clique no nome na lista): status, dominio, tarefas, riscos e historico Cynefin.
- Correcao: dominio exibido agora deriva do historico de classificacoes; sem historico = 'Nao classificado'.
- Melhoria: campo Responsavel do projeto virou menu suspenso com os membros da equipe.

## v1.4.0
- Correcao: o 'Risco' do projeto (lista e detalhe) agora e derivado automaticamente dos riscos cadastrados, exibindo o nivel mais alto entre eles (Critico > Alto > Medio > Baixo). Projetos sem riscos exibem 'Sem riscos'.
- O campo manual 'Nivel de Risco Geral' foi removido do formulario de projeto.

## v1.4.1
- Melhoria: campo Responsavel do formulario de tarefas virou menu suspenso com os membros da equipe (mesmo padrao do formulario de projetos).

## v1.5.0 — Cargos e Permissoes (RBAC)
- Nova tabela `cargos` (nome + permissoes em JSON) e coluna `cargo_id` em `usuarios`.
- Permissoes: projetos, riscos, tarefas, cynefin, equipe, cargos, configuracoes.
- Cargos iniciais: Administrador (total), Gerente de Projetos (projetos/riscos/tarefas/cynefin), Analista de Sistemas (tarefas).
- Tela Equipe: gerenciamento de cargos com checkboxes; cargo do membro virou menu suspenso.
- Servidor: middleware exigirPermissao() protege todas as rotas de escrita (403 sem permissao).
- Interface: botoes de criar/editar/excluir somem conforme o cargo do usuario logado.
- Migracao automatica em bancos existentes (nao precisa apagar o projetai.db).

## v1.5.1
- Questionario Cynefin ampliado de 9 para 10 perguntas: adicionada a dimensao 'Impacto das decisoes' (q9), alinhando o sistema as 10 dimensoes do documento do TCC. 'Abordagem de gestao' passou a ser a q10.

## v1.6.0
- Exclusao de membro: falhas passam a exibir o motivo, o modal avisa quantas tarefas estao atribuidas ao membro e o servidor libera essas tarefas (responsavel vazio).
- Cards do dashboard alinhados (alturas e linha de base uniformes).
- Menu lateral reordenado: Dashboard, Projetos, Cynefin, Tarefas, Riscos, Equipe, Configuracoes.
- Busca global funcional em Tarefas, Riscos e Equipe; oculta em Dashboard, Cynefin e Configuracoes.
- Mensagens da Distribuicao Cynefin especificas e coerentes com cada dominio.
- Dominio 'Obvio' passa a ser exibido como 'Claro' em todo o sistema.
- Tarefas canceladas nao contam mais como 'abertas' no dashboard.

## v1.6.1
- Correcao do alinhamento no dashboard: a regra ".card + .card { margin-top:16px }" tambem atingia cards dentro dos grids, empurrando a coluna da direita 16px para baixo. Cards em grid nao herdam mais essa margem.
