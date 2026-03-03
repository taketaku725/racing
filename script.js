// =======================================
// 画面取得
// =======================================
const oddsScreen = document.getElementById("oddsScreen");
const raceScreen = document.getElementById("raceScreen");
const resultScreen = document.getElementById("resultScreen");

const raceInfo = document.getElementById("raceInfo");
const horseList = document.getElementById("horseList");
const rankingDiv = document.getElementById("ranking");
const resultList = document.getElementById("resultList");

const canvas = document.getElementById("raceCanvas");
const ctx = canvas.getContext("2d");

// =======================================
// 基本データ
// =======================================
const firstParts = ["トウカイ","ゴールド","ミホノ","サクラ","メジロ","ナリタ","シンボリ","タマモ"];
const lastParts  = ["テイオー","シップ","ブルボン","スター","キング","ボルト","クラウン","ドラゴン"];

const tracks = ["芝","ダート"];
const weathers = ["晴","雨"];
const distances = [1200,2400,3600];

let horses = [];
let raceSetting = {};

let animationId;
let lastTimestamp = null;

// =======================================
// 初期化
// =======================================
initRace();

function initRace(){
  generateRaceSetting();
  generateHorses();
  calculateOdds();
  renderOddsScreen();
}

// =======================================
// レース条件
// =======================================
function generateRaceSetting(){
  raceSetting.distance = distances[rand(0,2)];
  raceSetting.track = tracks[rand(0,1)];
  raceSetting.weather = weathers[rand(0,1)];
}

// =======================================
// 馬生成
// =======================================
function generateHorses(){

  horses = [];

  const shuffledFirst = shuffle([...firstParts]);
  const shuffledLast  = shuffle([...lastParts]);

  for(let i=0;i<8;i++){

    const horse = {
      name: shuffledFirst[i] + shuffledLast[i],
      speed: rand(70,95),
      stamina: rand(70,95),
      acceleration: rand(70,95),
      stability: rand(70,95),
      guts: rand(70,95),
      preferredTrack: tracks[rand(0,1)],
      condition: rand(-10,10),
      strategy: "",
      winRate: 0,
      cups: 0
    };

    horse.strategy = decideStrategy(horse);

    horses.push(horse);
  }
}

// =======================================
function decideStrategy(h){
  const front = h.speed + h.acceleration;
  const late  = h.stamina + h.guts;

  if(front > late + 20) return "逃げ";
  if(late > front + 20) return "追い込み";
  if(h.guts > 85) return "差し";
  return "先行";
}

// =======================================
// 裏シミュ100回
// =======================================
function calculateOdds(){

  horses.forEach(h=>h.winCount=0);

  for(let i=0;i<1000;i++){
    const winner = simulateRace();
    horses[winner].winCount++;
  }

  horses.forEach(h=>{
    h.winRate = h.winCount/1000;
  });

  assignCups();
}

function simulateRace(){

  const sim = horses.map(h=>({
    ...h,
    distance:0,
    staminaLeft:h.stamina
  }));

  while(sim.some(h=>h.distance < raceSetting.distance)){

    sim.forEach(h=>{

      if(h.distance >= raceSetting.distance) return;

      let speed = h.speed + h.condition;

      if(raceSetting.track===h.preferredTrack) speed+=5;

      if(raceSetting.weather==="雨"){
        if(h.preferredTrack==="ダート") speed+=3;
        if(h.preferredTrack==="芝") speed-=3;
      }

      h.staminaLeft -= 1;
      if(h.staminaLeft<30) speed-=10;

      if(h.distance > raceSetting.distance*0.8)
        speed += h.guts*0.1;

      const variance=(100-h.stability)*0.1;
      speed += (Math.random()*variance-variance/2);

      h.distance += speed*0.2;
    });
  }

  sim.sort((a,b)=>b.distance-a.distance);
  return horses.findIndex(h=>h.name===sim[0].name);
}

// =======================================
function assignCups(){

  const top = Math.max(...horses.map(h=>h.winRate));

  horses.forEach(h=>{

    if(h.winRate===0){
      h.cups=10;
      return;
    }

    const diff = top - h.winRate;
    let cups = 1 + Math.round(diff*15);

    cups = Math.max(1,Math.min(10,cups));
    h.cups=cups;
  });
}

// =======================================
// 表示
// =======================================
function renderOddsScreen(){

  raceInfo.innerHTML =
    `距離:${raceSetting.distance}m /
     馬場:${raceSetting.track} /
     天候:${raceSetting.weather}`;

  horseList.innerHTML="";

  horses.forEach((h,index)=>{

    const div=document.createElement("div");
    div.style.borderBottom="1px solid #555";
    div.style.padding="8px 0";

    div.innerHTML=`
      <strong style="color:${getHorseColor(index)}">
        ${h.name}
      </strong>
      (${h.strategy})<br>
      得意:${h.preferredTrack} /
      調子:${conditionLabel(h.condition)}<br>
      杯数:${h.cups}杯
    `;

    horseList.appendChild(div);
  });
}

// =======================================
function conditionLabel(v){
  if(v>=8) return "絶好調";
  if(v>=5) return "好調";
  if(v>=2) return "やや好調";
  if(v>=-1) return "普通";
  if(v>=-4) return "やや不調";
  if(v>=-7) return "不調";
  return "絶不調";
}

// =======================================
// レース開始
// =======================================
document.getElementById("startRaceBtn").onclick=()=>{
  oddsScreen.classList.remove("active");
  raceScreen.classList.add("active");
  startRace();
};

function startRace(){

  horses.forEach((h, i)=>{
    h.distance=0;
    h.staminaLeft=h.stamina;
    h.finished=false;

    h.laneOffset = 40;
  });

  lastTimestamp=null;
  animationId=requestAnimationFrame(raceLoop);
}

// =======================================
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
    finishRace();
  }
}

// =======================================
function updateHorses(dt){

  horses.forEach(h => {

    if(h.finished) return;

    // =========================
    // 基本速度
    // =========================
    let speed = h.speed + h.condition;

    // 馬場補正
    if(raceSetting.track === h.preferredTrack){
      speed += 4;
    }

    // 雨補正
    if(raceSetting.weather === "雨"){
      if(h.preferredTrack === "ダート") speed += 2;
      if(h.preferredTrack === "芝") speed -= 2;
    }

    // =========================
    // スタミナ減衰
    // =========================
    h.staminaLeft -= 8 * dt;

    if(h.staminaLeft < 30){
      speed -= 12;
    }

    // =========================
    // 終盤補正（残り20%）
    // =========================
    if(h.distance > raceSetting.distance * 0.8){
      speed += h.guts * 0.08;
    }

    // =========================
    // 安定性ブレ
    // =========================
    const variance = (100 - h.stability) * 0.08;
    speed += (Math.random() * variance - variance / 2);

    // =========================
    // 作戦補正
    // =========================
    if(h.strategy === "逃げ" && h.distance < raceSetting.distance * 0.3){
      speed += 10;
    }

    if(h.strategy === "追い込み" && h.distance > raceSetting.distance * 0.7){
      speed += 14;
    }

    // =========================
    // 抜き判定（前方20m以内）
    // =========================
    const ahead = horses.find(o =>
      o !== h &&
      !o.finished &&
      o.distance > h.distance &&
      o.distance - h.distance < 20
    );

    if(ahead){
      // 外へ回避（はみ出さない）
      h.laneOffset += 60 * dt;
    }else{
      // 徐々に内へ戻る
      h.laneOffset -= 30 * dt;
    }

    // コース幅制限（0〜40）
    if(h.laneOffset < 0) h.laneOffset = 0;
    if(h.laneOffset > 40) h.laneOffset = 40;

    // =========================
    // 前進（秒速換算）
    // =========================
    h.distance += speed * dt;

    if(h.distance >= raceSetting.distance){
      h.distance = raceSetting.distance;
      h.finished = true;
    }
  });
}

// =======================================
function drawRace(){

  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;

  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0,0,w,h);

  const trackWidth = 40;   // コース幅（一定）

  const radius = h * 0.3;
  const straight = w - radius*2 - 40;

  const left = 20;
  const top = h/2 - radius;

  ctx.fillStyle="#1a1a1a";
  ctx.fillRect(0,0,w,h);

  // ===== 外ラチ =====
  ctx.beginPath();
  ctx.moveTo(left + radius, top);
  ctx.lineTo(left + radius + straight, top);
  ctx.arc(left + radius + straight, top + radius, radius, -Math.PI/2, Math.PI/2);
  ctx.lineTo(left + radius, top + radius*2);
  ctx.arc(left + radius, top + radius, radius, Math.PI/2, -Math.PI/2);
  ctx.closePath();

  ctx.fillStyle = raceSetting.track==="芝" ? "#2e7d32" : "#8b5a2b";
  ctx.fill();

  // ===== 内ラチ =====
  const innerR = radius - trackWidth;

  ctx.globalCompositeOperation="destination-out";
  ctx.beginPath();
  ctx.moveTo(left + radius, top + trackWidth);
  ctx.lineTo(left + radius + straight, top + trackWidth);
  ctx.arc(left + radius + straight, top + radius, innerR, -Math.PI/2, Math.PI/2);
  ctx.lineTo(left + radius, top + radius*2 - trackWidth);
  ctx.arc(left + radius, top + radius, innerR, Math.PI/2, -Math.PI/2);
  ctx.closePath();
  ctx.fill();
  ctx.globalCompositeOperation="source-over";

  ctx.strokeStyle="white";
  ctx.lineWidth=2;
  ctx.stroke();

  // ===== 馬描画 =====
  horses.forEach((h,i)=>{

    const pos = getPositionOnTrack(h.distance, left, top, radius, straight);

    const lane = Math.max(0, Math.min(trackWidth, h.laneOffset));

    const offsetRatio = lane / trackWidth;

    // 外側→内側へ寄る
    const offsetX = pos.normalX * lane;
    const offsetY = pos.normalY * lane;

    const x = pos.x + offsetX;
    const y = pos.y + offsetY;

    ctx.fillStyle="rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.arc(x+3,y+3,6,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle=getHorseColor(i);
    ctx.beginPath();
    ctx.arc(x,y,6,0,Math.PI*2);
    ctx.fill();
  });
}

function getPositionOnTrack(distance, left, top, radius, straight){

  const lapLength = 2*straight + 2*Math.PI*radius;
  const d = distance % lapLength;

  // 上直線
  if(d < straight){
    return {
      x: left + radius + d,
      y: top,
      normalX: 0,
      normalY: 1
    };
  }

  // 右カーブ
  if(d < straight + Math.PI*radius){
    const angle = -Math.PI/2 + (d - straight)/radius;
    return {
      x: left + radius + straight + radius*Math.cos(angle),
      y: top + radius + radius*Math.sin(angle),
      normalX: -Math.cos(angle),
      normalY: -Math.sin(angle)
    };
  }

  // 下直線
  if(d < straight*2 + Math.PI*radius){
    return {
      x: left + radius + straight - (d - straight - Math.PI*radius),
      y: top + radius*2,
      normalX: 0,
      normalY: -1
    };
  }

  // 左カーブ
  const angle = Math.PI/2 + (d - straight*2 - Math.PI*radius)/radius;
  return {
    x: left + radius + radius*Math.cos(angle),
    y: top + radius + radius*Math.sin(angle),
    normalX: -Math.cos(angle),
    normalY: -Math.sin(angle)
  };
}

// =======================================
function updateRanking(){

  const sorted=[...horses]
    .sort((a,b)=>b.distance-a.distance);

  rankingDiv.innerHTML=sorted.map((h,i)=>{

    const index=horses.findIndex(x=>x.name===h.name);
    const color=getHorseColor(index);

    return `<span style="color:${color}">
              ${i+1}位 ${h.name}
            </span>`;
  }).join("<br>");
}

// =======================================
function finishRace(){

  cancelAnimationFrame(animationId);

  const result=[...horses]
    .sort((a,b)=>b.distance-a.distance);

  raceScreen.classList.remove("active");
  resultScreen.classList.add("active");

  resultList.innerHTML=result.map((h,i)=>{

    const index=horses.findIndex(x=>x.name===h.name);
    const color=getHorseColor(index);

    return `<span style="color:${color}">
              ${i+1}位 ${h.name}
            </span>`;
  }).join("<br>");
}

// =======================================
function getHorseColor(i){
  const colors=[
    "#ff5252","#ff9800","#ffee58","#66bb6a",
    "#42a5f5","#ab47bc","#ec407a","#26c6da"
  ];
  return colors[i];
}

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
