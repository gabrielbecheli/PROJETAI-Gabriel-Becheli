// server.js - Backend Node.js + Express + SQLite
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction && !process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET não configurado.");
}

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ══ Item 3: Sessao real no servidor (express-session) ════════════════════════
app.use(session({
  secret: process.env.SESSION_SECRET ||
    "segredo-apenas-para-desenvolvimento",

  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 8
  },
}));

// Middleware: exige sessao autenticada
function exigirLogin(req, res, next) {
  if (req.session && req.session.usuarioId) return next();
  res.status(401).json({ erro: "Nao autenticado. Faca login para continuar." });
}

// ══ RBAC: permissoes por cargo ══════════════════════════════════════════
const PERMISSOES_VALIDAS = ["projetos","riscos","tarefas","cynefin","equipe","cargos","configuracoes"];

function permissoesDe(usuarioId) {
  const u = db.prepare("SELECT cargo_id FROM usuarios WHERE id = ?").get(usuarioId);
  if (!u || !u.cargo_id) return [];
  const c = db.prepare("SELECT permissoes FROM cargos WHERE id = ?").get(u.cargo_id);
  try { return c ? JSON.parse(c.permissoes || "[]") : []; } catch (_) { return []; }
}

const cargoNomeDe = (id) => {
  if (!id) return "";
  const c = db.prepare("SELECT nome FROM cargos WHERE id = ?").get(id);
  return c ? c.nome : "";
};

// Middleware: exige que o cargo do usuario logado possua a permissao
const exigirPermissao = (perm) => (req, res, next) => {
  if (permissoesDe(req.session.usuarioId).includes(perm)) return next();
  res.status(403).json({ erro: "Permissao negada: seu cargo nao permite esta acao." });
};

// ══ Item 4: Validacao no servidor ════════════════════════════════════════════
// Normaliza texto para comparacao (remove acentos e ignora caixa)
const norm = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function validar(body, regras) {
  const erros = [];
  if (!body || typeof body !== "object") return ["Corpo da requisicao ausente ou invalido."];
  for (const [campo, cfg] of Object.entries(regras)) {
    const v = body[campo];
    const vazio = v === undefined || v === null || String(v).trim() === "";
    if (cfg.obrigatorio && vazio) {
      erros.push(`O campo '${cfg.rotulo || campo}' e obrigatorio.`);
      continue;
    }
    if (!vazio) {
      if (cfg.valores && !cfg.valores.some((x) => norm(x) === norm(v)))
        erros.push(`Valor invalido para '${cfg.rotulo || campo}'.`);
      if (cfg.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)))
        erros.push("E-mail invalido.");
      if (cfg.numero && isNaN(Number(v)))
        erros.push(`O campo '${cfg.rotulo || campo}' deve ser numerico.`);
      if (cfg.max && String(v).length > cfg.max)
        erros.push(`O campo '${cfg.rotulo || campo}' excede ${cfg.max} caracteres.`);
    }
  }
  return erros;
}

const projetoExiste = (id) => !!db.prepare("SELECT id FROM projetos WHERE id = ?").get(id);

const VAL = {
  statusProjeto: ["Planejamento", "Em Andamento", "Concluído", "Cancelado"],
  statusTarefa:  ["Pendente", "Em Andamento", "Concluído", "Cancelado"],
  prioridades:   ["Baixa", "Média", "Alta"],
  probabilidades:["Baixa", "Média", "Alta"],
  impactos:      ["Baixo", "Médio", "Alto"],
};

// ── Matriz de risco: probabilidade x impacto -> nivel ────────────────────────
const nivelMatrix = {
  Baixa: { Baixo: "Baixo", Medio: "Baixo", Alto: "Medio" },
  Media: { Baixo: "Baixo", Medio: "Medio", Alto: "Alto" },
  Alta:  { Baixo: "Medio", Medio: "Alto", Alto: "Critico" },
};
const calcNivel = (p, i) => (nivelMatrix[p] && nivelMatrix[p][i]) || "Baixo";

// ── Login ────────────────────────────────────────────────────────────────────
app.post("/api/login", (req, res) => {
  const erros = validar(req.body, {
    email: { obrigatorio: true, email: true, rotulo: "E-mail" },
    senha: { obrigatorio: true, rotulo: "Senha" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });

  const { email, senha } = req.body;
  const u = db.prepare("SELECT * FROM usuarios WHERE lower(email) = lower(?)").get(email.trim());
  if (!u) return res.status(401).json({ erro: "E-mail nao encontrado. Verifique os dados informados." });

  // Item 2: comparacao segura com hash bcrypt
  const senhaOk = u.senha && u.senha.startsWith("$2")
    ? bcrypt.compareSync(senha, u.senha)
    : u.senha === senha; // compatibilidade com bancos antigos (apague projetai.db para migrar)
  if (!senhaOk) return res.status(401).json({ erro: "Senha incorreta. Tente novamente." });

  req.session.usuarioId = u.id; // item 3: sessao gravada no servidor
  const { senha: _, ...safe } = u;
  safe.permissoes = permissoesDe(u.id);
  res.json({ usuario: safe });
});

// Sessao atual — mantem o login apos recarregar a pagina (F5)
app.get("/api/me", (req, res) => {
  if (!req.session || !req.session.usuarioId)
    return res.status(401).json({ erro: "Sem sessao ativa." });
  const u = db.prepare("SELECT id, nome, cargo, cargo_id, email, projeto_id FROM usuarios WHERE id = ?")
    .get(req.session.usuarioId);
  if (!u) { req.session.destroy(() => {}); return res.status(401).json({ erro: "Sessao invalida." }); }
  u.permissoes = permissoesDe(u.id);
  res.json({ usuario: u });
});

// Logout — destroi a sessao no servidor
app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));

// Configuracoes publicas (nome do sistema/tema exibidos na tela de login)
app.get("/api/configuracoes", (req, res) =>
  res.json(db.prepare("SELECT * FROM configuracoes WHERE id = 1").get()));

// ══ Item 3: A partir daqui TODAS as rotas /api exigem sessao autenticada ═════
app.use("/api", exigirLogin);


// ── Projetos ─────────────────────────────────────────────────────────────────
app.get("/api/projetos", (req, res) => res.json(db.prepare("SELECT * FROM projetos ORDER BY id DESC").all()));

app.post("/api/projetos", exigirPermissao("projetos"), (req, res) => {
  const b = req.body;
  const erros = validar(b, {
    nome:        { obrigatorio: true, max: 120, rotulo: "Nome do Projeto" },
    data_inicio: { obrigatorio: true, rotulo: "Data de Inicio" },
    data_fim:    { obrigatorio: true, rotulo: "Prazo de Conclusao" },
    status:      { valores: VAL.statusProjeto, rotulo: "Status" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  const r = db.prepare(`INSERT INTO projetos (nome, descricao, data_inicio, data_fim, status, responsavel, dominio, risco)
                        VALUES (?,?,?,?,?,?,?,?)`)
    .run(b.nome, b.descricao || "", b.data_inicio || "", b.data_fim || "", b.status || "Planejamento",
         b.responsavel || "", b.dominio || "Nao classificado", b.risco || "Baixo");
  res.status(201).json(db.prepare("SELECT * FROM projetos WHERE id = ?").get(r.lastInsertRowid));
});

app.put("/api/projetos/:id", exigirPermissao("projetos"), (req, res) => {
  const b = req.body;
  const erros = validar(b, {
    nome:        { obrigatorio: true, max: 120, rotulo: "Nome do Projeto" },
    data_inicio: { obrigatorio: true, rotulo: "Data de Inicio" },
    data_fim:    { obrigatorio: true, rotulo: "Prazo de Conclusao" },
    status:      { valores: VAL.statusProjeto, rotulo: "Status" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  if (!projetoExiste(req.params.id)) return res.status(404).json({ erro: "Projeto nao encontrado." });
  db.prepare(`UPDATE projetos SET nome=?, descricao=?, data_inicio=?, data_fim=?, status=?, responsavel=?, dominio=?, risco=? WHERE id=?`)
    .run(b.nome, b.descricao || "", b.data_inicio || "", b.data_fim || "", b.status, b.responsavel || "", b.dominio, b.risco, req.params.id);
  res.json(db.prepare("SELECT * FROM projetos WHERE id = ?").get(req.params.id));
});

app.delete("/api/projetos/:id", exigirPermissao("projetos"), (req, res) => {
  // ON DELETE CASCADE remove tarefas, riscos e classificacoes vinculados
  db.prepare("DELETE FROM projetos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Tarefas ──────────────────────────────────────────────────────────────────
app.get("/api/tarefas", (req, res) => res.json(db.prepare("SELECT * FROM tarefas ORDER BY id DESC").all()));

app.post("/api/tarefas", exigirPermissao("tarefas"), (req, res) => {
  const b = req.body;
  const erros = validar(b, {
    projeto_id:  { obrigatorio: true, numero: true, rotulo: "Projeto" },
    titulo:      { obrigatorio: true, max: 120, rotulo: "Titulo da Tarefa" },
    data_inicio: { obrigatorio: true, rotulo: "Data de Inicio" },
    prazo:       { obrigatorio: true, rotulo: "Prazo de Conclusao" },
    prioridade:  { valores: VAL.prioridades, rotulo: "Prioridade" },
    status:      { valores: VAL.statusTarefa, rotulo: "Status" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  if (!projetoExiste(b.projeto_id)) return res.status(400).json({ erro: "Projeto informado nao existe." });
  const r = db.prepare(`INSERT INTO tarefas (projeto_id, titulo, descricao, responsavel, data_inicio, prazo, prioridade, status)
                        VALUES (?,?,?,?,?,?,?,?)`)
    .run(b.projeto_id, b.titulo, b.descricao || "", b.responsavel || "", b.data_inicio || "", b.prazo || "",
         b.prioridade || "Media", b.status || "Pendente");
  res.status(201).json(db.prepare("SELECT * FROM tarefas WHERE id = ?").get(r.lastInsertRowid));
});

app.put("/api/tarefas/:id", exigirPermissao("tarefas"), (req, res) => {
  const b = req.body;
  const erros = validar(b, {
    projeto_id:  { obrigatorio: true, numero: true, rotulo: "Projeto" },
    titulo:      { obrigatorio: true, max: 120, rotulo: "Titulo da Tarefa" },
    data_inicio: { obrigatorio: true, rotulo: "Data de Inicio" },
    prazo:       { obrigatorio: true, rotulo: "Prazo de Conclusao" },
    prioridade:  { valores: VAL.prioridades, rotulo: "Prioridade" },
    status:      { valores: VAL.statusTarefa, rotulo: "Status" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  if (!projetoExiste(b.projeto_id)) return res.status(400).json({ erro: "Projeto informado nao existe." });
  db.prepare(`UPDATE tarefas SET projeto_id=?, titulo=?, descricao=?, responsavel=?, data_inicio=?, prazo=?, prioridade=?, status=? WHERE id=?`)
    .run(b.projeto_id, b.titulo, b.descricao || "", b.responsavel || "", b.data_inicio || "", b.prazo || "", b.prioridade, b.status, req.params.id);
  res.json(db.prepare("SELECT * FROM tarefas WHERE id = ?").get(req.params.id));
});

app.delete("/api/tarefas/:id", exigirPermissao("tarefas"), (req, res) => {
  db.prepare("DELETE FROM tarefas WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Riscos ───────────────────────────────────────────────────────────────────
app.get("/api/riscos", (req, res) => res.json(db.prepare("SELECT * FROM riscos ORDER BY id DESC").all()));

app.post("/api/riscos", exigirPermissao("riscos"), (req, res) => {
  const b = req.body;
  const erros = validar(b, {
    projeto_id:    { obrigatorio: true, numero: true, rotulo: "Projeto" },
    descricao:     { obrigatorio: true, max: 500, rotulo: "Descricao do Risco" },
    probabilidade: { obrigatorio: true, valores: VAL.probabilidades, rotulo: "Probabilidade" },
    impacto:       { obrigatorio: true, valores: VAL.impactos, rotulo: "Impacto" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  if (!projetoExiste(b.projeto_id)) return res.status(400).json({ erro: "Projeto informado nao existe." });
  const nivel = calcNivel(b.probabilidade, b.impacto);
  const r = db.prepare(`INSERT INTO riscos (projeto_id, descricao, probabilidade, impacto, nivel, mitigacao) VALUES (?,?,?,?,?,?)`)
    .run(b.projeto_id, b.descricao, b.probabilidade, b.impacto, nivel, b.mitigacao || "");
  res.status(201).json(db.prepare("SELECT * FROM riscos WHERE id = ?").get(r.lastInsertRowid));
});

app.put("/api/riscos/:id", exigirPermissao("riscos"), (req, res) => {
  const b = req.body;
  const erros = validar(b, {
    projeto_id:    { obrigatorio: true, numero: true, rotulo: "Projeto" },
    descricao:     { obrigatorio: true, max: 500, rotulo: "Descricao do Risco" },
    probabilidade: { obrigatorio: true, valores: VAL.probabilidades, rotulo: "Probabilidade" },
    impacto:       { obrigatorio: true, valores: VAL.impactos, rotulo: "Impacto" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  if (!projetoExiste(b.projeto_id)) return res.status(400).json({ erro: "Projeto informado nao existe." });
  const nivel = calcNivel(b.probabilidade, b.impacto);
  db.prepare(`UPDATE riscos SET projeto_id=?, descricao=?, probabilidade=?, impacto=?, nivel=?, mitigacao=? WHERE id=?`)
    .run(b.projeto_id, b.descricao, b.probabilidade, b.impacto, nivel, b.mitigacao || "", req.params.id);
  res.json(db.prepare("SELECT * FROM riscos WHERE id = ?").get(req.params.id));
});

app.delete("/api/riscos/:id", exigirPermissao("riscos"), (req, res) => {
  db.prepare("DELETE FROM riscos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Usuarios ─────────────────────────────────────────────────────────────────
app.get("/api/usuarios", (req, res) =>
  res.json(db.prepare("SELECT id, nome, cargo, cargo_id, email, projeto_id FROM usuarios ORDER BY id").all()));

app.post("/api/usuarios", exigirPermissao("equipe"), (req, res) => {
  const b = req.body;
  const erros = validar(b, {
    nome:  { obrigatorio: true, max: 120, rotulo: "Nome" },
    email: { obrigatorio: true, email: true, rotulo: "E-mail" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  if (!b.senha || !String(b.senha).trim()) return res.status(400).json({ erro: "O campo 'Senha' e obrigatorio." });
  try {
    const r = db.prepare("INSERT INTO usuarios (nome, cargo, cargo_id, email, senha) VALUES (?,?,?,?,?)")
      .run(b.nome, cargoNomeDe(b.cargo_id), b.cargo_id || null, b.email, bcrypt.hashSync(b.senha, 10)); // senha nunca em texto puro
    res.status(201).json(db.prepare("SELECT id, nome, cargo, cargo_id, email FROM usuarios WHERE id = ?").get(r.lastInsertRowid));
  } catch (e) {
    res.status(400).json({ erro: "E-mail ja cadastrado." });
  }
});

app.put("/api/usuarios/:id", exigirPermissao("equipe"), (req, res) => {
  const b = req.body;
  const erros = validar(b, {
    nome:  { obrigatorio: true, max: 120, rotulo: "Nome" },
    email: { obrigatorio: true, email: true, rotulo: "E-mail" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  if (b.senha) {
    db.prepare("UPDATE usuarios SET nome=?, cargo=?, cargo_id=?, email=?, senha=? WHERE id=?")
      .run(b.nome, cargoNomeDe(b.cargo_id), b.cargo_id || null, b.email, bcrypt.hashSync(b.senha, 10), req.params.id);
  } else {
    db.prepare("UPDATE usuarios SET nome=?, cargo=?, cargo_id=?, email=? WHERE id=?")
      .run(b.nome, cargoNomeDe(b.cargo_id), b.cargo_id || null, b.email, req.params.id);
  }
  res.json(db.prepare("SELECT id, nome, cargo, cargo_id, email FROM usuarios WHERE id = ?").get(req.params.id));
});

app.delete("/api/usuarios/:id", exigirPermissao("equipe"), (req, res) => {
  if (Number(req.params.id) === req.session.usuarioId)
    return res.status(400).json({ erro: "Voce nao pode excluir o proprio usuario logado." });
  const u = db.prepare("SELECT nome FROM usuarios WHERE id = ?").get(req.params.id);
  if (!u) return res.status(404).json({ erro: "Membro nao encontrado." });
  db.prepare("UPDATE tarefas SET responsavel = '' WHERE responsavel = ?").run(u.nome);
  db.prepare("DELETE FROM usuarios WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Classificacoes Cynefin ───────────────────────────────────────────────────
// ── Cargos e Permissoes (RBAC) ─────────────────────────────────────────────
app.get("/api/cargos", (req, res) =>
  res.json(db.prepare("SELECT * FROM cargos ORDER BY nome").all()
    .map((c) => Object.assign({}, c, { permissoes: JSON.parse(c.permissoes || "[]") }))));

function validarCargo(b) {
  const erros = validar(b, { nome: { obrigatorio: true, max: 60, rotulo: "Nome do Cargo" } });
  if (!Array.isArray(b.permissoes)) erros.push("O campo 'permissoes' deve ser uma lista.");
  else if (b.permissoes.some((p) => !PERMISSOES_VALIDAS.includes(p))) erros.push("Permissao desconhecida na lista.");
  return erros;
}

app.post("/api/cargos", exigirPermissao("cargos"), (req, res) => {
  const erros = validarCargo(req.body);
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  try {
    const r = db.prepare("INSERT INTO cargos (nome, permissoes) VALUES (?,?)")
      .run(req.body.nome.trim(), JSON.stringify(req.body.permissoes));
    res.status(201).json(db.prepare("SELECT * FROM cargos WHERE id = ?").get(r.lastInsertRowid));
  } catch (e) { res.status(400).json({ erro: "Ja existe um cargo com este nome." }); }
});

app.put("/api/cargos/:id", exigirPermissao("cargos"), (req, res) => {
  const erros = validarCargo(req.body);
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  try {
    db.prepare("UPDATE cargos SET nome=?, permissoes=? WHERE id=?")
      .run(req.body.nome.trim(), JSON.stringify(req.body.permissoes), req.params.id);
    // Mantem o nome do cargo sincronizado nos membros vinculados
    db.prepare("UPDATE usuarios SET cargo=? WHERE cargo_id=?").run(req.body.nome.trim(), req.params.id);
    res.json(db.prepare("SELECT * FROM cargos WHERE id = ?").get(req.params.id));
  } catch (e) { res.status(400).json({ erro: "Ja existe um cargo com este nome." }); }
});

app.delete("/api/cargos/:id", exigirPermissao("cargos"), (req, res) => {
  const emUso = db.prepare("SELECT COUNT(*) AS c FROM usuarios WHERE cargo_id = ?").get(req.params.id).c;
  if (emUso > 0) return res.status(400).json({ erro: `Este cargo esta atribuido a ${emUso} membro(s). Reatribua-os antes de excluir.` });
  db.prepare("DELETE FROM cargos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

app.get("/api/classificacoes", (req, res) =>
  res.json(db.prepare("SELECT * FROM classificacoes ORDER BY id DESC").all()));

app.post("/api/classificacoes", exigirPermissao("cynefin"), (req, res) => {
  const b = req.body;
  const erros = validar(b, {
    projeto_id: { obrigatorio: true, numero: true, rotulo: "Projeto" },
    dominante:  { obrigatorio: true, valores: ["Obvio", "Complicado", "Complexo", "Caotico"], rotulo: "Dominio" },
  });
  if (erros.length) return res.status(400).json({ erro: erros.join(" ") });
  if (!projetoExiste(b.projeto_id)) return res.status(400).json({ erro: "Projeto informado nao existe." });
  const r = db.prepare(`INSERT INTO classificacoes (projeto_id, dominante, dist_obvio, dist_complicado, dist_complexo, dist_caotico)
                        VALUES (?,?,?,?,?,?)`)
    .run(b.projeto_id, b.dominante, b.dist_obvio, b.dist_complicado, b.dist_complexo, b.dist_caotico);
  // Atualiza o dominio do projeto classificado
  db.prepare("UPDATE projetos SET dominio = ? WHERE id = ?").run(b.dominante, b.projeto_id);
  res.status(201).json(db.prepare("SELECT * FROM classificacoes WHERE id = ?").get(r.lastInsertRowid));
});

app.delete("/api/classificacoes/:id", (req, res) => {
  db.prepare("DELETE FROM classificacoes WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Configuracoes ────────────────────────────────────────────────────────────

app.put("/api/configuracoes", exigirPermissao("configuracoes"), (req, res) => {
  const b = req.body;
  // Alteracao opcional de senha do usuario logado (gravada com hash bcrypt)
  if (b.senha) {
    if (String(b.senha).length < 4) return res.status(400).json({ erro: "A nova senha deve ter pelo menos 4 caracteres." });
    if (!req.session.usuarioId) return res.status(401).json({ erro: "Sessao invalida. Faca login novamente." });
    db.prepare("UPDATE usuarios SET senha=? WHERE id=?").run(bcrypt.hashSync(String(b.senha), 10), req.session.usuarioId);
  }
  db.prepare("UPDATE configuracoes SET nome_sistema=?, tema=?, idioma=?, nome_usuario=?, email=? WHERE id=1")
    .run(b.nome_sistema, b.tema, "pt", b.nome_usuario, b.email);
  res.json(db.prepare("SELECT * FROM configuracoes WHERE id = 1").get());
});

app.listen(PORT, () => console.log(`ProjetAI rodando em http://localhost:${PORT}`));
