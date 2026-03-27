-- Si te sale el error de que falta la columna 'audio_url', ejecuta esto en el SQL Editor de Supabase:

ALTER TABLE questions ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Y asegúrate de que la extensión UUID esté habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
