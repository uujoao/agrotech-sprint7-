"""Validações do lado do servidor (espelham as regras do front-end).

Cada função devolve (dados_limpos, erros). Se `erros` não estiver vazio, a API responde 422.
"""
import re

EMAIL = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]{2,}$")
PARTE_NOME = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿ'-]{2,}$")
CELULAR = re.compile(r"^[1-9]{2}9\d{8}$")

SERVICOS = {
    "Assinatura B2B",
    "Simulador de Impacto",
    "Logística / Entrega",
    "Dashboard Executivo",
    "Atendimento",
}
ASSUNTOS = {"duvida", "sugestao", "parceria", "suporte", "outro"}
CULTURAS = {"hortalica", "fruta", "graos", "laticinios"}
DISTANCIAS = {"curta", "media", "longa"}
STATUS = {"novo", "em_contato", "conectado"}


def _texto(dados, campo):
    valor = dados.get(campo)
    return valor.strip() if isinstance(valor, str) else ""


def _validar_contato_basico(dados, erros, limpo):
    nome = _texto(dados, "nome")
    partes = nome.split()
    if len(partes) < 2 or not all(PARTE_NOME.match(p) for p in partes):
        erros["nome"] = "Digite nome e sobrenome usando apenas letras."
    limpo["nome"] = nome

    email = _texto(dados, "email")
    if not EMAIL.match(email):
        erros["email"] = "Informe um e-mail válido, por exemplo: nome@dominio.com."
    limpo["email"] = email

    digitos = re.sub(r"\D", "", _texto(dados, "telefone"))
    if not CELULAR.match(digitos) or re.match(r"^(\d)\1{10}$", digitos):
        erros["telefone"] = "Informe um celular completo no formato (XX) 9XXXX-XXXX."
    limpo["telefone"] = digitos


def _validar_mensagem(dados, erros, limpo, campo="mensagem", maximo=500):
    mensagem = _texto(dados, campo)
    if not mensagem:
        erros[campo] = "A mensagem não pode ficar em branco."
    elif len(mensagem) > maximo:
        erros[campo] = f"A mensagem deve ter no máximo {maximo} caracteres."
    limpo[campo] = mensagem


def validar_cadastro(dados):
    erros, limpo = {}, {}
    if dados.get("tipo") not in ("produtor", "restaurante"):
        erros["tipo"] = "Escolha se você é produtor rural ou restaurante."
    limpo["tipo"] = dados.get("tipo")
    _validar_contato_basico(dados, erros, limpo)
    limpo["cidade"] = _texto(dados, "cidade")
    if not limpo["cidade"]:
        erros["cidade"] = "Informe a cidade e o estado."
    _validar_mensagem(dados, erros, limpo)
    return limpo, erros


def validar_mensagem_contato(dados):
    erros, limpo = {}, {}
    _validar_contato_basico(dados, erros, limpo)
    limpo["assunto"] = dados.get("assunto")
    if limpo["assunto"] not in ASSUNTOS:
        erros["assunto"] = "Escolha um assunto da lista."
    _validar_mensagem(dados, erros, limpo)
    return limpo, erros


def validar_avaliacao(dados):
    erros, limpo = {}, {}
    autor = _texto(dados, "autor")
    if len(autor) < 2 or len(autor) > 60:
        erros["autor"] = "Informe seu nome (entre 2 e 60 caracteres)."
    limpo["autor"] = autor
    limpo["servico"] = dados.get("servico")
    if limpo["servico"] not in SERVICOS:
        erros["servico"] = "Escolha um serviço da lista."
    nota = dados.get("nota")
    if not isinstance(nota, int) or isinstance(nota, bool) or not 1 <= nota <= 5:
        erros["nota"] = "Escolha uma nota de 1 a 5 estrelas."
    limpo["nota"] = nota
    _validar_mensagem(dados, erros, limpo, campo="comentario", maximo=400)
    return limpo, erros


def _numero(dados, campo, minimo, maximo, erros, rotulo):
    valor = dados.get(campo)
    if isinstance(valor, bool) or not isinstance(valor, (int, float)) or not minimo <= valor <= maximo:
        erros[campo] = f"{rotulo} deve estar entre {minimo} e {maximo}."
        return 0
    return float(valor)


def validar_simulacao(dados):
    erros, limpo = {}, {}
    cliente = _texto(dados, "cliente_id")
    if not re.match(r"^[A-Za-z0-9-]{8,64}$", cliente):
        erros["cliente_id"] = "Identificador do navegador inválido."
    limpo["cliente_id"] = cliente
    limpo["cultura"] = dados.get("cultura")
    if limpo["cultura"] not in CULTURAS:
        erros["cultura"] = "Escolha um tipo de cultura da lista."
    limpo["distancia"] = dados.get("distancia")
    if limpo["distancia"] not in DISTANCIAS:
        erros["distancia"] = "Escolha uma faixa de distância da lista."
    limpo["producao_kg"] = _numero(dados, "producao_kg", 1, 1_000_000, erros, "A produção semanal")
    limpo["desperdicio_pct"] = _numero(dados, "desperdicio_pct", 0, 100, erros, "O desperdício")
    limpo["preco_kg"] = _numero(dados, "preco_kg", 0.01, 10_000, erros, "O preço por kg")
    limpo["kg_salvos"] = _numero(dados, "kg_salvos", 0, 1_000_000, erros, "O total de kg salvos")
    limpo["ganho_mensal"] = _numero(dados, "ganho_mensal", 0, 1_000_000_000, erros, "O ganho mensal")
    limpo["co2_evitado_kg"] = _numero(dados, "co2_evitado_kg", 0, 1_000_000_000, erros, "O CO₂ evitado")
    return limpo, erros
