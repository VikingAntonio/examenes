-- Si te sale el error de que falta alguna columna, ejecuta esto en el SQL Editor de Supabase:

ALTER TABLE questions ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Para soportar el nuevo tipo de pregunta de ordenamiento
ALTER TABLE options ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0;

-- Asegúrate de que los tipos de pregunta permitidos incluyan sql_ordering
DO $$
BEGIN
    ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_question_type_check;
    ALTER TABLE questions ADD CONSTRAINT questions_question_type_check CHECK (question_type IN ('multiple_choice', 'text', 'sql_ordering'));
EXCEPTION
    WHEN others THEN
        NULL;
END $$;

-- Y asegúrate de que la extensión UUID esté habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
