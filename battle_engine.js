//---Battle_engine.js

// 全体の状態管理

window.player = {x: 100, y: 350, en: 500, actionCount: 0,
    // ...既存のプロパティ...
    state: "IDLE",     // IDLE, SWORD_ATTACK など
    armAngle: 0,       // 腕の角度（0 = 上、180 = 下）
   shakeCounter: 0, 
        // ...
};

window.player = {x: 300, y: 350, en: 500, actionCount: 0,
    // ...既存のプロパティ...
    state: "IDLE",     // IDLE, SWORD_ATTACK など
    armAngle: 0,       // 腕の角度（0 = 上、180 = 下）
   shakeCounter: 0,
    // ...
};

window.bullet = { active: false, x: 0, y: 0, vx: 0, vy: 0, range: 0, dist: 0 };

//---speed（弾のスピード）--range（射程距離）--enCost（消費EN）--color（弾の色）
window.WEAPON_CONFIG = {
    "マシンガン": { 
        speed: 12, range: 250, atkMult: 0.2, enCost: 5, color: "gray"
    },
    "ビームガン": { 
        speed: 8, range: 350, atkMult: 0.6, enCost: 15, color: "cyan"
    },
    "ミサイル": { 
        speed: 5, range: 300, atkMult: 1.0, enCost: 25, color: "orange"
    }
};

window.checkSwordHit = function() {
    console.log("checkSwordHit called!"); // デバッグ用ログを追加
    if (typeof window.checkBeamSwordHit === 'function') {
        window.checkBeamSwordHit(window.player, window.enemy);
    } else {
        console.error("checkBeamSwordHit is not defined!");
    }
};

// ゲーム開始時に呼ぶタイマー設定
window.startTimer = function(minutes) {
    let seconds = minutes * 60;
    const timerElement = document.getElementById('timer-display');
    
    const countdown = setInterval(() => {
        seconds--;
        
        let m = Math.floor(seconds / 60);
        let s = seconds % 60;
        
        // 00:00 の形式に整える
        if (timerElement) {
            timerElement.innerText = `TIME: ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        }
        
        // 毎秒、残り時間（分単位に換算したものなど）を BattleResultManager に渡してチェックさせることも可能です
        // （すでに gameLoop 側で毎フレームチェックしている場合は、0になった時だけでもOKです）

        if (seconds <= 0) {
            clearInterval(countdown);
            
            // ★ここでタイムアップ時の勝敗判定を呼び出す！
            if (typeof BattleResultManager !== 'undefined') {
                // プレイヤーと敵のオブジェクト、および残り時間 0 を渡す
                BattleResultManager.checkGameEnd(window.player, window.enemy, 0);
            } else {
                // 万が一 BattleResultManager がない場合のフォールバック
                alert("TIME UP!");
            }
        }
    }, 1000);
};


// ターン管理
// ターン管理
window.TurnManager = {
    currentCount: 0,
    update() {
        this.currentCount = (this.currentCount + 1) % 500; // 500カウント周期
        if (window.player.actionCount > 0) window.player.actionCount--;
        if (window.enemy.actionCount > 0) window.enemy.actionCount--;
    }
};

window.GameState = {
    flags: { 
        isLoopRunning: false,
        isActionLocked: true // ★追加：最初は行動不能（ロック中）にする
    }
};

window.BattleManager = {
    init: function() {
        console.log("BattleManager 初期化");
    }
};

//---------------------------------------------------------------------

window.gameLoop = function() {
    if (!window.GameState.flags.isLoopRunning) return;

    // ★修正：まだゲームが終了していない場合のみ、勝敗チェックを1回だけ通す
    if (typeof BattleResultManager !== 'undefined' && !BattleResultManager.isFinished) {
        if (window.player && window.enemy) {
            BattleResultManager.checkGameEnd(window.player, window.enemy, window.currentRemainingMinutes);
        }
    }

    // --- 以下、通常の処理 ---
    if (!window.GameState.flags.isActionLocked) {
        window.UpdateManager.updatePhysics();
        TurnManager.update();
        if (window.enemy && window.EnemyAI && typeof window.EnemyAI.update === 'function') {
            window.EnemyAI.update(window.enemy, window.player);
        }
    }

    if (typeof window.updateShake === 'function') {
        window.updateShake(window.enemy); 
    }
    if (typeof window.updatePlayerShake === 'function') {
        window.updatePlayerShake(window.player); 
    }

    Renderer.updateAvatarPositions();
    Renderer.updateHpBar(window.player.hp, window.player.stats.maxHp);
    Renderer.updateEnBar(window.player.en);
    if (typeof Renderer.draw === 'function') {
        Renderer.draw();
    }

    requestAnimationFrame(window.gameLoop);
};

//---------------------------------------------------------------------

// --- 画像の事前ロード ---
function preloadImages() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        let targetCount = 0;

        const checkComplete = () => {
            loadedCount++;
            if (loadedCount >= targetCount) {
                resolve();
            }
        };

        const pIcon = window.player?.stats?.avatarIcon;
        const eIcon = window.enemy?.stats?.avatarIcon;

        if (pIcon) {
            targetCount++;
            const pImg = new Image();
            pImg.onload = checkComplete;
            pImg.onerror = checkComplete;
            pImg.src = pIcon;
            window.player.imageObject = pImg;
        }

        if (eIcon) {
            targetCount++;
            const eImg = new Image();
            eImg.onload = checkComplete;
            eImg.onerror = checkComplete;
            eImg.src = eIcon;
            window.enemy.imageObject = eImg;
        }

        if (targetCount === 0) {
            resolve();
        }
    });
}

// --- カウントダウン関数 ---
window.runBattleCountdown = async function() {
    const counts = [
        { num: 3, se: 'count3' },
        { num: 2, se: 'count2' },
        { num: 1, se: 'count1' },
        { num: 'FIGHT!', se: 'count0' }
    ];

    // カウントダウン中は行動をロック
    window.GameState.flags.isActionLocked = true;

    for (const item of counts) {
        // 表示の更新
        const countDisplay = document.getElementById('battle-countdown');
        if (countDisplay) {
            countDisplay.innerText = item.num;
            countDisplay.style.display = 'flex';
        }

        // 音声再生
        if (typeof AudioManager !== 'undefined' && AudioManager.play) {
            AudioManager.play(item.se);
        }

        // 1秒間待機（この間も裏で通常の gameLoop が回り続け、機体を描画し続けます）
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // カウントダウン終了後に非表示化 ＆ 行動ロック解除！
    const countDisplay = document.getElementById('battle-countdown');
    if (countDisplay) {
        countDisplay.style.display = 'none';
    }

    window.GameState.flags.isActionLocked = false; // ★ここで機体が動けるようになる！
};

// --- メイン機能 ---
window.startEverything = async function() {
    if (window.isBattleStarted) return;
    window.isBattleStarted = true;

    // 1. レンダラー初期化
    Renderer.init('canvas');

    // 2. データの読み込み
    const rawData = localStorage.getItem('battleData');
    if (rawData) {
        const battleData = JSON.parse(rawData);
        
        window.player.stats = { 
            ...battleData.player.robot, 
            avatarIcon: battleData.player.avatar?.icon 
        };
        window.player.maxHp = battleData.player.robot.maxHp || battleData.player.robot.hp || 500;
        window.player.hp = window.player.maxHp;

        window.enemy.stats = {
            ...battleData.enemy.robot,
            avatarIcon: battleData.enemy.avatar?.icon 
        };
        
        window.enemy.maxHp = battleData.enemy.robot.maxHp || battleData.enemy.robot.hp || 500;
        window.enemy.hp = window.enemy.maxHp;
        window.enemy.def = battleData.enemy.robot.def || 20;

        window.enemyStats = battleData.enemy.robot; 
    }

    // 3. 画像の読み込み完了を待つ
    await preloadImages();

// 4. オーディオ初期化とBGM再生
    if (typeof Playback !== 'undefined') {
        Playback.init();
        if (Playback.audioCtx.state === 'suspended') {
            await Playback.audioCtx.resume();
        }
        
        // ローカルストレージ等から battleData を安全に取得
        const battleData = JSON.parse(localStorage.getItem('battleData')) || {};
        const enemyBgm = window.enemyStats?.bgmData || battleData.enemy?.robot?.bgmData;

        if (enemyBgm) {
            // 曲データに保存されているテンポがあればそれを適用、なければ 0.2
            const tempo = parseFloat(enemyBgm.tempo) || 0.2;
            Playback.play(enemyBgm, tempo);
        } else {
            // 曲データがない場合のフォールバック（デフォルト曲など）
            console.log("敵のBGMデータが見つからないため、デフォルトで再生します");
        }
    }

    // ★5. カウントダウンの前に「ゲームループ自体」をスタートさせてしまう！
    // （ただし isActionLocked = true なので移動や攻撃は起きず、機体の描画だけが綺麗に行われます）
    window.GameState.flags.isLoopRunning = true;
    window.gameLoop();

    // 6. カウントダウンを実行（3, 2, 1, FIGHT!）
    if (typeof window.runBattleCountdown === 'function') {
        await window.runBattleCountdown();
    }

    // 7. タイマー開始
    window.startTimer(5); 
   if (remainingMinutes <= 0) { // または残りの秒数が0になったとき
    // player と enemy のオブジェクトを渡して判定を走らせる
    BattleResultManager.checkGameEnd(player, enemy, 0);
   }
};

//---------------------------------------------------------------------

window.keys = {
    ArrowRight: false,
    ArrowLeft: false,
    ArrowUp: false 
};

window.addEventListener('keydown', (e) => { if(window.keys.hasOwnProperty(e.code)) window.keys[e.code] = true; });
window.addEventListener('keyup', (e) => { if(window.keys.hasOwnProperty(e.code)) window.keys[e.code] = false; });

// --- 4. 初期化とボタンイベント ---
window.initializeGameData = function() {
    const raw = localStorage.getItem('battleData');
    if (!raw) return null;
    const data = JSON.parse(raw);
    window.enemyStats = data.enemy?.robot;
    
    if (window.enemyStats?.bgmData) {
        const bgm = window.enemyStats.bgmData;
        document.getElementById('bgm-title').innerText = bgm.title || "-";
        document.getElementById('bgm-author').innerText = bgm.author || "-";
        document.getElementById('bgm-comment').innerText = bgm.comment || "-";
    }
    return data;
};


// 戦闘終了・タイムアップ時の勝敗判定
function judgeBattleResult() {
    // すでに勝敗が決まっている場合は二重処理しない
    if (window.GameState && window.GameState.isBattleFinished) return;
    if (window.GameState) window.GameState.isBattleFinished = true;

    // ゲームループやタイマーを停止
    if (window.GameState && window.GameState.flags) {
        window.GameState.flags.isLoopRunning = false;
    }

    // プレイヤーと敵のオブジェクト・HPを取得（プロジェクトの変数名に合わせて調整してください）
    const player = window.player || (typeof p !== 'undefined' ? p : null);
    const enemy = window.enemy || null;

    let playerHp = player ? (player.hp !== undefined ? player.hp : 100) : 0;
    let enemyHp = enemy ? (enemy.hp !== undefined ? enemy.hp : 100) : 0;

    let resultMessage = "";
    let isWin = false;

    // HPの比較による勝敗判定
    if (playerHp > enemyHp) {
        resultMessage = "TIME UP! 残りHPにより勝利！";
        isWin = true;
    } else if (playerHp < enemyHp) {
        resultMessage = "TIME UP! 残りHPにより敗北…";
        isWin = false;
    } else {
        resultMessage = "TIME UP! 引き分け！";
        isWin = false; // 必要に応じて引き分け処理へ
    }

    // 画面への表示やリザルト処理（アラートや専用のリザルト画面への遷移）
    alert(resultMessage);

    // 例：基地（base.html）やリザルト画面へ戻る、あるいは報酬処理を呼ぶ
    // 勝利時のコレクション獲得処理などをここに繋げられます
    if (typeof window.onBattleEnded === 'function') {
        window.onBattleEnded(isWin);
    } else {
        location.href = 'base.html';
    }
}

// --- 勝敗・終了処理管理 ---
// --- 安全な煙エフェクト描画関数 ---
function drawSmokeSafely(ctx, entity) {
    if (!entity || !entity.isSmoking) return;

    if (ctx && typeof ctx.save === 'function') {
        try {
            ctx.save();
            const centerX = entity.x !== undefined ? entity.x : 200;
            const centerY = entity.y !== undefined ? entity.y : 200;
            const bodyWidth = 40; // 機体幅の目安

            ctx.fillStyle = "rgba(150, 150, 150, 0.7)";
            for (let i = 0; i < 3; i++) {
                const offsetX = (Math.random() - 0.5) * bodyWidth;
                const offsetY = -Math.random() * 25 - 10;
                ctx.beginPath();
                ctx.arc(centerX + offsetX, centerY + offsetY, 10 + Math.random() * 5, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } catch (e) {
            // 万が一描画中にエラーが出てもゲームを止めない
            if (ctx && typeof ctx.restore === 'function') {
                ctx.restore();
            }
        }
    }
}

// --- 勝敗・終了処理管理（機体を消さない完全安定版） ---
// --- 勝敗・終了処理管理（音声キー完全一致版 ＆ レベル・BGM入手連動） ---
// --- 勝敗・終了処理管理（音声キー完全一致版 ＆ レベル・BGM入手連動・enemy_list.html直行版） ---
window.BattleResultManager = {
    isFinished: false,

    checkGameEnd: function(player, enemy, remainingMinutes) {
        if (this.isFinished) return;

        if (player && player.hp <= 0) {
            this.triggerEnd("LOSE");
        } else if (enemy && enemy.hp <= 0) {
            this.triggerEnd("WIN");
        } else if (remainingMinutes !== undefined && remainingMinutes <= 0) {
            if (player.hp > enemy.hp) {
                this.triggerEnd("WIN");
            } else if (player.hp < enemy.hp) {
                this.triggerEnd("LOSE");
            } else {
                this.triggerEnd("DRAW");
            }
        }
    },

    triggerEnd: function(resultType) {
        if (this.isFinished) return;
        this.isFinished = true;

        // 1. 行動をロック
        if (typeof GameState !== 'undefined' && GameState.flags) {
            GameState.flags.isActionLocked = true;
        }

// 2. 敗者に煙フラグを立てる
        if (resultType === "LOSE" && window.player) {
            window.player.isSmoking = true;
        } else if (resultType === "WIN" && window.enemy) {
            window.enemy.isSmoking = true;
        }

        // 3. 安全な音声再生用ヘルパー関数
        const playSeSafely = (key) => {
            try {
                if (typeof AudioManager !== 'undefined') {
                    if (typeof AudioManager.play === 'function') {
                        AudioManager.play(key);
                    } else if (AudioManager.se && AudioManager.se[key] && typeof AudioManager.se[key].play === 'function') {
                        AudioManager.se[key].currentTime = 0;
                        AudioManager.se[key].play().catch(e => console.log("音声再生ブロック:", e));
                    }
                }
            } catch (e) {
                console.log("音声再生エラー回避:", e);
            }
        };

        // 4. 音声シーケンスの実行
        if (resultType === "LOSE" || resultType === "WIN") {
            playSeSafely('lose');

            setTimeout(() => {
                if (resultType === "LOSE") {
                    playSeSafely('lose_a_battle');
                } else {
                    playSeSafely('victory');
                }
            }, 5000);

        } else if (resultType === "DRAW") {
            playSeSafely('draw');
        }

        // ==========================================================
        // ★ 勝敗に応じたレベル変動・BGM入手・データ保存・画面遷移処理
        // ==========================================================
        setTimeout(() => {
            const battleData = JSON.parse(localStorage.getItem('battleData'));
            const myRobotId = localStorage.getItem('activeRobotId') || "0";
            const robotKey = `robot_slot_${myRobotId}`;
            let myRobotData = JSON.parse(localStorage.getItem(robotKey)) || { level: 1 };

            let resultMsg = "";

            if (resultType === "WIN") {
                // 自機の勝利：レベル + 10
                myRobotData.level = (myRobotData.level || 1) + 10;
                resultMsg = `【勝利！】\n自機のレベルが 10 上がった！（Lv.${myRobotData.level}）\n`;

                // 敵機のBGMデータをID管理で入手するギミック
                if (battleData && battleData.enemy && battleData.enemy.robot && battleData.enemy.robot.bgmData) {
                    const enemyBgm = battleData.enemy.robot.bgmData;
                    let unlockedSongs = JSON.parse(localStorage.getItem('unlocked_bgm_ids')) || [];
                    
                    const songId = enemyBgm.id || enemyBgm.title || "unknown_bgm";
                    
                    if (!unlockedSongs.includes(songId)) {
                        unlockedSongs.push(songId);
                        localStorage.setItem('unlocked_bgm_ids', JSON.stringify(unlockedSongs));
                        
                        let storedSongsData = JSON.parse(localStorage.getItem('stored_songs_data')) || {};
                        storedSongsData[songId] = enemyBgm;
                        localStorage.setItem('stored_songs_data', JSON.stringify(storedSongsData));

                        resultMsg += `\n🎵 敵のBGM「${enemyBgm.title || '無題'}」のIDを獲得した！`;
                    } else {
                        resultMsg += `\n(このBGMのIDは既に取得済みです)`;
                    }
                }

            } else if (resultType === "LOSE") {
                // 自機の敗北：レベル + 7
                myRobotData.level = (myRobotData.level || 1) + 7;
                resultMsg = `【敗北…】\n自機のレベルが 7 上がった（Lv.${myRobotData.level}）\n敵機の勝利！`;

            } else {
                // 引き分けの場合
                resultMsg = `【引き分け】\nお互いのレベル変動はありません。`;
            }

            // 自機データを保存
            localStorage.setItem(robotKey, JSON.stringify(myRobotData));

            // メッセージを表示して enemy_list.html へ戻る
            alert(resultMsg);
            location.href = 'enemy_list.html';

        }, 6000); 
    }
};
//----------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    BattleManager.init();
    initializeGameData();

    // ボタンのイベント登録はここだけに絞る
    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
        startBtn.onclick = () => {
            console.log("戦闘開始！");
            document.getElementById('start-overlay').style.display = 'none';
            window.startEverything();
        };
    }
});



//----------------------------------------------------------------------

// --- 1. 初期データとプレイヤー・敵の定義 ---

// 【プレイヤー】
// 前の画面等で作られた window.player があればそれを使い、無ければ空オブジェクトにする
window.player = window.player || {};

// バトル開始に必要な「座標」や「状態」だけを追加・上書きする
Object.assign(window.player, {
    x: 100, 
    y: 350, 
    en: 0, 
    actionCount: 0,
    state: "IDLE",
    armAngle: 0
    // ※ hp, maxHp, stats(atk, def, spd) は元の window.player のデータをそのまま活かすためここには書きません
});
window.player.lastDir = 1;


// 【敵機】
// 生成された window.enemy があればそれを使い、無ければ空オブジェクトにする
window.enemy = window.enemy || {};

// 敵の初期配置と状態だけを追加・上書き
Object.assign(window.enemy, {
    x: 250, 
    y: 350, 
    en: 0, 
    actionCount: 0
    // ※ hp, maxHp, def 等は元データをそのまま使う
});
window.enemy.lastDir = -1;


// ターン管理
window.TurnManager = {
    currentCount: 0,
    update() {
        this.currentCount = (this.currentCount + 1) % 500;
        if (window.player.actionCount > 0) window.player.actionCount--;
        if (window.enemy.actionCount > 0) window.enemy.actionCount--;
    }
};

window.calculateDamage = function(attacker, target, weaponType, isRanged) {
    const config = window.WEAPON_CONFIG ? window.WEAPON_CONFIG[weaponType] : null;
    
    // 1. 相手の防御力を安全に取得
    const def = (target.stats && target.stats.def !== undefined) ? target.stats.def : (target.def || 0);
    
    let dmg = 1;

    // 2. 近接（ビームソードなど）と遠距離（ビームガン等）で計算式を分岐
    if (weaponType === "ビームソード" || !isRanged) {
        let baseAtk = 10;
        if (config && config.atk !== undefined) {
            baseAtk = config.atk;
        } else if (attacker.stats && attacker.stats.atk !== undefined) {
            baseAtk = attacker.stats.atk;
        } else if (attacker.atk !== undefined) {
            baseAtk = attacker.atk;
        }
        dmg = baseAtk - (def * 0.5);
    } else {
        let pAtk = 50;
        if (attacker.stats && attacker.stats.atk !== undefined) {
            pAtk = attacker.stats.atk;
        } else if (attacker.atk !== undefined) {
            pAtk = attacker.atk;
        }

        let atkMult = 0.1;
        if (config && config.atkMult !== undefined) {
            atkMult = config.atkMult;
        }

        dmg = (pAtk * atkMult) - (def * 0.1);
    }

    // --- バリア中のダメージ軽減（0.05倍） ---
    const isTargetShielding = (target.state === "CHARGING" || target.isBarrier === true);
    if (isTargetShielding) {
        dmg = dmg * 0.05;
        console.log("バリア展開中！ダメージを大幅に軽減しました");
    }

    if (weaponType === "ビームソード") {
        dmg = dmg * 0.4; 
    } else {
        dmg = dmg * 0.2; 
    }

    dmg = Math.round(dmg);
    return Math.max(1, isNaN(dmg) ? 1 : dmg);
};

// --- ダメージを受けた時のトリガー関数 ---
// --- ダメージを受けた時のトリガー関数（完全安全ガード版） ---
window.applyDamage = function(target, damage) {
    if (!target) return;

    // すでにゲームが終了している、あるいは対象がすでに倒されている場合はダメージ処理を行わない
    if (typeof BattleResultManager !== 'undefined' && BattleResultManager.isFinished) {
        return;
    }

    if (target.hp === undefined) {
        target.hp = target.stats && target.stats.maxHp ? target.stats.maxHp : 100;
    }

    const actualDamage = Math.max(1, damage); 
    target.hp = Math.max(0, target.hp - actualDamage); 

    // 揺れフラグを立てる
    target.shakeCount = 10; 
    target.shakeState = 1;  
    
    // プレイヤーがダメージを受けた場合
    if (target === window.player) {
        console.log(`プレイヤーがダメージを受けた: ${actualDamage}, 残りHP: ${target.hp}`);
        
        const maxHp = (target.stats && target.stats.maxHp) ? target.stats.maxHp : (target.maxHp || 500);
        target.hp = Math.max(0, Math.min(maxHp, target.hp));

        const hpPercent = (target.hp / maxHp) * 100;
        
        const hpBarElement = document.getElementById('hp-bar');
        if (hpBarElement) {
            hpBarElement.style.width = hpPercent + "%";
            hpBarElement.style.background = "green"; 
        }

        const hpContainer = document.getElementById('hp-container');
        if (hpContainer) {
            hpContainer.style.background = "#000000";
        }
    } 
    // 敵がダメージを受けた場合
    else if (target === window.enemy) {
        console.log(`敵がダメージを受けた: ${actualDamage}, 残りHP: ${target.hp}`);
    }

    // ==========================================================
    // ★ HPが0になった瞬間に、確実に1回だけ勝敗演出を呼び出す
    // ==========================================================
    if (typeof BattleResultManager !== 'undefined' && !BattleResultManager.isFinished) {
        if (window.player && window.player.hp <= 0) {
            BattleResultManager.triggerEnd("LOSE");
        } else if (window.enemy && window.enemy.hp <= 0) {
            BattleResultManager.triggerEnd("WIN");
        }
    }
};


// 毎フレーム呼ぶプレイヤー用の揺れ処理
window.updatePlayerShake = function(player) {
    if (!player) return;

    // まだベース位置がないなら現在の位置を基準として記録
    if (player.baseX === undefined) {
        player.baseX = player.x;
        player.baseY = player.y;
    }

    if (player.shakeCount > 0) {
        // 横揺れのみ（またはお好みで縦も入れたければ調整可能ですが、まずは敵と同じ横揺れに）
        const offset = 6; 
        player.x = player.baseX + (Math.random() * offset * 2 - offset);
        player.shakeCount--;
    } else {
        // 揺れが終わったら、ベース位置を現在の最新位置に更新する
        player.baseX = player.x;
    }
};

// 毎フレーム呼ぶ更新処理（UpdateManager等に配置）
window.updateShake = function(enemy) {
    if (!enemy) return;

    // まだベース位置がないなら現在の位置を基準として記録
    if (enemy.baseX === undefined) {
        enemy.baseX = enemy.x;
        enemy.baseY = enemy.y;
    }

    if (enemy.shakeCount > 0) {
        // 【重要】横揺れのみにするため、X座標だけに乱数を加え、Y座標（enemy.y）は一切いじらない！
        const offset = 6; // 揺れの強さ（必要に応じて調整してください）
        
        // 元のベース位置、または現在の位置を基準に横方向へずらす
        // （AIによる移動を邪魔しないよう、ベース位置から一定範囲でブルブル震わせる場合）
        enemy.x = enemy.baseX + (Math.random() * offset * 2 - offset);
        
        // ※ Y座標は変更しないため、enemy.y に関する処理は削除します

        enemy.shakeCount--;
    } else {
        // 揺れが終わったら、ベース位置を現在のAIの最新位置に更新する
        // （これを行わないと、揺れ終わった瞬間に過去のベース位置に戻ろうとしてしまいます）
        enemy.baseX = enemy.x;
    }
};

window.checkBeamSwordHit = function(attacker, target) {
    if (!attacker || !target) return;

    // 1. それぞれのスケール（サイズ）を安全に取得（デフォルトは 1.0）
    const attackerScale = (attacker.stats && attacker.stats.scale) ? attacker.stats.scale : (attacker.scale || 1.0);
    const targetScale = (target.stats && target.stats.scale) ? target.stats.scale : (target.scale || 1.0);

    // 2. 機体の中心座標をそれぞれのスケールに合わせて正しく計算
    const attackerCenterY = attacker.y - (40 * attackerScale * attackerScale);
    const targetCenterY = target.y - (40 * targetScale * targetScale);

    // 3. 距離の計算
    const dx = target.x - attacker.x;
    const dy = targetCenterY - attackerCenterY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 4. ★サイズ差を考慮した「ヒット判定の基準距離」
    // 基本のリーチ（例: 80px）に、攻撃側のスケールと防御側のスケールを反映させる
    const baseReach = 80; 
    const hitReach = baseReach * ((attackerScale + targetScale) / 2);

    // すでにヒットしていなければ判定
    if (!attacker.hasSwordHit && dist < hitReach) {
        attacker.hasSwordHit = true; // ヒット済みフラグ

        // ダメージ計算と適用
        const dmg = window.calculateDamage(attacker, target, "ビームソード", false);
        window.applyDamage(target, dmg);
        
        AudioManager.play('hit');
        if (typeof window.UpdateManager.createExplosion === 'function') {
            window.UpdateManager.createExplosion(target.x, targetCenterY);
        }
    }
};


window.GameState = { flags: { isLoopRunning: false } };
window.BattleManager = { init: function() { console.log("BattleManager 初期化"); } };


// --- 2. 物理演算と攻撃処理 ---
window.UpdateManager = {
    // 1. 弾を発射する関数
  shootWeapon: function(weaponType) {
        const p = window.player;
        const e = window.enemy;
        const config = (window.WEAPON_CONFIG && window.WEAPON_CONFIG[weaponType]) ? window.WEAPON_CONFIG[weaponType] : { speed: 5, range: 400, color: "cyan", enCost: 0 };
        if (!p) return;

        const scale = (p.stats && p.stats.scale) ? p.stats.scale : 1.0;
        const pCenterY = p.y - (40 * scale * scale);
        
        let angle = 0;

        // 1. 「敵がいて、かつ自機が敵の方向を向いていて、前方にいる」かを判定する条件
        const dir = (p.lastDir !== undefined) ? p.lastDir : 1; // 1:右, -1:左
        const isEnemyAhead = e && ((dir === 1 && e.x > p.x) || (dir === -1 && e.x < p.x));

        // 2. 敵が前方にいる場合は斜めを含めた正確な角度、いない場合はまっすぐ（水平）に飛ばす
        if (isEnemyAhead) {
            // --- 敵の方向を狙って斜めに撃つ ---
            const eCenterY = e.y - (40 * (e.stats && e.stats.scale ? e.stats.scale : 1.0)**2);
            const dx = e.x - p.x;
            const dy = eCenterY - pCenterY;
            angle = Math.atan2(dy, dx);
        } else {
            // --- 前方に敵がいない（または背を向けている）ので、進行方向にまっすぐ飛ばす ---
            angle = (dir === 1) ? 0 : Math.PI;
        }

        window.bullet = { 
            active: true, 
            type: weaponType, 
            x: p.x, 
            y: pCenterY, 
            vx: Math.cos(angle) * config.speed, 
            vy: Math.sin(angle) * config.speed, 
            range: config.range, 
            dist: 0, 
            color: config.color
        };

        if (typeof p.en !== 'undefined' && typeof config.enCost !== 'undefined') {
            p.en = Math.max(0, p.en - config.enCost);
        }

        const sounds = { "マシンガン": 'machinegun', "ビームガン": 'beam_gun', "ミサイル": 'missile_fire' };
        if (typeof AudioManager !== 'undefined' && sounds[weaponType]) {
            AudioManager.play(sounds[weaponType]);
        }
    },

      shootEnemyWeapon: function(weaponType) {
        const p = window.player;
        const e = window.enemy;
        const config = window.WEAPON_CONFIG[weaponType];
        if (!p || !e || !config) return;

        // 1. それぞれのスケール（大きさ）を取得
        const pScale = (p.stats && p.stats.scale) ? p.stats.scale : 1.0;
        const eScale = (e.stats && e.stats.scale) ? e.stats.scale : 1.0;

        // 2. それぞれの中心Y座標を正しく計算する
        const pCenterY = p.y - (40 * pScale * pScale); 
        const eCenterY = e.y - (40 * eScale * eScale); // ★ここを敵(e)のデータできちんと計算する！
        
        // 3. 敵から自機へ向かう距離と角度（敵視点なので 「自機 - 敵」）
        const dx = p.x - e.x;
        const dy = pCenterY - eCenterY;
        const angle = Math.atan2(dy, dx);

        window.enemyBullet = { 
            active: true, 
            type: weaponType, 
            x: e.x, 
            y: eCenterY, // 敵の中心から発射
            vx: Math.cos(angle) * config.speed, 
            vy: Math.sin(angle) * config.speed, 
            range: config.range, 
            dist: 0, 
            color: config.color
        };
    },

    // 2. 爆発エフェクトを作る関数（※ここに置くことでエラーが消えます）
    createExplosion: function(x, y) {
        if (!window.effects) window.effects = [];
        for (let i = 0; i < 5; i++) {
            window.effects.push({ active: true, x: x, y: y, life: 10 });
        }
    },

    // 3. 物理演算と入力・行動処理
    updatePhysics: function() {
        const p = window.player;
        const isUp = window.keys.ArrowUp || window.touches.up;
        const isLeft = window.keys.ArrowLeft || window.touches.left;
        const isRight = window.keys.ArrowRight || window.touches.right;

        if (p.y >= 350) {
            p.jumpCount = 0;
            p.isJumping = false;
        }

        if (isUp && !p.isJumpingHeld) { 
            if ((p.y >= 350 || (p.jumpTimes && p.jumpTimes < 2)) && p.en >= 10) {
                p.isJumping = true;
                p.en -= 10; 
                let power = Math.max(8, Math.sqrt((p.stats.spd * 0.5) * 2));
                p.jumpVel = -power; 
                p.jumpTimes = (p.y >= 350) ? 1 : (p.jumpTimes + 1);
                AudioManager.play('jump');
            }
        }
        p.isJumpingHeld = isUp; 

        // ジャンプ中、または空中にいるときの処理
        if (p.isJumping) {
            
            // ★変更：SWORD_ATTACK中であっても浮遊させず、通常通り落下・重力を適用する
            p.y += p.jumpVel;    
            p.jumpVel += 1.0;    

            if (p.y >= 350) {
                p.y = 350;
                p.isJumping = false;
                p.jumpVel = 0;
                p.jumpTimes = 0; 
                AudioManager.play('landing'); 
            }
        } else {
            p.y = 350; 
        }

        if (p.actionCount > 0) p.actionCount--;

        // --- プレイヤーの攻撃処理 ---
        if (p.state === "SWORD_ATTACK") {
            p.armAngle = (1 - (p.actionCount / 30)) * 180;
            if (p.actionCount > 10 && p.actionCount < 20) {
                if (typeof window.checkSwordHit === 'function') window.checkSwordHit();
            }
            p.actionCount--;
            if (p.actionCount <= 0) {
                p.state = "IDLE";
                p.actionCount = 0;
                p.armAngle = 0;
            }
            return;
        }

        // --- 敵の攻撃処理 ---
        const e = window.enemy;
        if (e && e.state === "ENEMY_SWORD_ATTACK") {
            e.armAngle = (1 - (e.actionCount / 30)) * 180;
            if (e.actionCount > 10 && e.actionCount < 20) {
                if (typeof window.checkEnemySwordHit === 'function') window.checkEnemySwordHit();
            }
            e.actionCount--;
            if (e.actionCount <= 0) {
                e.state = "IDLE";
                e.actionCount = 0;
                e.armAngle = 0;
            }
        }

        if (window.prevFar === undefined) window.prevFar = false;
        const isFarPressed = window.touches.far && !window.touches.near;

        if (window.touches.near && p.actionCount === 0 && p.en >= 10) {
            p.state = "SWORD_ATTACK";
            p.hasSwordHit = false; // ★ここで今回のヒットフラグをリセット！
            p.actionCount = 30;
            p.en -= 10;
            AudioManager.play('beam_sword');
        } 
        else if (isFarPressed && !window.prevFar) { 
            const currentWeapon = window.player.stats.weapon || "マシンガン";
            if (!window.bullet || !window.bullet.active) {
                UpdateManager.shootWeapon(currentWeapon);
            }
        } 
        else if (window.touches.en) {
            p.state = "CHARGING";
            p.en = Math.min(p.en + 1.0, 500);
            if (!p.chargeTimer || p.chargeTimer <= 0) { AudioManager.play('charge'); p.chargeTimer = 60; }
            p.chargeTimer--;
            if (!p.shakeCounter) p.shakeCounter = 0;
            p.shakeCounter++;
        }
        else if (window.touches.barrier) {
            p.isBarrier = true;
            if (!p.barrierTimer) p.barrierTimer = 10;
            p.barrierTimer--;
            if (p.barrierTimer <= 0) { p.en = Math.max(p.en - 10, 0); p.barrierTimer = 10; }
            if (p.en <= 0) p.isBarrier = false;
        } 
        else {
            p.state = "IDLE";
            p.isBarrier = false;
            if (!p.isJumping) p.y = 350; 
        }
//左右移動
window.prevFar = isFarPressed;

        let speedMultiplier = (p.en > 400) ? 0.03 : (p.en > 0) ? 0.02 : 0.01;
        let isMoving = (isRight || isLeft) && p.actionCount === 0;

        if (isMoving) {
            let scaleFactor = (p.stats && p.stats.scale) ? p.stats.scale : 1.0;
            let rawMove = p.stats.spd * speedMultiplier * scaleFactor;

            // ★SSサイズの場合のみ、最低移動量を0.5に保証する
            let minMove = (p.stats && p.stats.size === 'SS') ? 0.5 : 0.1;
            let moveAmount = Math.max(minMove, rawMove);

            if (isRight) { p.x += moveAmount; p.lastDir = 1; }
            if (isLeft) { p.x -= moveAmount; p.lastDir = -1; }
            
            p.x = Math.max(10, Math.min(p.x, 400));
            if (Math.random() < 0.2) AudioManager.play('dash');
        }

        this.updateBullets();
        this.updateEnemyBullets();
        if (window.enemy) window.updateShake(window.enemy);
    },


       // 3. プレイヤーの弾の更新と当たり判定（敵へのダメージ ＆ 敵の剣による迎撃）
      updateBullets: function() {
        const b = window.bullet;
        if (!b || !b.active) return;
        b.x += b.vx; 
        b.y += b.vy;
        b.dist += Math.sqrt(b.vx ** 2 + b.vy ** 2);
        if (b.dist >= b.range) b.active = false;
       
        const e = window.enemy;
        if (!e) return;

        // 1. 敵のスケールと中心座標を正しく取得する
        const eScale = (e.stats && e.stats.scale) ? e.stats.scale : 1.0;
        const eCenterY = e.y - (40 * eScale * eScale);

        // ★バリアや機体サイズに合わせた判定サイズ（スケールに応じて拡大縮小する）
        // もしバリアのサイズが半径 40〜50px くらいであれば、それに合わせます
        const hitRadiusX = 35 * eScale; 
        const hitRadiusY = 45 * eScale;

        // 2. 敵がビームソードを振っているときの迎撃判定
        const isEnemySwinging = (e.state === "SWORD_ATTACK" || e.state === "ENEMY_SWORD_ATTACK");
        const isNearEnemy = Math.abs(b.x - e.x) < (hitRadiusX + 10) && Math.abs(b.y - eCenterY) < (hitRadiusY + 10);
        
        if (b.active && isEnemySwinging && isNearEnemy) {
            b.active = false; // 弾を消す
            AudioManager.play('hit');
            UpdateManager.createExplosion(b.x, b.y);
            return;
        }

        // 3. 敵への通常ヒット判定（XもYも機体の中心とサイズに合わせる）
        const isHitX = Math.abs(b.x - e.x) < hitRadiusX;
        const isHitY = Math.abs(b.y - eCenterY) < hitRadiusY;

        if (b.active && isHitX && isHitY) {
            const dmg = window.calculateDamage(window.player, window.enemy, b.type, true);
            window.applyDamage(window.enemy, dmg);
            
            b.active = false; // 貫通せずに消す
            AudioManager.play('hit');
            UpdateManager.createExplosion(b.x, b.y);
            return;
        }
    },

    // 4. 敵の弾の更新と当たり判定（自機へのダメージ ＆ 自機の剣による迎撃）
    updateEnemyBullets: function() {
        const eb = window.enemyBullet;
        if (!eb || !eb.active) return;
        eb.x += eb.vx; 
        eb.y += eb.vy;
        eb.dist += Math.sqrt(eb.vx ** 2 + eb.vy ** 2);
        if (eb.dist >= eb.range) eb.active = false;

        const p = window.player;
        if (!p) return;

        // 【ギミック】自機がビームソードを振っている最中なら、弾を切り払って消す！
        const isPlayerSwinging = (p.state === "SWORD_ATTACK");
        const isNearPlayer = Math.abs(eb.x - p.x) < 50 && Math.abs(eb.y - p.y) < 50;
        if (eb.active && isPlayerSwinging && isNearPlayer) {
            eb.active = false;
            AudioManager.play('hit');
            UpdateManager.createExplosion(eb.x, eb.y);
            return;
        }

        // 自機への通常ヒット判定（共通の calculateDamage と applyDamage を使用！）
        const pCenterY = p.y - 40; // もし機体の中心を基準にしている場合
        const hitWidth = 45;  // 横方向の判定
        const hitHeight = 50; // 縦方向の判定（水平な弾も確実に拾うために少し広めに）

        if (eb.active && Math.abs(eb.x - p.x) < hitWidth && Math.abs(eb.y - p.y) < hitHeight) {
            const dmg = window.calculateDamage(window.enemy, window.player, eb.type, true);
            window.applyDamage(window.player, dmg);
            eb.active = false; // ★ここで確実に弾を消す！
            AudioManager.play('hit');
            UpdateManager.createExplosion(eb.x, eb.y);
        }
    },
};



// --- 敵のAI（思考・行動・移動管理） ---
window.EnemyAI = {
    update: function(enemy, player) {
// 1. プロパティの初期化
        if (enemy.aiTimer === undefined) {
            enemy.aiTimer = 0;            
            
            // ★【ここを変更】戦闘開始直後は、約2秒間（約120フレーム）何もしない時間を預ける！
            enemy.actionDuration = 120;       
            
            enemy.currentAction = "IDLE"; // 最初はアプローチではなく完全な待機（IDLE）にする
            enemy.isBarrier = false;
            enemy.isJumping = false;
            enemy.jumpVel = 0;
            enemy.jumpCount = 0;          
            enemy.attackCooldown = 60;    // 最初からすぐに攻撃できないようクールダウンも持たせる
            enemy.actionCount = 0;    
            enemy.armAngle = 0;       
        }

        // クールダウンの減少
        if (enemy.attackCooldown > 0) enemy.attackCooldown--;

        // ★★★ レベルに応じた難易度係数（0〜40:弱、41〜71:中、72〜100:強） ★★★
        const enemyLevel = (enemy.stats && enemy.stats.level !== undefined) ? enemy.stats.level : 10;
        
        let dynamicDuration; // 思考を切り替える間隔（フレーム数：大きいほどゆっくり）
        let dynamicSpd;      // 移動スピードの係数

        if (enemyLevel <= 40) {
            // 【弱い】レベル0〜40：思考がゆっくりで、動きもおっとり
            dynamicDuration = 70 - Math.floor(enemyLevel * 0.3); // 約70〜58フレームごと
            dynamicSpd = 0.6 + (enemyLevel * 0.005);             // 0.6 〜 0.8
        } else if (enemyLevel <= 71) {
            // 【中】レベル41〜71：標準的な動き
            dynamicDuration = 55 - Math.floor((enemyLevel - 41) * 0.5); // 約55〜40フレームごと
            dynamicSpd = 0.85 + ((enemyLevel - 41) * 0.01);               // 0.85 〜 1.15
        } else {
            // 【強い】レベル72〜100：機敏で素早い動き（これまで通りの強さ）
            dynamicDuration = Math.max(10, 38 - Math.floor((enemyLevel - 72) * 0.6)); // 約38〜21フレームごと
            dynamicSpd = 1.2 + ((enemyLevel - 72) * 0.015);                         // 1.2 〜 1.62
        }

        // 2. ★【最重要】自機と同様に、攻撃中のカウントダウンとモーション処理を毎フレーム先に行う
        if (enemy.state === "ENEMY_SWORD_ATTACK") {
            enemy.armAngle = (1 - (enemy.actionCount / 30)) * 180;
            
            if (enemy.actionCount > 10 && enemy.actionCount < 20) {
                if (typeof window.checkBeamSwordHit === 'function') {
                    window.checkBeamSwordHit(enemy, player);
                }
            }

            enemy.actionCount--;

            if (enemy.actionCount <= 0) {
                enemy.state = "IDLE";
                enemy.actionCount = 0;
                enemy.armAngle = 0;
            }
            return; 
        }

        // 通常の行動カウント減少
        if (enemy.actionCount > 0) {
            enemy.actionCount--;
            return;
        }

        // 3. 一定フレームごとに次のコマンドを抽選
        if (enemy.actionDuration <= 0) {
            enemy.actionDuration = dynamicDuration; 

            const randCmd = Math.floor(Math.random() * 100) + 1;

            if (randCmd >= 1 && randCmd <= 15) {
                enemy.currentAction = "APPROACH";      
            } else if (randCmd >= 16 && randCmd <= 25) {
                enemy.currentAction = "ESCAPE";        
            } else if (randCmd >= 26 && randCmd <= 38) {
                enemy.currentAction = "BARRIER";        
            } else if (randCmd >= 39 && randCmd <= 58) {
                enemy.currentAction = "FAR_ATTACK";    
            } else if (randCmd >= 59 && randCmd <= 68) {
                enemy.currentAction = "JUMP_ACTION";    
            } else if (randCmd >= 69 && randCmd <= 78) {
                enemy.currentAction = "CHARGE_EN";      
            } else {
                enemy.currentAction = "NEAR_ATTACK";    
            }
        } else {
            enemy.actionDuration--;
        }

        // 4. 常にプレイヤーの方向を向く ＆ 基本移動
        const dx = player.x - enemy.x;
        const dist = Math.abs(dx);
        enemy.lastDir = (dx > 0) ? 1 : -1;
        const spd = dynamicSpd;

        enemy.isBarrier = false;
        enemy.state = "IDLE";

        // 5. 行動の実行
        switch (enemy.currentAction) {
            case "IDLE":
            // その場で立ち尽くす（移動も攻撃もバリアもしない）
                enemy.state = "IDLE";
                break;

            case "APPROACH":
                if (dist > 60) enemy.x += enemy.lastDir * 1.5 * spd;
                break;

            case "ESCAPE":
                if (dist < 280) enemy.x -= enemy.lastDir * 1.5 * spd;
                break;

            case "BARRIER":
                enemy.isBarrier = true; 
                break;

            case "FAR_ATTACK":
                enemy.state = "FAR_ATTACKING";
                if (dist < 150) enemy.x -= enemy.lastDir * 1.0 * spd;

                // 敵の弾を発射する処理
                if (enemy.attackCooldown <= 0) {
                    const weaponType = (enemy.stats && enemy.stats.weapon) ? enemy.stats.weapon : "ビームガン";
                    const config = window.WEAPON_CONFIG ? window.WEAPON_CONFIG[weaponType] : { speed: 8, range: 300, color: "cyan" };
                    
                    const eCenterY = enemy.y - (40 * (enemy.stats.scale || 1.0)**2);
                    const pCenterY = player.y - (40 * (player.stats.scale || 1.0)**2);
                    const edx = player.x - enemy.x;
                    const edy = pCenterY - eCenterY;

                    const angle = Math.atan2(edy, edx);

                    window.enemyBullet = {
                        active: true, type: weaponType, x: enemy.x, y: eCenterY,
                        vx: Math.cos(angle) * (config.speed || 8), vy: Math.sin(angle) * (config.speed || 8),
                        range: config.range || 300, dist: 0, color: config.color || "cyan"
                    };

                    AudioManager.play('beam_gun');
                    // レベルが低いほど発射クールダウンを長くして、撃ってくる頻度を下げる
                    enemy.attackCooldown = Math.max(30, Math.floor(80 - (enemyLevel * 0.4)));
                }
                break;

            case "JUMP_ACTION":
                if (!enemy.isJumping) {
                    enemy.isJumping = true;
                    enemy.jumpVel = -9;
                    enemy.jumpCount = 1;
                } else if (enemy.jumpCount < 2 && enemy.jumpVel > -2) {
                    enemy.jumpVel = -8;
                    enemy.jumpCount++;
                }
                break;

                case "CHARGE_EN":
                enemy.isBarrier = true; // チャージ中はバリア展開中のような硬い状態にする場合
                if (enemy.en !== undefined) {
                    enemy.en = Math.min(500, enemy.en + 6.0);
                }

                // ★追加：ENチャージ中の縦揺れ演出（上下に小刻みに震わせる）
                // 基準となるY座標（例: 地面の高さ 350、または現在の y）をベースに上下にランダムで揺らす
                const shakeIntensity = 3; // 揺れの幅（ピクセル）
                // ジャンプ中などと競合しないよう、地面付近にいるときや静止中に縦揺れさせる
                if (!enemy.isJumping) {
                    // 基本の足場位置（350）を基準にするか、現在の y 位置をベースにする
                    const baseY = 350; 
                    enemy.y = baseY + (Math.random() * shakeIntensity * 2 - shakeIntensity);
                }
                break;

            case "NEAR_ATTACK":
                if (dist <= 120 && enemy.attackCooldown <= 0) {
                    enemy.state = "ENEMY_SWORD_ATTACK";
                    enemy.hasSwordHit = false; 
                    enemy.actionCount = 30; 
                    enemy.attackCooldown = Math.max(40, Math.floor(90 - (enemyLevel * 0.4)));
                    AudioManager.play('beam_sword');
                } else {
                    enemy.x += enemy.lastDir * 2.5 * spd; 
                }
                break;

            default:
                break;
        }

        // 6. ジャンプ中の物理演算
        if (enemy.isJumping) {
            enemy.y += enemy.jumpVel;
            enemy.jumpVel += 0.45; 
            if (enemy.y >= 350) {
                enemy.y = 350;
                enemy.isJumping = false;
                enemy.jumpVel = 0;
                enemy.jumpCount = 0;
            }
        }

        // 画面外への飛び出し防止
        enemy.x = Math.max(50, Math.min(enemy.x, 400));
    }
};