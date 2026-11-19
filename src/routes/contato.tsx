import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useToast } from "../components/ToastProvider";
import { api, ErroApi } from "../lib/api";
import {
  formatTelefoneBR,
  validarCidade,
  validarEmail,
  validarMensagem,
  validarNome,
  validarTelefone,
  type FieldErrors,
} from "../lib/form-validation";

export const Route = createFileRoute("/contato")({
  head: () => ({
    meta: [
      { title: "Entre na Rede | AgroConecta" },
      {
        name: "description",
        content:
          "Produtor rural ou restaurante? Cadastre-se na rede AgroConecta e garanta demanda constante e fornecimento estável.",
      },
      { property: "og:title", content: "Entre na Rede | AgroConecta" },
      {
        property: "og:description",
        content: "Cadastre seu negócio na rede de assinaturas B2B da AgroConecta.",
      },
    ],
  }),
  component: Contato,
});

type Tipo = "produtor" | "restaurante";
type CamposContato = "tipo" | "nome" | "email" | "tel" | "cidade" | "msg";

function Contato() {
  const { showToast } = useToast();
  const [tipo, setTipo] = useState<Tipo | null>(null);
  const [form, setForm] = useState({ nome: "", email: "", tel: "", cidade: "", msg: "" });
  const [tocado, setTocado] = useState<Record<CamposContato, boolean>>({
    tipo: false,
    nome: false,
    email: false,
    tel: false,
    cidade: false,
    msg: false,
  });
  const [enviado, setEnviado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");

  const erros: FieldErrors<CamposContato> = {
    tipo: tipo ? null : "Selecione se você é produtor rural ou restaurante.",
    nome: validarNome(form.nome),
    email: validarEmail(form.email),
    tel: validarTelefone(form.tel),
    cidade: validarCidade(form.cidade),
    msg: validarMensagem(form.msg),
  };

  function atualizar(campo: keyof typeof form, valor: string) {
    setEnviado(false);
    setForm((atual) => ({ ...atual, [campo]: valor }));
  }

  function tocar(campo: CamposContato) {
    setTocado((atual) => ({ ...atual, [campo]: true }));
  }

  async function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErroEnvio("");
    setTocado({
      tipo: true,
      nome: true,
      email: true,
      tel: true,
      cidade: true,
      msg: true,
    });

    const primeiroErro = Object.values(erros).find(Boolean);
    if (primeiroErro) {
      showToast("⚠️", "Revise os campos", "Corrija os campos destacados e envie de novo.");
      return;
    }

    setEnviando(true);
    try {
      await api.criarCadastro({
        tipo: tipo!,
        nome: form.nome.trim(),
        email: form.email.trim(),
        telefone: form.tel,
        cidade: form.cidade.trim(),
        mensagem: form.msg.trim(),
      });
      setEnviado(true);
      setForm({ nome: "", email: "", tel: "", cidade: "", msg: "" });
      setTipo(null);
      setTocado({ tipo: false, nome: false, email: false, tel: false, cidade: false, msg: false });
      showToast("🌱", "Cadastro recebido", "Entraremos em contato por e-mail ou WhatsApp.");
    } catch (err) {
      const mensagem =
        err instanceof ErroApi
          ? err.indisponivel
            ? "Não foi possível enviar agora. Seus dados continuam no formulário: tente de novo em instantes."
            : err.message
          : "Não foi possível enviar. Tente de novo.";
      setErroEnvio(mensagem);
      showToast("⚠️", "Cadastro não enviado", mensagem);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="contact-wrap">
      <div className="section-tag">Vamos Conectar?</div>
      <h2>
        Entre na <span>Rede</span>
      </h2>
      <p>Preencha seus dados e conte um pouco sobre seu negócio para entrar na rede AgroConecta.</p>

      <form noValidate onSubmit={enviar}>
        <fieldset className="contact-type-fieldset">
          <legend>Como você participa da rede? *</legend>
          <div className="contact-type-grid">
            <button
              type="button"
              className={`contact-type-card${tipo === "produtor" ? " selected" : ""}`}
              onClick={() => {
                setTipo("produtor");
                setEnviado(false);
                tocar("tipo");
              }}
              aria-pressed={tipo === "produtor"}
            >
              <span className="problem-icon">🚜</span>
              <strong>Sou Produtor</strong>
              <span>Quero garantir demanda constante e previsibilidade para minha safra.</span>
            </button>
            <button
              type="button"
              className={`contact-type-card${tipo === "restaurante" ? " selected" : ""}`}
              onClick={() => {
                setTipo("restaurante");
                setEnviado(false);
                tocar("tipo");
              }}
              aria-pressed={tipo === "restaurante"}
            >
              <span className="problem-icon">🍽️</span>
              <strong>Sou Restaurante</strong>
              <span>Quero fornecedores confiáveis, preços estáveis e rastreabilidade.</span>
            </button>
          </div>
          <span className="error-msg" role="alert">
            {tocado.tipo ? (erros.tipo ?? "") : ""}
          </span>
        </fieldset>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="contato-nome">Nome Completo *</label>
            <input
              id="contato-nome"
              type="text"
              className={`sim-input${tocado.nome && erros.nome ? " input-error" : ""}`}
              value={form.nome}
              placeholder="João da Silva"
              autoComplete="name"
              aria-invalid={Boolean(tocado.nome && erros.nome)}
              aria-describedby="contato-nome-error"
              onChange={(e) => atualizar("nome", e.target.value)}
              onBlur={() => tocar("nome")}
            />
            <span id="contato-nome-error" className="error-msg" role="alert">
              {tocado.nome ? (erros.nome ?? "") : ""}
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="contato-email">E-mail *</label>
            <input
              id="contato-email"
              type="email"
              className={`sim-input${tocado.email && erros.email ? " input-error" : ""}`}
              value={form.email}
              placeholder="joao@exemplo.com"
              autoComplete="email"
              aria-invalid={Boolean(tocado.email && erros.email)}
              aria-describedby="contato-email-error"
              onChange={(e) => atualizar("email", e.target.value)}
              onBlur={() => tocar("email")}
            />
            <span id="contato-email-error" className="error-msg" role="alert">
              {tocado.email ? (erros.email ?? "") : ""}
            </span>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="contato-tel">Telefone / WhatsApp *</label>
            <input
              id="contato-tel"
              type="tel"
              className={`sim-input${tocado.tel && erros.tel ? " input-error" : ""}`}
              value={form.tel}
              placeholder="(11) 99999-9999"
              inputMode="numeric"
              maxLength={15}
              autoComplete="tel"
              aria-invalid={Boolean(tocado.tel && erros.tel)}
              aria-describedby="contato-tel-error"
              onChange={(e) => atualizar("tel", formatTelefoneBR(e.target.value))}
              onBlur={() => tocar("tel")}
            />
            <span id="contato-tel-error" className="error-msg" role="alert">
              {tocado.tel ? (erros.tel ?? "") : ""}
            </span>
          </div>

          <div className="form-group">
            <label htmlFor="contato-cidade">Cidade / Estado *</label>
            <input
              id="contato-cidade"
              type="text"
              className={`sim-input${tocado.cidade && erros.cidade ? " input-error" : ""}`}
              value={form.cidade}
              placeholder="São Paulo, SP"
              autoComplete="address-level2"
              aria-invalid={Boolean(tocado.cidade && erros.cidade)}
              aria-describedby="contato-cidade-error"
              onChange={(e) => atualizar("cidade", e.target.value)}
              onBlur={() => tocar("cidade")}
            />
            <span id="contato-cidade-error" className="error-msg" role="alert">
              {tocado.cidade ? (erros.cidade ?? "") : ""}
            </span>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="contato-msg">Mensagem *</label>
          <textarea
            id="contato-msg"
            className={`sim-input${tocado.msg && erros.msg ? " input-error" : ""}`}
            maxLength={500}
            value={form.msg}
            placeholder="Conte um pouco sobre seu negócio..."
            aria-invalid={Boolean(tocado.msg && erros.msg)}
            aria-describedby="contato-msg-error"
            onChange={(e) => atualizar("msg", e.target.value)}
            onBlur={() => tocar("msg")}
          />
          <div className="msg-footer">
            <span id="contato-msg-error" className="error-msg" role="alert">
              {tocado.msg ? (erros.msg ?? "") : ""}
            </span>
            <span className="char-counter">{form.msg.length}/500</span>
          </div>
        </div>

        {erroEnvio && (
          <p className="form-error-banner" role="alert">
            {erroEnvio}
          </p>
        )}

        <button type="submit" className="sim-btn" disabled={enviando}>
          {enviando ? "Enviando cadastro..." : "🌱 Enviar cadastro"}
        </button>
      </form>

      {enviado && (
        <div className="form-success" role="status">
          <div className="form-success-icon">✅</div>
          <strong>Cadastro recebido</strong>
          <span>
            Nossa equipe vai entrar em contato por e-mail ou WhatsApp. Bem-vindo à rede AgroConecta.
          </span>
        </div>
      )}
    </div>
  );
}
