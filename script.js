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
    h.winRate = h.winCount/100;
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
    let cups = 1 + Math.round(diff*25);

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

  horses.forEach(h=>{
    h.distance=0;
    h.staminaLeft=h.stamina;
    h.finished=false;
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

  horses.forEach(h=>{

    if(h.finished) return;

    let speed=h.speed+h.condition;

    if(raceSetting.track===h.preferredTrack) speed+=5;

    if(raceSetting.weather==="雨"){
      if(h.preferredTrack==="ダート") speed+=3;
      if(h.preferredTrack==="芝") speed-=3;
    }

    h.staminaLeft-=10*dt;
    if(h.staminaLeft<30) speed-=15;

    if(h.distance>raceSetting.distance*0.8)
      speed+=h.guts*0.1;

    const variance=(100-h.stability)*0.1;
    speed+=(Math.random()*variance-variance/2);

    h.distance+=speed*dt;

    if(h.distance>=raceSetting.distance){
      h.distance=raceSetting.distance;
      h.finished=true;
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

  const cx = w/2;
  const cy = h/2;

  const outerRx = w*0.42;
  const outerRy = h*0.32;
  const innerRx = w*0.30;
  const innerRy = h*0.22;

  ctx.fillStyle="#1a1a1a";
  ctx.fillRect(0,0,w,h);

  // トラック
  ctx.beginPath();
  ctx.ellipse(cx,cy,outerRx,outerRy,0,0,Math.PI*2);
  ctx.fillStyle = raceSetting.track==="芝" ? "#2e7d32" : "#8b5a2b";
  ctx.fill();

  ctx.globalCompositeOperation="destination-out";
  ctx.beginPath();
  ctx.ellipse(cx,cy,innerRx,innerRy,0,0,Math.PI*2);
  ctx.fill();
  ctx.globalCompositeOperation="source-over";

  ctx.strokeStyle="white";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.ellipse(cx,cy,outerRx,outerRy,0,0,Math.PI*2);
  ctx.stroke();

  ctx.beginPath();
  ctx.ellipse(cx,cy,innerRx,innerRy,0,0,Math.PI*2);
  ctx.stroke();

  const midRxBase = (outerRx+innerRx)/2;
  const midRyBase = (outerRy+innerRy)/2;

  // ゴール線（最終周の半分以降）
  const leader = [...horses].sort((a,b)=>b.distance-a.distance)[0];
  const finalLapStart = raceSetting.distance - 1200;

  if(leader.distance > finalLapStart + 600){

    ctx.strokeStyle="#ff4444";
    ctx.lineWidth=4;

    const angle = 0; // 右側固定
    const x1 = cx + innerRx * Math.cos(angle);
    const y1 = cy + innerRy * Math.sin(angle);
    const x2 = cx + outerRx * Math.cos(angle);
    const y2 = cy + outerRy * Math.sin(angle);

    ctx.beginPath();
    ctx.moveTo(x1,y1);
    ctx.lineTo(x2,y2);
    ctx.stroke();
  }

  // 馬描画
  horses.forEach((h,i)=>{

    const lapProgress = h.distance / 1200;
    const angle = (lapProgress % 1) * Math.PI*2;

    const midRx = midRxBase + h.laneOffset;
    const midRy = midRyBase + h.laneOffset*0.7;

    const x = cx + midRx * Math.cos(angle);
    const y = cy + midRy * Math.sin(angle);

    ctx.fillStyle="rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.arc(x+3,y+3,7,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle=getHorseColor(i);
    ctx.beginPath();
    ctx.arc(x,y,7,0,Math.PI*2);
    ctx.fill();
  });
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
