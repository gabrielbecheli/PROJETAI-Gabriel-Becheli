// database.js - Conexao e criacao do banco SQLite
// Usa o modulo nativo node:sqlite (embutido no Node.js 23+), sem compilacao nativa.

const { DatabaseSync } = require("node:sqlite");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

// Caminho configurável do banco de dados
const dbPath = process.env.DB_PATH ||
  path.join(__dirname, "projetai.db");

// Cria o diretório caso ainda não exista
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

// Conexão com o banco SQLite
const db = new DatabaseSync(dbPath);

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");


// ── Criacao das tabelas ──────────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS projetos (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  nome        TEXT NOT NULL,
  descricao   TEXT,
  data_inicio TEXT,
  data_fim    TEXT,
  status      TEXT DEFAULT 'Planejamento',
  responsavel TEXT,
  dominio     TEXT DEFAULT 'Nao classificado',
  risco       TEXT DEFAULT 'Baixo'
);

CREATE TABLE IF NOT EXISTS tarefas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  projeto_id  INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  titulo      TEXT NOT NULL,
  descricao   TEXT,
  responsavel TEXT,
  data_inicio TEXT,
  prazo       TEXT,
  prioridade  TEXT DEFAULT 'Media',
  status      TEXT DEFAULT 'Pendente'
);

CREATE TABLE IF NOT EXISTS riscos (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  projeto_id    INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  descricao     TEXT NOT NULL,
  probabilidade TEXT DEFAULT 'Baixa',
  impacto       TEXT DEFAULT 'Baixo',
  nivel         TEXT DEFAULT 'Baixo',
  mitigacao     TEXT
);

CREATE TABLE IF NOT EXISTS usuarios (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL,
  cargo      TEXT,
  email      TEXT NOT NULL UNIQUE,
  senha      TEXT,
  projeto_id INTEGER REFERENCES projetos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS classificacoes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  projeto_id       INTEGER NOT NULL REFERENCES projetos(id) ON DELETE CASCADE,
  dominante        TEXT NOT NULL,
  dist_obvio       INTEGER DEFAULT 0,
  dist_complicado  INTEGER DEFAULT 0,
  dist_complexo    INTEGER DEFAULT 0,
  dist_caotico     INTEGER DEFAULT 0,
  data             TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS configuracoes (
  id           INTEGER PRIMARY KEY CHECK (id = 1),
  nome_sistema TEXT DEFAULT 'Projetai',
  tema         TEXT DEFAULT 'dark',
  idioma       TEXT DEFAULT 'pt',
  nome_usuario TEXT DEFAULT 'Administrador',
  email        TEXT DEFAULT 'admin@projetai.com'
);
`);

// ── Seed (somente na primeira execucao) ──────────────────────────────────────
const count = db.prepare("SELECT COUNT(*) AS c FROM projetos").get().c;
if (count === 0) {
  const insP = db.prepare(`INSERT INTO projetos (nome, descricao, data_inicio, data_fim, status, responsavel, dominio, risco)
                           VALUES (?,?,?,?,?,?,?,?)`);
  insP.run("Migracao para a Nuvem", "Migracao da infraestrutura on-premise para cloud.", "2026-01-10", "2026-09-30", "Em Andamento", "Ana Souza", "Complicado", "Alto");
  insP.run("App Mobile de Vendas", "Aplicativo mobile para equipe comercial.", "2026-02-01", "2026-08-15", "Em Andamento", "Carlos Lima", "Complexo", "Medio");
  insP.run("Portal do Cliente", "Novo portal web de autoatendimento.", "2026-03-05", "2026-11-20", "Planejamento", "Gabriel Becheli", "Complexo", "Medio");
  insP.run("Automacao de Relatorios", "Automatizacao dos relatorios gerenciais mensais.", "2025-11-01", "2026-04-30", "Concluido", "Ana Souza", "Obvio", "Baixo");
  insP.run("IA para Previsao de Demanda", "Modelo preditivo de demanda com machine learning.", "2026-04-01", "2026-12-20", "Em Andamento", "Carlos Lima", "Caotico", "Critico");

  const insT = db.prepare(`INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel, data_inicio, prazo, prioridade, status)
                           VALUES (?,?,?,?,?,?,?,?)`);
  insT.run(1, "Mapear servidores legados", "Inventario completo do datacenter.", "Ana Souza", "2026-01-12", "2026-02-28", "Alta", "Concluido");
  insT.run(1, "Configurar VPC e rede", "Provisionamento da rede na nuvem.", "Carlos Lima", "2026-03-01", "2026-05-15", "Alta", "Em Andamento");
  insT.run(2, "Prototipo de telas", "Wireframes e prototipo navegavel.", "Gabriel Becheli", "2026-02-05", "2026-03-20", "Media", "Concluido");
  insT.run(3, "Levantar requisitos", "Entrevistas com stakeholders.", "Gabriel Becheli", "2026-03-10", "2026-04-30", "Alta", "Em Andamento");
  insT.run(5, "Coleta e limpeza de dados", "Pipeline de dados historicos de vendas.", "Ana Souza", "2026-04-05", "2026-06-30", "Alta", "Pendente");

  const insR = db.prepare(`INSERT INTO riscos (projeto_id, descricao, probabilidade, impacto, nivel, mitigacao) VALUES (?,?,?,?,?,?)`);
  insR.run(1, "Indisponibilidade durante a janela de migracao.", "Media", "Alto", "Alto", "Executar migracao em fases com rollback planejado.");
  insR.run(2, "Baixa adesao da equipe comercial ao app.", "Media", "Medio", "Medio", "Treinamentos e programa de embaixadores internos.");
  insR.run(5, "Qualidade insuficiente dos dados historicos.", "Alta", "Alto", "Critico", "Auditoria de dados e enriquecimento com fontes externas.");

  const insU = db.prepare(`INSERT INTO usuarios (nome, cargo, email, senha, projeto_id) VALUES (?,?,?,?,?)`);
  insU.run("Administrador", "Administrador do Sistema", "admin@projetai.com", bcrypt.hashSync("admin123", 10), null);
  insU.run("Ana Souza", "Gerente de Projetos", "ana@projetai.com", bcrypt.hashSync("123456", 10), 1);
  insU.run("Carlos Lima", "Analista de Sistemas", "carlos@projetai.com", bcrypt.hashSync("123456", 10), 2);

  db.prepare("INSERT INTO configuracoes (id) VALUES (1)").run();
  console.log("[database] Banco criado e populado com dados iniciais (senhas com hash bcrypt).");
}


// ── Cargos e permissoes (RBAC) ───────────────────────────────────────────────────
db.exec(`
CREATE TABLE IF NOT EXISTS cargos (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  nome       TEXT NOT NULL UNIQUE,
  permissoes TEXT NOT NULL DEFAULT '[]'
);`);
try { db.exec("ALTER TABLE usuarios ADD COLUMN cargo_id INTEGER REFERENCES cargos(id)"); } catch (_) { /* coluna ja existe */ }

const cargosCount = db.prepare("SELECT COUNT(*) AS c FROM cargos").get().c;
if (cargosCount === 0) {
  const insC = db.prepare("INSERT INTO cargos (nome, permissoes) VALUES (?,?)");
  insC.run("Administrador", JSON.stringify(["projetos","riscos","tarefas","cynefin","equipe","cargos","configuracoes"]));
  insC.run("Gerente de Projetos", JSON.stringify(["projetos","riscos","tarefas","cynefin"]));
  insC.run("Analista de Sistemas", JSON.stringify(["tarefas"]));
  // Migracao: vincula usuarios existentes aos cargos pelo texto antigo do campo 'cargo'
  db.exec(`
    UPDATE usuarios SET cargo_id = (SELECT id FROM cargos WHERE nome = 'Administrador'), cargo = 'Administrador'
      WHERE cargo LIKE '%Administrador%';
    UPDATE usuarios SET cargo_id = (SELECT id FROM cargos WHERE nome = 'Gerente de Projetos'), cargo = 'Gerente de Projetos'
      WHERE cargo_id IS NULL AND cargo LIKE '%Gerente%';
    UPDATE usuarios SET cargo_id = (SELECT id FROM cargos WHERE nome = 'Analista de Sistemas'), cargo = 'Analista de Sistemas'
      WHERE cargo_id IS NULL AND cargo LIKE '%Analista%';
  `);
  console.log("[database] Cargos criados e usuarios vinculados (RBAC).");
}

module.exports = db;
