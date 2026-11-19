import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  api,
  ErroApi,
  tokenAdmin,
  type Cadastro,
  type Resumo,
  type StatusCadastro,
} from "../lib/api";
import { formatarNumero } from "../lib/impacto";
import { useToast } from "./ToastProvider";

const ROTULO_STATUS: Record<StatusCadastro, string> = {
  novo: "Novo",
  em_contato: "Em contato",
  conectado: "Conectado",
};

function formatarTelefone(d: string) {
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : d;
}

/** Dados REAIS vindos do banco: totais públicos e gestão de cadastros (área restrita). */
export function PainelDados() {
  const { showToast } = useToast();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [indisponivel, setIndisponivel] = useState(false);
  const [cadastros, setCadastros] = useState<Cadastro[] | null>(null);
  const [restrito, setRestrito] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [erroAcesso, setErroAcesso] = useState("");

  const carregarResumo = useCallback(async () => {
    try {
      setResumo(await api.resumo());
      setIndisponivel(false);
    } catch {
      setIndisponivel(true);
    }
  }, []);

  const carregarCadastros = useCallback(async () => {
    try {
      setCadastros(await api.listarCadastros());
      setRestrito(false);
      setErroAcesso("");
    } catch (err) {
      setCadastros(null);
      if (err instanceof ErroApi && err.status === 401) {
        setRestrito(true);
        if (tokenAdmin.ler()) setErroAcesso("Código incorreto. Confira e tente de novo.");
        tokenAdmin.limpar();
      }
    }
  }, []);

  useEffect(() => {
    void carregarResumo();
    void carregarCadastros();
  }, [carregarResumo, carregarCadastros]);

  function entrar(e: FormEvent) {
    e.preventDefault();
    tokenAdmin.salvar(codigo.trim());
    setCodigo("");
    void carregarCadastros();
  }

  async function mudarStatus(id: number, status: StatusCadastro) {
    try {
      await api.atualizarCadastro(id, status);
      setCadastros((l) => l?.map((c) => (c.id === id ? { ...c, status } : c)) ?? null);
      showToast("✅", "Status atualizado", `Cadastro marcado como "${ROTULO_STATUS[status]}".`);
      void carregarResumo();
    } catch {
      showToast("⚠️", "Não foi possível atualizar", "Tente de novo em instantes.");
    }
  }

  async function excluir(c: Cadastro) {
    if (!window.confirm(`Excluir o cadastro de ${c.nome}? Esta ação não pode ser desfeita.`))
      return;
    try {
      await api.excluirCadastro(c.id);
      setCadastros((l) => l?.filter((x) => x.id !== c.id) ?? null);
      showToast("🗑️", "Cadastro excluído", `${c.nome} foi removido da lista.`);
      void carregarResumo();
    } catch {
      showToast("⚠️", "Não foi possível excluir", "Tente de novo em instantes.");
    }
  }

  return (
    <section className="dados-reais" aria-labelledby="dados-reais-titulo">
      <div className="dados-reais-cab">
        <h2 id="dados-reais-titulo">
          Dados da <span>rede</span>
        </h2>
        <span className="badge-real">Dados reais do banco</span>
      </div>

      {indisponivel ? (
        <p className="aviso-offline" role="status">
          Servidor indisponível. Inicie a API Python (python backend/servidor.py) para ver os
          totais.
          <button
            type="button"
            className="btn-outline climate-retry"
            onClick={() => void carregarResumo()}
          >
            Tentar novamente
          </button>
        </p>
      ) : !resumo ? (
        <p className="review-empty" role="status">
          Carregando dados...
        </p>
      ) : (
        <div className="dados-grid">
          <div className="kpi-card">
            <div className="kpi-label">Cadastros recebidos</div>
            <div className="kpi-value pink">{formatarNumero(resumo.cadastros_total)}</div>
            <div className="kpi-delta">
              {resumo.produtores} produtores · {resumo.restaurantes} restaurantes
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Já conectados</div>
            <div className="kpi-value green">{formatarNumero(resumo.conectados)}</div>
            <div className="kpi-delta">cadastros com status "Conectado"</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Simulações feitas</div>
            <div className="kpi-value">{formatarNumero(resumo.simulacoes_total)}</div>
            <div className="kpi-delta">
              {formatarNumero(resumo.kg_salvos_simulados)} kg/semana simulados
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">CO₂e estimado (simulações)</div>
            <div className="kpi-value green">
              {formatarNumero(resumo.co2_evitado_simulado_kg)} kg
            </div>
            <div className="kpi-delta">estimativa, não medição</div>
          </div>
        </div>
      )}

      <div className="dash-card cadastros-card">
        <h3>
          Cadastros <span>recebidos</span>
        </h3>
        {restrito ? (
          <form className="acesso-admin" onSubmit={entrar}>
            <p>Os cadastros têm dados pessoais. Informe o código de administrador para vê-los.</p>
            <label htmlFor="codigo-admin">Código de administrador</label>
            <div className="climate-search-row">
              <input
                id="codigo-admin"
                type="password"
                className="sim-input"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="climate-search-btn" disabled={!codigo.trim()}>
                Entrar
              </button>
            </div>
            {erroAcesso && (
              <span className="error-msg" role="alert">
                {erroAcesso}
              </span>
            )}
          </form>
        ) : cadastros === null ? (
          <p className="review-empty">
            Cadastros indisponíveis enquanto o servidor estiver fora do ar.
          </p>
        ) : cadastros.length === 0 ? (
          <p className="review-empty">
            Nenhum cadastro ainda. Os envios do formulário "Entre na rede" aparecem aqui.
          </p>
        ) : (
          <div className="tabela-scroll">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Tipo</th>
                  <th>Contato</th>
                  <th>Cidade</th>
                  <th>Status</th>
                  <th>
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {cadastros.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nome}</td>
                    <td>{c.tipo === "produtor" ? "Produtor" : "Restaurante"}</td>
                    <td>
                      {c.email}
                      <br />
                      {formatarTelefone(c.telefone)}
                    </td>
                    <td>{c.cidade}</td>
                    <td>
                      <select
                        className="sim-select status-select"
                        value={c.status}
                        aria-label={`Status do cadastro de ${c.nome}`}
                        onChange={(e) => void mudarStatus(c.id, e.target.value as StatusCadastro)}
                      >
                        {(Object.keys(ROTULO_STATUS) as StatusCadastro[]).map((s) => (
                          <option key={s} value={s}>
                            {ROTULO_STATUS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="review-delete"
                        onClick={() => void excluir(c)}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
