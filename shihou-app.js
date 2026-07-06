let emptyCellsSequence = []; 
let currentTargetIndex = -1; 
let isInputLocked = false; 

window.onload = startGame;

function startGame() {
    emptyCellsSequence = [];
    currentTargetIndex = 0;
    isInputLocked = false;
    
    // ★表を毎回ランダムにシャッフルする
    let shuffledData = [...tableData].sort(() => 0.5 - Math.random());
    
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = "";

    shuffledData.forEach((row, rIdx) => {
        let tr = document.createElement('tr');
        
        // --- 刺法名セル（必ず穴埋め） ---
        let shihouTd = document.createElement('td');
        shihouTd.className = 'empty-target col-shihou';
        shihouTd.innerHTML = `<span class="blank">[　]</span>`;
        shihouTd.addEventListener('click', () => {
            if (!isInputLocked) activateCellByElement(shihouTd);
        });
        tr.appendChild(shihouTd);
        
        // 進行シーケンスに追加
        emptyCellsSequence.push({ 
            type: 'shihou', shihou: row.shihou, furigana: row.furigana, element: shihouTd 
        });

        // --- 内容セル ---
        let contentTd = document.createElement('td');
        if (row.blanks.length > 0) {
            // 穴埋めがある場合
            contentTd.className = 'empty-target col-content';
            contentTd.innerHTML = getContentHtml(row.text, row.blanks, [], false);
            contentTd.addEventListener('click', () => {
                if (!isInputLocked) activateCellByElement(contentTd);
            });
            emptyCellsSequence.push({ 
                type: 'content', text: row.text, blanks: row.blanks, answered: [], element: contentTd 
            });
        } else {
            // 穴埋めがない場合はただのテキスト
            contentTd.className = 'col-content';
            contentTd.innerHTML = row.text;
        }
        tr.appendChild(contentTd);
        tbody.appendChild(tr);
    });

    document.getElementById('quiz-container').classList.add('hidden');
    
    if(emptyCellsSequence.length > 0) {
        setTimeout(() => moveToNextTarget(0), 500);
    }
}

// 内容のHTMLを生成する関数（【BLANK】を置き換える）
function getContentHtml(baseText, allBlanks, answeredList, isError) {
    let html = baseText;
    
    // 正解済みのワードを黒字で反映
    answeredList.forEach(ans => {
        html = html.replace("【BLANK】", `【<span class="correct-text">${ans}</span>】`);
    });
    
    if (isError) {
        // 間違えた時は残りを赤字で表示
        let remaining = allBlanks.filter(b => !answeredList.includes(b));
        remaining.forEach(ans => {
            html = html.replace("【BLANK】", `【<span class="wrong-text">${ans}</span>】`);
        });
    } else {
        // 通常時は [　] で表示
        let remainingCount = allBlanks.length - answeredList.length;
        for (let i = 0; i < remainingCount; i++) {
            html = html.replace("【BLANK】", `【<span class="blank">[　]</span>】`);
        }
    }
    return html;
}

function activateCellByElement(tdElement) {
    const targetIdx = emptyCellsSequence.findIndex(item => item.element === tdElement);
    if (targetIdx !== -1) moveToNextTarget(targetIdx);
}

function moveToNextTarget(targetIdx) {
    if (targetIdx >= emptyCellsSequence.length) targetIdx = 0;
    
    document.querySelectorAll('.empty-target').forEach(el => el.classList.remove('active-target'));
    
    currentTargetIndex = targetIdx;
    const target = emptyCellsSequence[currentTargetIndex];
    target.element.classList.add('active-target');
    
    let infoType = target.type === 'shihou' ? "【刺法名】を回答" : "内容の【空欄】を回答";
    document.getElementById('current-target-info').textContent = infoType;

    target.element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    
    generateQuiz();
}

function generateQuiz() {
    const target = emptyCellsSequence[currentTargetIndex];
    document.getElementById('quiz-container').classList.remove('hidden');
    
    let choices = [];

    if (target.type === 'shihou') {
        let wrongChoices = allShihou.filter(s => s !== target.shihou);
        wrongChoices = wrongChoices.sort(() => 0.5 - Math.random()).slice(0, 5);
        choices = [target.shihou, ...wrongChoices];
    } else {
        let remainingAnswers = target.blanks.filter(b => !target.answered.includes(b));
        let wrongChoices = allBlanks.filter(b => !target.blanks.includes(b));
        wrongChoices = wrongChoices.sort(() => 0.5 - Math.random()).slice(0, 6 - remainingAnswers.length);
        choices = [...remainingAnswers, ...wrongChoices];
    }

    choices = choices.sort(() => 0.5 - Math.random()); 

    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach((btn, idx) => {
        btn.textContent = choices[idx];
        btn.disabled = false; 
    });
    
    isInputLocked = false;
}

function checkAnswer(btnIndex) {
    if (isInputLocked) return; 
    isInputLocked = true; 

    const buttons = document.querySelectorAll('.choice-btn');
    buttons.forEach(btn => btn.disabled = true); 

    const selectedAnswer = buttons[btnIndex].textContent;
    const target = emptyCellsSequence[currentTargetIndex];
    const el = target.element;

    if (target.type === 'shihou') {
        if (selectedAnswer === target.shihou) {
            // 正解：ふりがな付きで表示
            el.innerHTML = `<span class="correct-text">${target.shihou}</span><br><span class="furigana">(${target.furigana})</span>`;
            el.classList.remove('active-target');
            el.classList.add('correct');
            
            proceedToNext();
        } else {
            // 不正解：赤字でふりがな付き表示
            el.innerHTML = `<span class="wrong-text">${target.shihou}</span><br><span class="furigana">(${target.furigana})</span>`;
            el.classList.remove('active-target');
            el.classList.add('wrong-cell');
            
            proceedToNext();
        }
    } else {
        // 内容の【】の穴埋め判定 (偶刺の順不同にも対応)
        if (target.blanks.includes(selectedAnswer) && !target.answered.includes(selectedAnswer)) {
            target.answered.push(selectedAnswer);
            el.innerHTML = getContentHtml(target.text, target.blanks, target.answered, false);

            if (target.answered.length === target.blanks.length) {
                el.classList.remove('active-target');
                el.classList.add('correct');
                proceedToNext();
            } else {
                // 偶刺など、まだ埋める箇所が残っている場合は継続
                setTimeout(() => generateQuiz(), 300);
            }
        } else {
            // 間違い：残りを赤字で強制表示
            el.innerHTML = getContentHtml(target.text, target.blanks, target.answered, true);
            el.classList.remove('active-target');
            el.classList.add('wrong-cell');
            proceedToNext();
        }
    }
}

function proceedToNext() {
    emptyCellsSequence.splice(currentTargetIndex, 1);
    if (emptyCellsSequence.length > 0) {
        setTimeout(() => moveToNextTarget(currentTargetIndex), 400);
    } else {
        document.getElementById('quiz-container').classList.add('hidden');
        document.getElementById('complete-message').classList.remove('hidden');
        document.getElementById('current-target-info').textContent = "コンプリート！";
        isInputLocked = false;
    }
}
