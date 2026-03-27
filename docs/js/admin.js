const { supabaseClient } = window;

// State Management
let subjects = [];
let levels = [];
let exams = [];
let currentExam = null;
let currentQuestions = [];
let editingQuestion = null;
let uploadedFiles = { image: null, audio: null };

// DOM Elements
const subjectCountEl = document.getElementById('subjectCount');
const levelCountEl = document.getElementById('levelCount');
const examCountEl = document.getElementById('examCount');
const recentExamsList = document.getElementById('recentExamsList');
const fullExamsGrid = document.getElementById('fullExamsGrid');
const subjectsList = document.getElementById('subjectsList');

// Helper for XSS safety
function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Initialize
async function init() {
    await fetchData();
}

async function fetchData() {
    const { data: sData } = await supabaseClient.from('subjects').select('*').order('name');
    const { data: lData } = await supabaseClient.from('levels').select('*').order('name');
    const { data: eData } = await supabaseClient.from('exams').select('*, subjects(name), levels(name)').order('created_at', { ascending: false });

    subjects = sData || [];
    levels = lData || [];
    exams = eData || [];

    updateDashboardUI();
    updateSettingsUI();
    renderExamsGrid();
    populateSelects();
}

function updateDashboardUI() {
    subjectCountEl.textContent = subjects.length;
    levelCountEl.textContent = levels.length;
    examCountEl.textContent = exams.length;

    const filtered = exams.filter(e =>
        e.title.toLowerCase().includes(document.getElementById('examSearch').value.toLowerCase())
    );

    recentExamsList.innerHTML = filtered.slice(0, 5).map(exam => `
        <div class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between items-center group">
            <div class="flex items-center">
                <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-4">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div>
                    <h4 class="font-bold text-sm">${esc(exam.title)}</h4>
                    <p class="text-xs text-gray-500">${esc(exam.subjects?.name || 'Materia')} • ${esc(exam.levels?.name || 'Nivel')}</p>
                </div>
            </div>
            <button onclick="manageQuestions('${exam.id}')" class="opacity-0 group-hover:opacity-100 p-2 text-primary hover:bg-primary/10 rounded-lg transition-all">
                <i class="fas fa-edit"></i>
            </button>
        </div>
    `).join('') || '<div class="p-8 text-center text-gray-400">No hay exámenes recientes</div>';
}

function updateSettingsUI() {
    subjectsList.innerHTML = subjects.map(s => `
        <div class="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <span class="text-sm font-medium">${esc(s.name)}</span>
            <button onclick="deleteEntity('subjects', '${s.id}')" class="text-gray-400 hover:text-red-500"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('');
}

function renderExamsGrid() {
    const filtered = exams.filter(e =>
        e.title.toLowerCase().includes(document.getElementById('examSearch').value.toLowerCase())
    );
    fullExamsGrid.innerHTML = filtered.map(exam => `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border dark:border-gray-700 card-hover group">
            <div class="flex justify-between items-start mb-4">
                <span class="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded-full uppercase">${esc(exam.subjects?.name || 'Materia')}</span>
                <div class="flex space-x-1">
                    <button onclick="manageQuestions('${exam.id}')" class="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteEntity('exams', '${exam.id}')" class="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"><i class="fas fa-trash-alt"></i></button>
                </div>
            </div>
            <h3 class="font-bold mb-2 group-hover:text-primary transition-colors">${esc(exam.title)}</h3>
            <p class="text-xs text-gray-500 mb-6 line-clamp-2">${esc(exam.description || 'Sin descripción')}</p>
            <button onclick="manageQuestions('${exam.id}')" class="w-full py-2.5 text-xs font-bold bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl hover:bg-primary hover:text-white transition-all">
                Gestionar Preguntas
            </button>
        </div>
    `).join('') || '<div class="col-span-full py-12 text-center text-gray-400">No hay exámenes creados</div>';
}

function populateSelects() {
    const sSelect = document.getElementById('examSubject');
    const lSelect = document.getElementById('examLevel');

    sSelect.innerHTML = '<option value="">Seleccionar Materia</option>' + subjects.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('');
    lSelect.innerHTML = '<option value="">Seleccionar Nivel</option>' + levels.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('');
}

// Entity Management
async function deleteEntity(table, id) {
    if (!confirm('¿Estás seguro de que deseas eliminar este elemento?')) return;
    const { error } = await supabaseClient.from(table).delete().eq('id', id);
    if (error) alert('Error: ' + error.message);
    else fetchData();
}

document.getElementById('addSubjectBtn').addEventListener('click', async () => {
    const name = document.getElementById('subjectInput').value.trim();
    if (!name) return;
    await supabaseClient.from('subjects').insert([{ name }]);
    document.getElementById('subjectInput').value = '';
    fetchData();
});


// Exam Form Logic
function showCreateExam() {
    document.getElementById('examModal').classList.remove('hidden');
    document.getElementById('examForm').reset();
    document.getElementById('examModalTitle').textContent = 'Crear Nuevo Examen';
}

function closeExamModal() {
    document.getElementById('examModal').classList.add('hidden');
}

document.getElementById('examForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('examTitle').value;
    const subject_id = document.getElementById('examSubject').value;
    const level_id = document.getElementById('examLevel').value;
    const description = document.getElementById('examDesc').value;

    const { data, error } = await supabaseClient.from('exams').insert([{ title, subject_id, level_id, description }]).select();
    if (error) {
        alert('Error: ' + error.message);
    } else {
        closeExamModal();
        await fetchData();
        manageQuestions(data[0].id);
    }
});

// Question Manager Logic
async function manageQuestions(examId) {
    currentExam = exams.find(e => e.id === examId);
    if (!currentExam) return;

    document.getElementById('questionManager').classList.remove('hidden');
    document.getElementById('currentExamTitle').textContent = currentExam.title;
    document.getElementById('currentExamMeta').textContent = `${currentExam.subjects?.name} • ${currentExam.levels?.name || 'Sin Nivel'}`;

    updateManagerLevelSelect();
    await fetchQuestions();
    showQuestionForm();
}

function updateManagerLevelSelect() {
    const select = document.getElementById('currentExamLevelSelect');
    select.innerHTML = '<option value="">Sin Nivel</option>' +
        levels.map(l => `<option value="${l.id}" ${currentExam.level_id === l.id ? 'selected' : ''}>${esc(l.name)}</option>`).join('');
}

document.getElementById('currentExamLevelSelect').addEventListener('change', async (e) => {
    const levelId = e.target.value;
    const { error } = await supabaseClient.from('exams').update({ level_id: levelId || null }).eq('id', currentExam.id);
    if (error) {
        alert('Error al actualizar nivel: ' + error.message);
    } else {
        // Refresh local state
        await fetchData();
        currentExam = exams.find(e => e.id === currentExam.id);
        document.getElementById('currentExamMeta').textContent = `${currentExam.subjects?.name} • ${currentExam.levels?.name || 'Sin Nivel'}`;
    }
});

document.getElementById('quickAddLevelBtn').addEventListener('click', async () => {
    const input = document.getElementById('quickAddLevelInput');
    const name = input.value.trim();
    if (!name) return;

    const { data, error } = await supabaseClient.from('levels').insert([{ name }]).select();
    if (error) {
        alert('Error al crear nivel: ' + error.message);
    } else {
        input.value = '';
        await fetchData(); // Refresh levels list
        // Automatically assign new level to current exam
        const newLevelId = data[0].id;
        await supabaseClient.from('exams').update({ level_id: newLevelId }).eq('id', currentExam.id);
        await fetchData();
        currentExam = exams.find(e => e.id === currentExam.id);
        updateManagerLevelSelect();
        document.getElementById('currentExamMeta').textContent = `${currentExam.subjects?.name} • ${currentExam.levels?.name || 'Sin Nivel'}`;
    }
});

function closeQuestionManager() {
    document.getElementById('questionManager').classList.add('hidden');
    editingQuestion = null;
}

async function fetchQuestions() {
    const { data, error } = await supabaseClient.from('questions').select('*, options(*)').eq('exam_id', currentExam.id).order('created_at');
    currentQuestions = data || [];
    renderQuestionsSidebar();
}

function renderQuestionsSidebar() {
    const list = document.getElementById('questionListSidebar');
    list.innerHTML = currentQuestions.map((q, idx) => `
        <div onclick="editQuestion('${q.id}')" class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${editingQuestion?.id === q.id ? 'bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-primary' : ''}">
            <div class="flex justify-between items-start mb-1">
                <span class="text-[10px] font-bold text-gray-400 uppercase">Pregunta ${idx + 1}</span>
                <button onclick="event.stopPropagation(); deleteQuestion('${q.id}')" class="text-gray-300 hover:text-red-500"><i class="fas fa-trash-alt text-xs"></i></button>
            </div>
            <p class="text-xs font-medium line-clamp-2">${esc(q.question_text)}</p>
        </div>
    `).join('') || '<div class="p-8 text-center text-sm text-gray-400">Sin preguntas</div>';
}

function showQuestionForm() {
    editingQuestion = null;
    uploadedFiles = { image: null, audio: null };
    document.getElementById('qEditorTitle').textContent = 'Nueva Pregunta';
    document.getElementById('questionForm').reset();
    document.getElementById('editQuestionId').value = '';
    document.getElementById('questionFormArea').classList.remove('hidden');
    document.getElementById('emptyQuestionArea').classList.add('hidden');
    document.getElementById('optionsList').innerHTML = '';
    document.getElementById('filePreview').innerHTML = '';
    document.getElementById('dropZonePrompt').classList.remove('hidden');

    addOption();
    addOption();
    switchQuestionType();
}

async function editQuestion(id) {
    editingQuestion = currentQuestions.find(q => q.id === id);
    if (!editingQuestion) return;

    document.getElementById('qEditorTitle').textContent = 'Editar Pregunta';
    document.getElementById('questionFormArea').classList.remove('hidden');
    document.getElementById('emptyQuestionArea').classList.add('hidden');

    document.getElementById('editQuestionId').value = editingQuestion.id;
    document.getElementById('questionText').value = editingQuestion.question_text;
    document.getElementById('questionType').value = editingQuestion.question_type;
    document.getElementById('correctAnswerText').value = editingQuestion.correct_answer_text || '';

    const oList = document.getElementById('optionsList');
    oList.innerHTML = '';
    if (editingQuestion.options && editingQuestion.options.length > 0) {
        editingQuestion.options.forEach((opt, idx) => addOption(opt.option_text, opt.is_correct));
    } else if (editingQuestion.question_type === 'multiple_choice') {
        addOption(); addOption();
    }

    const preview = document.getElementById('filePreview');
    const prompt = document.getElementById('dropZonePrompt');
    preview.innerHTML = '';
    if (editingQuestion.image_url || editingQuestion.audio_url) {
        prompt.classList.add('hidden');
        preview.classList.remove('hidden');
        if (editingQuestion.image_url) {
            preview.innerHTML += '<div class="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded">Imagen actual</div>';
        }
        if (editingQuestion.audio_url) {
            preview.innerHTML += '<div class="text-[10px] bg-green-500/10 text-green-600 px-2 py-1 rounded">Audio actual</div>';
        }
    } else {
        prompt.classList.remove('hidden');
    }

    switchQuestionType();
    renderQuestionsSidebar();
}

function addOption(text = '', isCorrect = false) {
    const list = document.getElementById('optionsList');
    const idx = list.children.length;
    const div = document.createElement('div');
    div.className = 'flex items-center space-x-2';
    div.innerHTML = `
        <input type="text" class="option-input flex-1 px-4 py-2 text-sm rounded-xl border dark:border-gray-700 dark:bg-gray-700 outline-none" placeholder="Texto de la opción" value="${esc(text)}">
        <input type="radio" name="correctOption" value="${idx}" ${isCorrect ? 'checked' : ''} class="w-4 h-4 text-primary">
        <button type="button" onclick="this.parentElement.remove()" class="text-gray-400 hover:text-red-500"><i class="fas fa-times"></i></button>
    `;
    list.appendChild(div);
}

function switchQuestionType() {
    const type = document.getElementById('questionType').value;
    document.getElementById('optionsContainer').classList.toggle('hidden', type !== 'multiple_choice');
    document.getElementById('textAnswerContainer').classList.toggle('hidden', type !== 'text');
}

document.getElementById('questionType').addEventListener('change', switchQuestionType);
document.getElementById('addOptionBtn').addEventListener('click', () => addOption());

async function deleteQuestion(id) {
    if (!confirm('¿Eliminar esta pregunta?')) return;
    await supabaseClient.from('questions').delete().eq('id', id);
    fetchQuestions();
}

function cancelQuestionEdit() {
    document.getElementById('questionFormArea').classList.add('hidden');
    document.getElementById('emptyQuestionArea').classList.remove('hidden');
    editingQuestion = null;
    renderQuestionsSidebar();
}

// Form Submission
document.getElementById('questionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById('saveQuestionBtn');
    const originalText = saveBtn.textContent;

    try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';

        const qId = document.getElementById('editQuestionId').value;
        const text = document.getElementById('questionText').value;
        const type = document.getElementById('questionType').value;
        const correctText = document.getElementById('correctAnswerText').value;

        let imgUrl = editingQuestion?.image_url || null;
        let audUrl = editingQuestion?.audio_url || null;

        if (uploadedFiles.image) imgUrl = await uploadToCloudinary(uploadedFiles.image);
        if (uploadedFiles.audio) audUrl = await uploadToCloudinary(uploadedFiles.audio);

        const questionData = {
            exam_id: currentExam.id,
            question_text: text,
            question_type: type,
            image_url: imgUrl,
            audio_url: audUrl,
            correct_answer_text: type === 'text' ? correctText : null
        };

        let resultQ;
        if (qId) {
            const { data, error: qErr } = await supabaseClient.from('questions').update(questionData).eq('id', qId).select();
            if (qErr) throw qErr;
            resultQ = data[0];
            const { error: oDelErr } = await supabaseClient.from('options').delete().eq('question_id', qId);
            if (oDelErr) throw oDelErr;
        } else {
            const { data, error: qErr } = await supabaseClient.from('questions').insert([questionData]).select();
            if (qErr) throw qErr;
            resultQ = data[0];
        }

        if (type === 'multiple_choice') {
            const options = Array.from(document.querySelectorAll('.option-input')).map((input, idx) => ({
                question_id: resultQ.id,
                option_text: input.value,
                is_correct: document.querySelector('input[name="correctOption"]:checked')?.value == idx
            }));
            const { error: oInsErr } = await supabaseClient.from('options').insert(options);
            if (oInsErr) throw oInsErr;
        }

        await fetchQuestions();
        showQuestionForm();
    } catch (error) {
        console.error('Error al guardar pregunta:', error);
        alert('Error al guardar: ' + (error.message || 'Error desconocido'));
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = originalText;
    }
});

// Drag & Drop Setup
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('filePreview');
    const prompt = document.getElementById('dropZonePrompt');

    dropZone.addEventListener('click', () => fileInput.click());
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    ['dragleave', 'drop'].forEach(evt => dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over')));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) uploadedFiles.image = file;
            else if (file.type.startsWith('audio/')) uploadedFiles.audio = file;
        });
        updatePreview();
    }

    function updatePreview() {
        preview.innerHTML = '';
        if (uploadedFiles.image || uploadedFiles.audio) {
            prompt.classList.add('hidden');
            preview.classList.remove('hidden');
            if (uploadedFiles.image) preview.innerHTML += '<div class="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded">Imagen lista</div>';
            if (uploadedFiles.audio) preview.innerHTML += '<div class="text-[10px] bg-green-500/10 text-green-600 px-2 py-1 rounded">Audio listo</div>';
        }
    }
}

async function uploadToCloudinary(file) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'vikingdevBdd');
        const res = await fetch(`https://api.cloudinary.com/v1_1/de3n9pg8x/upload`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Fallo al subir archivo a Cloudinary');
        const data = await res.json();
        return data.secure_url;
    } catch (error) {
        console.error('Cloudinary Error:', error);
        throw error;
    }
}

init();
setupDragAndDrop();
