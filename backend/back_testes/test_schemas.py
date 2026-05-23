import pytest
from pydantic import ValidationError


from backend.schemas.room_schemas import (
    ConfigurarEntrevistaRequest,
    FeedbackResponse,
    Cargo,
    Senioridade,
    Idioma,
    Persona
)


# Testes: ConfigurarEntrevistaRequest 

def test_configurar_entrevista_request_sucesso():
    """Garante que o Pydantic aceita e converte um payload válido com Enums."""
    payload = {
        "role": "Front-end Developer",
        "level": "Júnior",
        "language": "pt",
        "persona": "Acolhedor",
        "company": "Nexus Inc",
        "analogy": "Construir uma casa"
    }
    
    schema = ConfigurarEntrevistaRequest(**payload)
    
    # O Pydantic converte automaticamente as strings nos tipos Enum correspondentes
    assert schema.role == Cargo.FRONT_END
    assert schema.level == Senioridade.JUNIOR
    assert schema.language == Idioma.PORTUGUESE
    assert schema.persona == Persona.ACOLHEDOR
    assert schema.company == "Nexus Inc"


def test_configurar_entrevista_request_enum_invalido():
    """Garante que falha ao receber um cargo que não faz parte das opções do Enum."""
    payload = {
        "role": "Programador de Jogos", # Cargo inexistente no Enum Cargo
        "level": "Júnior",
        "language": "pt",
        "persona": "Acolhedor"
    }
    
    with pytest.raises(ValidationError) as exc:
        ConfigurarEntrevistaRequest(**payload)
        
    assert "Input should be" in str(exc.value)
    assert "Front-end Developer" in str(exc.value) # O erro do Pydantic sugere as opções válidas


def test_configurar_entrevista_request_limites_tamanho():
    """Garante que os limites de caracteres (max_length) são respeitados."""
    # Testar company com mais de 50 caracteres
    payload_empresa_longa = {
        "role": "Back-end Developer",
        "level": "Sênior",
        "language": "en",
        "persona": "Rigoroso",
        "company": "A" * 51,  # Limite é 50
    }
    with pytest.raises(ValidationError) as exc_company:
        ConfigurarEntrevistaRequest(**payload_empresa_longa)
    assert "String should have at most 50 characters" in str(exc_company.value)

    # Testar analogy com mais de 100 caracteres
    payload_analogia_longa = {
        "role": "Back-end Developer",
        "level": "Sênior",
        "language": "en",
        "persona": "Rigoroso",
        "analogy": "B" * 101,  # Limite é 100
    }
    with pytest.raises(ValidationError) as exc_analogy:
        ConfigurarEntrevistaRequest(**payload_analogia_longa)
    assert "String should have at most 100 characters" in str(exc_analogy.value)


#  Testes: FeedbackResponse 

def test_feedback_response_notas_validas():
    """Garante que as notas dentro do intervalo de 0 a 100 são aceites."""
    payload = {
        "score": 100,
        "tech": 85,
        "comm": 0,
        "soft": 50,
        "feedback": "Bom trabalho."
    }
    schema = FeedbackResponse(**payload)
    
    assert schema.score == 100
    assert schema.comm == 0
    assert schema.status == "completed" # Valor por defeito foi aplicado


def test_feedback_response_notas_fora_do_limite():
    """Garante que o schema rejeita avaliações negativas ou superiores a 100."""
    
    # Testar limite superior (> 100)
    with pytest.raises(ValidationError) as exc_maior:
        FeedbackResponse(score=101, tech=80, comm=80, soft=80, feedback="Nota muito alta")
    assert "Input should be less than or equal to 100" in str(exc_maior.value)

    # Testar limite inferior (< 0)
    with pytest.raises(ValidationError) as exc_menor:
        FeedbackResponse(score=-5, tech=80, comm=80, soft=80, feedback="Nota negativa")
    assert "Input should be greater than or equal to 0" in str(exc_menor.value)