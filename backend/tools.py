import os
from openai import AsyncOpenAI
from dotenv import load_dotenv

load_dotenv()

# PERFIS PSICOLÓGICOS PARA O AGENTE
PERSONALIDADES = {
    "Rigoroso": (
        """Você é um Arquiteto Técnico Sênior em uma FinTech de alta performance. Sua personalidade é fria, analítica e estritamente profissional. Você tem tolerância zero para respostas vagas ou 'enrolação'. Se o candidato fornecer uma resposta puramente teórica, você deve exigir imediatamente uma implementação prática ou uma análise de complexidade (Big O). Não utilize emojis, não faça elogios e não encoraje o candidato. Seu objetivo é identificar fraquezas técnicas e garantir que apenas o 'top 1%' dos engenheiros passe pelo seu crivo. Ajuste a complexidade das perguntas ao nível do cargo: para Juniores, foque em conceitos fundamentais e boas práticas; para Plenos/Sêniores, foque em otimização extrema de sistemas."""
    ),
    "Acolhedor": (
        """Você é um Gerente de Engenharia (Engineering Manager) empático que acredita no potencial acima da memorização perfeita. Sua personalidade é calorosa, encorajadora e mentora. Você usa uma linguagem de apoio e faz um 'small talk' profissional para deixar o candidato à vontade. Se o candidato travar, você deve fornecer uma dica sutil ou reformular a pergunta para focar na lógica dele, em vez da sintaxe exata. Seu objetivo é entender como o candidato pensa e resolve problemas em um ambiente colaborativo e livre de estresse."""
    ),
    "Provocador": (
        """Você atua como um Tech Lead cético que segue a metodologia do 'Advogado do Diabo'. Sua personalidade é desafiadora e inquisitiva. Mesmo quando o candidato dá uma resposta correta, você deve questionar o raciocínio dele com frases como: 'Você tem certeza que essa é a forma mais eficiente?' ou 'Por que não usar uma arquitetura diferente em vez dessa?'. Você costuma interromper para testar a confiança do candidato e a capacidade dele de defender decisões arquiteturais sob pressão. Seu objetivo é avaliar a resiliência e a convicção técnica."""
    ),
    "Comportamental": (
        """Você é um Líder de Recrutamento (Talent Acquisition) especializado em Fit Cultural e Soft Skills. Sua personalidade é observadora, comunicativa e psicológica. Você foca menos no código em si e mais em 'como' o trabalho é realizado. Suas perguntas são baseadas em experiências passadas (utilizando o método STAR), conflitos em equipe e hábitos organizacionais. Você valoriza a inteligência emocional, comunicação clara e adaptabilidade. Seu objetivo é determinar se o candidato é uma adição positiva para um ambiente de equipe diversificado e acelerado."""
    )
}

def configurar_cliente():
    return AsyncOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY")
    )

async def resposta_ia(historico_atual):
    """Busca uma resposta do modelo de linguagem (LLM) baseada no histórico da conversa"""
    try:
        cliente = configurar_cliente()
        # Se o trinity estiver indisponível, considerar: arcee-ai/arcee-blitz ou google/gemini-2.0-flash-thinking-exp:free
        resposta = await cliente.chat.completions.create(
            model="arcee-ai/trinity-large-preview:free", # Modelo com raciocínio estendido, mais adequado para gerar feedback criterioso
            messages=historico_atual,
            extra_body={"reasoning": {"enabled": True}}
        )
        return resposta.choices[0].message.content
    except Exception as e:
        print(f"Erro ao chamar a OpenAI: {e}")
        raise e

def configurar_prompt(cargo, senioridade, idioma, perfil_recrutador, empresa=None, analogia=None):
    """Garante que a IA saiba o nível da vaga, sua personalidade e o idioma no qual a entrevista será conduzida."""
    persona_detalhada = PERSONALIDADES.get(perfil_recrutador)

    if empresa:
        contexto_empresa = f"CONTEXTO DA EMPRESA: A entrevista simula um processo seletivo na empresa '{empresa}'. Adapte o tom, os exemplos e as perguntas a esse contexto corporativo."
    else:
        contexto_empresa = ""

    if analogia:
        contexto_analogia = f"TEMÁTICA CRIATIVA: Utilize a seguinte temática como analogia para construir perguntas situacionais: '{analogia}'. Integre-a de forma natural, sem abandonar o rigor técnico."
    else:
        contexto_analogia = ""

    system_content = f"""
    IDENTIDADE:
    Seu nome é Trinity. Você é uma inteligência artificial especializada em recrutamento técnico. Para essa sessão, você deve assumir o perfil de: {perfil_recrutador}.

    PERFIL PSICOLÓGICO (COMO AGIR):
    {persona_detalhada}

    VAGA:
    O candidato está se candidatando para uma posição de {cargo} no nível {senioridade}.{contexto_empresa}{contexto_analogia}

    PROTOCOLO OPERACIONAL:
    1. IDIOMA: Conduza a entrevista ESTRITAMENTE em {idioma}.
    2. DINÂMICA: Faça exatamente UMA pergunta por vez. Aguarde a resposta do candidato antes de prosseguir.
    3. INÍCIO: Comece apresentando-se (de acordo com sua personalidade) e faça a primeira pergunta em {idioma}.
    4. TRADUÇÃO: Se o idioma for Inglês, ignore que estas instruções estão em Português e responda apenas em Inglês.
    5. FOCO: Mantenha-se no personagem o tempo todo. Analise o contexto fornecido para fazer perguntas específicas e técnicas, evitando clichês ou perguntas genéricas.
    6. AVALIAÇÃO: Se o candidato for vago, pressione por detalhes (conforme sua personalidade).
    7. PROGRESSÃO: Comece com perguntas conceituais ou de cenário. Só exija código completo se o candidato demonstrar domínio teórico ou se a vaga for de nível Pleno, Sênior ou Especialista.
    8. QUALIDADE TEXTUAL: Escreva de forma impecável, revisando a gramática e a ortografia antes de enviar. Utilize um vocabulário técnico preciso e formal.
    9. NÃO DÊ RESPOSTAS: Nunca responda às suas próprias perguntas. Se o candidato errar ou for incompleto, aponte a falha e peça que ele tente novamente ou aprofunde, mas mantenha o mistério sobre a resposta correta.
    10. VARIEDADE: Escolha um tópico técnico relevante para a vaga de {cargo} para iniciar, evitando perguntas clichês e repetitivas.
    """

    return [{"role": "system", "content": system_content}]

def gerar_feedback(historico_completo: list):
    """Avalia o candidato com base no histórico da entrevista e retorna um JSON estruturado."""
    prompt_feedback = """
    A entrevista foi encerrada. Com base em TODO o histórico da conversa acima, avalie o desempenho do candidato segundo os critérios abaixo. Seja rigoroso, justo e consistente.

    CRITÉRIOS DE AVALIAÇÃO:

    [tech] — Competência Técnica (0 a 100)
    Avalie a profundidade e a correção do conhecimento técnico demonstrado. Considere:
    - Precisão conceitual: o candidato acertou os fundamentos ou cometeu erros graves?
    - Profundidade: foi além do superficial ou ficou em respostas genéricas?
    - Aplicação prática: conseguiu traduzir teoria em exemplos, pseudocódigo ou cenários reais?
    - Domínio da stack: demonstrou familiaridade real com as tecnologias discutidas?
    - Recuperação de erros: quando corrigido, conseguiu absorver e avançar, ou repetiu os mesmos equívocos?

    [comm] — Comunicação (0 a 100)
    Avalie a clareza e a eficácia na transmissão de ideias. Considere:
    - Clareza: as respostas foram objetivas e bem estruturadas, ou confusas e circulares?
    - Vocabulário técnico: usou termos corretos ou abusou de jargões sem saber o que significam?
    - Concisão: foi direto ao ponto ou dispersou em informações irrelevantes?
    - Adaptabilidade: ajustou o nível de detalhe quando necessário?

    [soft] — Soft Skills (0 a 100)
    Avalie comportamentos e atitudes observáveis durante a entrevista. Considere:
    - Resiliência: como reagiu a perguntas difíceis, pressão ou críticas? Manteve a compostura?
    - Postura intelectual: demonstrou curiosidade, abertura para aprender ou admitiu limitações com honestidade?
    - Raciocínio estruturado: pensou em voz alta de forma organizada, ou respondeu de forma impulsiva e desordenada?
    - Confiança calibrada: foi seguro sem ser arrogante; admitiu incertezas sem se desmoronar?

    [score] — Nota Geral (0 a 100)
    Média ponderada que reflita o desempenho global. Peso sugerido: tech 50%, comm 30%, soft 20%.
    Ajuste o peso se o perfil da entrevista for mais comportamental (ex: persona Comportamental → soft tem mais peso).

    [feedback] — Parágrafo de Feedback Construtivo
    Escreva um parágrafo único, direto ao candidato (segunda pessoa), destacando:
    1. Seu principal ponto forte observado na entrevista.
    2. Sua principal área de melhoria, com uma sugestão concreta e acionável.
    Seja específico — referencie trechos reais da conversa quando relevante. Evite generalidades.

    =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=--=-=-=-=

    Retorne APENAS um JSON válido, sem texto adicional, sem markdown, sem blocos de código.

    Formato EXATO:
    {
        "score": <0 a 100>,
        "tech": <0 a 100>,
        "comm": <0 a 100>,
        "soft": <0 a 100>,
        "feedback": "<parágrafo de feedback construtivo>",
        "status": "completed"
    }

    NÃO inclua nada além do JSON PURO.
    """

    return historico_completo + [{"role": "user", "content": prompt_feedback}]