import { useCallback, useEffect, useState } from "react";
import { api, ErroApi } from "../lib/api";
import { REVIEWS_STORAGE_KEY, TOKENS_STORAGE_KEY, type Review } from "../components/reviews";

type NovaAvaliacao = Pick<Review, "autor" | "servico" | "nota" | "comentario">;

function lerJson<T>(chave: string, padrao: T): T {
  try {
    const bruto = window.localStorage.getItem(chave);
    return bruto ? (JSON.parse(bruto) as T) : padrao;
  } catch {
    return padrao;
  }
}

function gravarJson(chave: string, valor: unknown) {
  try {
    window.localStorage.setItem(chave, JSON.stringify(valor));
  } catch {
    /* armazenamento indisponível */
  }
}

/**
 * Avaliações do serviço. Usa a API (banco SQLite). Se a API estiver fora do ar,
 * cai para o modo offline: lê e grava só neste navegador e avisa a pessoa (`offline`).
 */
export function useAvaliacoes() {
  const [avaliacoes, setAvaliacoes] = useState<Review[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [offline, setOffline] = useState(false);
  const [tokens, setTokens] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setCarregando(true);
    setTokens(lerJson<Record<string, string>>(TOKENS_STORAGE_KEY, {}));
    try {
      const dados = await api.listarAvaliacoes();
      setAvaliacoes(
        dados.map((a) => ({
          id: String(a.id),
          autor: a.autor,
          servico: a.servico,
          nota: a.nota,
          comentario: a.comentario,
          data: a.criado_em,
        })),
      );
      setOffline(false);
    } catch (err) {
      if (!(err instanceof ErroApi) || !err.indisponivel) throw err;
      setAvaliacoes(lerJson<Review[]>(REVIEWS_STORAGE_KEY, []));
      setOffline(true);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar().catch(() => setCarregando(false));
  }, [carregar]);

  async function adicionar(nova: NovaAvaliacao) {
    try {
      const { id, token_remocao } = await api.criarAvaliacao(nova);
      const atualizados = { ...tokens, [id]: token_remocao };
      setTokens(atualizados);
      gravarJson(TOKENS_STORAGE_KEY, atualizados);
      setOffline(false);
      await carregar();
    } catch (err) {
      if (!(err instanceof ErroApi) || !err.indisponivel) throw err;
      const local: Review = { ...nova, id: `local-${Date.now()}`, data: new Date().toISOString() };
      const lista = [local, ...lerJson<Review[]>(REVIEWS_STORAGE_KEY, [])];
      gravarJson(REVIEWS_STORAGE_KEY, lista);
      setAvaliacoes(lista);
      setOffline(true);
    }
  }

  async function remover(id: string) {
    if (id.startsWith("local-")) {
      const lista = lerJson<Review[]>(REVIEWS_STORAGE_KEY, []).filter((r) => r.id !== id);
      gravarJson(REVIEWS_STORAGE_KEY, lista);
      setAvaliacoes(lista);
      return;
    }
    await api.excluirAvaliacao(Number(id), tokens[id] ?? "");
    const { [id]: _removido, ...resto } = tokens;
    setTokens(resto);
    gravarJson(TOKENS_STORAGE_KEY, resto);
    await carregar();
  }

  /** Só mostra "remover" nas avaliações que este navegador enviou. */
  const podeRemover = (id: string) => id.startsWith("local-") || Boolean(tokens[id]);

  return { avaliacoes, carregando, offline, adicionar, remover, podeRemover, recarregar: carregar };
}
