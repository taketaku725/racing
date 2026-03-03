// ===== 画面取得 =====
const oddsScreen = document.getElementById("oddsScreen");
const raceScreen = document.getElementById("raceScreen");
const resultScreen = document.getElementById("resultScreen");

const raceInfo = document.getElementById("raceInfo");
const horseList = document.getElementById("horseList");

document.getElementById("startRaceBtn").onclick = () => {
  oddsScreen.classList.remove("active");
  raceScreen.classList.add("active");
};

document.getElementById("backBtn").onclick = () => {
  resultScreen.classList.remove("active");
  oddsScreen.classList.add("active");
};

// ===== 基本データ =====
const firstParts = ["トウカイ","ゴールド","ミホノ","サクラ","メジロ","ナリタ","シンボリ","タマモ"];
const lastParts  = ["テイオー","シップ","ブルボン","スター","キング","ボルト","クラウン","ドラゴン"];

const tracks = ["芝","ダート"];
const weathers = ["晴","雨"];
const distances = [1200, 2400, 3600];

let horses = [];
let raceSetting = {};

// ===== 初期化 =====
initRace();

function initRace(){
  generateRaceSetting();
  generateHorses();
  calculateOdds();
  renderOddsScreen();
}

// ===== レース条件生成 =====
function generateRaceSetting() {
  raceSetting.distance = distances[Math.floor(Math.random()*distances.length)];
  raceSetting.track = tracks[Math.floor(Math.random()*tracks.length)];
  raceSetting.weather = weathers[Math.floor(Math.random()*weathers.length)];
}

function getRaceTime(){
  if(raceSetting.distance === 1200) return 20;
  if(raceSetting.distance === 2400) return 30;
  return 40;
}

// ===== 馬生成 =====
function generateHorses() {

  horses = [];

  // シャッフル
  const shuffledFirst = shuffle([...firstParts]);
  const shuffledLast  = shuffle([...lastParts]);

  for (let i = 0; i < 8; i++) {

    const baseStats = {
      speed: rand(60,100),
      stamina: rand(60,100),
      acceleration: rand(60,100),
      stability: rand(60,100),
      guts: rand(60,100)
    };

    const horse = {
      name: shuffledFirst[i] + shuffledLast[i],
      ...baseStats,
      preferredTrack: tracks[Math.floor(Math.random()*tracks.length)],
      condition: rand(-10,10),
      strategy: "",
      winRate: 0,
      cups: 0
    };

    horse.strategy = decideStrategy(horse);

    horses.push(horse);
  }
}

function conditionLabel(value){

  if(value >= 8) return "絶好調";
  if(value >= 5) return "好調";
  if(value >= 2) return "やや好調";
  if(value >= -1) return "普通";
  if(value >= -4) return "やや不調";
  if(value >= -7) return "不調";
  return "絶不調";
}

// ===== 作戦決定 =====
function decideStrategy(h) {

  const front = h.speed + h.acceleration;
  const late  = h.stamina + h.guts;

  if (front > late + 20) return "逃げ";
  if (late > front + 20) return "追い込み";
  if (h.guts > 85) return "差し";
  return "先行";
}

// ===== オッズ生成 =====
function calculateOdds(){

  // 勝利回数リセット
  horses.forEach(h => h.winCount = 0);

  const SIM_COUNT = 100;

  for(let i=0;i<SIM_COUNT;i++){
    const winnerIndex = simulateRace();
    horses[winnerIndex].winCount++;
  }

  // 勝率算出
  horses.forEach(h=>{
    h.winRate = h.winCount / SIM_COUNT;
  });

  assignCups();
}

function simulateRace(){

  // 仮コピー（本番データを壊さない）
  const simHorses = horses.map(h=>({
    ...h,
    distance: 0,
    staminaLeft: h.stamina
  }));

  const totalTime = getRaceTime(); // 秒
  const dt = 0.2;
  const steps = totalTime / dt;

  for(let t=0;t<steps;t++){

    simHorses.forEach(h=>{

      let baseSpeed = h.speed;

      // 調子補正
      baseSpeed += h.condition;

      // 馬場補正
      if(raceSetting.track === h.preferredTrack) baseSpeed += 5;

      // 雨補正
      if(raceSetting.weather === "雨"){
        if(h.preferredTrack === "ダート") baseSpeed += 3;
        if(h.preferredTrack === "芝") baseSpeed -= 3;
      }

      // スタミナ消耗
      h.staminaLeft -= 0.1;
      if(h.staminaLeft < 30){
        baseSpeed -= 10;
      }

      // 終盤補正
      if(h.distance > 0.8){
        baseSpeed += h.guts * 0.05;
      }

      // 安定性ブレ
      const variance = (100 - h.stability) * 0.02;
      baseSpeed += (Math.random()*variance - variance/2);

      // 前半作戦補正
      if(h.strategy === "逃げ" && h.distance < 0.3){
        baseSpeed += 5;
      }
      if(h.strategy === "追い込み" && h.distance > 0.7){
        baseSpeed += 7;
      }

      // 前進
      h.distance += baseSpeed * 0.0005;
    });
  }

  // 最長距離の馬を返す
  simHorses.sort((a,b)=>b.distance - a.distance);
  return horses.findIndex(h=>h.name === simHorses[0].name);
}

function assignCups(){

  const topWinRate = Math.max(...horses.map(h=>h.winRate));

  horses.forEach(h=>{

    if(h.winRate === 0){
      h.cups = 10;
      return;
    }

    const ratio = topWinRate / h.winRate;

    let cups = Math.round(Math.sqrt(ratio) * 1.8);

    cups = Math.max(1, Math.min(10, cups));

    h.cups = cups;
  });
}

// ===== 表示 =====
function renderOddsScreen(){

  raceInfo.innerHTML = `
    距離: ${raceSetting.distance}m /
    馬場: ${raceSetting.track} /
    天候: ${raceSetting.weather}
  `;

  horseList.innerHTML = "";

  horses.forEach(h => {

    const div = document.createElement("div");
    div.style.borderBottom = "1px solid #555";
    div.style.padding = "8px 0";

    div.innerHTML = `
      <strong>${h.name}</strong>
      (${h.strategy})
      <br>
      得意:${h.preferredTrack}
      /
      調子:${conditionLabel(h.condition)}
      <br>
      杯数: ${h.cups}杯
    `;

    horseList.appendChild(div);
  });
}

// ===== ユーティリティ =====
function rand(min,max){
  return Math.floor(Math.random()*(max-min+1))+min;
}

function shuffle(array){
  for(let i=array.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [array[i],array[j]]=[array[j],array[i]];
  }
  return array;
}

// ===== PWA =====
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
