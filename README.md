# Nexus — Simulador de Entrevistas Técnicas com IA

<div align="center">


[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.136-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10.7-3776AB?style=flat-square&logo=python)](https://python.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3ECF8E?style=flat-square&logo=supabase)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)


**Plataforma de simulação de entrevistas técnicas com IA conversacional por voz, feedback inteligente e análise de currículo ATS.**

[Sobre o Projeto](#-sobre-o-projeto) • [Funcionalidades](#-funcionalidades) • [Arquitetura](#️-arquitetura) • [Como Rodar](#-como-rodar) • [Testes](#-testes) • [Equipe](#-equipe)

</div>

---

## 📖 Sobre o Projeto

O **Nexus** é uma aplicação web desenvolvida como projeto da disciplina de **Desenvolvimento de Software (2026.1)** pela **Equipe 9**. A plataforma permite que desenvolvedores pratiquem entrevistas técnicas em tempo real com uma IA entrevistadora, recebendo feedback detalhado e personalizado ao final de cada sessão.

A entrevista acontece **100% por voz**: o candidato fala pelo microfone, a IA processa a fala, raciocina e responde em áudio, criando uma experiência imersiva e realista.

---

## ✨ Funcionalidades

| Funcionalidade | Descrição |
|---|---|
| 🎙️ **Entrevista por Voz** | Conversa em tempo real via WebSocket com VAD (detecção de atividade de voz) |
| 🤖 **IA Entrevistadora** | Powered by OpenRouter (modelos aura-2/Gemini) com 4 personas configuráveis |
| 📊 **Feedback Detalhado** | Score geral, habilidades técnicas, comunicação e soft skills |
| 📄 **Análise de Currículo ATS** | Upload de PDF e verificação de compatibilidade com sistemas ATS |
| 🌐 **Bilíngue** | Suporte a entrevistas em Português (BR) e Inglês (EUA) |
| 🏢 **Contexto de Empresa** | Simule processos seletivos de empresas específicas (ex: Nubank, Google) |
| 🎭 **Personas do Entrevistador** | Rigoroso, Acolhedor, Provocador ou Comportamental |
| 📈 **Histórico de Entrevistas** | Acompanhe sua evolução ao longo do tempo |

---

## 🏗️ Arquitetura

O projeto é dividido em dois módulos independentes:

```
projetoNexus/
├── frontend/          # Next.js 16 + React 19 + TypeScript
│   ├── app/           # Páginas e layout (App Router)
│   ├── components/    # Componentes de UI
│   ├── hooks/         # useVoiceCall (WebSocket + Web Audio API)
│   ├── types/         # Tipagens TypeScript
│   └── constants/     # Dados mockados e constantes
│
├── backend/           # Python + FastAPI
│   ├── core/          # Configuração, banco de dados, exceções
│   ├── middleware/     # Autenticação JWT (Supabase)
│   ├── routes/        # Endpoints REST + WebSocket
│   ├── schemas/       # Modelos Pydantic (request/response)
│   └── services/      # LLM, pipeline de voz (VAD + STT + TTS)
│
└── migrations/        # Scripts SQL para o Supabase
```

### 🔄 Fluxo da Entrevista por Voz

```
Microfone → Frames PCM (960 bytes) → WebSocket
    → VAD (webrtcvad) → Deepgram STT → Texto
    → LLM (OpenRouter) → Resposta de texto
    → Deepgram TTS → Bytes MP3 → WebSocket
    → Frontend → Web Audio API → Áudio no navegador
```

### 🛠️ Stack Tecnológica

**Frontend**
- Next.js 16 / React 19 / TypeScript
- Tailwind CSS v4
- Web Audio API + WebSocket nativo

**Backend**
- FastAPI + Uvicorn (ASGI)
- Pydantic v2 + pydantic-settings
- WebRTC VAD (detecção de fim de fala)
- Deepgram (STT + TTS)
- OpenRouter (LLM)

**Banco de Dados & Auth**
- Supabase (PostgreSQL + Auth + Storage)
- JWT validado manualmente no backend (service role)

---

## 🚀 Como Rodar

> **Pré-requisito:** Python e Node.js instalados. Recomendamos o uso do **VSCode**.

### 1. Clone o repositório

```bash
git clone https://github.com/melocclara/projetoNexus.git
cd projetoNexus
```

### 2. Configure o ambiente Python (Backend)

```bash
# Crie e ative o ambiente virtual
python -m venv venv

# Windows
.\venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

# Instale as dependências
pip install -r requirements.txt
```

### 3. Configure as variáveis de ambiente do backend

Crie o arquivo `backend/.env.local` com o seguinte conteúdo:

```env
# Supabase
SUPABASE_URL=sua_url_do_supabase
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key
SUPABASE_JWT_SECRET=seu_jwt_secret

# LLM (OpenRouter)
OPENROUTER_API_KEY=sua_api_key_do_openrouter

# STT/TTS (Deepgram)
DEEPGRAM_API_KEY=sua_api_key_do_deepgram

# App
ALLOWED_ORIGINS=http://localhost:3000
ENVIRONMENT=development
```

### 4. Inicie o backend

```bash
uvicorn backend.main:app --reload
```

A API estará disponível em `http://localhost:8000`.
Documentação interativa: `http://localhost:8000/docs`

### 5. Configure o frontend

```bash
cd frontend
```

Crie o arquivo `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_do_supabase
```

### 6. Instale as dependências e rode o frontend

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` no navegador.

### 7. Execute a migration do banco de dados

No Supabase SQL Editor, execute o script:

```bash
migrations/add_interview_support.sql
```

---

## 🧪 Testes

### Backend (pytest)

```bash
# Na raiz do projeto, com o venv ativado
pytest backend/back_testes/ -v
```

Cobertura dos testes:
- **`test_auth.py`** — Decodificação de JWT, autenticação HTTP e WebSocket
- **`test_main.py`** — Healthcheck e rota raiz da API
- **`test_room_routes.py`** — Rotas de setup, encerramento e relatório (com mocks do serviço)
- **`test_schemas.py`** — Validação de Pydantic (enums, limites de campo, intervalos numéricos)
- **`test_services.py`** — LLM service (fallback), Deepgram STT/TTS e VAD detector

### Frontend (Jest)

```bash
cd frontend
npm test
# ou para modo interativo
npm run test:watch
```

Cobertura dos testes:
- **`page.test.tsx`** — Renderização da página principal
- **`usevoicecall.test.ts`** — Hook de chamada de voz (AudioContext + WebSocket mockados)
- **`setup-screen.test.tsx`** — Submissão de formulário e tratamento de erros
- **`report-screen.test.tsx`** — Exibição de pontuações e histórico de transcrição

---

## 📡 API Reference

### Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/` | Healthcheck da API |
| `GET` | `/health` | Status para monitoramento |
| `POST` | `/room/setup` | Cria uma nova sessão de entrevista |
| `WS` | `/room/{id}/entrevista` | WebSocket da entrevista por voz |
| `POST` | `/room/{id}/encerrar` | Encerra e gera feedback via LLM |
| `GET` | `/room/{id}/relatorio` | Retorna o relatório completo da sessão |

### Protocolo WebSocket

```
← Frontend envia: frames PCM 16-bit de 960 bytes (30ms @ 16kHz)
→ Backend envia:  bytes MP3 (áudio da resposta da IA)
→ Backend envia:  {"type": "transcript", "text": "..."}
→ Backend envia:  {"type": "done"} (libera microfone)
→ Backend envia:  {"type": "error", "text": "..."} (falha não-fatal)
```

---

## 🤖 Personas do Entrevistador

| Persona | Perfil | Estilo |
|---------|--------|--------|
| **Rigoroso** | Arquiteto Técnico Sênior em FinTech | Frio, analítico, zero tolerância a respostas vagas |
| **Acolhedor** | Gerente de Engenharia empático | Caloroso, encorajador, fornece dicas sutis |
| **Provocador** | Tech Lead Cético | Questiona respostas corretas, testa confiança |
| **Comportamental** | Líder de RH especializado em Fit Cultural | Foca em soft skills, método STAR, inteligência emocional |

---

## 🤝 Contribuindo

Consulte o [guia de contribuição](contributing.md) para detalhes sobre:

- Padrão de branches (`feat/`, `fix/`, `docs/`, `refactor/`, `test/`)
- Conventional Commits
- Padrões de código (PEP 8 no backend, tipagem estrita no frontend)
- Processo de Pull Request

---

## 👥 Equipe

<table align="center">
  <tr>
    <td align="center">
      <a href="https://github.com/allan-f0101">
        <img src="https://avatars.githubusercontent.com/u/244098995?v=4" width="80px;" alt="Allan"/><br>
        <sub><b>Allan Fernandes</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/arthlz">
        <img src="https://avatars.githubusercontent.com/u/173482833?v=4" width="80px;" alt="Arthur"/><br>
        <sub><b>Arthur Luz</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/ellesamarasllm">
        <img src="https://avatars.githubusercontent.com/u/200519720?v=4" width="80px;" alt="Elane"/><br>
        <sub><b>Elane Lima</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/izabilio">
        <img src="https://avatars.githubusercontent.com/u/177946427?v=4" width="80px;" alt="Iza"/><br>
        <sub><b>Izandra Abílio</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/kaio-mp3">
        <img src="https://avatars.githubusercontent.com/u/248941971?v=4" width="80px;" alt="Kaio"/><br>
        <sub><b>Kaio Vinícius</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/melocclara">
        <img src="https://avatars.githubusercontent.com/u/232266556?v=4" width="80px;" alt="Maria Clara"/><br>
        <sub><b>Maria Clara Melo</b></sub>
      </a>
    </td>
    <td align="center">
      <a href="https://github.com/sophiasantossa">
        <img src="https://avatars.githubusercontent.com/u/248780151?v=4" width="80px;" alt="Sophia"/><br>
        <sub><b>Sophia Santos</b></sub>
      </a>
    </td>
  </tr>
</table>

