export type Review = {
  id: string;
  autor: string;
  servico: string;
  nota: number;
  comentario: string;
  data: string; // ISO
};

export const SERVICOS = [
  "Assinatura B2B",
  "Simulador de Impacto",
  "Logística / Entrega",
  "Dashboard Executivo",
  "Atendimento",
] as const;

/** Chave usada só no modo offline (API indisponível): as avaliações ficam apenas neste navegador. */
export const REVIEWS_STORAGE_KEY = "agroconecta:avaliacoes-locais";
/** Guarda, por avaliação enviada, o código que permite ao autor removê-la depois. */
export const TOKENS_STORAGE_KEY = "agroconecta:avaliacoes-tokens";

export function mediaAvaliacoes(reviews: Review[]) {
  if (reviews.length === 0) return 0;
  return reviews.reduce((soma, r) => soma + r.nota, 0) / reviews.length;
}

export function distribuicaoNotas(reviews: Review[]) {
  return [5, 4, 3, 2, 1].map((nota) => ({
    nota,
    total: reviews.filter((r) => r.nota === nota).length,
  }));
}

export function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
