

-- 1. Coluna JSONB para guardar toda a config da sessão (role, language, etc.)
--    Evita colunas extras e permite evolução sem migrations futuras.
ALTER TABLE interviews
  ADD COLUMN IF NOT EXISTS extra_config JSONB DEFAULT '{}';

-- 2. Feedback por sessão completa.
--    A tabela original usa answer_id (feedback por resposta). Adicionamos
--    interview_id para o feedback de sessão e tornamos answer_id opcional.
ALTER TABLE feedback
  ADD COLUMN IF NOT EXISTS interview_id INT REFERENCES interviews(id),
  ALTER COLUMN answer_id DROP NOT NULL;

-- 3. Índices para queries de histórico e feedback por entrevista.
CREATE INDEX IF NOT EXISTS idx_interview_messages_interview_id
  ON interview_messages(interview_id);

CREATE INDEX IF NOT EXISTS idx_feedback_interview_id
  ON feedback(interview_id);

-- 4. user_id como TEXT para aceitar UUIDs do Supabase Auth.
--    O schema original define user_id como INT, mas o Supabase Auth emite UUIDs.
--    Esta etapa migra a coluna de forma segura:
--      a) Adiciona nova coluna TEXT
--      b) Copia os valores existentes (convertendo INT → TEXT)
--      c) Renomeia e substitui
--
--    Se a tabela interviews estiver vazia (ambiente novo), o bloco abaixo é
--    equivalente a um simples ALTER COLUMN e pode ser executado sem risco.
--    Se houver dados e user_id ainda for INT, descomente as linhas do bloco.
--
-- DO $$
-- BEGIN
--   IF EXISTS (
--     SELECT 1 FROM information_schema.columns
--     WHERE table_name = 'interviews'
--       AND column_name = 'user_id'
--       AND data_type IN ('integer', 'bigint')
--   ) THEN
--     ALTER TABLE interviews
--       ADD COLUMN IF NOT EXISTS user_id_text TEXT;
--     UPDATE interviews SET user_id_text = user_id::TEXT;
--     ALTER TABLE interviews DROP COLUMN user_id;
--     ALTER TABLE interviews RENAME COLUMN user_id_text TO user_id;
--   END IF;
-- END $$;
--
-- Alternativa para banco vazio / ambiente de dev (mais simples):
-- ALTER TABLE interviews ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;