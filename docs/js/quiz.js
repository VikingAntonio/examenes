const { supabaseClient } = window;

let exam = null;
let questions = [];
let currentIndex = 0;
let userAnswers = [];

function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function init() {
    const params = new URLSearchParams(window.location.search);
    const examId = params.get('id');

    if (!examId) {
        window.location.href = 'examenes.html';
        return;
    }

    const { data: eData } = await supabaseClient.from('exams').select('*, subjects(name), levels(name)').eq('id', examId).single();
    const { data: qData } = await supabaseClient.from('questions').select('*, options(*)').eq('exam_id', examId).order('created_at');

    if (!eData) {
        alert('Examen no encontrado');
        window.location.href = 'examenes.html';
        return;
    }

    exam = eData;
    questions = qData || [];

    document.getElementById('examTitle').textContent = exam.title;

    if (questions.length === 0) {
        document.getElementById('quizContainer').innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-12 rounded-3xl shadow-sm border dark:border-gray-700 text-center animate-fade-in">
                <i class="fas fa-exclamation-circle fa-3x text-gray-300 mb-6"></i>
                <h2 class="text-2xl font-bold mb-2">Este examen aún no tiene preguntas.</h2>
                <p class="text-gray-500 mb-8">Vuelve más tarde o contacta al administrador.</p>
                <a href="examenes.html" class="text-primary font-bold hover:underline">Volver al catálogo</a>
            </div>
        `;
        return;
    }

    renderQuestion();
}

function renderQuestion() {
    const q = questions[currentIndex];
    const container = document.getElementById('quizContainer');
    container.innerHTML = '';

    const card = document.createElement('div');
    card.className = 'bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border dark:border-gray-700 animate-fade-in';

    // Progress
    card.innerHTML = `
        <div class="flex justify-between items-center mb-8">
            <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Pregunta ${currentIndex + 1} de ${questions.length}</span>
            <div class="w-32 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div class="h-full bg-primary" style="width: ${((currentIndex + 1) / questions.length) * 100}%"></div>
            </div>
        </div>
    `;

    // Multimedia
    if (q.audio_url) {
        card.innerHTML += `
            <div class="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex flex-col items-center">
                <p class="text-xs font-bold text-primary mb-3 uppercase tracking-wider"><i class="fas fa-headphones mr-2"></i> Ejercicio de Escucha</p>
                <audio controls src="${q.audio_url}" class="w-full"></audio>
            </div>
        `;
    }

    if (q.image_url) {
        card.innerHTML += `
            <div class="mb-6 rounded-2xl overflow-hidden shadow-sm border dark:border-gray-700">
                <img src="${q.image_url}" class="w-full h-auto max-h-64 object-cover">
            </div>
        `;
    }

    // Question text
    card.innerHTML += `<h2 class="text-2xl font-bold mb-8">${esc(q.question_text)}</h2>`;

    // Answers
    if (q.question_type === 'multiple_choice') {
        const optionsDiv = document.createElement('div');
        optionsDiv.className = 'space-y-4 mb-8';
        q.options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'w-full p-4 text-left rounded-2xl border-2 dark:border-gray-700 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-all group flex items-center';
            btn.innerHTML = `
                <div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center mr-4 group-hover:bg-primary group-hover:text-white transition-colors">
                    <span class="font-bold">${String.fromCharCode(65 + idx)}</span>
                </div>
                <span class="font-medium">${esc(opt.option_text)}</span>
            `;
            btn.onclick = () => selectAnswer(opt.id, opt.is_correct);
            optionsDiv.appendChild(btn);
        });
        card.appendChild(optionsDiv);
    } else {
        const inputDiv = document.createElement('div');
        inputDiv.className = 'space-y-4 mb-8';
        inputDiv.innerHTML = `
            <input type="text" id="textAnswer" placeholder="Escribe tu respuesta aquí..." class="w-full px-6 py-4 rounded-2xl border-2 dark:border-gray-700 dark:bg-gray-700 outline-none focus:border-primary transition-all">
            <button onclick="submitTextAnswer()" class="w-full bg-primary text-white py-4 rounded-2xl font-bold shadow-xl shadow-primary/30 hover:scale-105 transition-all mt-4">Siguiente</button>
        `;
        card.appendChild(inputDiv);
    }

    container.appendChild(card);
}

function selectAnswer(optionId, isCorrect) {
    userAnswers.push({ questionId: questions[currentIndex].id, isCorrect });
    next();
}

function submitTextAnswer() {
    const input = document.getElementById('textAnswer');
    const answer = input.value.trim().toLowerCase();
    const correct = questions[currentIndex].correct_answer_text.trim().toLowerCase();
    userAnswers.push({ questionId: questions[currentIndex].id, isCorrect: answer === correct });
    next();
}

function next() {
    currentIndex++;
    if (currentIndex < questions.length) {
        renderQuestion();
    } else {
        finish();
    }
}

function finish() {
    const correctCount = userAnswers.filter(a => a.isCorrect).length;
    document.getElementById('quizContainer').classList.add('hidden');
    document.getElementById('resultContainer').classList.remove('hidden');
    document.getElementById('scoreDisplay').textContent = `${correctCount}/${questions.length}`;
}

init();
