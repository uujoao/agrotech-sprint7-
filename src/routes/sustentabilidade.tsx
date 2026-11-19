import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { api, type Resumo } from "../lib/api";
import { PREMISSAS, formatarNumero } from "../lib/impacto";

export const Route = createFileRoute("/sustentabilidade")({
  head: () => ({
    meta: [
      { title: "Sustentabilidade e Impacto | AgroConecta" },
      {
        name: "description",
        content:
          "Como a AgroConecta contribui para reduzir o desperdício de alimentos e as ODS 2, 12 e 13, e como estimamos esse impacto.",
      },
      { property: "og:title", content: "Sustentabilidade e Impacto | AgroConecta" },
      {
        property: "og:description",
        content:
          "Impacto ambiental, social e econômico da rede AgroConecta, com metodologia aberta.",
      },
    ],
  }),
  component: Sustentabilidade,
});

const DIMENSOES = [
  {
    icone: "🌍",
    titulo: "Ambiental",
    texto:
      "Demanda semanal previsível reduz colheitas sem destino. Menos alimento perdido significa menos água, solo e energia gastos à toa. Rotas consolidadas diminuem viagens de caminhão e as emissões do transporte.",
  },
  {
    icone: "🤝",
    titulo: "Social",
    texto:
      "Alimento que seria descartado volta para a cadeia de abastecimento da cidade. O pequeno produtor ganha previsibilidade para planejar o plantio, e o restaurante ganha rastreabilidade.",
  },
  {
    icone: "💰",
    titulo: "Econômico",
    texto:
      "Assinaturas semanais criam renda recorrente no campo e preço estável na cozinha. Menos intermediários ficam entre quem planta e quem serve.",
  },
];

const ODS = [
  {
    numero: "ODS 2",
    titulo: "Fome zero e agricultura sustentável",
    texto:
      "Apoia a renda e a produtividade de pequenos produtores e amplia o acesso a alimento de qualidade.",
  },
  {
    numero: "ODS 12",
    titulo: "Consumo e produção responsáveis",
    texto:
      "A meta 12.3 pede reduzir pela metade o desperdício de alimentos per capita no varejo e no consumo e diminuir as perdas ao longo da produção e do abastecimento até 2030. Este é o centro do projeto.",
  },
  {
    numero: "ODS 13",
    titulo: "Ação contra a mudança global do clima",
    texto: "Alimento não perdido e logística mais curta evitam emissões de gases de efeito estufa.",
  },
];

const PRATICAS = [
  "Pedir o volume que a cozinha usa na semana, em vez de estocar além do necessário.",
  "Aceitar produtos fora do padrão visual, mas próprios para consumo, como legumes tortos ou menores.",
  "Planejar o cardápio com a safra do período, que costuma ter oferta maior e custo menor.",
  "Aproveitar talos, cascas e folhas em caldos, farofas e recheios.",
  "Consolidar entregas no mesmo dia para reduzir viagens.",
];

function Sustentabilidade() {
  const [resumo, setResumo] = useState<Resumo | null>(null);

  useEffect(() => {
    api
      .resumo()
      .then(setResumo)
      .catch(() => setResumo(null));
  }, []);

  return (
    <div className="sust-wrap">
      <div className="section-tag">Sustentabilidade</div>
      <h1 className="sust-titulo">
        Menos desperdício no campo, <span>mais comida na mesa</span>
      </h1>
      <p className="sust-intro">
        No Brasil, 3,2% dos domicílios estavam em insegurança alimentar grave em 2024 (IBGE, PNAD
        Contínua). A AgroConecta ataca um lado desse problema: a produção que se perde por falta de
        comprador certo.
      </p>

      <section aria-labelledby="dim-titulo">
        <h2 id="dim-titulo" className="sust-h2">
          Três frentes de impacto
        </h2>
        <div className="problem-grid">
          {DIMENSOES.map((d) => (
            <div className="problem-card" key={d.titulo}>
              <div className="problem-icon" aria-hidden="true">
                {d.icone}
              </div>
              <h3>{d.titulo}</h3>
              <p>{d.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="ods-titulo">
        <h2 id="ods-titulo" className="sust-h2">
          Objetivos de Desenvolvimento Sustentável
        </h2>
        <div className="ods-lista">
          {ODS.map((o) => (
            <article className="ods-item" key={o.numero}>
              <strong className="ods-numero">{o.numero}</strong>
              <div>
                <h3>{o.titulo}</h3>
                <p>{o.texto}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="pratica-titulo">
        <h2 id="pratica-titulo" className="sust-h2">
          Boas práticas para restaurantes da rede
        </h2>
        <ul className="praticas">
          {PRATICAS.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>

      <section id="metodologia" aria-labelledby="met-titulo" className="metodologia">
        <h2 id="met-titulo" className="sust-h2">
          Como estimamos o impacto
        </h2>
        <p>
          O <Link to="/simulador">Simulador</Link> usa premissas simples e abertas. Elas são
          estimativas para planejar, não medições.
        </p>
        <ul className="praticas">
          <li>
            Kg salvos por semana = produção semanal × desperdício atual ×{" "}
            {PREMISSAS.fracaoRecuperavel * 100}% (parcela recuperável pela rede).
          </li>
          <li>
            Ganho mensal = kg salvos × preço por kg ×{" "}
            {String(PREMISSAS.semanasPorMes).replace(".", ",")} semanas.
          </li>
          <li>
            CO₂ equivalente evitado = kg salvos × {String(PREMISSAS.co2PorKg).replace(".", ",")} kg
            de CO₂e por kg. Esse fator é ilustrativo e deve ser trocado por um valor validado antes
            de qualquer uso oficial.
          </li>
        </ul>
        <p className="premissa-nota">
          Os valores ficam em <code>src/lib/impacto.ts</code>, num só lugar, para facilitar a
          revisão.
        </p>
      </section>

      <section aria-labelledby="real-titulo" className="dados-reais">
        <h2 id="real-titulo" className="sust-h2">
          O que a plataforma registrou até agora
        </h2>
        {resumo ? (
          <div className="dados-grid">
            <div className="kpi-card">
              <div className="kpi-label">Simulações feitas</div>
              <div className="kpi-value pink">{formatarNumero(resumo.simulacoes_total)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">Kg/semana simulados</div>
              <div className="kpi-value">{formatarNumero(resumo.kg_salvos_simulados)}</div>
            </div>
            <div className="kpi-card">
              <div className="kpi-label">CO₂e estimado</div>
              <div className="kpi-value green">
                {formatarNumero(resumo.co2_evitado_simulado_kg)} kg
              </div>
            </div>
          </div>
        ) : (
          <p className="review-empty">Os totais aparecem quando o servidor estiver disponível.</p>
        )}
        <p className="premissa-nota">
          São totais de simulações feitas no site, não de entregas realizadas.
        </p>
        <Link to="/simulador" className="btn-primary">
          Simular meu impacto
        </Link>
      </section>
    </div>
  );
}
