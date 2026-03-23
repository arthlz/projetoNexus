import streamlit as st
from tools import configurarSystemPrompt, respostaIA

st.title("Nexus AI Interviewer 🤖")

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
    curriculo_teste = "Nome: Joana. Experiência: 2 anos de desenvolvimento em Python."
if 'historico' not in st.session_state:
    # Simulando os dados do candidato por enquanto
    curriculo_teste = "Name: Joana. Experience: 2 years in C++ development."
    
    st.session_state.historico = configurarSystemPrompt("Junior", "Rigoroso", curriculo_teste)
    
    with st.spinner("Trinity está analisando o currículo..."):
        primeira_pergunta = respostaIA(st.session_state.historico)
        st.session_state.historico.append({"role": "assistant", "content": primeira_pergunta})

# 2. DESENHAR O CHAT NA TELA

for mensagem in st.session_state.historico:
    if mensagem["role"] != "system":
        with st.chat_message(mensagem["role"]):
            st.markdown(mensagem["content"])

# 3. A CAIXINHA DE TEXTO DO USUÁRIO
# Esse "walrus operator" (:=) pega o que você digitou e já verifica se não está vazio
if prompt := st.chat_input("Responda à pergunta da Trinity..."):
    
    with st.chat_message("user"):
        st.markdown(prompt)
    st.session_state.historico.append({"role": "user", "content": prompt})
    
    # Depois, chama a Trinity para avaliar a sua resposta e fazer a próxima pergunta
    with st.chat_message("assistant"):
        with st.spinner("Trinity pensando..."):
            resposta = respostaIA(st.session_state.historico)
            st.markdown(resposta)
            
    # Salva a resposta da Trinity na memória para o loop continuar
    st.session_state.historico.append({"role": "assistant", "content": resposta})