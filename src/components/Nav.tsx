import { Link } from "@tanstack/react-router";
import { useState } from "react";

const links = [
  { to: "/", label: "Início" },
  { to: "/simulador", label: "Simulador" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/sustentabilidade", label: "Sustentabilidade" },
  { to: "/avaliacoes", label: "Avaliações" },
  { to: "/contato", label: "Contato" },
  { to: "/fale-conosco", label: "Fale Conosco" },
] as const;

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <nav aria-label="Principal">
      <Link to="/" className="nav-logo" onClick={() => setOpen(false)}>
        Agro<span>Conecta</span>
      </Link>
      <ul id="menu-principal" className={`nav-links${open ? " open" : ""}`}>
        {links.map((l) => (
          <li key={l.to}>
            <Link
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              activeProps={{ className: "active" }}
              onClick={() => setOpen(false)}
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/contato" className="nav-cta">
        Entrar na rede
      </Link>
      <button
        className="hamburger"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        aria-expanded={open}
        aria-controls="menu-principal"
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
        <span />
      </button>
    </nav>
  );
}
