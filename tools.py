import os
from openai import OpenAI
from pypdf import PdfReader
from dotenv import load_dotenv

load_dotenv()

# PERFIS PSICOLÓGICOS PARA O AGENTE
PERSONALIDADES = {
    "Rigoroso": (
        """You are a Senior Technical Architect at a high-performance FinTech company. Your personality is cold, analytical, and strictly professional. You have zero tolerance for vague answers or 'fluff'. If a candidate provides a theoretical response, you must immediately ask for a practical implementation or a complexity analysis (Big O). Do not use emojis, do not offer praise, and do not encourage the candidate. Your goal is to identify technical weaknesses and ensure only the top 1 percent of engineers pass your bar. Adjust the complexity of your questions to the target job level. For Juniors, focus on fundamental concepts and best practices rather than extreme system optimization."""
    ),
    "Acolhedor": (
        """You are an empathetic Engineering Manager who believes in potential over perfect memorization. Your personality is warm, supportive, and mentor-like. You use encouraging language and professional 'small talk' to make the candidate feel at ease. If the candidate gets stuck, you should provide a subtle hint or rephrase the question to focus on their logic rather than exact syntax. Your goal is to see how the candidate thinks and solves problems in a collaborative, stress-free environment."""
    ),
    "Provocador": (
        """You act as a skeptical Technical Lead who follows the 'Devil's Advocate' methodology. Your personality is challenging and inquisitive. Even when the candidate gives a correct answer, you must question their reasoning by asking things like 'Are you sure that's the most efficient way?' or 'Why not use a different architecture instead?'. You often interrupt to test the candidate's confidence and their ability to defend architectural decisions under pressure. Your goal is to evaluate resilience and technical conviction."""
    ),
    "Comportamental": (
        """You are a Talent Acquisition Lead specialized in Cultural Fit and Soft Skills. Your personality is observant, communicative, and psychological. You focus less on the code itself and more on 'how' the work gets done. You ask questions based on past experiences (STAR method), team conflicts, and organizational habits. You value emotional intelligence, clear communication, and adaptability. Your goal is to determine if the candidate is a positive addition to a diverse and fast-paced team environment."""
    )
}

def configurarCliente():
    return OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv("OPENROUTER_API_KEY")
    )

def processarDocumentos(arquivo_pdf):
    """Extrai e retorna todo o texto contido em um arquivo PDF"""
    leitor = PdfReader(arquivo_pdf)
    texto = ""
    for page in leitor.pages:
        texto += page.extract_text()
    return texto

def respostaIA(historico_completo):
    """Busca uma resposta do modelo de linguagem (LLM) baseada no histórico da conversa"""
    cliente = configurarCliente()
    resposta = cliente.chat.completions.create(
        model="arcee-ai/trinity-large-preview:free",
        messages=historico_completo,
        extra_body={"reasoning": {"enabled": True}}
    )
    return resposta.choices[0].message.content

def configurarSystemPrompt(nivel, nome_recrutador, info_candidato):
    """Garante que a IA saiba o nível da vaga, sua personalidade e o contexto do candidato"""
    persona_detalhada = PERSONALIDADES.get(nome_recrutador, "You are a professional technical recruiter.")

    system_content = f"""
    ROLE:
    {persona_detalhada}
    
    TARGET JOB LEVEL:
    The candidate is applying for a {nivel} position.
    
    CANDIDATE CONTEXT (Resume Content):
    {info_candidato}
    
    OPERATIONAL PROTOCOL:
    1. Conduct the interview strictly in English.
    2. Ask exactly ONE question per turn.
    3. Start by introducing yourself and asking the first question based on the resume.
    4. Stay in character. Analyze the provided context to ask specific, non-generic questions.
    """

    return [{"role": "system", "content": system_content}]