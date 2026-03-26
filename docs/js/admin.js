const { supabaseClient } = window;

// Helper to escape HTML and prevent XSS
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// DOM Elements
const subjectInput = document.getElementById('subjectInput');
const addSubjectBtn = document.getElementById('addSubjectBtn');
const levelInput = document.getElementById('levelInput');
const addLevelBtn = document.getElementById('addLevelBtn');
const subjectCountEl = document.getElementById('subjectCount');
const levelCountEl = document.getElementById('levelCount');
const examSubjectSelect = document.getElementById('examSubject');
const examLevelSelect = document.getElementById('examLevel');

// State
let subjects = [];
let levels = [];
let uploadedFiles = { image: null, audio: null };

// Fetch initial data
async function fetchData() {
    const { data: subjectsData, error: sError } = await supabaseClient.from('subjects').select('*').order('name');
    const { data: levelsData, error: lError } = await supabaseClient.from('levels').select('*').order('name');

    if (sError) console.error('Error fetching subjects:', sError);
    if (lError) console.error('Error fetching levels:', lError);

    subjects = subjectsData || [];
    levels = levelsData || [];

    updateUI();
}

function updateUI() {
    subjectCountEl.textContent = subjects.length;
    levelCountEl.textContent = levels.length;

    // Update Selects
    examSubjectSelect.innerHTML = '<option value="">Seleccionar Materia</option>';
    subjects.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.id;
        opt.textContent = s.name;
        examSubjectSelect.appendChild(opt);
    });

    examLevelSelect.innerHTML = '<option value="">Seleccionar Nivel</option>';
    levels.forEach(l => {
        const opt = document.createElement('option');
        opt.value = l.id;
        opt.textContent = l.name;
        examLevelSelect.appendChild(opt);
    });
}

// Add Subject
addSubjectBtn.addEventListener('click', async () => {
    const name = subjectInput.value.trim();
    if (!name) return;

    const { data, error } = await supabaseClient.from('subjects').insert([{ name }]).select();
    if (error) {
        alert('Error al añadir materia: ' + error.message);
    } else {
        subjects.push(data[0]);
        subjectInput.value = '';
        updateUI();
    }
});

// Add Level
addLevelBtn.addEventListener('click', async () => {
    const name = levelInput.value.trim();
    if (!name) return;

    const { data, error } = await supabaseClient.from('levels').insert([{ name }]).select();
    if (error) {
        alert('Error al añadir nivel: ' + error.message);
    } else {
        levels.push(data[0]);
        levelInput.value = '';
        updateUI();
    }
});

// Exam & Question Management
const examForm = document.getElementById('examForm');
const questionsContainer = document.getElementById('questionsContainer');
let currentExamId = null;

examForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const title = document.getElementById('examTitle').value;
    const subject_id = document.getElementById('examSubject').value;
    const level_id = document.getElementById('examLevel').value;
    const description = document.getElementById('examDesc').value;

    const { data, error } = await supabaseClient.from('exams').insert([{
        title, subject_id, level_id, description
    }]).select();

    if (error) {
        alert('Error al crear examen: ' + error.message);
    } else {
        currentExamId = data[0].id;
        showQuestionsEditor();
    }
});

function showQuestionsEditor() {
    examForm.parentElement.classList.add('hidden');
    questionsContainer.classList.remove('hidden');
    renderQuestionForm();
}

function renderQuestionForm() {
    uploadedFiles = { image: null, audio: null };
    questionsContainer.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm animate-fade-in">
            <h3 class="text-lg font-bold mb-4">Añadir Pregunta</h3>
            <form id="questionForm" class="space-y-6">
                <div class="space-y-2">
                    <label class="text-sm font-medium">Pregunta</label>
                    <textarea id="questionText" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600 min-h-[100px]"></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="space-y-2">
                        <label class="text-sm font-medium">Tipo de Pregunta</label>
                        <select id="questionType" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600">
                            <option value="multiple_choice">Opción Múltiple</option>
                            <option value="text">Respuesta Abierta (Texto)</option>
                        </select>
                    </div>

                    <div class="space-y-2">
                        <label class="text-sm font-medium">Multimedia (Drag & Drop)</label>
                        <div id="dropZone" class="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center cursor-pointer hover:border-primary transition-colors relative">
                            <input type="file" id="fileInput" class="hidden" accept="image/*,audio/*" multiple>
                            <div id="dropZonePrompt">
                                <i class="fas fa-cloud-upload-alt text-3xl text-gray-400 mb-2"></i>
                                <p class="text-xs text-gray-500">Suelte imágenes o audios aquí</p>
                            </div>
                            <div id="filePreview" class="hidden mt-2 flex flex-wrap gap-2 justify-center"></div>
                        </div>
                    </div>
                </div>

                <div id="optionsContainer" class="space-y-3">
                    <label class="text-sm font-medium">Opciones</label>
                    <div class="flex items-center space-x-2">
                        <input type="text" class="option-input flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="Opción 1">
                        <input type="radio" name="correctOption" value="0" checked>
                    </div>
                    <div class="flex items-center space-x-2">
                        <input type="text" class="option-input flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600" placeholder="Opción 2">
                        <input type="radio" name="correctOption" value="1">
                    </div>
                    <button type="button" id="addOptionBtn" class="text-primary text-sm font-medium hover:underline">+ Añadir otra opción</button>
                </div>

                <div id="textAnswerContainer" class="hidden space-y-2">
                    <label class="text-sm font-medium">Respuesta Correcta</label>
                    <input type="text" id="correctAnswerText" class="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600">
                </div>

                <div class="pt-4 flex justify-between">
                    <button type="button" onclick="location.reload()" class="text-gray-500 hover:text-gray-700">Finalizar</button>
                    <button type="submit" class="bg-primary text-white px-8 py-3 rounded-xl hover:bg-primary-hover font-bold shadow-lg shadow-primary/20 transition-all">Guardar Pregunta</button>
                </div>
            </form>
        </div>
    `;

    setupDragAndDrop();
    const qType = document.getElementById('questionType');
    const optCont = document.getElementById('optionsContainer');
    const textCont = document.getElementById('textAnswerContainer');
    const addOptBtn = document.getElementById('addOptionBtn');

    qType.addEventListener('change', () => {
        if (qType.value === 'multiple_choice') {
            optCont.classList.remove('hidden');
            textCont.classList.add('hidden');
        } else {
            optCont.classList.add('hidden');
            textCont.classList.remove('hidden');
        }
    });

    addOptBtn.addEventListener('click', () => {
        const div = document.createElement('div');
        div.className = 'flex items-center space-x-2';
        const index = document.querySelectorAll('.option-input').length;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'option-input flex-1 px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600';
        input.placeholder = `Opción ${index + 1}`;

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'correctOption';
        radio.value = index;

        div.appendChild(input);
        div.appendChild(radio);
        optCont.insertBefore(div, addOptBtn);
    });

    document.getElementById('questionForm').addEventListener('submit', handleQuestionSubmit);
}

function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('fileInput');
    const preview = document.getElementById('filePreview');
    const prompt = document.getElementById('dropZonePrompt');

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, () => dropZone.classList.remove('drag-over'));
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    function handleFiles(files) {
        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                uploadedFiles.image = file;
            } else if (file.type.startsWith('audio/')) {
                uploadedFiles.audio = file;
            }
        });
        updatePreview();
    }

    function updatePreview() {
        preview.innerHTML = '';
        if (uploadedFiles.image || uploadedFiles.audio) {
            prompt.classList.add('hidden');
            preview.classList.remove('hidden');

            if (uploadedFiles.image) {
                const img = document.createElement('div');
                img.className = 'text-xs bg-primary/10 text-primary px-2 py-1 rounded-md';
                img.innerHTML = `<i class="fas fa-image mr-1"></i> Imagen cargada`;
                preview.appendChild(img);
            }
            if (uploadedFiles.audio) {
                const aud = document.createElement('div');
                aud.className = 'text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-md';
                aud.innerHTML = `<i class="fas fa-volume-up mr-1"></i> Audio cargado`;
                preview.appendChild(aud);
            }
        }
    }
}

async function handleQuestionSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Subiendo archivos...';

    const questionText = document.getElementById('questionText').value;
    const questionType = document.getElementById('questionType').value;

    let imageUrl = null;
    let audioUrl = null;

    if (uploadedFiles.image) {
        imageUrl = await uploadToCloudinary(uploadedFiles.image);
    }
    if (uploadedFiles.audio) {
        audioUrl = await uploadToCloudinary(uploadedFiles.audio);
    }

    btn.textContent = 'Guardando datos...';

    const { data: qData, error: qError } = await supabaseClient.from('questions').insert([{
        exam_id: currentExamId,
        question_text: questionText,
        question_type: questionType,
        image_url: imageUrl,
        audio_url: audioUrl,
        correct_answer_text: questionType === 'text' ? document.getElementById('correctAnswerText').value : null
    }]).select();

    if (qError) {
        alert('Error: ' + qError.message);
    } else if (questionType === 'multiple_choice') {
        const options = Array.from(document.querySelectorAll('.option-input')).map((input, idx) => ({
            question_id: qData[0].id,
            option_text: input.value,
            is_correct: document.querySelector(`input[name="correctOption"]:checked`).value == idx
        }));

        await supabaseClient.from('options').insert(options);
    }

    btn.disabled = false;
    btn.textContent = 'Guardar Pregunta';
    alert('Pregunta guardada correctamente');
    renderQuestionForm(); // Reset for next question
}

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        return data.secure_url;
    } catch (err) {
        console.error('Upload error:', err);
        return null;
    }
}

// Initial Fetch
fetchData();
