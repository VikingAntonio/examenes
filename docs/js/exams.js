const { supabaseClient } = window;

// DOM Elements
const examGrid = document.getElementById('examGrid');
const subjectFilter = document.getElementById('subjectFilter');
const levelFilter = document.getElementById('levelFilter');
const resetFilters = document.getElementById('resetFilters');

// State
let allExams = [];
let subjects = [];
let levels = [];

async function init() {
    await fetchFilters();
    await fetchExams();
    renderExams();
}

async function fetchFilters() {
    const { data: sData } = await supabaseClient.from('subjects').select('*').order('name');
    const { data: lData } = await supabaseClient.from('levels').select('*').order('name');

    subjects = sData || [];
    levels = lData || [];

    subjects.forEach(s => {
        const opt = new Option(s.name, s.id);
        subjectFilter.add(opt);
    });

    levels.forEach(l => {
        const opt = new Option(l.name, l.id);
        levelFilter.add(opt);
    });
}

async function fetchExams() {
    const { data, error } = await supabaseClient
        .from('exams')
        .select('*, subjects(name), levels(name)')
        .order('created_at', { ascending: false });

    if (error) console.error('Error fetching exams:', error);
    allExams = data || [];
}

function renderExams() {
    const sVal = subjectFilter.value;
    const lVal = levelFilter.value;

    const filtered = allExams.filter(exam => {
        const matchSubject = sVal === 'all' || exam.subject_id === sVal;
        const matchLevel = lVal === 'all' || exam.level_id === lVal;
        return matchSubject && matchLevel;
    });

    examGrid.innerHTML = '';

    if (filtered.length === 0) {
        const emptyState = document.createElement('div');
        emptyState.className = 'col-span-full text-center py-12';
        emptyState.innerHTML = `
            <i class="fas fa-search fa-3x text-gray-300 mb-4"></i>
            <p class="text-gray-500">No se encontraron exámenes con los filtros seleccionados.</p>
        `;
        examGrid.appendChild(emptyState);
        return;
    }

    filtered.forEach(exam => {
        const card = document.createElement('div');
        card.className = 'bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm card-hover animate-fade-in';

        const header = document.createElement('div');
        header.className = 'flex justify-between items-start mb-4';

        const subjectTag = document.createElement('span');
        subjectTag.className = 'px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase';
        subjectTag.textContent = exam.subjects?.name || 'Materia';

        const levelTag = document.createElement('span');
        levelTag.className = 'text-xs text-gray-500';
        levelTag.textContent = exam.levels?.name || 'Nivel';

        header.appendChild(subjectTag);
        header.appendChild(levelTag);

        const title = document.createElement('h3');
        title.className = 'text-xl font-bold mb-2';
        title.textContent = exam.title;

        const desc = document.createElement('p');
        desc.className = 'text-gray-600 dark:text-gray-400 text-sm mb-6 line-clamp-2';
        desc.textContent = exam.description || 'Sin descripción disponible.';

        const button = document.createElement('button');
        button.className = 'w-full py-3 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white transition-all rounded-xl font-semibold flex items-center justify-center group';
        button.innerHTML = `
            Realizar Examen
            <i class="fas fa-arrow-right ml-2 group-hover:translate-x-1 transition-transform"></i>
        `;

        card.appendChild(header);
        card.appendChild(title);
        card.appendChild(desc);
        card.appendChild(button);

        examGrid.appendChild(card);
    });
}

subjectFilter.addEventListener('change', renderExams);
levelFilter.addEventListener('change', renderExams);
resetFilters.addEventListener('click', () => {
    subjectFilter.value = 'all';
    levelFilter.value = 'all';
    renderExams();
});

init();
