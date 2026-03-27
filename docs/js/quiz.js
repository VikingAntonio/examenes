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
    } else if (q.question_type === 'sql_ordering') {
        // Clear card content for special layout
        card.innerHTML = `
            <div class="flex justify-between items-center mb-6">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">Pregunta ${currentIndex + 1} de ${questions.length} - Ordenamiento SQL</span>
                <div class="w-32 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div class="h-full bg-primary" style="width: ${((currentIndex + 1) / questions.length) * 100}%"></div>
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 h-[500px]">
                <div class="flex flex-col space-y-4">
                    <div class="flex-1 rounded-2xl overflow-hidden border dark:border-gray-700 bg-gray-100 dark:bg-gray-900 relative">
                        ${q.image_url ? `<img src="${q.image_url}" class="absolute inset-0 w-full h-full object-contain">` : '<div class="flex items-center justify-center h-full text-gray-500 italic">No hay imagen de referencia</div>'}
                    </div>
                    <p class="text-sm font-medium text-gray-600 dark:text-gray-400 leading-relaxed">${esc(q.question_text)}</p>
                </div>

                <div class="flex flex-col h-full">
                    <div class="bg-gray-100 dark:bg-gray-900/50 p-2 rounded-t-2xl border-x border-t dark:border-gray-700 flex items-center">
                        <div class="flex space-x-1.5 px-2">
                            <div class="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-amber-400"></div>
                            <div class="w-2.5 h-2.5 rounded-full bg-emerald-400"></div>
                        </div>
                        <span class="text-[10px] font-mono text-gray-400 ml-2">query.sql</span>
                    </div>
                    <div id="sqlBlocks" class="flex-1 bg-gray-900 dark:bg-black p-4 rounded-b-2xl border-x border-b border-gray-800 space-y-2 overflow-y-auto">
                        <!-- Blocks will be injected here -->
                    </div>
                    <button onclick="submitSqlOrdering()" class="mt-4 w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold shadow-xl shadow-emerald-500/20 hover:scale-105 transition-all">Verificar Código</button>
                </div>
            </div>
        `;

        const sqlBlocks = card.querySelector('#sqlBlocks');
        // Shuffle blocks
        const shuffled = [...q.options].sort(() => Math.random() - 0.5);

        shuffled.forEach(opt => {
            const block = document.createElement('div');
            block.className = 'p-3 bg-gray-800 text-blue-300 font-mono text-sm rounded-lg cursor-move border border-gray-700 hover:border-primary transition-colors select-none';
            block.dataset.id = opt.id;
            block.textContent = opt.option_text;
            sqlBlocks.appendChild(block);
        });

        new Sortable(sqlBlocks, {
            animation: 150,
            ghostClass: 'opacity-50'
        });

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

    // Feedback animation
    const card = document.querySelector('#quizContainer > div');
    if (isCorrect) {
        card.classList.add('ring-4', 'ring-emerald-500', 'transition-all');
    } else {
        card.classList.add('ring-4', 'ring-red-500', 'transition-all');
    }

    setTimeout(() => {
        next();
    }, 600);
}

function submitSqlOrdering() {
    const blocks = document.querySelectorAll('#sqlBlocks > div');
    const currentOrder = Array.from(blocks).map(b => b.dataset.id);
    const correctOrder = questions[currentIndex].options
        .sort((a, b) => (a.position || 0) - (b.position || 0))
        .map(o => o.id);

    const isCorrect = JSON.stringify(currentOrder) === JSON.stringify(correctOrder);

    const container = document.getElementById('sqlBlocks');
    if (isCorrect) {
        container.classList.add('ring-2', 'ring-emerald-500');
        setTimeout(() => {
            userAnswers.push({ questionId: questions[currentIndex].id, isCorrect: true });
            next();
        }, 800);
    } else {
        container.classList.add('ring-2', 'ring-red-500');
        container.classList.add('animate-shake');
        setTimeout(() => {
            container.classList.remove('ring-2', 'ring-red-500', 'animate-shake');
        }, 800);
        // We don't push and next here, let user try again or we can fail it
        // User request implied immediate feedback, let's just fail if wrong for now to move on
        // but typically ordering allows retries until submit.
        // For a test, we fail it and move on.
        userAnswers.push({ questionId: questions[currentIndex].id, isCorrect: false });
        setTimeout(() => {
            next();
        }, 1000);
    }
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
