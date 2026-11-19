"""Camada de banco de dados do AgroConecta (SQLite, biblioteca padrão do Python).

Todas as consultas usam parâmetros (?) para evitar SQL Injection.
"""
import os
import sqlite3
from contextlib import contextmanager

CAMINHO_BANCO = os.environ.get(
    "AGRO_DB", os.path.join(os.path.dirname(os.path.abspath(__file__)), "agroconecta.db")
)

ESQUEMA = """
CREATE TABLE IF NOT EXISTS cadastros (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo        TEXT NOT NULL CHECK (tipo IN ('produtor', 'restaurante')),
    nome        TEXT NOT NULL,
    email       TEXT NOT NULL,
    telefone    TEXT NOT NULL,
    cidade      TEXT NOT NULL,
    mensagem    TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'novo' CHECK (status IN ('novo', 'em_contato', 'conectado')),
    criado_em   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS avaliacoes (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    autor          TEXT NOT NULL,
    servico        TEXT NOT NULL,
    nota           INTEGER NOT NULL CHECK (nota BETWEEN 1 AND 5),
    comentario     TEXT NOT NULL,
    token_remocao  TEXT NOT NULL,
    criado_em      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS simulacoes (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id       TEXT NOT NULL,
    cultura          TEXT NOT NULL,
    producao_kg      REAL NOT NULL,
    desperdicio_pct  REAL NOT NULL,
    preco_kg         REAL NOT NULL,
    distancia        TEXT NOT NULL,
    kg_salvos        REAL NOT NULL,
    ganho_mensal     REAL NOT NULL,
    co2_evitado_kg   REAL NOT NULL,
    criado_em        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_simulacoes_cliente ON simulacoes (cliente_id);

CREATE TABLE IF NOT EXISTS mensagens (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    nome       TEXT NOT NULL,
    email      TEXT NOT NULL,
    telefone   TEXT NOT NULL,
    assunto    TEXT NOT NULL,
    mensagem   TEXT NOT NULL,
    criado_em  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
"""


@contextmanager
def conexao():
    """Abre uma conexão, confirma (commit) ao final e sempre fecha."""
    con = sqlite3.connect(CAMINHO_BANCO)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA foreign_keys = ON")
    try:
        yield con
        con.commit()
    except Exception:
        con.rollback()
        raise
    finally:
        con.close()


def iniciar_banco():
    with conexao() as con:
        con.executescript(ESQUEMA)


def linhas_para_dicts(linhas):
    return [dict(l) for l in linhas]
