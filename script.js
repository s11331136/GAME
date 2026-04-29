// --- 全域變數 ---
let currentGame = "", gameActive = false;
let mainLoop; 
let hasWon2048 = false;

// --- 側邊欄切換 ---
function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('collapsed');
}

// --- 遊戲切換系統 ---
function switchGame(game) {
    document.getElementById('welcome-msg').style.display = 'none';
    document.getElementById('game-2048').style.display = 'none';
    document.getElementById('game-snake').style.display = 'none';
    document.getElementById('game-magnet').style.display = 'none';
    document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
    document.getElementById('btn-' + game).classList.add('active');
    
    if(window.snakeInterval) clearInterval(window.snakeInterval);
    cancelAnimationFrame(mainLoop);
    closeModal();

    if(game === '2048') {
        currentGame = "2048"; document.getElementById('current-title').innerText = "2048";
        document.getElementById('game-2048').style.display = 'block'; 
        hasWon2048 = false; init2048();
    } else if(game === 'snake') {
        currentGame = "snake"; document.getElementById('current-title').innerText = "貪食蛇";
        document.getElementById('game-snake').style.display = 'flex'; initSnake();
    } else if(game === 'magnet') {
        currentGame = "magnet"; document.getElementById('current-title').innerText = "極地磁鐵";
        document.getElementById('game-magnet').style.display = 'flex'; initMagnet();
    }
}

// --- 彈窗系統 ---
function openModal(title, msg, actions = []) {
    document.getElementById('modal-title').innerText = title;
    document.getElementById('modal-msg').innerText = msg;
    const container = document.getElementById('modal-actions');
    container.innerHTML = '';
    if (actions.length === 0) actions = [{ text: "再次挑戰", callback: restartCurrentGame, class: "" }];
    actions.forEach(act => {
        const btn = document.createElement('button');
        btn.className = 'modal-btn ' + (act.class || '');
        btn.innerText = act.text;
        btn.onclick = act.callback;
        container.appendChild(btn);
    });
    document.getElementById('custom-modal').style.display = 'flex';
}

function closeModal() { document.getElementById('custom-modal').style.display = 'none'; }

function restartCurrentGame() {
    closeModal();
    if(currentGame === '2048') { hasWon2048 = false; init2048(); }
    else if(currentGame === 'snake') initSnake();
    else if(currentGame === 'magnet') initMagnet();
}

// --- 2048 邏輯 ---
let b2048 = [], s2048 = 0;
function init2048() {
    b2048 = Array(16).fill(0); s2048 = 0; gameActive = true;
    document.getElementById('best').innerText = localStorage.getItem('2048_best') || 0;
    const grid = document.getElementById('grid-base'); grid.innerHTML = '';
    for (let i = 0; i < 16; i++) {
        let c = document.createElement('div'); c.className = 'cell';
        c.style.left = (i % 4) * 78 + 'px'; c.style.top = Math.floor(i / 4) * 78 + 'px';
        grid.appendChild(c);
    }
    spawn2048(); spawn2048();
}
function spawn2048() {
    let empty = b2048.map((v, i) => v === 0 ? i : null).filter(v => v !== null);
    if(empty.length) b2048[empty[Math.floor(Math.random() * empty.length)]] = 2;
    render2048();
}
function render2048() {
    const grid = document.getElementById('grid-base');
    grid.querySelectorAll('.tile').forEach(t => t.remove());
    b2048.forEach((val, i) => {
        if(val > 0) {
            let t = document.createElement('div');
            t.className = `tile n${val > 2048 ? 2048 : val}`;
            t.innerText = val;
            t.style.left = (i % 4) * 78 + 'px'; t.style.top = Math.floor(i / 4) * 78 + 'px';
            grid.appendChild(t);
        }
    });
    document.getElementById('score').innerText = s2048;
    let best = localStorage.getItem('2048_best') || 0;
    if(s2048 > parseInt(best)) { localStorage.setItem('2048_best', s2048); document.getElementById('best').innerText = s2048; }
    if (!hasWon2048 && b2048.includes(2048)) {
        hasWon2048 = true;
        openModal("🏆 傳奇誕生！", "你成功合成了 2048 方塊！", [
            { text: "繼續挑戰", callback: closeModal, class: "secondary" },
            { text: "重新開始", callback: restartCurrentGame, class: "" }
        ]);
    } else { check2048GameOver(); }
}
function move2048(dir) {
    if(!gameActive) return;
    let old = [...b2048];
    for (let i = 0; i < 4; i++) {
        let row = [], indices = [];
        for (let j = 0; j < 4; j++) {
            let idx = (dir==='left')? i*4+j : (dir==='right')? i*4+(3-j) : (dir==='up')? j*4+i : (3-j)*4+i;
            indices.push(idx); row.push(b2048[idx]);
        }
        let newRow = slideRow(row);
        indices.forEach((idx, j) => b2048[idx] = newRow[j]);
    }
    if (JSON.stringify(old) !== JSON.stringify(b2048)) { spawn2048(); }
}
function slideRow(row) {
    let arr = row.filter(v => v !== 0);
    for (let i = 0; i < arr.length - 1; i++) {
        if (arr[i] === arr[i+1]) { arr[i] *= 2; s2048 += arr[i]; arr.splice(i+1, 1); }
    }
    while (arr.length < 4) arr.push(0); return arr;
}
function check2048GameOver() {
    if (b2048.includes(0)) return;
    for (let i = 0; i < 16; i++) {
        if (i % 4 < 3 && b2048[i] === b2048[i+1]) return;
        if (i < 12 && b2048[i] === b2048[i+4]) return;
    }
    gameActive = false; openModal("遊戲結束", "盤面已滿！得分：" + s2048);
}

// --- 貪食蛇 ---
let snake, food, dx, dy, sSnake;
function initSnake() {
    let canvas = document.getElementById('snakeCanvas'); 
    let ctx = canvas.getContext('2d');
    snake = [{x: 200, y: 200}, {x: 190, y: 200}]; dx = 10; dy = 0; sSnake = 0;
    document.getElementById('best').innerText = localStorage.getItem('snake_best') || 0;
    document.getElementById('score').innerText = 0; createFood();
    window.snakeInterval = setInterval(drawSnake, 100);
}
function drawSnake() {
    let canvas = document.getElementById('snakeCanvas');
    let ctx = canvas.getContext('2d');
    const head = {x: snake[0].x + dx, y: snake[0].y + dy};
    if (head.x < 0 || head.x >= 400 || head.y < 0 || head.y >= 400 || snake.some(p => p.x === head.x && p.y === head.y)) {
        clearInterval(window.snakeInterval); openModal("遊戲結束", "蛇撞到了！得分：" + sSnake); return;
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        sSnake += 1; document.getElementById('score').innerText = sSnake;
        let best = localStorage.getItem('snake_best') || 0;
        if(sSnake > parseInt(best)) { localStorage.setItem('snake_best', sSnake); document.getElementById('best').innerText = sSnake; }
        createFood();
    } else { snake.pop(); }
    ctx.fillStyle = "black"; ctx.fillRect(0,0,400,400);
    ctx.fillStyle = "#ff5252"; ctx.fillRect(food.x, food.y, 10, 10);
    ctx.fillStyle = "#8ab4f8"; snake.forEach(p => ctx.fillRect(p.x, p.y, 10, 10));
}
function createFood() { food = { x: Math.floor(Math.random()*39)*10, y: Math.floor(Math.random()*39)*10 }; }

// --- 極地磁鐵 ---
let mMagnet, mObstacles, mGravity, mDirection, mScore;
function initMagnet() {
    mMagnet = { x: 50, y: 250, radius: 15, velocity: 0 };
    mGravity = 0.22; mDirection = 1; mObstacles = []; mScore = 0; gameActive = true;
    document.getElementById('best').innerText = localStorage.getItem('magnet_best') || 0;
    document.getElementById('score').innerText = 0;
    magnetLoop();
}
function magnetLoop() {
    if(currentGame !== 'magnet') return;
    let canvas = document.getElementById('magnetCanvas');
    let ctx = canvas.getContext('2d');
    mMagnet.velocity += mGravity * mDirection;
    mMagnet.velocity *= 0.98; mMagnet.y += mMagnet.velocity;
    if (mMagnet.y < 0 || mMagnet.y > canvas.height) {
        gameActive = false; openModal("任務失敗", "掉出磁場！得分：" + mScore); return;
    }
    if (mObstacles.length === 0 || mObstacles[mObstacles.length-1].x < canvas.width - 220) {
        let gap = 170;
        let rY = Math.random() * (canvas.height - gap - 100) + 50;
        mObstacles.push({ x: canvas.width, top: rY, bottom: rY + gap, passed: false });
    }
    ctx.fillStyle = "black"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00f2ff";
    mObstacles.forEach((obs, i) => {
        obs.x -= 3.5;
        ctx.fillRect(obs.x, 0, 50, obs.top);
        ctx.fillRect(obs.x, obs.bottom, 50, canvas.height);
        if (mMagnet.x + 10 > obs.x && mMagnet.x - 10 < obs.x + 50) {
            if (mMagnet.y - 10 < obs.top || mMagnet.y + 10 > obs.bottom) {
                gameActive = false; openModal("任務失敗", "撞擊障礙！得分：" + mScore); return;
            }
        }
        if (!obs.passed && obs.x < mMagnet.x) {
            mScore++; obs.passed = true;
            document.getElementById('score').innerText = mScore;
            let best = localStorage.getItem('magnet_best') || 0;
            if(mScore > parseInt(best)) { localStorage.setItem('magnet_best', mScore); document.getElementById('best').innerText = mScore; }
        }
        if (obs.x < -60) mObstacles.splice(i, 1);
    });
    ctx.beginPath(); ctx.arc(mMagnet.x, mMagnet.y, mMagnet.radius, 0, Math.PI*2);
    ctx.fillStyle = mDirection > 0 ? "#ff4d4d" : "#4d79ff"; ctx.fill();
    ctx.strokeStyle = "white"; ctx.lineWidth = 2; ctx.stroke();
    mainLoop = requestAnimationFrame(magnetLoop);
}

// --- 事件監聽 ---
window.addEventListener('keydown', e => {
    const m = {'ArrowLeft':'left','KeyA':'left','ArrowRight':'right','KeyD':'right','ArrowUp':'up','KeyW':'up','ArrowDown':'down','KeyS':'down','Space':'space'};
    if(m[e.code]) {
        if(currentGame === "2048") move2048(m[e.code]);
        else if(currentGame === "snake") {
            const k = m[e.code];
            if(k==='up' && dy===0){dx=0;dy=-10;} else if(k==='down' && dy===0){dx=0;dy=10;}
            else if(k==='left' && dx===0){dx=-10;dy=0;} else if(k==='right' && dx===0){dx=10;dy=0;}
        }
        else if(currentGame === "magnet" && (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown')) {
            mDirection *= -1;
        }
    }
});

document.getElementById('magnetCanvas').addEventListener('mousedown', () => {
    if(currentGame === "magnet") mDirection *= -1;
});
