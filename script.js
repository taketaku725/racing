// ======================================
// DOM取得
// ======================================
const oddsScreen = document.getElementById("oddsScreen");
const raceScreen = document.getElementById("raceScreen");
const resultScreen = document.getElementById("resultScreen");

const raceInfo = document.getElementById("raceInfo");
const horseList = document.getElementById("horseList");
const rankingDiv = document.getElementById("ranking");
const resultList = document.getElementById("resultList");

const canvas = document.getElementById("raceCanvas");
const ctx = canvas.getContext("2d");

// ======================================
// 定数
// ======================================
const TRACK_WIDTH = 40; // コース幅
const COLORS = [
  "#ff5252","#ff9800","#ffee58","#66bb6a",
  "#42a5f5","#ab47bc","#ec407a","#26c6da"
];

let horses = [];
let raceSetting = {};
let animationId;
let lastTimestamp = null;

// ======================================
// 初期化
// ======================================
initRace();

function initRace(){
  generateRaceSetting();
  generateHorses();
  calculateOdds();
  renderOddsScreen();
}

// ======================================
// レース条件
// ======================================
function generateRaceSetting(){

  raceSetting.distance = [1200,2400,3600][rand(0,2)];

  // ダート20%
  raceSetting.track = Math.random() < 0.2 ? "ダート" : "芝";

  raceSetting.weather = Math.random() < 0.5 ? "晴" : "雨";
}

// ======================================
// 馬生成（作戦→能力）
// ======================================
function generateHorses(){

  horses = [];

  const firstParts = ["トウカイ","ゴールド","ミホノ","サクラ","メジロ","ナリタ","シンボリ","タマモ"];
  const lastParts  = ["テイオー","シップ","ブルボン","スター","キング","ボルト","クラウン","ドラゴン"];

  const shuffledFirst = shuffle([...firstParts]);
  const shuffledLast  = shuffle([...lastParts]);

  for(let i=0;i<8;i++){

    const strategies = ["逃げ","先行","差し","追い込み"];
    const strategy = strategies[rand(0,3)];

    const horse = {
      name: shuffledFirst[i] + shuffledLast[i],
      strategy: strategy,
      preferredTrack: Math.random() < 0.25 ? "ダート" : "芝",
      condition: rand(-10,10),
      winRate:0,
      cups:0
    };

    applyStrategyStats(horse);
    horses.push(horse);
  }
}

function applyStrategyStats(h){

  switch(h.strategy){

    case "逃げ":
      h.speed=rand(85,95);
      h.acceleration=rand(80,95);
      h.stamina=rand(70,85);
      h.stability=rand(75,90);
      h.guts=rand(70,85);
      break;

    case "先行":
      h.speed=rand(80,90);
      h.acceleration=rand(75,85);
      h.stamina=rand(80,90);
      h.stability=rand(80,90);
      h.guts=rand(75,85);
      break;

    case "差し":
      h.speed=rand(75,85);
      h.acceleration=rand(75,90);
      h.stamina=rand(80,90);
      h.stability=rand(75,90);
      h.guts=rand(85,95);
      break;

    case "追い込み":
      h.speed=rand(70,85);
      h.acceleration=rand(85,95);
      h.stamina=rand(85,95);
      h.stability=rand(70,85);
      h.guts=rand(85,95);
      break;
  }
}

// ======================================
// オッズ（1000回）
// ======================================
function calculateOdds(){

  horses.forEach(h=>h.winCount=0);

  for(let i=0;i<1000;i++){
    const winner = simulateRace();
    horses[winner].winCount++;
  }

  horses.forEach(h=>{
    h.winRate = h.winCount / 1000;
  });

  assignCups();
}

function simulateRace(){

  const sim = horses.map(h=>({...h,distance:0,staminaLeft:h.stamina}));

  while(sim.some(h=>h.distance < raceSetting.distance)){

    sim.forEach(h=>{

      if(h.distance >= raceSetting.distance) return;

      let speed = h.speed + h.condition;

      if(raceSetting.track===h.preferredTrack) speed+=4;

      h.staminaLeft -= 1;
      if(h.staminaLeft < 30) speed -= 10;

      if(h.distance > raceSetting.distance*0.8)
        speed += h.guts*0.1;

      speed += (Math.random()*4 - 2);

      h.distance += speed*0.2;
    });
  }

  sim.sort((a,b)=>b.distance-a.distance);
  return horses.findIndex(h=>h.name===sim[0].name);
}

function assignCups(){

  const top = Math.max(...horses.map(h=>h.winRate));

  horses.forEach(h=>{
    const diff = top - h.winRate;
    let cups = 1 + Math.round(diff * 8);
    cups = Math.max(1,Math.min(10,cups));
    h.cups=cups;
  });
}

// ======================================
// オッズ画面描画
// ======================================
function renderOddsScreen(){

  raceInfo.innerHTML =
    `距離:${raceSetting.distance}m /
     馬場:${raceSetting.track} /
     天候:${raceSetting.weather}`;

  horseList.innerHTML="";

  horses.forEach((h,i)=>{

    const div=document.createElement("div");
    div.style.padding="6px 0";

    div.innerHTML=`
      <strong style="color:${COLORS[i]}">
        ${h.name}
      </strong> ${h.cups}杯<br>
      得意:${h.preferredTrack} ${h.strategy}<br>
      調子:${conditionLabel(h.condition)}
    `;

    horseList.appendChild(div);
  });
}

function conditionLabel(v){
  if(v>=8) return "絶好調";
  if(v>=5) return "好調";
  if(v>=2) return "やや好調";
  if(v>=-1) return "普通";
  if(v>=-4) return "やや不調";
  if(v>=-7) return "不調";
  return "絶不調";
}

// ======================================
// レース開始
// ======================================
document.getElementById("startRaceBtn").onclick=()=>{
  oddsScreen.classList.remove("active");
  raceScreen.classList.add("active");
  startRace();
};

document.getElementById("backBtn").onclick=()=>{
  resultScreen.classList.remove("active");
  oddsScreen.classList.add("active");
  initRace();
};

function startRace(){

  horses.forEach((h,i)=>{
    h.distance = 0;
    h.prevDistance = 0;
    h.lapCount = 0;
    h.finished = false;
    h.staminaLeft = h.stamina;

    h.laneOffset = TRACK_WIDTH - 10; // 外側スタート
    h.lockedInside = false;
  });

  countdownAndStart();
}

function countdownAndStart(){

  let count = 3;

  const interval = setInterval(()=>{

    drawRace();
    ctx.fillStyle="white";
    ctx.font="bold 60px sans-serif";
    ctx.textAlign="center";
    ctx.fillText(count>0?count:"GO!",canvas.width/2,canvas.height/2);

    count--;

    if(count < -1){
      clearInterval(interval);
      lastTimestamp=null;
      animationId=requestAnimationFrame(raceLoop);
    }

  },1000);
}

// ======================================
// メインループ
// ======================================
function raceLoop(timestamp){

  if(!lastTimestamp) lastTimestamp=timestamp;
  const dt=(timestamp-lastTimestamp)/1000;
  lastTimestamp=timestamp;

  updateHorses(dt);
  drawRace();
  updateRanking();

  if(!horses.every(h=>h.finished)){
    animationId=requestAnimationFrame(raceLoop);
  }else{
    setTimeout(finishRace,1500);
  }
}

// ======================================
// 馬の挙動
// ======================================
function updateHorses(dt){

  // 現在順位取得
  const sorted = [...horses].sort((a,b)=>b.distance-a.distance);

  horses.forEach(h=>{

    if(h.finished) return;

    let speed = h.speed + h.condition;

    if(raceSetting.track===h.preferredTrack) speed+=4;

    h.staminaLeft -= 8*dt;
    if(h.staminaLeft<30) speed-=12;

    if(h.distance>raceSetting.distance*0.8)
      speed+=h.guts*0.08;

    speed += (Math.random()*4-2);

    // =========================
    // 内側キープロジック
    // =========================

    if(!h.lockedInside){
      h.laneOffset -= 25*dt; // 常に内へ戻る力
    }

    // 半分より内に入ったらロック
    if(h.laneOffset < TRACK_WIDTH/2){
      h.lockedInside = true;
    }

    // 1位以外だけ左右揺れ
    if(sorted[0] !== h){
      const sway = Math.sin(performance.now()/200 + h.speed)*2;
      h.laneOffset += sway*dt;
    }

    if(h.lockedInside && h.laneOffset > TRACK_WIDTH/2){
      h.laneOffset = TRACK_WIDTH/2;
    }

    if(h.laneOffset < 0) h.laneOffset = 0;
    if(h.laneOffset > TRACK_WIDTH-8) h.laneOffset = TRACK_WIDTH-8;

    // =========================

    h.distance += speed*dt;

    // ゴール判定（ゴール線踏んだ回数）
    const requiredLaps = raceSetting.distance / 1200;

    const lapLength = trackLapLength();
    const prevLap = Math.floor(h.prevDistance / lapLength);
    const currentLap = Math.floor(h.distance / lapLength);

    if(currentLap > prevLap){
      h.lapCount++;
    }

    if(h.lapCount >= requiredLaps){
      h.finished = true;
    }

    h.prevDistance = h.distance;
  });
}

// ======================================
// コース描画（ラウンド長方形）
// ======================================
function drawRace(){

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0,0,w,h);

  // =============================
  // コース形状パラメータ
  // =============================
  const radius = h * 0.3;
  const straight = w - radius*2 - 40;

  const left = 20;
  const top = h/2 - radius;

  const rightX = left + radius + straight;

  ctx.fillStyle = "#1a1a1a";
  ctx.fillRect(0,0,w,h);

  // =============================
  // 外ラチ
  // =============================
  ctx.beginPath();
  ctx.moveTo(left+radius, top);
  ctx.lineTo(left+radius+straight, top);
  ctx.arc(left+radius+straight, top+radius, radius, -Math.PI/2, Math.PI/2);
  ctx.lineTo(left+radius, top+radius*2);
  ctx.arc(left+radius, top+radius, radius, Math.PI/2, -Math.PI/2);
  ctx.closePath();

  ctx.fillStyle = raceSetting.track === "芝" ? "#2e7d32" : "#8b5a2b";
  ctx.fill();

  // =============================
  // 内ラチ（くり抜き）
  // =============================
  const innerR = radius - TRACK_WIDTH;

  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.moveTo(left+radius, top+TRACK_WIDTH);
  ctx.lineTo(left+radius+straight, top+TRACK_WIDTH);
  ctx.arc(left+radius+straight, top+radius, innerR, -Math.PI/2, Math.PI/2);
  ctx.lineTo(left+radius, top+radius*2-TRACK_WIDTH);
  ctx.arc(left+radius, top+radius, innerR, Math.PI/2, -Math.PI/2);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation = "source-over";

  // =============================
  // スタート線（右下）
  // =============================
  ctx.strokeStyle = "yellow";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rightX, top+radius*2);
  ctx.lineTo(rightX, top+radius*2-TRACK_WIDTH);
  ctx.stroke();

  // =============================
  // ゴール線（右上）
  // =============================
  ctx.strokeStyle = "red";
  ctx.beginPath();
  ctx.moveTo(rightX, top);
  ctx.lineTo(rightX, top+TRACK_WIDTH);
  ctx.stroke();

  // =============================
  // 馬描画
  // =============================
  horses.forEach((h,i)=>{

    const pos = getTrackPosition(
      h.distance,
      left,
      top,
      radius,
      straight
    );

    const x = pos.x + pos.normalX * h.laneOffset;
    const y = pos.y + pos.normalY * h.laneOffset;

    // 影
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.arc(x+3,y+3,6,0,Math.PI*2);
    ctx.fill();

    // 本体
    ctx.fillStyle = COLORS[i];
    ctx.beginPath();
    ctx.arc(x,y,6,0,Math.PI*2);
    ctx.fill();
  });

  // =============================
  // コース情報表示
  // =============================
  ctx.fillStyle = "white";
  ctx.font = "14px sans-serif";
  ctx.textAlign = "left";

  ctx.fillText(
    `${raceSetting.distance}m / ${raceSetting.track} / ${raceSetting.weather}`,
    20,
    20
  );
}

function trackLapLength(){
  const radius = canvas.height*0.3;
  const straight = canvas.width - radius*2 - 40;
  return 2*straight + 2*Math.PI*radius;
}

// ======================================
function getTrackPosition(distance,left,top,radius,straight){

  const lap=2*straight+2*Math.PI*radius;
  const d=distance%lap;

  if(d<straight){
    return {x:left+radius+d,y:top,normalX:0,normalY:1};
  }

  if(d<straight+Math.PI*radius){
    const angle=-Math.PI/2+(d-straight)/radius;
    return {
      x:left+radius+straight+radius*Math.cos(angle),
      y:top+radius+radius*Math.sin(angle),
      normalX:-Math.cos(angle),
      normalY:-Math.sin(angle)
    };
  }

  if(d<straight*2+Math.PI*radius){
    return {
      x:left+radius+straight-(d-straight-Math.PI*radius),
      y:top+radius*2,
      normalX:0,
      normalY:-1
    };
  }

  const angle=Math.PI/2+(d-straight*2-Math.PI*radius)/radius;
  return {
    x:left+radius+radius*Math.cos(angle),
    y:top+radius+radius*Math.sin(angle),
    normalX:-Math.cos(angle),
    normalY:-Math.sin(angle)
  };
}

// ======================================
function updateRanking(){

  const sorted=[...horses].sort((a,b)=>b.distance-a.distance);

  rankingDiv.innerHTML=sorted.map((h,i)=>{

    const index=horses.findIndex(x=>x.name===h.name);
    return `<span style="color:${COLORS[index]}">
      ${i+1}位 ${h.name}
    </span>`;

  }).join("<br>");
}

function finishRace(){

  raceScreen.classList.remove("active");
  resultScreen.classList.add("active");

  const result=[...horses].sort((a,b)=>b.distance-a.distance);

  resultList.innerHTML=result.map((h,i)=>{
    const index=horses.findIndex(x=>x.name===h.name);
    return `<span style="color:${COLORS[index]}">
      ${i+1}位 ${h.name} ${h.cups}杯
    </span>`;
  }).join("<br>");
}

// ======================================
function rand(min,max){
  return Math.floor(Math.random()*(max-min+1))+min;
}

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j=Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

// =======================================
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("service-worker.js");
}
