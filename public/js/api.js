// api.js - Camada de acesso a API REST (substitui o estado local do React)
const API = {
  async req(method, url, body) {
    const opts = { method, headers: { "Content-Type": "application/json" }, credentials: "same-origin" };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    // Sessao expirada em rota protegida: retorna para a tela de login
    if (res.status === 401 && url !== "/api/login" && url !== "/api/me") {
      window.location.reload();
      throw new Error("Sessao expirada. Faca login novamente.");
    }
    if (!res.ok) throw new Error(data.erro || "Erro na requisição");
    return data;
  },
  get:  (url)       => API.req("GET", url),
  post: (url, body) => API.req("POST", url, body),
  put:  (url, body) => API.req("PUT", url, body),
  del:  (url)       => API.req("DELETE", url),

  me:             () => API.get("/api/me"),
  logout:         () => API.post("/api/logout"),
  login:            (email, senha) => API.post("/api/login", { email, senha }),
  projetos:         () => API.get("/api/projetos"),
  tarefas:          () => API.get("/api/tarefas"),
  riscos:           () => API.get("/api/riscos"),
  usuarios:         () => API.get("/api/usuarios"),
  cargos:           () => API.get("/api/cargos"),
  classificacoes:   () => API.get("/api/classificacoes"),
  configuracoes:    () => API.get("/api/configuracoes"),
};
