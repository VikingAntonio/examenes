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
    questionsContainer.innerHTML = `
        <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm animate-fade-in">
            <h3 class="text-lg font-bold mb-4">Añadir Pregunta</h3>
            <form id="questionForm" class="space-y-4">
                <div class="space-y-2">
                    <label class="text-sm font-medium">Pregunta</label>
                    <textarea id="questionText" required class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600"></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="space-y-2">
                        <label class="text-sm font-medium">Tipo de Pregunta</label>
                        <select id="questionType" class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none dark:bg-gray-700 dark:border-gray-600">
                            <option value="multiple_choice">Opción Múltiple</option>
                            <option value="text">Respuesta Abierta (Texto)</option>
                        </select>
                    </div>
                    <div class="space-y-2">
                        <label class="text-sm font-medium">Imagen (Opcional)</label>
                        <input type="file" id="questionImage" accept="image/*" class="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-primary-hover transition-all">
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
                    <button type="submit" class="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary-hover font-bold">Guardar Pregunta</button>
                </div>
            </form>
        </div>
        <div id="savedQuestionsList" class="space-y-4 mt-8"></div>
    `;

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

async function handleQuestionSubmit(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const questionText = document.getElementById('questionText').value;
    const questionType = document.getElementById('questionType').value;
    const imageFile = document.getElementById('questionImage').files[0];
    let imageUrl = null;

    if (imageFile) {
        imageUrl = await uploadImage(imageFile);
    }

    const { data: qData, error: qError } = await supabaseClient.from('questions').insert([{
        exam_id: currentExamId,
        question_text: questionText,
        question_type: questionType,
        image_url: imageUrl,
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

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
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
