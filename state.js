// state.js
window.GameState = {
    // プレイヤーのステータスと状態
    player: {
        x: 100, y: 300, spd: 50, hp: 500, en: 500,
        actionCount: 0, jumpCount: 0, isShielded: false,
        lastDir: 1
    },
    // 敵のステータスと状態
    enemy: {
        x: 300, y: 300, hp: 500, en: 500
    },
    // ゲーム全体の状態管理
    flags: {
        isLoopRunning: false,
        isEnBtnDown: false,
        isMusicPlaying: false
    },
    // 固定値（定数）
    config: {
        MAX_EN: 500,
        GROUND_Y: 380
    }
};