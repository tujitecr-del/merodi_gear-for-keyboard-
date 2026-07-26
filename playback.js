// playback.js
const Playback = {
    audioCtx: null,
    masterGain: null,
    playTimeout: null,
    isPlaying: false,
    currentData: null,
    currentTempo: 0.2,

    init() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioCtx.createGain();
            this.masterGain.connect(this.audioCtx.destination);
            this.masterGain.gain.value = 0.1;
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    },

    stop() {
        this.isPlaying = false;
        clearTimeout(this.playTimeout);
        this.playTimeout = null;
    },

    // 外部から呼ぶためのメイン関数
    async play(jsonData, tempoSeconds = 0.2) {
    this.init();
    this.stop();
    
    this.currentData = jsonData;
    this.currentTempo = tempoSeconds * 1000;
    this.isPlaying = true;
    
    // --- 【修正】確実にコンマ区切りの配列にする ---
    let rawSeq = jsonData.sequence;
    let seq;
    
    if (Array.isArray(rawSeq)) {
        // 配列の場合：中身を結合して、改めてコンマで分割する（これでどんな形式でもOK）
        seq = rawSeq.join(',').split(',');
    } else {
        // 文字列の場合：そのまま分割
        seq = String(rawSeq).split(',');
    }
    // ----------------------------------------
    
    let i = 0;
    let currentWave = 'square';

    const step = () => {
        if (!this.isPlaying) return;
        if (i >= seq.length) i = 0;

        let val = seq[i].trim(); // 空白除去
        let waitTime = this.currentTempo;

        // 波形変更
        if (val.startsWith('[')) {
            currentWave = val.replace(/[\[\]]/g, '');
        } 
        // 音階処理
        else if (val !== '0' && val !== "" && val !== '-') {
            let note = Number(val);
            if (!isNaN(note)) {
                // '-' を探して長さを計算
                let durationCount = 1;
                while (i + 1 < seq.length && seq[i + 1].trim() === '-') {
                    durationCount++;
                    i++;
                }
                waitTime = durationCount * this.currentTempo;
                this.playNote(note, currentWave, waitTime - 20);
            }
        }

        i++;
        this.playTimeout = setTimeout(step, waitTime);
    };

    step();
},

    playNote(n, wave, duration) {
        if (isNaN(n) || !this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        osc.type = wave;
        osc.frequency.setValueAtTime(440 * Math.pow(2, (n - 69) / 12), this.audioCtx.currentTime);
        osc.connect(this.masterGain);
        osc.start();
        
        setTimeout(() => {
            try { osc.stop(); osc.disconnect(); } catch(e) {}
        }, duration);
    }
};