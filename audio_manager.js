// audio_manager.js

//このファイルを作ることで、
//ゲーム中に音を鳴らしたいときは se_AudioManager.play('[se]dash') と
//一行書くだけで済むようになります。

window.AudioManager = {
    // 効果音の定義
    se: {
        count0: new Audio('se/se_count-0.m4a'),
        count1: new Audio('se/se_count-1.m4a'),
        count2: new Audio('se/se_count-2.m4a'),
        count3: new Audio('se/se_count-3.m4a'),
        draw: new Audio('se/se_draw.m4a'),
        lose_a_battle: new Audio('se/se_lose_a_battle.m4a'),
        new_type: new Audio('se/se_new_type.m4a'),
        barrier: new Audio('se/se_ROBOT_barrier.m4a'),
        beam_sword: new Audio('se/se_ROBOT_beam_sword.m4a'),
        beam_gun: new Audio('se/se_ROBOT_Beamgunfiring.m4a'),
        damage: new Audio('se/se_ROBOT_damege.m4a'),
        dash: new Audio('se/se_ROBOT_dash.m4a'),
        charge: new Audio('se/se_ROBOT_EN_charge.m4a'),
        jump: new Audio('se/se_ROBOT_jump.m4a'),
        landing: new Audio('se/se_ROBOT_landing.m4a'),
        lose: new Audio('se/se_ROBOT_LOSE.m4a'),
        machinegun: new Audio('se/se_ROBOT_machinegun_short.m4a'),
        missile_exp: new Audio('se/se_ROBOT_missile_explosion.m4a'),
        missile_fire: new Audio('se/se_ROBOT_missile_firing.m4a'),
        special: new Audio('se/se_ROBOT_Special_move.m4a'),
        victory: new Audio('se/se_We_defeated_the_enemy.m4a')
      },

    // 指定した音をループ再生開始
    startLoop: function(key) {
        if (this.se[key]) {
            this.se[key].loop = true;
            this.se[key].play().catch(e => console.log("再生エラー:", e));
        }
    },

    // 指定した音を停止して巻き戻す
    stop: function(key) {
        if (this.se[key]) {
            this.se[key].pause();
            this.se[key].currentTime = 0;
        }
    },


    // 初期化設定（ループ音など）
    init: function() {
        this.se.charge.volume = 0.9;
        //this.se.charge.loop = true;
    },

    // 単発再生
    play: function(key) {
        if (this.se[key]) {
            this.se[key].currentTime = 0;
            this.se[key].play().catch(e => console.log(`音再生エラー (${key}):`, e));
        }
    },

    // ループ音の制御
    setLoop: function(key, isPlaying) {
        if (!this.se[key]) return;
        isPlaying ? this.se[key].play() : this.se[key].pause();
    },
};

// 初期化を実行
AudioManager.init();

//-------------------------------------------------------------

window.updateBgmDisplay = function() {
    const bgm = window.enemyStats?.bgmData;
    if (bgm) {
        // nullチェックを追加
        const title = document.getElementById('bgm-title');
        const comp = document.getElementById('bgm-composer');
        const comm = document.getElementById('bgm-comment');
        
        if (title) title.innerText = bgm.title || "不明";
        if (comp) comp.innerText = bgm.composer || "不明";
        if (comm) comm.innerText = bgm.comment || "特になし";
    }
};
//-------------------------------------------------------------


