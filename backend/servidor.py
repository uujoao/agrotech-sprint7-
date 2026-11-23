"""API REST do AgroConecta — Python (biblioteca padrão) + SQLite. Sem dependências externas.

Executar localmente: python servidor.py (dentro da pasta backend)

Variáveis de ambiente:
  PORT                porta fornecida pela plataforma (preferencial)
  AGRO_PORTA          porta alternativa (padrão 8000)
  AGRO_HOST           endereço de escuta (padrão 0.0.0.0)
  AGRO_DB             caminho do arquivo SQLite
  AGRO_ORIGEM         origens permitidas pelo CORS, separadas por vírgula
  AGRO_ADMIN_TOKEN    exige X-Admin-Token nas rotas administrativas
"""
import hmac
import json
import os
import re
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import banco
import validacao

ADMIN_TOKEN = os.environ.get("AGRO_ADMIN_TOKEN", "")
LIMITE_CORPO = 16 * 1024  # 16 KB por requisição


class ErroHttp(Exception):
    def __init__(self, codigo, mensagem, campos=None):
        self.codigo, self.mensagem, self.campos = codigo, mensagem, campos or {}


class Manipulador(BaseHTTPRequestHandler):
    server_version = "AgroConecta/1.0"

    # ---------- infraestrutura ----------
    def log_message(self, formato, *args):
        pass  # silencia o log padrão (evita registrar dados pessoais em query strings)

    def _origens_permitidas(self):
        return {
            origem.strip().rstrip("/")
            for origem in os.environ.get("AGRO_ORIGEM", "").split(",")
            if origem.strip()
        }

    def _adicionar_cors(self):
        origem = self.headers.get("Origin", "").rstrip("/")
        if origem and origem in self._origens_permitidas():
            self.send_header("Access-Control-Allow-Origin", origem)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
            self.send_header(
                "Access-Control-Allow-Headers",
                "Content-Type, X-Admin-Token, X-Cliente-Id, X-Token-Remocao",
            )
            self.send_header("Access-Control-Max-Age", "86400")

    def _enviar(self, codigo, corpo=None):
        dados = b"" if corpo is None else json.dumps(corpo, ensure_ascii=False).encode("utf-8")
        self.send_response(codigo)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(dados)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self._adicionar_cors()
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(dados)

    def do_OPTIONS(self):
        self.send_response(204)
        self._adicionar_cors()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _ler_json(self):
        tamanho = int(self.headers.get("Content-Length") or 0)
        if tamanho > LIMITE_CORPO:
            raise ErroHttp(413, "O envio é grande demais. Reduza o texto e tente de novo.")
        try:
            dados = json.loads(self.rfile.read(tamanho) or b"{}")
        except (ValueError, UnicodeDecodeError):
            raise ErroHttp(400, "Não foi possível ler os dados enviados.")
        if not isinstance(dados, dict):
            raise ErroHttp(400, "Os dados enviados precisam ser um objeto JSON.")
        return dados

    def _exigir_admin(self):
        if not ADMIN_TOKEN:
            return  # modo local de desenvolvimento
        enviado = self.headers.get("X-Admin-Token", "")
        if not hmac.compare_digest(enviado.encode(), ADMIN_TOKEN.encode()):
            raise ErroHttp(401, "Acesso restrito. Informe o código de administrador.")

    def _despachar(self):
        caminho = self.path.split("?")[0].rstrip("/")
        for metodo, padrao, funcao in ROTAS:
            if metodo != self.command:
                continue
            m = re.fullmatch(padrao, caminho)
            if m:
                return funcao(self, *m.groups())
        if any(re.fullmatch(p, caminho) for _, p, _ in ROTAS):
            raise ErroHttp(405, "Método não permitido para este endereço.")
        raise ErroHttp(404, "Endereço não encontrado.")

    def _tratar(self):
        try:
            resultado = self._despachar()
            codigo, corpo = resultado if isinstance(resultado, tuple) else (200, resultado)
            self._enviar(codigo, corpo)
        except ErroHttp as e:
            self._enviar(e.codigo, {"erro": e.mensagem, "campos": e.campos})
        except Exception:
            self._enviar(500, {"erro": "Erro interno. Tente novamente em instantes.", "campos": {}})

    do_GET = do_POST = do_PATCH = do_DELETE = do_PUT = _tratar


# ---------- rotas ----------
def saude(_h):
    return {"ok": True}


def resumo(_h):
    with banco.conexao() as con:
        def contar(sql, *p):
            return con.execute(sql, p).fetchone()[0]

        media = con.execute("SELECT AVG(nota) FROM avaliacoes").fetchone()[0]
        return {
            "cadastros_total": contar("SELECT COUNT(*) FROM cadastros"),
            "produtores": contar("SELECT COUNT(*) FROM cadastros WHERE tipo = 'produtor'"),
            "restaurantes": contar("SELECT COUNT(*) FROM cadastros WHERE tipo = 'restaurante'"),
            "conectados": contar("SELECT COUNT(*) FROM cadastros WHERE status = 'conectado'"),
            "simulacoes_total": contar("SELECT COUNT(*) FROM simulacoes"),
            "kg_salvos_simulados": con.execute("SELECT COALESCE(SUM(kg_salvos), 0) FROM simulacoes").fetchone()[0],
            "co2_evitado_simulado_kg": con.execute("SELECT COALESCE(SUM(co2_evitado_kg), 0) FROM simulacoes").fetchone()[0],
            "avaliacoes_total": contar("SELECT COUNT(*) FROM avaliacoes"),
            "avaliacoes_media": round(media, 2) if media is not None else None,
        }


# Cadastros (dados pessoais → restritos ao administrador, exceto a criação)
def criar_cadastro(h):
    limpo, erros = validacao.validar_cadastro(h._ler_json())
    if erros:
        raise ErroHttp(422, "Revise os campos destacados.", erros)
    with banco.conexao() as con:
        cur = con.execute(
            "INSERT INTO cadastros (tipo, nome, email, telefone, cidade, mensagem) VALUES (?,?,?,?,?,?)",
            (limpo["tipo"], limpo["nome"], limpo["email"], limpo["telefone"], limpo["cidade"], limpo["mensagem"]),
        )
        return 201, {"id": cur.lastrowid}


def listar_cadastros(h):
    h._exigir_admin()
    with banco.conexao() as con:
        return banco.linhas_para_dicts(con.execute("SELECT * FROM cadastros ORDER BY criado_em DESC, id DESC"))


def atualizar_cadastro(h, id_):
    h._exigir_admin()
    status = h._ler_json().get("status")
    if status not in validacao.STATUS:
        raise ErroHttp(422, "Status inválido.", {"status": "Use novo, em_contato ou conectado."})
    with banco.conexao() as con:
        cur = con.execute("UPDATE cadastros SET status = ? WHERE id = ?", (status, int(id_)))
        if cur.rowcount == 0:
            raise ErroHttp(404, "Cadastro não encontrado.")
    return {"id": int(id_), "status": status}


def excluir_cadastro(h, id_):
    h._exigir_admin()
    with banco.conexao() as con:
        if con.execute("DELETE FROM cadastros WHERE id = ?", (int(id_),)).rowcount == 0:
            raise ErroHttp(404, "Cadastro não encontrado.")
    return 204, None


# Mensagens do Fale Conosco
def criar_mensagem(h):
    limpo, erros = validacao.validar_mensagem_contato(h._ler_json())
    if erros:
        raise ErroHttp(422, "Revise os campos destacados.", erros)
    with banco.conexao() as con:
        cur = con.execute(
            "INSERT INTO mensagens (nome, email, telefone, assunto, mensagem) VALUES (?,?,?,?,?)",
            (limpo["nome"], limpo["email"], limpo["telefone"], limpo["assunto"], limpo["mensagem"]),
        )
        return 201, {"id": cur.lastrowid}


def listar_mensagens(h):
    h._exigir_admin()
    with banco.conexao() as con:
        return banco.linhas_para_dicts(con.execute("SELECT * FROM mensagens ORDER BY criado_em DESC, id DESC"))


def excluir_mensagem(h, id_):
    h._exigir_admin()
    with banco.conexao() as con:
        if con.execute("DELETE FROM mensagens WHERE id = ?", (int(id_),)).rowcount == 0:
            raise ErroHttp(404, "Mensagem não encontrada.")
    return 204, None


# Avaliações (leitura pública; exclusão pelo autor via token ou pelo administrador)
def listar_avaliacoes(_h):
    with banco.conexao() as con:
        return banco.linhas_para_dicts(
            con.execute("SELECT id, autor, servico, nota, comentario, criado_em FROM avaliacoes ORDER BY criado_em DESC, id DESC")
        )


def criar_avaliacao(h):
    limpo, erros = validacao.validar_avaliacao(h._ler_json())
    if erros:
        raise ErroHttp(422, "Revise os campos destacados.", erros)
    token = secrets.token_urlsafe(16)
    with banco.conexao() as con:
        cur = con.execute(
            "INSERT INTO avaliacoes (autor, servico, nota, comentario, token_remocao) VALUES (?,?,?,?,?)",
            (limpo["autor"], limpo["servico"], limpo["nota"], limpo["comentario"], token),
        )
        return 201, {"id": cur.lastrowid, "token_remocao": token}


def excluir_avaliacao(h, id_):
    with banco.conexao() as con:
        linha = con.execute("SELECT token_remocao FROM avaliacoes WHERE id = ?", (int(id_),)).fetchone()
        if linha is None:
            raise ErroHttp(404, "Avaliação não encontrada.")
        enviado = h.headers.get("X-Token-Remocao", "")
        eh_autor = bool(enviado) and hmac.compare_digest(enviado.encode(), linha["token_remocao"].encode())
        if not eh_autor:
            h._exigir_admin()
            if not ADMIN_TOKEN:
                raise ErroHttp(403, "Só quem enviou a avaliação pode removê-la.")
        con.execute("DELETE FROM avaliacoes WHERE id = ?", (int(id_),))
    return 204, None


# Simulações (histórico por navegador: cliente_id)
def criar_simulacao(h):
    limpo, erros = validacao.validar_simulacao(h._ler_json())
    if erros:
        raise ErroHttp(422, "Revise os campos da simulação.", erros)
    with banco.conexao() as con:
        cur = con.execute(
            """INSERT INTO simulacoes (cliente_id, cultura, producao_kg, desperdicio_pct, preco_kg, distancia,
                                       kg_salvos, ganho_mensal, co2_evitado_kg) VALUES (?,?,?,?,?,?,?,?,?)""",
            (limpo["cliente_id"], limpo["cultura"], limpo["producao_kg"], limpo["desperdicio_pct"], limpo["preco_kg"],
             limpo["distancia"], limpo["kg_salvos"], limpo["ganho_mensal"], limpo["co2_evitado_kg"]),
        )
        return 201, {"id": cur.lastrowid}


def listar_simulacoes(h):
    cliente = h.headers.get("X-Cliente-Id", "")
    if not re.fullmatch(r"[A-Za-z0-9-]{8,64}", cliente):
        raise ErroHttp(400, "Identificador do navegador ausente ou inválido.")
    with banco.conexao() as con:
        return banco.linhas_para_dicts(
            con.execute(
                """SELECT id, cultura, producao_kg, desperdicio_pct, preco_kg, distancia, kg_salvos, ganho_mensal,
                          co2_evitado_kg, criado_em
                   FROM simulacoes WHERE cliente_id = ? ORDER BY criado_em DESC, id DESC LIMIT 20""",
                (cliente,),
            )
        )


def excluir_simulacao(h, id_):
    cliente = h.headers.get("X-Cliente-Id", "")
    with banco.conexao() as con:
        cur = con.execute("DELETE FROM simulacoes WHERE id = ? AND cliente_id = ?", (int(id_), cliente))
        if cur.rowcount == 0:
            raise ErroHttp(404, "Simulação não encontrada.")
    return 204, None


ROTAS = [
    ("GET", r"/api/saude", saude),
    ("GET", r"/api/resumo", resumo),
    ("POST", r"/api/cadastros", criar_cadastro),
    ("GET", r"/api/cadastros", listar_cadastros),
    ("PATCH", r"/api/cadastros/(\d+)", atualizar_cadastro),
    ("DELETE", r"/api/cadastros/(\d+)", excluir_cadastro),
    ("POST", r"/api/mensagens", criar_mensagem),
    ("GET", r"/api/mensagens", listar_mensagens),
    ("DELETE", r"/api/mensagens/(\d+)", excluir_mensagem),
    ("GET", r"/api/avaliacoes", listar_avaliacoes),
    ("POST", r"/api/avaliacoes", criar_avaliacao),
    ("DELETE", r"/api/avaliacoes/(\d+)", excluir_avaliacao),
    ("GET", r"/api/simulacoes", listar_simulacoes),
    ("POST", r"/api/simulacoes", criar_simulacao),
    ("DELETE", r"/api/simulacoes/(\d+)", excluir_simulacao),
]


def main():
    banco.iniciar_banco()
    host = os.environ.get("AGRO_HOST", "0.0.0.0")
    porta = int(os.environ.get("PORT") or os.environ.get("AGRO_PORTA", "8000"))
    aviso = "" if ADMIN_TOKEN else "  (AGRO_ADMIN_TOKEN não definido: rotas administrativas abertas)"
    print(f"API AgroConecta escutando em {host}:{porta}{aviso}")
    ThreadingHTTPServer((host, porta), Manipulador).serve_forever()


if __name__ == "__main__":
    main()
