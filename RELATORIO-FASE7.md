# Relatório de aprimoramento — AgroConecta (Fase 7)

Cada item informa: **O quê · Onde · Por quê · Conhecimento**. Status: 🆕 novo · ⬆️ existia e foi aprimorado.

## 1. Banco de dados e back-end (Cap. 6)
- 🆕 **API REST em Python + SQLite** — `backend/servidor.py`, `banco.py`, `validacao.py`. Quatro tabelas (cadastros, mensagens, avaliações, simulações), consultas parametrizadas, validação no servidor, limite de corpo, token de administrador opcional. *Por quê:* os formulários só validavam e mostravam sucesso; nada era guardado. *Cap. 6.*
- 🆕 **CRUD completo de cadastros** — criar (`Contato`), listar/atualizar status/excluir (`Dashboard`, área restrita). *Cap. 6.*
- 🆕 **Histórico de simulações por navegador** (criar/listar/excluir) — `simulador.tsx`.
- ⬆️ **Avaliações** agora gravadas no banco; autor remove a própria via token — `hooks/useAvaliacoes.ts`, `avaliacoes.tsx`.

## 2. Front-end e consumo de API (Cap. 5)
- 🆕 `src/lib/api.ts`: cliente `fetch` tipado, timeout de 8 s, erros tratados. `vite.config.ts`: proxy `/api`.
- 🆕 `src/lib/impacto.ts`: cálculo do simulador extraído e com premissas documentadas.
- ⬆️ Reserva offline: se a API cair, avaliações usam `localStorage` e a pessoa é avisada.
- ⬆️ Home exibe nº de cadastros reais vindo da API (`routes/index.tsx`).

## 3. UX Writing (Cap. 9)
- ⬆️ Rótulos de ação mais claros: "Entrar na rede", "Simular meu impacto", "Ver o dashboard", "Enviar cadastro", "Publicar avaliação".
- ⬆️ Mensagens de feedback: carregando, sucesso ("Cadastro recebido"), erro de rede (dados preservados no formulário), estados vazios com próximo passo.
- ⬆️ Validação do simulador com mensagens específicas (antes não havia).
- Arquivos: `contato.tsx`, `fale-conosco.tsx`, `ReviewForm.tsx`, `ReviewList.tsx`, `simulador.tsx`, `dashboard.tsx`, `Nav.tsx`, `index.tsx`.

## 4. Sustentabilidade (Cap. 11)
- 🆕 **Página `/sustentabilidade`** — três dimensões (ambiental, social, econômica), ODS 2, 12 (meta 12.3) e 13, boas práticas para restaurantes, metodologia aberta e totais reais. Dado do IBGE (3,2 % em insegurança alimentar grave, PNAD Contínua 2024) conferido em fonte oficial.
- 🆕 **CO₂ equivalente evitado** no simulador (premissa ilustrativa de 0,5 kg CO₂e/kg, editável em `impacto.ts`).

## 5. Honestidade dos dados (requisito "sem dados fictícios")
- ⬆️ Dashboard: KPIs, pedidos, mapa de produtores e impacto ambiental antigos continuam, porém marcados **"Dados ilustrativos"**; novo bloco **"Dados reais do banco"** (`components/PainelDados.tsx`).
- ⬆️ Removidos: "320+ produtores parceiros", "Sistema Ativo", "98 % nível de serviço" como resultado, "35 %" de redução logística e as 6 avaliações-semente. Metas aparecem rotuladas como **metas**.

## 6. Acessibilidade, identidade e navegação
- 🆕 Link "Pular para o conteúdo", foco visível, `prefers-reduced-motion`, `aria-expanded` no menu mobile, `aria-label` na busca.
- ⬆️ Item "Sustentabilidade" no menu. Estilos novos em arquivo separado `src/styles/extras.css`, reaproveitando as variáveis existentes (identidade preservada).

## Como configurar
`python backend/servidor.py` + `npm run dev`. Em produção: hospedar `backend/`, definir `AGRO_ADMIN_TOKEN` e `VITE_API_URL`.

## Limitações a conhecer
- Verificados: API testada ponta a ponta (CRUD, validação, tokens, isolamento por navegador); `vite build`, `tsc` e ESLint sem erros. **Não consegui abrir o site num navegador** neste ambiente, então a navegação visual e o proxy do Vite em execução não foram testados.
- Premissas do simulador (40 % recuperável, 0,5 kg CO₂e/kg) são estimativas e devem ser validadas antes de uso oficial.
- O painel de cadastros sem `AGRO_ADMIN_TOKEN` fica aberto: use só localmente.
- Itens ilustrativos do dashboard não foram removidos para preservar o layout.
