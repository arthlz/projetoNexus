from tools import *
import streamlit as st

st.title("Nexus AI Interviewer")

def gerenciarConversa():
    """Inicializa o histórico da sessão do Streamlit se ele ainda não existir"""
    if 'historico' not in st.session_state:
        st.session_state.historico = []

def reiniciarConversa():
    """Reinicia a conversa atual, limpando o histórico e recarregando a aplicação"""
    st.session_state.historico = []
    st.rerun()

# ======== TESTE DE MEMÓRIA ========
if __name__ == "__main__":
    gerenciarConversa()
    curriculo_teste = "Name: Joana. Experience: 2 years in C++ development."
    st.session_state.historico = configurarSystemPrompt("Junior", "Rigoroso", curriculo_teste)
    
    print("--- Entrevista Iniciada (Digite 'sair' para encerrar) ---")
    
    while True:
        # busca a resposta da IA baseada no histórico atual
        print("\nTrinity pensando...")
        resposta_ia = respostaIA(st.session_state.historico)
        
        # salva a resposta da IA na memória
        st.session_state.historico.append({"role": "assistant", "content": resposta_ia})
        print(f"\n[TRINITY]: {resposta_ia}")
        
        # entrada do usuário
        print("\n-----------------------")
        user_input = input("[VOCÊ]: ")
        
        if user_input.lower() == 'sair':
            break
            
        # salva a sua resposta na memória antes de chamar a IA de novo
        st.session_state.historico.append({"role": "user", "content": user_input})
