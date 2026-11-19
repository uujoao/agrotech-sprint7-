/**
 * Regras de cálculo do Simulador de Impacto.
 *
 * ATENÇÃO — são premissas de ESTIMATIVA, não medições. Foram mantidas da versão anterior
 * (fração recuperável de 40 %) e a elas se somou o fator de CO₂.
 * Substitua os valores por dados validados (cooperativas, Embrapa, inventário próprio) antes
 * de usar os números em decisões reais ou comunicação externa.
 */
export const PREMISSAS = {
  /** Parcela do desperdício atual que a rede consegue redirecionar para venda. */
  fracaoRecuperavel: 0.4,
  /** Semanas por mês usadas para converter ganho semanal em mensal. */
  semanasPorMes: 4.3,
  /** kg de CO₂ equivalente evitados por kg de alimento que deixa de ser perdido (premissa ilustrativa). */
  co2PorKg: 0.5,
} as const;

export const FRETES = {
  curta: { rotulo: "R$ 80–120/semana", faixa: "Até 50 km" },
  media: { rotulo: "R$ 150–220/semana", faixa: "50–150 km" },
  longa: { rotulo: "R$ 280–350/semana", faixa: "150+ km" },
} as const;

export const CULTURAS = {
  hortalica: "Hortaliças",
  fruta: "Frutas",
  graos: "Grãos",
  laticinios: "Laticínios",
} as const;

export type Cultura = keyof typeof CULTURAS;
export type Distancia = keyof typeof FRETES;

export type EntradaImpacto = {
  producaoKg: number;
  desperdicioPct: number;
  precoKg: number;
};

export type SaidaImpacto = {
  reducaoPct: number;
  kgSalvosSemana: number;
  ganhoMensal: number;
  co2EvitadoMesKg: number;
};

export function calcularImpacto({
  producaoKg,
  desperdicioPct,
  precoKg,
}: EntradaImpacto): SaidaImpacto {
  const desperdicio = desperdicioPct / 100;
  const kgSalvosSemana = producaoKg * desperdicio * PREMISSAS.fracaoRecuperavel;
  return {
    reducaoPct: Math.round(desperdicio * PREMISSAS.fracaoRecuperavel * 100),
    kgSalvosSemana,
    ganhoMensal: kgSalvosSemana * precoKg * PREMISSAS.semanasPorMes,
    co2EvitadoMesKg: kgSalvosSemana * PREMISSAS.semanasPorMes * PREMISSAS.co2PorKg,
  };
}

export const formatarReais = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export const formatarNumero = (v: number, casas = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: casas });
