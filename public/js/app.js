// app.js - Lógica da aplicação (SPA em JavaScript puro)

// ══ Estado global ════════════════════════════════════════════════════════════
const state = {
  logado: false, usuario: null, permissoes: [],
  projetos: [], tarefas: [], riscos: [], usuarios: [], cargos: [], classificacoes: [],
  config: { nome_sistema: "Projetaí", tema: "dark", nome_usuario: "", email: "" },
  screen: "dashboard", activeNav: "Dashboard",
  editando: null,           // projeto em edição
  editandoRisco: null, editandoTarefa: null, editandoUsuario: null, editandoCargo: null,
  filtroProjetoRiscos: "", filtroProjetoTarefas: "", busca: "",
  cynefin: { projetoId: null, respostas: {}, resultado: null },
  projetoDetalhe: null,
};


// ══ Constantes ═══════════════════════════════════════════════════════════════
const statusBadge = { "Planejamento":"b-blue", "Em Andamento":"b-yellow", "Concluído":"b-green", "Concluido":"b-green", "Cancelado":"b-red", "Pendente":"b-gray" };
const nivelBadge  = { "Baixo":"b-green", "Médio":"b-yellow", "Medio":"b-yellow", "Alto":"b-red", "Crítico":"b-purple", "Critico":"b-purple" };
const domColor    = { "Claro":"#3fb950", "Óbvio":"#3fb950", "Obvio":"#3fb950", "Complicado":"#58a6ff", "Complexo":"#bc8cff", "Caótico":"#f85149", "Caotico":"#f85149" };
const domBadge    = { "Claro":"b-green", "Óbvio":"b-green", "Obvio":"b-green", "Complicado":"b-blue", "Complexo":"b-purple", "Caótico":"b-red", "Caotico":"b-red", "Nao classificado":"b-gray" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const can = (p) => Array.isArray(state.permissoes) && state.permissoes.includes(p);

// Rótulos legíveis das permissões exibidas na tela Equipe
const permLabels = {
  projetos: "Gerenciar Projetos",
  riscos: "Gerenciar Riscos",
  tarefas: "Gerenciar Tarefas",
  cynefin: "Classificar Projetos (Cynefin)",
  equipe: "Gerenciar Equipe",
  cargos: "Gerenciar Cargos",
  configuracoes: "Configurações do Sistema",
};

// ══ Questionário Cynefin ═════════════════════════════════════════════════════
const cynefinQuestions = [
  { id:"q1", text:"Qual é o nível de clareza sobre o problema que o projeto resolve?",
    options:[["O problema é claro e bem compreendido por todos.","Obvio"],["O problema é compreensível, mas exige análise de especialistas.","Complicado"],["O problema é pouco claro e muda com frequência.","Complexo"],["Não há entendimento sobre o problema; situação de crise.","Caotico"]] },
  { id:"q2", text:"Existem práticas ou soluções conhecidas para este tipo de projeto?",
    options:[["Sim, existem boas práticas consolidadas.","Obvio"],["Existem práticas, mas exigem adaptação por especialistas.","Complicado"],["As práticas emergem experimentalmente, com muita incerteza.","Complexo"],["Não existem práticas estabelecidas.","Caotico"]] },
  { id:"q3", text:"Como você avalia o nível de incerteza dos requisitos do projeto?",
    options:[["Os requisitos são claros e estáveis.","Obvio"],["Alguns requisitos precisam de análise técnica.","Complicado"],["Alta incerteza; requisitos evoluem continuamente.","Complexo"],["Requisitos completamente indefinidos.","Caotico"]] },
  { id:"q4", text:"Como as decisões são normalmente tomadas pela equipe?",
    options:[["Seguindo procedimentos definidos.","Obvio"],["Com base em análise e expertise.","Complicado"],["Por tentativa, aprendizado e adaptação.","Complexo"],["De forma reativa e urgente.","Caotico"]] },
  { id:"q5", text:"Qual o grau de novidade da solução a ser desenvolvida?",
    options:[["Solução amplamente conhecida e já utilizada.","Obvio"],["Solução conhecida com adaptações específicas.","Complicado"],["Solução nova com elementos incertos.","Complexo"],["Solução completamente inovadora e experimental.","Caotico"]] },
  { id:"q6", text:"Como está o alinhamento entre os stakeholders do projeto?",
    options:[["Existe consenso sobre objetivos e expectativas.","Obvio"],["Há alinhamento parcial com algumas divergências.","Complicado"],["Divergências significativas entre stakeholders.","Complexo"],["Conflito constante de interesses e objetivos.","Caotico"]] },
  { id:"q7", text:"Como as mudanças de escopo costumam ocorrer?",
    options:[["São raras e controladas.","Obvio"],["Ocorrem com frequência moderada e planejada.","Complicado"],["Ocorrem frequentemente e de forma emergente.","Complexo"],["São constantes e imprevisíveis.","Caotico"]] },
  { id:"q8", text:"Qual o nível de maturidade das tecnologias utilizadas no projeto?",
    options:[["Tecnologias consolidadas e amplamente utilizadas.","Obvio"],["Tecnologias maduras com algumas novidades.","Complicado"],["Tecnologias emergentes com incertezas.","Complexo"],["Tecnologias experimentais ou de ponta.","Caotico"]] },
  { id:"q9", text:"Qual o impacto das decisões tomadas no projeto?",
    options:[["As decisões têm impacto previsível e facilmente reversível.","Obvio"],["O impacto é significativo, mas pode ser avaliado com análise prévia.","Complicado"],["O impacto só é compreendido depois que a decisão é tomada.","Complexo"],["Decisões têm consequências imprevisíveis e potencialmente graves.","Caotico"]] },
  { id:"q10", text:"Qual abordagem de gestão parece mais adequada para este projeto?",
    options:[["Seguir procedimentos e boas práticas estabelecidas.","Obvio"],["Aplicar boas práticas adaptadas ao contexto.","Complicado"],["Experimentar e adaptar continuamente.","Complexo"],["Agir imediatamente para estabilizar a situação.","Caotico"]] },
];

const domDescricao = {
  Obvio: "Projeto classificado como Claro possui relações de causa e efeito claras e previsíveis. Boas práticas consolidadas e processos bem definidos são a abordagem ideal.",
  Complicado: "Projeto classificado como Complicado requer análise especializada. As relações de causa e efeito existem, mas demandam expertise para serem identificadas e resolvidas.",
  Complexo: "Projeto classificado como Complexo apresenta elevado nível de incerteza, exigindo adaptação contínua, experimentação controlada e aprendizado constante ao longo da execução.",
  Caotico: "Projeto classificado como Caótico requer ação imediata para estabilização. A prioridade é restaurar a ordem antes de planejar soluções de longo prazo.",
};
const domMensagem = {
  Obvio: "O domínio com maior quantidade de classificações entre os projetos ativos é Claro, no qual as relações de causa e efeito são previsíveis, indicando a adoção de processos padronizados e boas práticas consolidadas.",
  Complicado: "O domínio com maior quantidade de classificações entre os projetos ativos é Complicado, indicando necessidade de análise especializada e do apoio de especialistas antes da tomada de decisão.",
  Complexo: "O domínio com maior quantidade de classificações entre os projetos ativos é Complexo, indicando necessidade de abordagens adaptativas e iterativas, com experimentação controlada e aprendizado contínuo.",
  Caotico: "O domínio com maior quantidade de classificações entre os projetos ativos é Caótico, indicando necessidade de ação imediata para estabilizar a situação antes de qualquer planejamento de longo prazo.",
};
const domNome = { Obvio: "Claro", Claro: "Claro", Complicado: "Complicado", Complexo: "Complexo", Caotico: "Caótico" };

// ══ Utilidades de UI ═════════════════════════════════════════════════════════
const $ = (sel) => document.querySelector(sel);
const screenEl = () => $("#screen");

function showModal(text, onConfirm) {
  $("#modal-text").textContent = text;
  $("#modal").classList.remove("hidden");
  $("#modal-confirm").onclick = () => { $("#modal").classList.add("hidden"); onConfirm(); };
  $("#modal-cancel").onclick = () => $("#modal").classList.add("hidden");
}

function applyTema() { document.documentElement.setAttribute("data-theme", state.config.tema); }

async function loadAll() {
  const [p, ta, r, u, c, cg, cfg] = await Promise.all([
    API.projetos(), API.tarefas(), API.riscos(), API.usuarios(), API.classificacoes(), API.cargos(), API.configuracoes(),
  ]);
  Object.assign(state, { projetos: p, tarefas: ta, riscos: r, usuarios: u, classificacoes: c, cargos: cg, config: cfg });
  applyTema();
}

function projetoNome(id) { const p = state.projetos.find((x) => x.id === id); return p ? p.nome : "—"; }
function riscoProjeto(id) {
  const ordem = { "Baixo": 1, "Médio": 2, "Medio": 2, "Alto": 3, "Crítico": 4, "Critico": 4 };
  const nomes = { 1: "Baixo", 2: "Médio", 3: "Alto", 4: "Crítico" };
  const niveis = state.riscos.filter((r) => r.projeto_id === id).map((r) => ordem[r.nivel] || 0);
  return niveis.length ? nomes[Math.max(...niveis)] : "Sem riscos";
}
function dominioProjeto(id) {
  const cls = state.classificacoes.filter((c) => c.projeto_id === id).sort((a, b) => b.id - a.id);
  return cls.length ? cls[0].dominante : "Não classificado";
}
// Retorna os projetos cujo responsável corresponde ao membro da equipe.
function projetosDoMembro(usuario) {
  const normalizar = (valor) => String(valor || "")
    .normalize("NFD")
    .replace(/[\\u0300-\\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("pt-BR");

  const nomeMembro = normalizar(usuario.nome);
  if (!nomeMembro) return [];

  return state.projetos.filter((projeto) =>
    normalizar(projeto.responsavel) === nomeMembro
  );
}
function fmtData(d) { if (!d) return "—"; const [y, m, dd] = d.split("T")[0].split("-"); return `${dd}/${m}/${y}`; }

// ══ Navegação ════════════════════════════════════════════════════════════════
const navItems = [
  { label: "Dashboard", icon: "📊", screen: "dashboard" },
  { label: "Projetos", icon: "📁", screen: "lista" },
  { label: "Cynefin", icon: "🧠", screen: "questionario" },
  { label: "Tarefas", icon: "✅", screen: "lista-tarefas" },
  { label: "Riscos", icon: "⚠️", screen: "lista-riscos" },
  { label: "Equipe", icon: "👥", screen: "equipe" },
  { label: "Configurações", icon: "⚙️", screen: "configuracoes" },
];

const breadcrumbs = {
  dashboard: "/ visão geral", lista: "/ projetos", cadastro: "/ cadastro", "detalhe-projeto": "/ detalhe",
  "lista-riscos": "/ riscos", "cadastro-risco": "/ cadastro",
  questionario: "/ questionário", resultado: "/ resultado", "historico-cynefin": "/ histórico",
  "lista-tarefas": "/ tarefas", "cadastro-tarefa": "/ cadastro",
  equipe: "/ usuários", "cadastro-membro": "/ cadastro", "cadastro-cargo": "/ cargos", configuracoes: "",
};

function nav(navLabel, screen) {
  state.activeNav = navLabel; state.screen = screen;
  render();
}

function renderSidebar() {
  $("#sidebar-logo").textContent = state.config.nome_sistema || "Projetaí";
  $("#sidebar-nav").innerHTML = navItems.map((n) =>
    `<button class="nav-item ${state.activeNav === n.label ? "active" : ""}" data-nav="${n.label}" data-screen="${n.screen}">${n.icon} <span>${n.label}</span></button>`
  ).join("");
  document.querySelectorAll("#sidebar-nav .nav-item").forEach((b) =>
    b.addEventListener("click", () => {
      state.editando = state.editandoRisco = state.editandoTarefa = state.editandoUsuario = null;
      if (b.dataset.screen === "questionario") state.cynefin = { projetoId: null, respostas: {}, resultado: null };
      nav(b.dataset.nav, b.dataset.screen);
    })
  );
}

// ══ Renderização principal ═══════════════════════════════════════════════════
function render() {
  renderSidebar();
  $("#screen-title").textContent = state.activeNav;
  $("#screen-breadcrumb").textContent = breadcrumbs[state.screen] || "";
  $("#user-badge").textContent = state.usuario ? state.usuario.nome : "";
  const renders = {
    dashboard: renderDashboard, lista: renderListaProjetos, cadastro: renderCadastroProjeto,
    "detalhe-projeto": renderDetalheProjeto,
    "lista-riscos": renderListaRiscos, "cadastro-risco": renderCadastroRisco,
    "lista-tarefas": renderListaTarefas, "cadastro-tarefa": renderCadastroTarefa,
    equipe: renderEquipe, "cadastro-membro": renderCadastroMembro, "cadastro-cargo": renderCadastroCargo,
    questionario: renderQuestionario, resultado: renderResultado, "historico-cynefin": renderHistorico,
    configuracoes: renderConfiguracoes,
  };
  (renders[state.screen] || renderDashboard)();
  aplicarPermissoes();
}

// ══ DASHBOARD ════════════════════════════════════════════════════════════════
function distribuicaoDominiosAtivos() {
  const cnt = { Obvio: 0, Complicado: 0, Complexo: 0, Caotico: 0 };
  const normalizar = (valor) => String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
  const dominios = {
    claro: "Obvio", obvio: "Obvio",
    complicado: "Complicado",
    complexo: "Complexo",
    caotico: "Caotico",
  };

  // Somente projetos planejados ou em andamento participam da distribuição.
  const projetosAtivos = state.projetos.filter((p) => {
    const status = normalizar(p.status);
    return ["planejamento", "planejado", "em andamento"].includes(status);
  });

  let total = 0;
  projetosAtivos.forEach((p) => {
    const dominio = dominios[normalizar(dominioProjeto(p.id))];
    if (dominio && cnt[dominio] !== undefined) {
      cnt[dominio]++;
      total++;
    }
  });

  const dist = {};
  Object.keys(cnt).forEach((k) => {
    dist[k] = total ? Math.round((cnt[k] / total) * 100) : 0;
  });
  return { cnt, dist, totalClass: total };
}

function renderDashboard() {
  const { cnt, dist, totalClass } = distribuicaoDominiosAtivos();
  const dominante = totalClass
    ? Object.keys(cnt).reduce((a, b) => (cnt[b] > cnt[a] ? b : a), "Obvio")
    : "Obvio";
  const abertas = state.tarefas.filter((x) => x.status !== "Concluído" && x.status !== "Concluido" && x.status !== "Cancelado").length;
  const criticos = state.riscos.filter((r) => r.nivel === "Crítico" || r.nivel === "Critico").length;
  const andamento = state.projetos.filter((p) => p.status === "Em Andamento").length;

  const stats = [
    { label: "Projetos", value: state.projetos.length, color: "#58a6ff", icon: "📁", delta: `${andamento} em andamento` },
    { label: "Riscos", value: state.riscos.length, color: "#f85149", icon: "⚠️", delta: `${criticos} críticos` },
    { label: "Tarefas", value: state.tarefas.length, color: "#3fb950", icon: "✅", delta: `${abertas} abertas` },
    { label: "Domínio", value: totalClass ? domNome[dominante] : "—", color: "#bc8cff", icon: "🧠", delta: totalClass ? `${dist[dominante]}% dos ativos classificados` : "nenhum projeto ativo classificado" },
  ];

  const recentes = state.projetos.slice(0, 5);

  screenEl().innerHTML = `
    <div class="grid-4">
      ${stats.map((s) => `
        <div class="stat-card">
          <div class="stat-label"><span>${s.label}</span>
            <span class="stat-icon" style="background:${s.color}22;color:${s.color}">${s.icon}</span></div>
          <div class="stat-value" style="${s.label === "Domínio" ? `color:${s.color}` : ""}">${s.value}</div>
          <div class="stat-delta">${s.delta}</div>
        </div>`).join("")}
    </div>
    <div class="grid-2" style="margin-top:16px">
      <div class="card"><div class="card-header">Projetos por Status</div><canvas id="chart-status"></canvas></div>
      <div class="card"><div class="card-header">Riscos por Nível</div><canvas id="chart-riscos"></canvas></div>
    </div>
    <div class="grid-2" style="margin-top:16px">
      <div class="card">
        <div class="card-header">Distribuição Cynefin (projetos ativos)</div>
        ${Object.keys(dist).map((k) => `
          <div class="hbar-row">
            <span class="hbar-label">${domNome[k]}</span>
            <div class="hbar-track"><div class="hbar-fill" style="width:${dist[k]}%;background:${domColor[k]}"></div></div>
            <span class="hbar-pct" style="color:${domColor[k]}">${dist[k]}%</span>
          </div>`).join("")}
        <p style="font-size:10px;color:var(--muted);margin-top:14px;padding-top:12px;border-top:1px solid var(--border)">
          ${totalClass === 0 ? "Nenhum projeto ativo classificado. Utilize o questionário Cynefin para classificar um projeto planejado ou em andamento." : domMensagem[dominante]}</p>
      </div>
      <div class="card">
        <div class="card-header">Projetos Recentes</div>
        ${recentes.length === 0 ? '<p class="empty">Nenhum projeto encontrado.</p>' : recentes.map((p) => `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--border)">
            <div><p class="row-title">${esc(p.nome)}</p>
              <p class="row-sub">${state.tarefas.filter((x) => x.projeto_id === p.id).length} tarefas · ${esc(p.responsavel || "")}</p></div>
            <span class="badge ${statusBadge[p.status] || "b-gray"}">${esc(p.status)}</span>
          </div>`).join("")}
      </div>
    </div>`;

  const st = { Planejamento: 0, "Em Andamento": 0, Concluido: 0, Cancelado: 0 };
  state.projetos.forEach((p) => { const k = p.status === "Concluído" ? "Concluido" : p.status; if (st[k] !== undefined) st[k]++; });
  drawBarChart($("#chart-status"), ["Planej.", "Andamento", "Concluído", "Cancelado"],
    [st.Planejamento, st["Em Andamento"], st.Concluido, st.Cancelado], ["#58a6ff", "#d29922", "#3fb950", "#f85149"]);

  const rv = { Baixo: 0, Medio: 0, Alto: 0, Critico: 0 };
  state.riscos.forEach((r) => { const k = r.nivel.replace("é", "e").replace("í", "i"); if (rv[k] !== undefined) rv[k]++; });
  drawDonutChart($("#chart-riscos"), ["Baixo", "Médio", "Alto", "Crítico"],
    [rv.Baixo, rv.Medio, rv.Alto, rv.Critico], ["#3fb950", "#d29922", "#f85149", "#bc8cff"]);
}

// ══ PROJETOS ═════════════════════════════════════════════════════════════════
function renderListaProjetos() {
const lista = state.projetos;
  screenEl().innerHTML = `
    <div class="page-head">
      <div><div class="page-title">Projetos Cadastrados</div>
      <p class="page-sub">${lista.length} projeto${lista.length !== 1 ? "s" : ""} encontrado${lista.length !== 1 ? "s" : ""}</p></div>
      <button class="btn btn-primary btn-sm" id="btn-novo-projeto">+ Novo Projeto</button>
    </div>
    <div class="table">
      <div class="table-head" style="grid-template-columns:1fr 110px 110px 100px 90px 76px">
        <span>Projeto</span><span>Status</span><span>Domínio</span><span>Risco</span><span>Prazo</span><span></span>
      </div>
      ${lista.length === 0 ? '<p class="empty">Nenhum projeto cadastrado.</p>' : lista.map((p) => `
        <div class="table-row" style="grid-template-columns:1fr 110px 110px 100px 90px 76px">
          <div style="cursor:pointer" data-view="${p.id}" title="Ver detalhes do projeto"><p class="row-title" style="color:var(--blue)">${esc(p.nome)}</p><p class="row-sub">${esc(p.responsavel || "")}</p></div>
          <span class="badge ${statusBadge[p.status] || "b-gray"}">${esc(p.status)}</span>
          <span class="badge ${domBadge[dominioProjeto(p.id)] || "b-gray"}">${esc(dominioProjeto(p.id))}</span>
          <span class="badge ${nivelBadge[riscoProjeto(p.id)] || "b-gray"}">${esc(riscoProjeto(p.id))}</span>
          <span class="row-sub">${fmtData(p.data_fim)}</span>
          <div class="row-actions">
            <button class="icon-btn" data-edit="${p.id}" title="Editar">✎</button>
            <button class="icon-btn danger" data-del="${p.id}" title="Excluir">🗑</button>
          </div>
        </div>`).join("")}
    </div>`;
  $("#btn-novo-projeto").onclick = () => { state.editando = null; nav("Projetos", "cadastro"); };
  bindRowActions(state.projetos, (p) => { state.editando = p; nav("Projetos", "cadastro"); },
    async (id) => { await API.del(`/api/projetos/${id}`); await loadAll(); render(); },
    "Excluir este projeto? Riscos, tarefas e classificações vinculados também serão removidos.");
  document.querySelectorAll("[data-view]").forEach((el) => el.addEventListener("click", () => {
    state.projetoDetalhe = state.projetos.find((x) => x.id === Number(el.dataset.view));
    nav("Projetos", "detalhe-projeto");
  }));
}

function bindRowActions(coll, onEdit, onDel, delMsg) {
  document.querySelectorAll("[data-edit]").forEach((b) =>
    b.addEventListener("click", () => onEdit(coll.find((x) => x.id === Number(b.dataset.edit)))));
  document.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => showModal(delMsg, () => onDel(Number(b.dataset.del)))));
}

function renderCadastroProjeto() {
  const p = state.editando || {};
  screenEl().innerHTML = `
    <div class="page-head"><div class="page-title">${p.id ? "Editar Projeto" : "Novo Projeto"}</div></div>
    <form id="form-projeto" class="card">
      <label class="field-label">Nome do Projeto</label>
      <input class="input" name="nome" value="${esc(p.nome || "")}" placeholder="Informe o nome do projeto" required />
      <label class="field-label">Descrição</label>
      <textarea class="input" name="descricao" rows="3" placeholder="Descreva o objetivo do projeto">${esc(p.descricao || "")}</textarea>
      <div class="form-grid">
        <div><label class="field-label">Data de Início</label>
          <input type="date" class="input" name="data_inicio" value="${p.data_inicio || ""}" required /></div>
        <div><label class="field-label">Prazo de Conclusão</label>
          <input type="date" class="input" name="data_fim" value="${p.data_fim || ""}" required /></div>
        <div><label class="field-label">Responsável</label>
          <select class="input" name="responsavel">
            <option value="">— Selecione um membro da equipe —</option>
            ${p.responsavel && !state.usuarios.some((u) => u.nome === p.responsavel) ? `<option value="${esc(p.responsavel)}" selected>${esc(p.responsavel)} (fora da equipe)</option>` : ""}
            ${state.usuarios.map((u) => `<option value="${esc(u.nome)}" ${p.responsavel === u.nome ? "selected" : ""}>${esc(u.nome)}${u.cargo ? " · " + esc(u.cargo) : ""}</option>`).join("")}
          </select></div>
        <div><label class="field-label">Status</label>
          <select class="input" name="status">
            ${["Planejamento", "Em Andamento", "Concluído", "Cancelado"].map((s) =>
              `<option ${p.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="btn-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-save">Salvar Projeto</button>
      </div>
    </form>`;
  $("#btn-cancel").onclick = () => nav("Projetos", "lista");
  $("#form-projeto").onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    fd.dominio = p.dominio || "Nao classificado";
    fd.risco = p.risco || "Baixo"; // campo legado: exibicao agora deriva dos riscos cadastrados
    if (p.id) await API.put(`/api/projetos/${p.id}`, fd); else await API.post("/api/projetos", fd);
    flashSaved("#btn-save"); await loadAll();
    setTimeout(() => nav("Projetos", "lista"), 600);
  };
}

function flashSaved(sel) {
  const b = $(sel); if (!b) return;
  b.textContent = "Salvo com sucesso!"; b.classList.remove("btn-primary"); b.classList.add("btn-success");
}

// ══ RISCOS ═══════════════════════════════════════════════════════════════════
function renderListaRiscos() {
  const f = state.filtroProjetoRiscos, q = state.busca.toLowerCase();
  const lista = state.riscos.filter((r) => (!f || r.projeto_id === Number(f)) &&
    (!q || `${r.descricao} ${r.nivel} ${projetoNome(r.projeto_id)}`.toLowerCase().includes(q)));
  screenEl().innerHTML = `
    <div class="page-head">
      <div class="page-title">Riscos Cadastrados</div>
      <button class="btn btn-sm btn-tag" style="color:var(--red);border-color:rgba(248,81,73,.4);background:rgba(248,81,73,.12)" id="btn-novo-risco">+ Novo Risco</button>
    </div>
    <div class="toolbar"><span class="row-sub">Projeto:</span>
      <select class="input select" id="filtro-riscos">
        <option value="">[Todos os Projetos]</option>
        ${state.projetos.map((p) => `<option value="${p.id}" ${String(f) === String(p.id) ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}
      </select></div>
    <div class="table">
      <div class="table-head" style="grid-template-columns:1fr 100px 100px 100px 76px">
        <span>Descrição</span><span>Probab.</span><span>Impacto</span><span>Nível</span><span></span></div>
      ${lista.length === 0 ? '<p class="empty">Nenhum risco cadastrado.</p>' : lista.map((r) => `
        <div class="table-row" style="grid-template-columns:1fr 100px 100px 100px 76px">
          <div><p class="row-title">${esc(r.descricao)}</p><p class="row-sub">${esc(projetoNome(r.projeto_id))}</p></div>
          <span class="row-sub">${esc(r.probabilidade)}</span><span class="row-sub">${esc(r.impacto)}</span>
          <span class="badge ${nivelBadge[r.nivel] || "b-gray"}">${esc(r.nivel)}</span>
          <div class="row-actions">
            <button class="icon-btn" data-edit="${r.id}">✎</button>
            <button class="icon-btn danger" data-del="${r.id}">🗑</button></div>
        </div>`).join("")}
    </div>`;
  $("#btn-novo-risco").onclick = () => { state.editandoRisco = null; nav("Riscos", "cadastro-risco"); };
  $("#filtro-riscos").onchange = (e) => { state.filtroProjetoRiscos = e.target.value; render(); };
  bindRowActions(state.riscos, (r) => { state.editandoRisco = r; nav("Riscos", "cadastro-risco"); },
    async (id) => { await API.del(`/api/riscos/${id}`); await loadAll(); render(); }, "Excluir este risco?");
}

const nivelMatrixFE = { Baixa: { Baixo: "Baixo", Médio: "Baixo", Alto: "Médio" }, Média: { Baixo: "Baixo", Médio: "Médio", Alto: "Alto" }, Alta: { Baixo: "Médio", Médio: "Alto", Alto: "Crítico" } };

function renderCadastroRisco() {
  const r = state.editandoRisco || {};
  screenEl().innerHTML = `
    <div class="page-head"><div class="page-title">${r.id ? "Editar Risco" : "Novo Risco"}</div></div>
    <form id="form-risco" class="card">
      <label class="field-label">Projeto</label>
      <select class="input" name="projeto_id" required>
        ${state.projetos.map((p) => `<option value="${p.id}" ${r.projeto_id === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}
      </select>
      <label class="field-label">Descrição do Risco</label>
      <textarea class="input" name="descricao" rows="3" placeholder="Informe a descrição do risco" required>${esc(r.descricao || "")}</textarea>
      <div class="form-grid">
        <div><label class="field-label">Probabilidade</label>
          <select class="input" name="probabilidade" id="sel-prob">
            ${["Baixa", "Média", "Alta"].map((s) => `<option ${(r.probabilidade || "Baixa") === s ? "selected" : ""}>${s}</option>`).join("")}
          </select></div>
        <div><label class="field-label">Impacto</label>
          <select class="input" name="impacto" id="sel-imp">
            ${["Baixo", "Médio", "Alto"].map((s) => `<option ${(r.impacto || "Baixo") === s ? "selected" : ""}>${s}</option>`).join("")}
          </select></div>
      </div>
      <label class="field-label">Nível de Risco</label>
      <div style="display:flex;align-items:center;gap:12px">
        <span class="badge b-green" id="nivel-preview">Baixo</span>
        <span class="row-sub">calculado automaticamente com base na probabilidade × impacto</span>
      </div>
      <label class="field-label">Ações de Mitigação</label>
      <textarea class="input" name="mitigacao" rows="4" placeholder="Descreva as ações para reduzir ou controlar o risco">${esc(r.mitigacao || "")}</textarea>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="btn-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-save">Salvar Risco</button>
      </div>
    </form>`;
  const updateNivel = () => {
    const prob = $("#sel-prob").value, imp = $("#sel-imp").value;
    const nivel = (nivelMatrixFE[prob] || {})[imp] || "Baixo";
    const badge = $("#nivel-preview");
    badge.textContent = nivel;
    badge.className = "badge " + (nivelBadge[nivel] || "b-gray");
  };
  $("#sel-prob").onchange = updateNivel; $("#sel-imp").onchange = updateNivel; updateNivel();
  $("#btn-cancel").onclick = () => nav("Riscos", "lista-riscos");
  $("#form-risco").onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    fd.projeto_id = Number(fd.projeto_id);
    if (r.id) await API.put(`/api/riscos/${r.id}`, fd); else await API.post("/api/riscos", fd);
    flashSaved("#btn-save"); await loadAll();
    setTimeout(() => nav("Riscos", "lista-riscos"), 600);
  };
}

// ══ TAREFAS ══════════════════════════════════════════════════════════════════
function renderListaTarefas() {
const f = state.filtroProjetoTarefas;
const lista = state.tarefas.filter(
  (x) => !f || x.projeto_id === Number(f));
  screenEl().innerHTML = `
    <div class="page-head">
      <div class="page-title">Tarefas Cadastradas</div>
      <button class="btn btn-sm btn-tag" style="color:var(--green);border-color:rgba(63,185,80,.4);background:rgba(63,185,80,.12)" id="btn-nova-tarefa">+ Nova Tarefa</button>
    </div>
    <div class="toolbar"><span class="row-sub">Projeto:</span>
      <select class="input select" id="filtro-tarefas">
        <option value="">[Todos os Projetos]</option>
        ${state.projetos.map((p) => `<option value="${p.id}" ${String(f) === String(p.id) ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}
      </select></div>
    <div class="table">
      <div class="table-head" style="grid-template-columns:1fr 110px 100px 110px 90px 76px">
        <span>Tarefa</span><span>Responsável</span><span>Prioridade</span><span>Status</span><span>Prazo</span><span></span></div>
      ${lista.length === 0 ? '<p class="empty">Nenhuma tarefa cadastrada.</p>' : lista.map((x) => `
        <div class="table-row" style="grid-template-columns:1fr 110px 100px 110px 90px 76px">
          <div><p class="row-title">${esc(x.titulo)}</p><p class="row-sub">${esc(projetoNome(x.projeto_id))}</p></div>
          <span class="row-sub">${esc(x.responsavel || "—")}</span>
          <span class="badge ${x.prioridade === "Alta" ? "b-red" : x.prioridade === "Média" || x.prioridade === "Media" ? "b-yellow" : "b-green"}">${esc(x.prioridade)}</span>
          <span class="badge ${statusBadge[x.status] || "b-gray"}">${esc(x.status)}</span>
          <span class="row-sub">${fmtData(x.prazo)}</span>
          <div class="row-actions">
            <button class="icon-btn" data-edit="${x.id}">✎</button>
            <button class="icon-btn danger" data-del="${x.id}">🗑</button></div>
        </div>`).join("")}
    </div>`;
  $("#btn-nova-tarefa").onclick = () => { state.editandoTarefa = null; nav("Tarefas", "cadastro-tarefa"); };
  $("#filtro-tarefas").onchange = (e) => { state.filtroProjetoTarefas = e.target.value; render(); };
  bindRowActions(state.tarefas, (x) => { state.editandoTarefa = x; nav("Tarefas", "cadastro-tarefa"); },
    async (id) => { await API.del(`/api/tarefas/${id}`); await loadAll(); render(); }, "Excluir esta tarefa?");
}

function renderCadastroTarefa() {
  const x = state.editandoTarefa || {};
  screenEl().innerHTML = `
    <div class="page-head"><div class="page-title">${x.id ? "Editar Tarefa" : "Nova Tarefa"}</div></div>
    <form id="form-tarefa" class="card">
      <label class="field-label">Projeto</label>
      <select class="input" name="projeto_id" required>
        ${state.projetos.map((p) => `<option value="${p.id}" ${x.projeto_id === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}
      </select>
      <label class="field-label">Título da Tarefa</label>
      <input class="input" name="titulo" value="${esc(x.titulo || "")}" placeholder="Informe o título da tarefa" required />
      <label class="field-label">Descrição</label>
      <textarea class="input" name="descricao" rows="3">${esc(x.descricao || "")}</textarea>
      <div class="form-grid">
        <div><label class="field-label">Responsável</label>
          <select class="input" name="responsavel">
            <option value="">— Selecione um membro da equipe —</option>
            ${x.responsavel && !state.usuarios.some((u) => u.nome === x.responsavel) ? `<option value="${esc(x.responsavel)}" selected>${esc(x.responsavel)} (fora da equipe)</option>` : ""}
            ${state.usuarios.map((u) => `<option value="${esc(u.nome)}" ${x.responsavel === u.nome ? "selected" : ""}>${esc(u.nome)}${u.cargo ? " · " + esc(u.cargo) : ""}</option>`).join("")}
          </select></div>
        <div><label class="field-label">Data de Início</label>
          <input type="date" class="input" name="data_inicio" value="${x.data_inicio || ""}" required /></div>
        <div><label class="field-label">Prazo de Conclusão</label>
          <input type="date" class="input" name="prazo" value="${x.prazo || ""}" required /></div>
        <div><label class="field-label">Prioridade</label>
          <select class="input" name="prioridade">
            ${["Baixa", "Média", "Alta"].map((s) => `<option ${x.prioridade === s ? "selected" : ""}>${s}</option>`).join("")}
          </select></div>
        <div><label class="field-label">Status</label>
          <select class="input" name="status">
            ${["Pendente", "Em Andamento", "Concluído", "Cancelado"].map((s) => `<option ${x.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="btn-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-save">Salvar Tarefa</button>
      </div>
    </form>`;
  $("#btn-cancel").onclick = () => nav("Tarefas", "lista-tarefas");
  $("#form-tarefa").onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    fd.projeto_id = Number(fd.projeto_id);
    if (x.id) await API.put(`/api/tarefas/${x.id}`, fd); else await API.post("/api/tarefas", fd);
    flashSaved("#btn-save"); await loadAll();
    setTimeout(() => nav("Tarefas", "lista-tarefas"), 600);
  };
}

// ══ EQUIPE ═══════════════════════════════════════════════════════════════════
function renderEquipe() {
const q = state.busca.toLowerCase();
const membros = state.usuarios.filter(
  (u) => !q ||
    `${u.nome} ${u.email} ${u.cargo || ""}`
      .toLowerCase().includes(q));
  screenEl().innerHTML = `
    <div class="page-head">
      <div class="page-title">Equipe</div>
      <div style="display:flex;gap:8px">
        ${can("cargos") ? '<button class="btn btn-ghost btn-sm" id="btn-novo-cargo">+ Novo Cargo</button>' : ""}
        ${can("equipe") ? '<button class="btn btn-primary btn-sm" id="btn-novo-membro">+ Novo Membro</button>' : ""}
      </div>
    </div>
    <div class="table">
      <div class="table-head" style="grid-template-columns:1fr 180px 1fr 76px">
        <span>Nome</span><span>Cargo</span><span>Projeto</span><span></span></div>
      ${membros.length === 0 ? '<p class="empty">Nenhum membro encontrado.</p>' : membros.map((u) => `
        <div class="table-row" style="grid-template-columns:1fr 180px 1fr 76px">
          <div><p class="row-title">${esc(u.nome)}</p><p class="row-sub">${esc(u.email)}</p></div>
          <span class="row-sub">${esc(u.cargo || "—")}</span>
          <span class="row-sub">${(() => {
            const projetos = projetosDoMembro(u);
            return projetos.length
              ? projetos.map((p) => esc(p.nome)).join(", ")
              : "—";
          })()}</span>
          <div class="row-actions">${can("equipe") ? `
            <button class="icon-btn" data-edit="${u.id}">✎</button>
            <button class="icon-btn danger" data-del="${u.id}">🗑</button>` : ""}</div>
        </div>`).join("")}
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header">Cargos e Permissões</div>
      ${state.cargos.length === 0 ? '<p class="empty">Nenhum cargo cadastrado.</p>' : state.cargos.map((cg) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
          <div style="min-width:170px"><p class="row-title">${esc(cg.nome)}</p>
            <p class="row-sub">${state.usuarios.filter((u) => u.cargo_id === cg.id).length} membro(s)</p></div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;flex:1">
            ${(cg.permissoes || []).map((p) => `<span class="badge b-blue">${permLabels[p] || p}</span>`).join("") || '<span class="badge b-gray">Somente leitura</span>'}
          </div>
          ${can("cargos") ? `<div class="row-actions">
            <button class="icon-btn" data-edit-cargo="${cg.id}">✎</button>
            <button class="icon-btn danger" data-del-cargo="${cg.id}">🗑</button></div>` : ""}
        </div>`).join("")}
    </div>`;
  const bn = $("#btn-novo-membro"); if (bn) bn.onclick = () => { state.editandoUsuario = null; nav("Equipe", "cadastro-membro"); };
  const bc = $("#btn-novo-cargo"); if (bc) bc.onclick = () => { state.editandoCargo = null; nav("Equipe", "cadastro-cargo"); };
  document.querySelectorAll("#screen [data-edit]").forEach((b) => b.addEventListener("click", () => {
    state.editandoUsuario = state.usuarios.find((x) => x.id === Number(b.dataset.edit)); nav("Equipe", "cadastro-membro");
  }));
  document.querySelectorAll("#screen [data-del]").forEach((b) => b.addEventListener("click", () => {
    const id = Number(b.dataset.del), u = state.usuarios.find((x) => x.id === id) || {};
    const nTar = state.tarefas.filter((t) => t.responsavel && t.responsavel === u.nome).length;
    showModal(`Excluir ${u.nome || "este membro"} da equipe?` +
      (nTar ? ` Atenção: ${nTar} tarefa(s) atribuída(s) a este membro ficarão sem responsável.` : ""),
      async () => {
        try { await API.del(`/api/usuarios/${id}`); await loadAll(); render(); }
        catch (err) { alert(err.message || "Não foi possível excluir o membro."); }
      });
  }));
  document.querySelectorAll("[data-edit-cargo]").forEach((b) => b.addEventListener("click", () => {
    state.editandoCargo = state.cargos.find((x) => x.id === Number(b.dataset.editCargo)); nav("Equipe", "cadastro-cargo");
  }));
  document.querySelectorAll("[data-del-cargo]").forEach((b) => b.addEventListener("click", () =>
    showModal("Excluir este cargo?", async () => {
      try { await API.del(`/api/cargos/${b.dataset.delCargo}`); await loadAll(); render(); } catch (err) { alert(err.message); }
    })));
}

// ══ CADASTRO DE CARGO (permissões configuráveis) ════════════════════
function renderCadastroCargo() {
  const cg = state.editandoCargo || {};
  const perms = cg.permissoes || [];
  const opcoes = [
    ["projetos", "Gerenciar Projetos", "criar, editar e excluir projetos"],
    ["riscos", "Gerenciar Riscos", "criar, editar e excluir riscos"],
    ["tarefas", "Gerenciar Tarefas", "criar, editar e excluir tarefas"],
    ["cynefin", "Classificar Projetos (Cynefin)", "responder o questionário e salvar classificações"],
    ["equipe", "Gerenciar Equipe", "cadastrar, editar e excluir membros"],
    ["cargos", "Gerenciar Cargos", "criar e editar cargos e suas permissões"],
    ["configuracoes", "Configurações do Sistema", "alterar nome do sistema, tema e preferências globais"],
  ];
  screenEl().innerHTML = `
    <div class="page-head"><div><div class="page-title">${cg.id ? "Editar Cargo" : "Novo Cargo"}</div>
      <p class="page-sub">Marque as permissões que este cargo concede aos membros</p></div></div>
    <form id="form-cargo" class="card">
      <label class="field-label" style="margin-top:0">Nome do Cargo</label>
      <input class="input" name="nome" value="${esc(cg.nome || "")}" maxlength="60" required />
      <label class="field-label">Permissões do Cargo</label>
      ${opcoes.map(([k, titulo, desc]) => `
        <label class="q-option ${perms.includes(k) ? "selected" : ""}" style="display:flex">
          <input type="checkbox" name="perm" value="${k}" ${perms.includes(k) ? "checked" : ""} />
          <span><strong>${titulo}</strong> — <span class="row-sub">${desc}</span></span>
        </label>`).join("")}
      <p class="row-sub" style="margin-top:8px">Telas não marcadas ficam em modo somente leitura para os membros deste cargo.</p>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="btn-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-save">Salvar Cargo</button>
      </div>
    </form>`;
  document.querySelectorAll('#form-cargo input[name="perm"]').forEach((cb) =>
    cb.addEventListener("change", () => cb.closest(".q-option").classList.toggle("selected", cb.checked)));
  $("#btn-cancel").onclick = () => nav("Equipe", "equipe");
  $("#form-cargo").onsubmit = async (e) => {
    e.preventDefault();
    const nome = e.target.nome.value.trim();
    const permissoes = [...document.querySelectorAll('#form-cargo input[name="perm"]:checked')].map((c) => c.value);
    try {
      if (cg.id) await API.put(`/api/cargos/${cg.id}`, { nome, permissoes });
      else await API.post("/api/cargos", { nome, permissoes });
      flashSaved("#btn-save"); await loadAll();
      setTimeout(() => nav("Equipe", "equipe"), 600);
    } catch (err) { alert(err.message); }
  };
}

// ══ Aplica as permissões do cargo na interface (esconde ações de escrita) ══
function aplicarPermissoes() {
  const remover = (sel) => document.querySelectorAll(sel).forEach((el) => el.remove());
  if (!can("projetos") && (state.screen === "lista" || state.screen === "detalhe-projeto"))
    remover("#btn-novo-projeto, #btn-editar-det, #screen [data-edit], #screen [data-del]");
  if (!can("riscos") && state.screen === "lista-riscos")
    remover("#btn-novo-risco, #screen [data-edit], #screen [data-del]");
  if (!can("tarefas") && state.screen === "lista-tarefas")
    remover("#btn-nova-tarefa, #screen [data-edit], #screen [data-del]");
  if (!can("cynefin") && state.screen === "questionario")
    remover("#screen .btn-primary");
  if (!can("configuracoes") && state.screen === "configuracoes")
    document.querySelectorAll("#screen .card:last-of-type input, #screen .card:last-of-type select, #screen .card:last-of-type button").forEach((el) => { el.disabled = true; });
}

function renderCadastroMembro() {
  const u = state.editandoUsuario || {};
  screenEl().innerHTML = `
    <div class="page-head"><div class="page-title">${u.id ? "Editar Membro" : "Novo Membro"}</div></div>
    <form id="form-membro" class="card">
      <div class="form-grid">
        <div><label class="field-label">Nome</label>
          <input class="input" name="nome" value="${esc(u.nome || "")}" required /></div>
        <div><label class="field-label">Cargo</label>
          <select class="input" name="cargo_id" required>
            <option value="">— Selecione um cargo —</option>
            ${state.cargos.map((cg) => `<option value="${cg.id}" ${u.cargo_id === cg.id ? "selected" : ""}>${esc(cg.nome)}</option>`).join("")}
          </select></div>
        <div><label class="field-label">E-mail</label>
          <input type="email" class="input" name="email" value="${esc(u.email || "")}" required /></div>
        <div><label class="field-label">Senha</label>
          <input type="password" class="input" name="senha" placeholder="${u.id ? "Deixe em branco para não alterar" : "Senha de acesso"}" ${u.id ? "" : "required"} /></div>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="btn-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-save">Salvar Membro</button>
      </div>
    </form>`;
  $("#btn-cancel").onclick = () => nav("Equipe", "equipe");
  $("#form-membro").onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    fd.cargo_id = fd.cargo_id ? Number(fd.cargo_id) : null;
    if (!fd.senha) delete fd.senha;
    try {
      if (u.id) await API.put(`/api/usuarios/${u.id}`, fd); else await API.post("/api/usuarios", fd);
      flashSaved("#btn-save"); await loadAll();
      setTimeout(() => nav("Equipe", "equipe"), 600);
    } catch (err) { alert(err.message); }
  };
}

// ══ CYNEFIN ══════════════════════════════════════════════════════════════════
function renderQuestionario() {
  const c = state.cynefin;
  screenEl().innerHTML = `
    <div class="page-head">
      <div><div class="page-title">Classificação Cynefin</div>
      <p class="page-sub">Responda o questionário para classificar o projeto</p></div>
      <button class="btn btn-ghost btn-sm" id="btn-historico">🕘 Histórico</button>
    </div>
    <div class="card" style="margin-bottom:14px">
      <label class="field-label" style="margin-top:0">Projeto a classificar</label>
      <select class="input" id="cy-projeto">
        <option value="">Selecione um projeto...</option>
        ${state.projetos.map((p) => `<option value="${p.id}" ${c.projetoId === p.id ? "selected" : ""}>${esc(p.nome)}</option>`).join("")}
      </select>
    </div>
    <p class="q-progress">${Object.keys(c.respostas).length} / ${cynefinQuestions.length} respondidas</p>
    ${cynefinQuestions.map((q, qi) => `
      <div class="q-card">
        <p class="q-text">${qi + 1}. ${q.text}</p>
        ${q.options.map(([label, dom], oi) => `
          <div class="q-option ${c.respostas[q.id] === oi ? "selected" : ""}" data-q="${q.id}" data-o="${oi}">
            <span style="width:14px;height:14px;border-radius:50%;border:2px solid ${c.respostas[q.id] === oi ? "var(--blue)" : "var(--border-strong)"};background:${c.respostas[q.id] === oi ? "var(--blue)" : "transparent"};flex-shrink:0"></span>
            ${label}
          </div>`).join("")}
      </div>`).join("")}
    <div class="form-actions">
      <button class="btn btn-primary" id="btn-classificar">Classificar Projeto</button>
    </div>`;
  $("#cy-projeto").onchange = (e) => { c.projetoId = e.target.value ? Number(e.target.value) : null; };
  $("#btn-historico").onclick = () => nav("Cynefin", "historico-cynefin");
  document.querySelectorAll(".q-option").forEach((el) =>
    el.addEventListener("click", () => { c.respostas[el.dataset.q] = Number(el.dataset.o); render(); }));
  $("#btn-classificar").onclick = async () => {
    if (!c.projetoId) return alert("Selecione um projeto para classificar.");
    if (Object.keys(c.respostas).length < cynefinQuestions.length) return alert("Responda todas as perguntas antes de classificar.");
    const cnt = { Obvio: 0, Complicado: 0, Complexo: 0, Caotico: 0 };
    cynefinQuestions.forEach((q) => { const dom = q.options[c.respostas[q.id]][1]; cnt[dom]++; });
    const total = cynefinQuestions.length;
    const dist = {}; Object.keys(cnt).forEach((k) => (dist[k] = Math.round((cnt[k] / total) * 100)));
    const dominante = Object.keys(cnt).reduce((a, b) => (cnt[b] > cnt[a] ? b : a), "Obvio");
    // Envia o identificador interno aceito pela API (ex.: "Obvio").
    // O rótulo "Claro" é apenas a forma de exibição na interface.
    try {
      await API.post("/api/classificacoes", {
        projeto_id: c.projetoId, dominante,
        dist_obvio: dist.Obvio, dist_complicado: dist.Complicado, dist_complexo: dist.Complexo, dist_caotico: dist.Caotico,
      });
    } catch (erro) {
      alert(`Não foi possível salvar a classificação: ${erro.message}`);
      return;
    }
    c.resultado = { dominante, dist };
    try {
      await loadAll();
    } catch (erro) {
      console.error("Classificação salva, mas não foi possível atualizar os dados:", erro);
      alert("A classificação foi salva, mas não foi possível atualizar os dados da tela. Atualize a página.");
    }
    nav("Cynefin", "resultado");
  };
}

function renderResultado() {
  const c = state.cynefin;
  if (!c.resultado) return nav("Cynefin", "questionario");
  const { dominante, dist } = c.resultado;
  screenEl().innerHTML = `
    <div class="page-head">
      <div><div class="page-title">Resultado da Classificação</div>
      <p class="page-sub">${esc(projetoNome(c.projetoId))}</p></div>
    </div>
    <div class="card">
      <div class="card-header">Domínio Predominante</div>
      <span class="badge ${domBadge[domNome[dominante]]}" style="font-size:14px;padding:6px 18px;text-transform:uppercase;letter-spacing:.1em">${domNome[dominante]}</span>
      <p style="font-size:12px;color:var(--muted);line-height:1.6;margin-top:12px">${domDescricao[dominante]}</p>
    </div>
    <div class="card">
      <div class="card-header">Distribuição das Respostas</div>
      ${Object.keys(dist).map((k) => `
        <div class="hbar-row">
          <span class="hbar-label">${domNome[k]}</span>
          <div class="hbar-track"><div class="hbar-fill" style="width:${dist[k]}%;background:${domColor[k]}"></div></div>
          <span class="hbar-pct" style="color:${domColor[k]}">${dist[k]}%</span>
        </div>`).join("")}
    </div>
    <div class="form-actions">
      <button class="btn btn-ghost" id="btn-nova-class">Nova Classificação</button>
      <button class="btn btn-primary" id="btn-ver-hist">Ver Histórico</button>
    </div>`;
  $("#btn-nova-class").onclick = () => { state.cynefin = { projetoId: null, respostas: {}, resultado: null }; nav("Cynefin", "questionario"); };
  $("#btn-ver-hist").onclick = () => nav("Cynefin", "historico-cynefin");
}

function renderHistorico() {
  const hist = state.classificacoes;
  screenEl().innerHTML = `
    <div class="page-head">
      <div><div class="page-title">Histórico de Classificações</div>
      <p class="page-sub">Classificações anteriores dos projetos</p></div>
      <button class="btn btn-sm btn-tag" style="color:var(--purple);border-color:rgba(188,140,255,.4);background:rgba(188,140,255,.12)" id="btn-nova">+ Nova Classificação</button>
    </div>
    ${hist.length === 0 ? `
      <div class="card empty">🧠<br/><br/>Nenhuma classificação realizada ainda.<br/><br/>
        <button class="btn btn-primary btn-sm" id="btn-primeira">+ Iniciar primeira classificação</button></div>` : `
      <div class="table">
        <div class="table-head" style="grid-template-columns:1fr 130px 140px 200px 60px">
          <span>Projeto</span><span>Domínio</span><span>Data</span><span>Distribuição</span><span></span></div>
        ${hist.map((h) => {
          const color = domColor[h.dominante] || "#8b949e";
          return `
          <div class="table-row" style="grid-template-columns:1fr 130px 140px 200px 60px">
            <p class="row-title">${esc(projetoNome(h.projeto_id))}</p>
            <span class="badge ${domBadge[h.dominante] || "b-gray"}">${esc(h.dominante)}</span>
            <span class="row-sub">${esc((h.data || "").slice(0, 16))}</span>
            <div style="display:flex;gap:3px;height:6px;border-radius:999px;overflow:hidden">
              <div style="width:${h.dist_obvio}%;background:#3fb950"></div>
              <div style="width:${h.dist_complicado}%;background:#58a6ff"></div>
              <div style="width:${h.dist_complexo}%;background:#bc8cff"></div>
              <div style="width:${h.dist_caotico}%;background:#f85149"></div>
            </div>
            <div class="row-actions"><button class="icon-btn danger" data-del="${h.id}">🗑</button></div>
          </div>`; }).join("")}
      </div>`}`;
  const novaFn = () => { state.cynefin = { projetoId: null, respostas: {}, resultado: null }; nav("Cynefin", "questionario"); };
  $("#btn-nova").onclick = novaFn;
  const bp = $("#btn-primeira"); if (bp) bp.onclick = novaFn;
  document.querySelectorAll("[data-del]").forEach((b) =>
    b.addEventListener("click", () => showModal("Excluir esta classificação do histórico?", async () => {
      await API.del(`/api/classificacoes/${b.dataset.del}`); await loadAll(); render();
    })));
}

// ══ CONFIGURAÇÕES ════════════════════════════════════════════════════════════
function renderConfiguracoes() {
  const c = state.config;
  screenEl().innerHTML = `
    <div class="page-head">
      <div><div class="page-title">⚙ Configurações</div>
      <p class="page-sub">Preferências do sistema e do usuário</p></div>
    </div>
    <form id="form-config">
      <div class="card">
        <div class="card-header">Perfil do Usuário</div>
        <label class="field-label" style="margin-top:0">Nome de Usuário</label>
        <input class="input" name="nome_usuario" value="${esc(c.nome_usuario || "")}" />
        <label class="field-label">E-mail</label>
        <input type="email" class="input" name="email" value="${esc(c.email || "")}" />
        <label class="field-label">Nova Senha</label>
        <input type="password" class="input" name="senha" placeholder="Deixe em branco para não alterar" />
      </div>
      <div class="card">
        <div class="card-header">Sistema</div>
        <label class="field-label" style="margin-top:0">Nome do Sistema</label>
        <input class="input" name="nome_sistema" value="${esc(c.nome_sistema || "")}" />
        <label class="field-label">Tema</label>
        <div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0">
          <div>
            <p style="font-size:13px">${c.tema === "dark" ? "🌙 Tema escuro" : "☀ Tema claro"}</p>
            <p class="row-sub">${c.tema === "dark" ? "Interface em modo noturno" : "Interface em modo claro"}</p>
          </div>
          <button type="button" id="btn-tema"
            style="width:38px;height:20px;border-radius:999px;border:none;cursor:pointer;display:flex;align-items:center;padding:2px;background:${c.tema === "dark" ? "#1f6feb" : "#d29922"}">
            <span style="width:16px;height:16px;background:#fff;border-radius:50%;transform:translateX(${c.tema === "dark" ? "16px" : "0"});transition:transform .2s"></span>
          </button>
        </div>
      </div>
      <div class="card">
        <div class="card-header">Sobre</div>
        <p class="row-sub">${esc(c.nome_sistema)} v1.0.0 · Gestão de projetos com classificação Cynefin<br/>
        HTML · CSS · JavaScript · Node.js · Express.js · SQLite</p>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="btn-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary" id="btn-save">Salvar Configurações</button>
      </div>
    </form>`;
  $("#btn-tema").onclick = async () => {
    state.config.tema = state.config.tema === "dark" ? "light" : "dark";
    applyTema(); await API.put("/api/configuracoes", state.config); render();
  };
  $("#btn-cancel").onclick = () => nav("Dashboard", "dashboard");
  $("#form-config").onsubmit = async (e) => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(e.target));
    Object.assign(state.config, { nome_sistema: fd.nome_sistema, nome_usuario: fd.nome_usuario, email: fd.email });
    const payload = Object.assign({}, state.config);
    if (fd.senha) payload.senha = fd.senha;
    try { await API.put("/api/configuracoes", payload); }
    catch (err) { return alert(err.message); }
    e.target.senha.value = "";
    flashSaved("#btn-save");
    setTimeout(render, 700);
  };
}

// ══ LOGIN / LOGOUT ═══════════════════════════════════════════════════════════
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const erroEl = $("#login-erro");
  erroEl.classList.add("hidden");
  try {
    const { usuario } = await API.login($("#login-email").value, $("#login-senha").value);
    state.usuario = usuario; state.logado = true; state.permissoes = usuario.permissoes || [];
    await loadAll();
    $("#login-screen").classList.add("hidden");
    $("#app").classList.remove("hidden");
    render();
  } catch (err) {
    erroEl.textContent = err.message; erroEl.classList.remove("hidden");
  }
});

$("#btn-sair").addEventListener("click", () =>
  showModal("Deseja realmente encerrar a sessão?", async () => {
    try { await API.logout(); } catch (_) {} // item 3: destroi a sessao no servidor
    state.logado = false; state.usuario = null; state.permissoes = [];
    state.activeNav = "Dashboard"; state.screen = "dashboard";
    $("#app").classList.add("hidden");
    $("#login-screen").classList.remove("hidden");
    $("#login-form").reset();
  }));

// ══ Inicialização ════════════════════════════════════════════════════════════
(async () => {
  try {
    const cfg = await API.configuracoes();
    state.config = cfg; applyTema();
    $("#login-logo").textContent = cfg.nome_sistema || "Projetaí";
  } catch (_) { /* servidor ainda inicializando */ }

  // Item 3: restaura a sessao do servidor (mantem o login apos F5)
  try {
    const { usuario } = await API.me();
    state.usuario = usuario; state.logado = true; state.permissoes = usuario.permissoes || [];
    await loadAll();
    $("#login-screen").classList.add("hidden");
    $("#app").classList.remove("hidden");
    render();
  } catch (_) { /* sem sessao ativa: permanece na tela de login */ }
})();


// ══ DETALHE DO PROJETO ════════════════════════════════════════════════
function renderDetalheProjeto() {
  const p = state.projetoDetalhe;
  if (!p) return nav("Projetos", "lista");
  const tarefas = state.tarefas.filter((t) => t.projeto_id === p.id);
  const riscos = state.riscos.filter((r) => r.projeto_id === p.id);
  const historico = state.classificacoes.filter((c) => c.projeto_id === p.id).sort((a, b) => b.id - a.id);
  const dom = dominioProjeto(p.id);
  screenEl().innerHTML = `
    <div class="page-head">
      <div><div class="page-title">${esc(p.nome)}</div>
      <p class="page-sub">${esc(p.descricao || "")}</p></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost btn-sm" id="btn-voltar-det">← Voltar</button>
        <button class="btn btn-primary btn-sm" id="btn-editar-det">✎ Editar</button>
      </div>
    </div>
    <div class="grid-4">
      <div class="stat-card"><div class="stat-label">Status</div><div><span class="badge ${statusBadge[p.status] || "b-gray"}">${esc(p.status)}</span></div>
        <div class="stat-delta">Início: ${fmtData(p.data_inicio)}</div></div>
      <div class="stat-card"><div class="stat-label">Domínio Cynefin</div><div><span class="badge ${domBadge[dom] || "b-gray"}">${esc(dom)}</span></div>
        <div class="stat-delta">${historico.length} classificação(ões) no histórico</div></div>
      <div class="stat-card"><div class="stat-label">Risco Geral</div><div><span class="badge ${nivelBadge[riscoProjeto(p.id)] || "b-gray"}">${esc(riscoProjeto(p.id))}</span></div>
        <div class="stat-delta">${riscos.length} risco(s) cadastrado(s)</div></div>
      <div class="stat-card"><div class="stat-label">Prazo</div>
        <div class="stat-value" style="font-size:16px">${fmtData(p.data_fim)}</div>
        <div class="stat-delta">Responsável: ${esc(p.responsavel || "—")}</div></div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-header">☑ Tarefas (${tarefas.length})</div>
      ${tarefas.length === 0 ? '<p class="empty">Nenhuma tarefa vinculada a este projeto.</p>' : tarefas.map((t) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
          <div><p class="row-title">${esc(t.titulo)}</p>
          <p class="row-sub">${esc(t.responsavel || "—")} · prazo ${fmtData(t.prazo)} · prioridade ${esc(t.prioridade || "—")}</p></div>
          <span class="badge ${statusBadge[t.status] || "b-gray"}">${esc(t.status)}</span>
        </div>`).join("")}
    </div>
    <div class="card">
      <div class="card-header">⚠ Riscos (${riscos.length})</div>
      ${riscos.length === 0 ? '<p class="empty">Nenhum risco cadastrado para este projeto.</p>' : riscos.map((r) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
          <div><p class="row-title">${esc(r.descricao)}</p>
          <p class="row-sub">Probabilidade: ${esc(r.probabilidade)} · Impacto: ${esc(r.impacto)}${r.mitigacao ? " · Mitigação: " + esc(r.mitigacao) : ""}</p></div>
          <span class="badge ${nivelBadge[r.nivel] || "b-gray"}">${esc(r.nivel)}</span>
        </div>`).join("")}
    </div>
    <div class="card">
      <div class="card-header">Histórico Cynefin (${historico.length})</div>
      ${historico.length === 0 ? '<p class="empty">Este projeto ainda não foi classificado pelo questionário Cynefin.</p>' : historico.map((h) => `
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--border)">
          <div><p class="row-title">Domínio: <span class="badge ${domBadge[h.dominante] || "b-gray"}">${esc(h.dominante)}</span></p>
          <p class="row-sub" style="margin-top:4px">Óbvio ${h.dist_obvio}% · Complicado ${h.dist_complicado}% · Complexo ${h.dist_complexo}% · Caótico ${h.dist_caotico}%</p></div>
          <span class="row-sub mono">${fmtData(h.data)}</span>
        </div>`).join("")}
    </div>`;
  $("#btn-voltar-det").onclick = () => nav("Projetos", "lista");
  $("#btn-editar-det").onclick = () => { state.editando = p; nav("Projetos", "cadastro"); };
}
