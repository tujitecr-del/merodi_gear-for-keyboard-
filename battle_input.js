// battle_input.js
// 入力状態を管理するグローバル変数（スマホ・マウス・ゲームパッド・キーボード共通）
window.touches = {
    up: false, left: false, right: false, down: false,
    en: false, barrier: false, near: false, far: false
};

// --- 1. 画面上のボタン（スマホ・マウス用）の処理 ---
const buttons = [
    { id: 'btn-up', key: 'up' },
    { id: 'btn-left', key: 'left' },
    { id: 'btn-right', key: 'right' },
    { id: 'btn-down', key: 'down' },
    { id: 'btn-en', key: 'en' },
    { id: 'btn-barrier', key: 'barrier' },
    { id: 'btn-near', key: 'near' },
    { id: 'btn-far', key: 'far' }
];

buttons.forEach(btn => {
    const el = document.getElementById(btn.id);
    if (!el) return;

    const press = (e) => {
        e.preventDefault();
        window.touches[btn.key] = true;
    };
    
    const release = (e) => {
        e.preventDefault();
        window.touches[btn.key] = false;
    };

    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('touchcancel', release, { passive: false });

    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
});

// --- 2. ゲームパッドの入力を監視 ---
function updateGamepadInput() {
    const gamepads = navigator.getGamepads();
    const gp = gamepads[0];

    if (gp) {
        window.touches.left = (gp.axes[0] < -0.2 || gp.buttons[14]?.pressed);
        window.touches.right = (gp.axes[0] > 0.2 || gp.buttons[15]?.pressed);
        
        window.touches.up = (
            gp.axes[1] < -0.5 ||
            gp.buttons[12]?.pressed
        );

        window.touches.far = gp.buttons[0]?.pressed; 
        window.touches.en = gp.buttons[3]?.pressed;      
        window.touches.near = gp.buttons[1]?.pressed;    
        window.touches.barrier = gp.buttons[2]?.pressed; 
    }

    requestAnimationFrame(updateGamepadInput);
}

window.addEventListener("gamepadconnected", (e) => {
    console.log("コントローラー接続完了: %s", e.gamepad.id);
    updateGamepadInput();
});


// --- 3. PCキーボード操作の処理（追加部分） ---
// キーと window.touches のキーの対応表
const keyMap = {
    'KeyA': 'left',     // Aキー (←代わり)
    'KeyS': 'right',    // Sキー (→代わり)
    'KeyW': 'up',       // Wキー (↑代わり)
    'KeyZ': 'down',     // Zキー (↓代わり)
    'KeyI': 'en',       // iキー (EN)
    'KeyO': 'barrier',  // oキー (バリア)
    'KeyK': 'near',     // kキー (近接)
    'KeyL': 'far',      // lキー (遠距離)
    // 矢印キーでも操作できるように親切設計にしています
    'ArrowLeft': 'left',
    'ArrowRight': 'right',
    'ArrowUp': 'up',
    'ArrowDown': 'down'
};

window.addEventListener('keydown', (e) => {
    // インプット要素（テキスト入力など）にフォーカスがあるときは誤作動を防ぐため無効化
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    if (keyMap[e.code]) {
        // キー長押しによる連打イベントの暴発を防ぐ
        if (!window.touches[keyMap[e.code]]) {
            window.touches[keyMap[e.code]] = true;
        }
        // ゲーム画面がスクロールしてしまうのを防ぐ
        if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code) || e.code.startsWith('Key')) {
            e.preventDefault();
        }
    }
});

window.addEventListener('keyup', (e) => {
    if (keyMap[e.code]) {
        window.touches[keyMap[e.code]] = false;
    }
});