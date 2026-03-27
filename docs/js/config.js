const SUPABASE_URL = 'https://wwcmtqqbxdamxebkfsqk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3Y210cXFieGRhbXhlYmtmc3FrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MDUzNzksImV4cCI6MjA5MDA4MTM3OX0.4C5gGKxJrpF5BS8FfEAu8FLa9VudEHxCYxwwtb991Io';
const CLOUDINARY_CLOUD_NAME = 'de3n9pg8x';
const CLOUDINARY_UPLOAD_PRESET = 'vikingdevBdd';

// Initialize Supabase client
if (!window.supabaseClient) {
    const { createClient } = supabase;
    const _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    window.supabaseClient = _supabase;
}
