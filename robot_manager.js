// robot_manager.js
const RobotManager = {
    // IDから機体データを取得
    getRobot: function(slotId) {
        const data = localStorage.getItem(`robot_slot_${slotId}`);
        return data ? JSON.parse(data) : null;
    },

    // バトル結果に基づき機体を成長させる
    grow: function(slotId, isWin) {
        const robot = this.getRobot(slotId);
        if (!robot) return;

        // ルールに基づき加算
        const add = isWin ? RobotRules.WIN_EXP : RobotRules.LOSE_EXP;
        robot.brainLevel = Math.min((robot.brainLevel || 0) + add, RobotRules.MAX_LEVEL);

        this.saveRobot(slotId, robot);
    },

    // 改造や成長後のデータを保存（上限チェック付き）
    saveRobot: function(slotId, robot) {
        // ステータスの上限999を適用
        robot.atk = Math.min(robot.atk || 0, RobotRules.MAX_STAT);
        robot.def = Math.min(robot.def || 0, RobotRules.MAX_STAT);
        robot.spd = Math.min(robot.spd || 0, RobotRules.MAX_STAT);

        localStorage.setItem(`robot_slot_${slotId}`, JSON.stringify(robot));
    }
};





