const { supabaseClient } = window;

let allExams = [];
let subjects = [];
let levels = [];

function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function init() {
    const { data: sData } = await supabaseClient.from('subjects').select('*').order('name');
    const { data: lData } = await supabaseClient.from('levels').select('*').order('name');
    const { data: eData } = await supabaseClient.from('exams').select('*, subjects(name), levels(name)').order('created_at', { ascending: false });

    subjects = sData || [];
    levels = lData || [];
    allExams = eData || [];

    populateFilters();
    renderExams(allExams);
}

function populateFilters() {
    const sFilter = document.getElementById('subjectFilter');
    const lFilter = document.getElementById('levelFilter');

    sFilter.innerHTML = '<option value="">Todas las materias</option>' +
        subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');

    lFilter.innerHTML = '<option value="">Todos los niveles</option>' +
        levels.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
}

function renderExams(exams) {
    const grid = document.getElementById('examGrid');
    if (exams.length === 0) {
        grid.innerHTML = '<div class="col-span-full py-20 text-center text-gray-400">No se encontraron exámenes con estos filtros.</div>';
        return;
    }

    grid.innerHTML = exams.map(exam => `
        <div class="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border dark:border-gray-700 card-hover group">
            <div class="flex justify-between items-start mb-6">
                <span class="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-primary text-[10px] font-bold rounded-full uppercase tracking-wider">${esc(exam.subjects?.name)}</span>
                <span class="text-xs font-bold text-gray-300">${esc(exam.levels?.name)}</span>
            </div>
            <h3 class="text-xl font-bold mb-3 group-hover:text-primary transition-colors">${esc(exam.title)}</h3>
            <p class="text-sm text-gray-500 mb-8 line-clamp-2">${esc(exam.description || 'Sin descripción disponible.')}</p>
            <button class="w-full py-4 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-2xl font-bold flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                Realizar Examen <i class="fas fa-arrow-right ml-2 text-xs"></i>
            </button>
        </div>
    `).join('');
}

function applyFilters() {
    const subjectId = document.getElementById('subjectFilter').value;
    const levelId = document.getElementById('levelFilter').value;

    let filtered = allExams;
    if (subjectId && subjectId !== 'all') filtered = filtered.filter(e => e.subject_id === subjectId);
    if (levelId && levelId !== 'all') filtered = filtered.filter(e => e.level_id === levelId);

    renderExams(filtered);
}

function resetFilters() {
    document.getElementById('subjectFilter').value = 'all';
    document.getElementById('levelFilter').value = 'all';
    renderExams(allExams);
}

document.getElementById('subjectFilter').addEventListener('change', applyFilters);
document.getElementById('levelFilter').addEventListener('change', applyFilters);
document.getElementById('resetFilters').addEventListener('click', resetFilters);

init();
