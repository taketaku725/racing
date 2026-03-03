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

function initRace() {
  generateRaceSetting();
  generateHorses();
  renderOddsScreen();
}

// ===== レース条件生成 =====
function generateRaceSetting() {
  raceSetting.distance = distances[Math.floor(Math.random()*distances.length)];
  raceSetting.track = tracks[Math.floor(Math.random()*tracks.length)];
  raceSetting.weather = weathers[Math.floor(Math.random()*weathers.length)];
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

// ===== 作戦決定 =====
function decideStrategy(h) {

  const front = h.speed + h.acceleration;
  const late  = h.stamina + h.guts;

  if (front > late + 20) return "逃げ";
  if (late > front + 20) return "追い込み";
  if (h.guts > 85) return "差し";
  return "先行";
}

// ===== 表示 =====
function renderOddsScreen() {

  raceInfo.innerHTML = `
    距離: ${raceSetting.distance}m /
    馬場: ${raceSetting.track} /
    天候: ${raceSetting.weather}
  `;

  horseList.innerHTML = "";

  horses.forEach(h => {
    const div = document.createElement("div");
    div.style.borderBottom = "1px solid #555";
    div.style.padding = "6px 0";

    div.innerHTML = `
      <strong>${h.name}</strong>
      (${h.strategy})
      <br>
      SPD:${h.speed}
      STA:${h.stamina}
      ACC:${h.acceleration}
      STB:${h.stability}
      GUT:${h.guts}
      <br>
      得意:${h.preferredTrack}
      調子:${h.condition >=0 ? "+"+h.condition : h.condition}
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
