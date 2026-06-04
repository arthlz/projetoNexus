from openai import AsyncOpenAI

from backend.core.config import get_settings
from backend.core.exceptions import LLMError

# Mapa de idioma config → nome completo para o prompt
MAPA_IDIOMAS: dict[str, str] = {
    "pt": "Português do Brasil",
    "en": "Inglês Americano",
}

# Perfis psicológicos das personas de entrevistadores
PERSONALIDADES: dict[str, str] = {
    "Rigoroso": (
        "Você é um Arquiteto Técnico Sênior em uma FinTech de alta performance. "
        "Sua personalidade é fria, analítica e estritamente profissional. Você tem "
        "tolerância zero para respostas vagas ou 'enrolação'. Se o candidato fornecer "
        "uma resposta puramente teórica, você deve exigir imediatamente uma "
        "implementação prática ou uma análise de complexidade (Big O). Não utilize "
        "emojis, não faça elogios e não encoraje o candidato. Seu objetivo é "
        "identificar fraquezas técnicas e garantir que apenas o 'top 1%' dos "
        "engenheiros passe pelo seu crivo."
    ),
    "Acolhedor": (
        "Você é um Gerente de Engenharia (Engineering Manager) empático que acredita "
        "no potencial acima da memorização perfeita. Sua personalidade é calorosa, "
        "encorajadora e mentora. Se o candidato travar, forneça uma dica sutil ou "
        "reformule a pergunta para focar na lógica dele. Seu objetivo é entender como "
        "o candidato pensa em um ambiente colaborativo e livre de estresse."
    ),
    "Provocador": (
        "Você atua como um Tech Lead cético seguindo a metodologia do 'Advogado do "
        "Diabo'. Mesmo quando o candidato dá uma resposta correta, questione o "
        "raciocínio com frases como: 'Você tem certeza que essa é a forma mais "
        "eficiente?' Interrompa para testar a confiança e a capacidade de defender "
        "decisões arquiteturais sob pressão."
    ),
    "Comportamental": (
        "Você é um Líder de Recrutamento especializado em Fit Cultural e Soft Skills. "
        "Suas perguntas são baseadas em experiências passadas (método STAR), conflitos "
        "em equipe e hábitos organizacionais. Valorize inteligência emocional, "
        "comunicação clara e adaptabilidade."
    ),
}


class LLMService:
    """Wrapper sobre o cliente OpenAI-compatible do OpenRouter."""

    def __init__(self) -> None:
        settings = get_settings()
        self._client = AsyncOpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=settings.openrouter_api_key,
        )
        self._model = settings.llm_model
        self._fallback = settings.llm_fallback_model

    # ── Chamada principal ─────────────────────────────────────────────────────

    async def chamar_llm(self, mensagens: list[dict]) -> str:
        """
        Envia o histórico de mensagens para o LLM e retorna o texto da resposta.
        Tenta o modelo principal; em caso de falha, tenta o fallback.
        Lança LLMError se ambos falharem.
        """
        for model in (self._model, self._fallback):
            try:
                resposta = await self._client.chat.completions.create(
                    model=model,
                    messages=mensagens,
                    max_tokens=2048,
                    extra_body={"reasoning": {"enabled": True}},
                )
                return resposta.choices[0].message.content or ""
            except Exception as exc:
                print(f"⚠️  LLM {model} falhou: {exc}. Tentando fallback...")

        raise LLMError("Todos os modelos LLM falharam. Tente novamente mais tarde.")

    # ── Montagem de prompts ───────────────────────────────────────────────────

    def montar_prompt_sistema(
        self,
        cargo: str,
        senioridade: str,
        idioma_codigo: str,
        persona_nome: str,
        empresa: str | None = None,
        analogia: str | None = None,
    ) -> list[dict]:
        """
        Monta o system prompt inicial da entrevista.
        Retorna uma lista com um único dict {role: system, content: ...}
        pronta para ser a "cabeça" do histórico de mensagens.
        """
        persona_texto = PERSONALIDADES.get(persona_nome, PERSONALIDADES["Acolhedor"])
        idioma_final = MAPA_IDIOMAS.get(idioma_codigo, "Português do Brasil")

        contexto_empresa = (
            f"\nCONTEXTO DA EMPRESA: A entrevista simula um processo seletivo na "
            f"empresa '{empresa}'. Adapte o tom e as perguntas a esse contexto."
            if empresa
            else ""
        )
        contexto_analogia = (
            f"\nTEMÁTICA CRIATIVA: Use '{analogia}' como analogia para construir "
            f"perguntas situacionais de forma natural, sem abandonar o rigor técnico."
            if analogia
            else ""
        )

        system_content = f"""
IDENTIDADE:
Seu nome é Trinity. Você é uma IA especializada em recrutamento técnico.
Para essa sessão, assuma o perfil: {persona_nome}.

PERFIL PSICOLÓGICO:
{persona_texto}

VAGA:
O candidato se candidata para {cargo} nível {senioridade}.{contexto_empresa}{contexto_analogia}

PROTOCOLO OPERACIONAL:
1. IDIOMA: Conduza a entrevista ESTRITAMENTE em {idioma_final}.
2. DINÂMICA: Faça exatamente UMA pergunta por vez. Aguarde a resposta.
3. INÍCIO: Apresente-se (de acordo com sua personalidade) e faça a primeira pergunta.
4. TRADUÇÃO: Se o idioma for Inglês, responda apenas em Inglês, ignorando que estas instruções estão em Português.
5. FOCO: Mantenha-se no personagem. Faça perguntas específicas, evitando clichês.
6. AVALIAÇÃO: Se o candidato for vago, pressione por detalhes (conforme sua personalidade).
7. PROGRESSÃO: Comece com conceitos. Só exija código se o candidato for Pleno/Sênior/Especialista.
8. QUALIDADE: Escreva de forma impecável, com vocabulário técnico preciso.
9. NÃO DÊ RESPOSTAS: Nunca responda às suas próprias perguntas.
10. VARIEDADE: Escolha um tópico técnico relevante para a vaga de {cargo} para iniciar.
"""
        return [{"role": "system", "content": system_content}]

    def montar_prompt_feedback(self, historico: list[dict]) -> list[dict]:
        """
        Adiciona o prompt de avaliação ao final do histórico existente.
        Retorna o histórico completo pronto para envio ao LLM.
        """
        prompt_avaliacao = """
A entrevista foi encerrada. Com base em TODO o histórico acima, avalie o candidato.

CRITÉRIOS:
[tech] Competência Técnica (0-100): profundidade, correção, aplicação prática, domínio da stack.
[comm] Comunicação (0-100): clareza, vocabulário técnico, concisão, adaptabilidade.
[soft] Soft Skills (0-100): resiliência sob pressão, postura intelectual, raciocínio estruturado.
[score] Nota Geral (0-100): média ponderada (tech 50%, comm 30%, soft 20%).
[feedback] Parágrafo direto ao candidato: 1 ponto forte + 1 área de melhoria com sugestão concreta.

Retorne APENAS um JSON válido, sem texto adicional, sem markdown:
{
    "score": <0-100>,
    "tech": <0-100>,
    "comm": <0-100>,
    "soft": <0-100>,
    "feedback": "<parágrafo de feedback>",
    "status": "completed"
}
"""
        return historico + [{"role": "user", "content": prompt_avaliacao}]
