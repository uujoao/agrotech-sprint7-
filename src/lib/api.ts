/**
 * Cliente da API Python do AgroConecta (backend/servidor.py).
 * Em desenvolvimento o Vite encaminha /api para http://127.0.0.1:8000.
 * Em produção, defina VITE_API_URL com o endereço público da API.
 */
const BASE = (import.meta.env["VITE_API_URL"] as string | undefined)?.replace(/\/$/, "") ?? "";

export class ErroApi extends Error {
  constructor(
    mensagem: string,
    public status: number,
    public campos: Record<string, string> = {},
  ) {
    super(mensagem);
  }
  /** true quando o servidor não respondeu (offline, API desligada, timeout). */
  get indisponivel() {
    return this.status === 0;
  }
}

type Opcoes = { corpo?: unknown; cabecalhos?: Record<string, string> };

async function chamar<T>(
  metodo: string,
  caminho: string,
  { corpo, cabecalhos }: Opcoes = {},
): Promise<T> {
  const controle = new AbortController();
  const limite = setTimeout(() => controle.abort(), 8000);
  let resposta: Response;
  try {
    resposta = await fetch(`${BASE}/api${caminho}`, {
      method: metodo,
      headers: { "Content-Type": "application/json", ...cabecalhos },
      body: corpo === undefined ? null : JSON.stringify(corpo),
      signal: controle.signal,
    });
  } catch {
    throw new ErroApi(
      "Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo.",
      0,
    );
  } finally {
    clearTimeout(limite);
  }

  if (resposta.status === 204) return undefined as T;
  let dados: unknown = null;
  try {
    dados = await resposta.json();
  } catch {
    /* resposta sem JSON (ex.: página de erro do proxy quando a API está desligada) */
  }
  if (!resposta.ok) {
    const d = dados as { erro?: string; campos?: Record<string, string> } | null;
    // O proxy do Vite responde 500/502/504 sem JSON quando a API Python não está rodando.
    const semApi = d === null && resposta.status >= 500;
    throw new ErroApi(
      semApi
        ? "Não conseguimos falar com o servidor. Verifique sua conexão e tente de novo."
        : (d?.erro ?? "Algo deu errado. Tente novamente."),
      semApi ? 0 : resposta.status,
      d?.campos ?? {},
    );
  }
  return dados as T;
}

// ---------- tipos ----------
export type TipoCadastro = "produtor" | "restaurante";
export type StatusCadastro = "novo" | "em_contato" | "conectado";

export type Cadastro = {
  id: number;
  tipo: TipoCadastro;
  nome: string;
  email: string;
  telefone: string;
  cidade: string;
  mensagem: string;
  status: StatusCadastro;
  criado_em: string;
};

export type AvaliacaoApi = {
  id: number;
  autor: string;
  servico: string;
  nota: number;
  comentario: string;
  criado_em: string;
};

export type SimulacaoSalva = {
  id: number;
  cultura: string;
  producao_kg: number;
  desperdicio_pct: number;
  preco_kg: number;
  distancia: string;
  kg_salvos: number;
  ganho_mensal: number;
  co2_evitado_kg: number;
  criado_em: string;
};

export type Resumo = {
  cadastros_total: number;
  produtores: number;
  restaurantes: number;
  conectados: number;
  simulacoes_total: number;
  kg_salvos_simulados: number;
  co2_evitado_simulado_kg: number;
  avaliacoes_total: number;
  avaliacoes_media: number | null;
};

// ---------- identificação do navegador (histórico de simulações) ----------
export function clienteId(): string {
  const chave = "agroconecta:cliente-id";
  try {
    let id = window.localStorage.getItem(chave);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(chave, id);
    }
    return id;
  } catch {
    return "sem-armazenamento-local";
  }
}

// ---------- código de administrador (guardado só na aba, nunca no código) ----------
const CHAVE_ADMIN = "agroconecta:admin-token";
export const tokenAdmin = {
  ler: () => {
    try {
      return window.sessionStorage.getItem(CHAVE_ADMIN) ?? "";
    } catch {
      return "";
    }
  },
  salvar: (t: string) => {
    try {
      window.sessionStorage.setItem(CHAVE_ADMIN, t);
    } catch {
      /* sessionStorage indisponível */
    }
  },
  limpar: () => {
    try {
      window.sessionStorage.removeItem(CHAVE_ADMIN);
    } catch {
      /* sessionStorage indisponível */
    }
  },
};
const admin = () => ({ "X-Admin-Token": tokenAdmin.ler() });

// ---------- endpoints ----------
export const api = {
  resumo: () => chamar<Resumo>("GET", "/resumo"),

  criarCadastro: (corpo: Omit<Cadastro, "id" | "status" | "criado_em">) =>
    chamar<{ id: number }>("POST", "/cadastros", { corpo }),
  listarCadastros: () => chamar<Cadastro[]>("GET", "/cadastros", { cabecalhos: admin() }),
  atualizarCadastro: (id: number, status: StatusCadastro) =>
    chamar<{ id: number; status: StatusCadastro }>("PATCH", `/cadastros/${id}`, {
      corpo: { status },
      cabecalhos: admin(),
    }),
  excluirCadastro: (id: number) =>
    chamar<void>("DELETE", `/cadastros/${id}`, { cabecalhos: admin() }),

  criarMensagem: (corpo: {
    nome: string;
    email: string;
    telefone: string;
    assunto: string;
    mensagem: string;
  }) => chamar<{ id: number }>("POST", "/mensagens", { corpo }),

  listarAvaliacoes: () => chamar<AvaliacaoApi[]>("GET", "/avaliacoes"),
  criarAvaliacao: (corpo: Pick<AvaliacaoApi, "autor" | "servico" | "nota" | "comentario">) =>
    chamar<{ id: number; token_remocao: string }>("POST", "/avaliacoes", { corpo }),
  excluirAvaliacao: (id: number, token: string) =>
    chamar<void>("DELETE", `/avaliacoes/${id}`, { cabecalhos: { "X-Token-Remocao": token } }),

  criarSimulacao: (corpo: Omit<SimulacaoSalva, "id" | "criado_em">) =>
    chamar<{ id: number }>("POST", "/simulacoes", { corpo: { ...corpo, cliente_id: clienteId() } }),
  listarSimulacoes: () =>
    chamar<SimulacaoSalva[]>("GET", "/simulacoes", { cabecalhos: { "X-Cliente-Id": clienteId() } }),
  excluirSimulacao: (id: number) =>
    chamar<void>("DELETE", `/simulacoes/${id}`, { cabecalhos: { "X-Cliente-Id": clienteId() } }),
};
