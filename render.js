// render.js
window.Renderer = {
    ctx: null,
    canvas: null,

    init: function(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
        }
    },

    // 描画メイン処理
// 描画メイン処理
updateAvatarPositions: function() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const p = window.player;

    // 1. 揺れ幅の計算
    let pOffset = 0;
    if (p.state === "CHARGING") {
        pOffset = (p.shakeCounter % 2 === 0) ? 4 : -4;
    } else {
        pOffset = (window.TurnManager && TurnManager.currentCount % 2 === 0) ? -0.3 : 0.3;
    }

    // 2. 機体描画
    this.drawRobot(p.x, p.y + pOffset, p.stats, p.lastDir, p.armAngle);

    // 3. バリア描画
    if (p.isBarrier) {
        this.drawBarrier(p.x, p.y + pOffset, (p.stats.scale || 1.0));
    }

    // 4. 敵機体描画
    if (window.enemy && window.enemy.stats) {
        this.drawRobot(window.enemy.x, window.enemy.y, window.enemy.stats, window.enemy.lastDir || 1, window.enemy.armAngle || 0);
    }

    // 5. 敵がバリアを張っているときにバリアを描画する
    if (window.enemy && window.enemy.isBarrier) {
        this.drawBarrier(window.enemy.x, window.enemy.y, (window.enemy.stats.scale || 1.0));
    }

    // 6. 自機の弾を描画
    if (window.bullet && window.bullet.active) {
        this.ctx.fillStyle = window.bullet.color;
        this.ctx.fillRect(window.bullet.x - 4, window.bullet.y - 4, 8, 8);
    }

    // 7. 敵の弾を描画
    if (window.enemyBullet && window.enemyBullet.active) {
        this.ctx.fillStyle = window.enemyBullet.color || "cyan";
        this.ctx.fillRect(window.enemyBullet.x - 4, window.enemyBullet.y - 4, 8, 8);
    }

    // ==========================================
    // ★ 8. 敗者の機体から煙を描画する処理を追加
    // ==========================================
    this.drawSmokeIfNeeded(this.ctx, window.player);
    this.drawSmokeIfNeeded(this.ctx, window.enemy);
},

// --- 安全な煙の描画処理（Rendererオブジェクトのメソッドとして定義） ---
// --- 機体サイズを考慮した安全な煙の描画処理 ---
drawSmokeIfNeeded: function(ctx, entity) {
    if (!entity || !entity.isSmoking) return;

    if (ctx && typeof ctx.save === 'function') {
        try {
            ctx.save();
            
            // 1. 機体のX座標（中心）
            const centerX = entity.x !== undefined ? entity.x : 170;
            
            // 2. 機体のスケール（拡大率）を取得
            const scale = (entity.stats && entity.stats.scale) || entity.scale || 1.0;
            
            // 3. 機体の高さの目安（標準の高さを80pxとし、スケールをかける）
            const bodyHeight = 80 * scale * scale;
            const bodyWidth = 70 * scale; // 機体の横幅の目安

            // 4. Y座標を足元から「機体の中央〜少し上（胴体あたり）」に調整する
            // 基準が足元の場合、高さの半分（bodyHeight * 0.5）だけ上にずらす
            const centerY = (entity.y !== undefined ? entity.y : 200) - (bodyHeight * 0.5);

            ctx.fillStyle = "rgba(180, 180, 180, 0.7)";
            for (let i = 0; i < 3; i++) {
                // 機体の横幅の範囲内でランダムに散らす
                const offsetX = (Math.random() - 0.5) * bodyWidth;
                // 機体の中心付近から上に向かって煙が立ち上るようにする
                const offsetY = (Math.random() - 0.5) * (bodyHeight * 0.4) - 10;
                
                ctx.beginPath();
                ctx.arc(centerX + offsetX, centerY + offsetY, (6 + Math.random() * 6) * scale, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        } catch (e) {
            if (ctx && typeof ctx.restore === 'function') {
                ctx.restore();
            }
        }
    }
},

    drawRobot: function(drawX, drawY, stats, dir, armAngle) {
        if (!this.ctx) return;
        const ctx = this.ctx;
        
        const sizeMap = { "SS": 1, "S": 2, "M": 3, "L": 4, "LL": 5 };
        const s = (stats.scale || 1.0) * ((sizeMap[stats.size] || 3) / 13);
        const d = dir || 1;

// アイコン描画
        const iconImg = new Image();
        iconImg.src = stats.avatarIcon || 'png_parts/default_icon.png';
        
        // ⭕ 修正：機体のスケール(s)に合わせて頭上に配置する
        const headOffset = (50 * s * s )*8 + 40 ; // サイズに応じた頭上の高さ
        ctx.drawImage(iconImg, drawX - 16, drawY - headOffset - 35, 32, 32);

        // --- 敵用ステータスバー ---
        if (window.enemy && stats === window.enemy.stats) {
            const barW = 40; // バーの幅
            const barH = 5;  // バーの高さ
            const startX = drawX - (barW / 2);
            
            // ⭕ 修正：アイコンのさらに上にステータスバーを配置
            const startY = drawY - headOffset - 45; 

            // 枠の描画
            ctx.strokeStyle = "black";
            ctx.lineWidth = 1;
            ctx.strokeRect(startX, startY, barW, barH * 2 + 2);

            // 確実に maxHp と currentHp を取得して割合を出す
            const currentHp = window.enemy.hp !== undefined ? window.enemy.hp : 500;
            const maxHp = window.enemy.maxHp || 500;
            const hpPercent = Math.max(0, Math.min(currentHp / maxHp, 1));

            // HPバー (緑)
            ctx.fillStyle = "green";
            ctx.fillRect(startX + 1, startY + 1, barW * hpPercent, barH);

            // ENバー (青)
            const currentEn = window.enemy.en !== undefined ? window.enemy.en : 500;
            const maxEn = window.enemy.maxEn || 500;
            const enPercent = Math.max(0, Math.min(currentEn / maxEn, 1));
            ctx.fillStyle = "blue";
            ctx.fillRect(startX + 1, startY + barH + 2, barW * enPercent, barH);
        }
        //------------------
  

        // パーツ描画
        const parts = [
            {type: "line", x1: 58, y1: 226, x2: 111, y2: 224, w: (stats.spd * 0.0334) * s},
            {type: "line", x1: 60, y1: 227, x2: 58, y2: 350, w: (stats.spd * 0.0334) * s},
            {type: "line", x1: 111, y1: 224, x2: 115, y2: 349, w: (stats.spd * 0.0334) * s},
            {type: "line", x1: 42, y1: 114, x2: 137, y2: 115, w: (stats.atk * 0.0334) * s},
            {type: "line", x1: 44, y1: 115, x2: 27, y2: 228, w: (stats.atk * 0.0334) * s},
            {type: "line", x1: 133, y1: 116, x2: 155, y2: 170, w: (stats.atk * 0.0334) * s},
            {type: "line", x1: 87, y1: 97, x2: 90, y2: 221, w: (stats.def * 0.0334 * 2) * s},
            {type: "circle", x1: 70, y1: 45, x2: 110, y2: 110},
            {type: "rect", x1: 80, y1: 75, x2: 112, y2: 82, isEye: true}
        ];

        parts.forEach(p => {
            ctx.beginPath();
            const centerX = drawX;
            const offsetX1 = (p.x1 - 140) * s * d;
            const offsetX2 = (p.x2 - 140) * s * d;
            const x1 = centerX + Math.min(offsetX1, offsetX2);
            const x2 = centerX + Math.max(offsetX1, offsetX2);
            const y1 = drawY + (p.y1 - 360) * s;
            const y2 = drawY + (p.y2 - 360) * s;

            if (p.type === "circle") {
                const r = (x2 - x1) / 2;
                ctx.arc(centerX + offsetX1 + (offsetX2 - offsetX1)/2, y1 + (y2 - y1)/2, Math.abs(r), 0, Math.PI * 2);
                ctx.fillStyle = stats.color; ctx.fill(); ctx.stroke();
            } else if (p.isEye) {
                ctx.fillStyle = "yellow"; ctx.fillRect(x1, y1, x2 - x1, y2 - y1);
            } else {
                ctx.strokeStyle = "black"; ctx.lineWidth = p.w + (4 * s); ctx.stroke();
                ctx.beginPath(); ctx.strokeStyle = stats.color; ctx.lineWidth = p.w;
                ctx.moveTo(centerX + offsetX1, y1); ctx.lineTo(centerX + offsetX2, y2); ctx.stroke();
            }
        });

       // 腕・回転レイヤー
// 腕・回転レイヤー
        ctx.save();
        ctx.translate(drawX + (20 * d * s), drawY + (160 - 350) * s);
        
        // 敵の場合は armAngle が渡されないことがあるため、攻撃中は腕を前に突き出す角度（例: 0度や動的な角度）にする
        let currentArmAngle = armAngle || 0;

        
        ctx.rotate((-90 + (currentArmAngle * d)) * Math.PI / 180);
        
        // 腕の丸パーツ
        ctx.beginPath(); 
        ctx.arc(0, 0, 8 * s, 0, Math.PI * 2); 
        ctx.fillStyle = stats.color; 
        ctx.fill();
        
        // 腕の棒パーツ
        ctx.beginPath(); 
        ctx.strokeStyle = stats.color; 
        ctx.lineWidth = 6 * s; 
        ctx.lineCap = "round";
        ctx.moveTo(0, 0); 
        ctx.lineTo(40 * s, 0); 
        ctx.stroke();

        // ★【重要】必ずここで新しいパスを切ってからビームソードを描画する
        const isPlayerAttacking = (window.player && window.player.state === "SWORD_ATTACK" && stats === window.player.stats);
        const isEnemyAttacking = (window.enemy && window.enemy.state === "ENEMY_SWORD_ATTACK" && stats === window.enemy.stats);

        if (isPlayerAttacking || isEnemyAttacking) {
            ctx.beginPath(); // パスを分離して縦線化を防ぐ
            ctx.strokeStyle = "yellow"; 
            ctx.lineWidth = 8 * s;
            ctx.lineCap = "round";
            ctx.moveTo(40 * s, 0); // 腕の先端から伸ばす
            ctx.lineTo(160 * s, 0); 
            ctx.stroke();
        }
        ctx.restore();
    },

drawBarrier: function(x, y, stats, direction) {
        const ctx = this.ctx;
        if (!ctx) return;
        
        let s = 1.0;
        if (stats) {
            if (typeof stats === 'object') {
                const sizeMap = { "SS": 1, "S": 2, "M": 3, "L": 4, "LL": 5 };
                const sizeMapKey = stats.size || "M";
                const sizeFactor = (sizeMap[sizeMapKey] || 3) / 3;
                s = (stats.scale || 1.0) * sizeFactor;
            } else if (typeof stats === 'number') {
                s = stats;
            }
        }

        // 左右の向き（1 または -1）
        const d = (direction !== undefined) ? direction : 1;

        // 機体全体の中心高さを計算
        const headTopY = y + (100 - 200) * s; 
        const footBottomY = y + (150 - 200) * s; 
        let centerYOffset = (headTopY + footBottomY) / 2 - y;

        if (stats && (stats.size === "LL" || stats.size === "L")) {
            centerYOffset -= (15 * s); 
        }

        const radiusX = 30 * s; 
        const radiusY = ((footBottomY - headTopY) / 2) * 3; 

        ctx.save();
        
        // ★ビームソードの描き方に合わせ、機体の足元位置 (x, y) に原点を移動し、向き (d) に合わせて反転させる
        ctx.translate(x, y);
        ctx.scale(d, 1); // これにより、右向きでも左向きでも常に「機体から見て同じ相対位置」になる

        // 進行方向と逆向きへ10pxずらす（反転を考慮しているので、常に後ろ側にいけばOK）
        const offsetX = -10 * s; 

        ctx.lineWidth = 4;
        ctx.strokeStyle = "#00ffff"; // シアンのエッジ
        ctx.fillStyle = "rgba(255, 2, 247, 0.2)"; // 半透明のマゼンタ

        // 楕円ドームを描画
        ctx.beginPath();
        ctx.ellipse(offsetX, centerYOffset, radiusX +25 , radiusY, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fill();

        ctx.restore();
    },

    updateEnBar: function(currentEn) {
        const bar = document.getElementById('en-bar');
        if (!bar) return;
        const percent = Math.min((currentEn / 500) * 100, 100);
        bar.style.width = percent + "%";
        if (currentEn < 200) bar.style.backgroundColor = "white";
        else if (currentEn < 300) bar.style.backgroundColor = "yellow";
        else if (currentEn < 450) bar.style.backgroundColor = "red";
        else bar.style.backgroundColor = "purple";
    },

    // render.js 内の Renderer オブジェクトに追加
  updateHpBar: function(currentHp, maxHp) {
    const bar = document.getElementById('hp-bar');
    if (!bar) return;
    // HPの割合を計算
    const percent = Math.max(0, Math.min((currentHp / maxHp) * 100, 100));
    bar.style.width = percent + "%";
      // HPの残量に応じて色を変える（直感的で分かりやすいです）
    if (percent > 60) bar.style.backgroundColor = "green";
    else if (percent > 30) bar.style.backgroundColor = "yellow";
    else bar.style.backgroundColor = "red";
   } 

};





