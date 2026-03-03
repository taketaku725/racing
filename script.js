// ===============================
// 画面取得
// ===============================
const oddsScreen = document.getElementById("oddsScreen");
const raceScreen = document.getElementById("raceScreen");
const resultScreen = document.getElementById("resultScreen");

const raceInfo = document.getElementById("raceInfo");
const horseList = document.getElementById("horseList");
const rankingDiv = document.getElementById("ranking");
const resultList = document.getElementById("resultList");

const canvas = document.getElementById("raceCanvas");
const ctx = canvas.getContext("2d");

// ===============================
// 基本データ
// ===============================
const firstParts = ["トウカイ","ゴールド","ミホノ","サクラ","メジロ","ナリタ","シンボリ","タマモ"];
const lastParts  = ["テイオー","シップ","ブルボン","スター","キング","ボルト","クラウン","ドラゴン"];

const tracks = ["芝","ダート"];
const weathers = ["晴","雨"];
const distances = [1200,2400,3600];

let horses = [];
let raceSetting = {};

let animationId;
let raceStartTime;

// ===============================
// 初期化
// ===============================
initRace();

function initRace(){
  generateRaceSetting();
  generateHorses();
  calculateOdds();
  renderOddsScreen();
}

// ===============================
// レース条件生成
// ===============================
function generateRaceSetting(){
  raceSetting.distance = distances[rand(0,distances.length-1)];
  raceSetting.track = tracks[rand(0,tracks.length-1)];
  raceSetting.weather = weathers[rand(0,weathers.length-1)];
}

// ===============================
// 馬生成
// ===============================
function generateHorses(){

  horses = [];

  const shuffledFirst = shuffle([...firstParts]);
  const shuffledLast  = shuffle([...lastParts]);

  for(let i=0;i<8;i++){

    const horse = {
      name: shuffledFirst[i] + shuffledLast[i],
      speed: rand(60,100),
      stamina: rand(60,100),
      acceleration: rand(60,100),
      stability: rand(60,100),
      guts: rand(60,100),
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

// ===============================
// 作戦決定
// ===============================
function decideStrategy(h){

  const front = h.speed + h.acceleration;
  const late  = h.stamina + h.guts;

  if(front > late + 20) return "逃げ";
  if(late > front + 20) return "追い込み";
  if(h.guts > 85) return "差し";
  return "先行";
}

// ===============================
// 裏シミュレーション100回
// ===============================
function calculateOdds(){

  horses.forEach(h=>h.winCount=0);

  const SIM_COUNT = 100;

  for(let i=0;i<SIM_COUNT;i++){
    const winnerIndex = simulateRace();
    horses[winnerIndex].winCount++;
  }

  horses.forEach(h=>{
    h.winRate = h.winCount / SIM_COUNT;
  });

  assignCups();
}

function simulateRace(){

  const simHorses = horses.map(h=>({
    ...h,
    distance:0,
    staminaLeft:h.stamina
  }));

  const totalTime = getRaceTime();
  const dt = 0.2;
  const steps = totalTime / dt;

  for(let t=0;t<steps;t++){

    simHorses.forEach(h=>{

      let baseSpeed = h.speed + h.condition;

      if(raceSetting.track === h.preferredTrack) baseSpeed += 5;

      if(raceSetting.weather === "雨"){
        if(h.preferredTrack==="ダート") baseSpeed+=3;
        if(h.preferredTrack==="芝") baseSpeed-=3;
      }

      h.staminaLeft -= 0.1;
      if(h.staminaLeft < 30) baseSpeed -= 10;

      if(h.distance > 0.8) baseSpeed += h.guts*0.05;

      const variance = (100-h.stability)*0.02;
      baseSpeed += (Math.random()*variance - variance/2);

      if(h.strategy==="逃げ" && h.distance<0.3) baseSpeed+=5;
      if(h.strategy==="追い込み" && h.distance>0.7) baseSpeed+=7;

      h.distance += baseSpeed*0.0005;
    });
  }

  simHorses.sort((a,b)=>b.distance-a.distance);
  return horses.findIndex(h=>h.name===simHorses[0].name);
}

// ===============================
// 杯数決定（トップ1杯方式）
// ===============================
function assignCups(){

  const topWinRate = Math.max(...horses.map(h=>h.winRate));

  horses.forEach(h=>{

    if(h.winRate===0){
      h.cups=10;
      return;
    }

    const ratio = topWinRate / h.winRate;
    let cups = Math.round(Math.sqrt(ratio)*1.8);

    cups = Math.max(1,Math.min(10,cups));
    h.cups = cups;
  });
}

// ===============================
// 表示
// ===============================
function renderOddsScreen(){

  raceInfo.innerHTML =
    `距離:${raceSetting.distance}m /
     馬場:${raceSetting.track} /
     天候:${raceSetting.weather}`;

  horseList.innerHTML="";

  horses.forEach(h=>{
    const div=document.createElement("div");
    div.style.borderBottom="1px solid #555";
    div.style.padding="8px 0";

    div.innerHTML=`
      <strong>${h.name}</strong> (${h.strategy})<br>
      得意:${h.preferredTrack} /
      調子:${conditionLabel(h.condition)}<br>
      杯数:${h.cups}杯
    `;

    horseList.appendChild(div);
  });
}

// ===============================
// 調子表示
// ===============================
function conditionLabel(v){
  if(v>=8) return "絶好調";
  if(v>=5) return "好調";
  if(v>=2) return "やや好調";
  if(v>=-1) return "普通";
  if(v>=-4) return "やや不調";
  if(v>=-7) return "不調";
  return "絶不調";
}

// ===============================
// レース開始
// ===============================
document.getElementById("startRaceBtn").onclick=()=>{
  oddsScreen.classList.remove("active");
  raceScreen.classList.add("active");
  startRace();
};

function startRace(){

  horses.forEach(h=>{
    h.progress=0;
    h.staminaLeft=h.stamina;
  });

  raceStartTime=null;
  animationId=requestAnimationFrame(raceLoop);
}

// ===============================
// レースループ
// ===============================
function raceLoop(timestamp){

  if(!raceStartTime) raceStartTime=timestamp;

  const elapsed=(timestamp-raceStartTime)/1000;
  const totalTime=getRaceTime();

  updateHorses(totalTime);
  drawRace();
  updateRanking();

  if(elapsed<totalTime){
    animationId=requestAnimationFrame(raceLoop);
  }else{
    finishRace();
  }
}

// ===============================
function updateHorses(totalTime){

  horses.forEach(h=>{

    let baseSpeed=h.speed+h.condition;

    if(raceSetting.track===h.preferredTrack) baseSpeed+=5;

    if(raceSetting.weather==="雨"){
      if(h.preferredTrack==="ダート") baseSpeed+=3;
      if(h.preferredTrack==="芝") baseSpeed-=3;
    }

    h.staminaLeft-=0.05;
    if(h.staminaLeft<30) baseSpeed-=10;

    if(h.progress>0.8) baseSpeed+=h.guts*0.05;

    const variance=(100-h.stability)*0.02;
    baseSpeed+=(Math.random()*variance-variance/2);

    if(h.strategy==="逃げ" && h.progress<0.3) baseSpeed+=5;
    if(h.strategy==="追い込み" && h.progress>0.7) baseSpeed+=7;

    h.progress+=baseSpeed/(totalTime*100);
    if(h.progress>1) h.progress=1;
  });
}

// ===============================
// 描画
// ===============================
function drawRace(){

  canvas.width=canvas.clientWidth;
  canvas.height=canvas.clientHeight;

  ctx.clearRect(0,0,canvas.width,canvas.height);

  ctx.fillStyle=raceSetting.track==="芝"?"#2e7d32":"#8b5a2b";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  const cx=canvas.width/2;
  const cy=canvas.height/2;
  const rx=canvas.width*0.4;
  const ry=canvas.height*0.3;

  ctx.strokeStyle="white";
  ctx.lineWidth=4;
  ctx.beginPath();
  ctx.ellipse(cx,cy,rx,ry,0,0,Math.PI*2);
  ctx.stroke();

  horses.forEach((h,i)=>{
    const angle=h.progress*Math.PI*2;
    const x=cx+rx*Math.cos(angle);
    const y=cy+ry*Math.sin(angle);

    ctx.fillStyle=getHorseColor(i);
    ctx.beginPath();
    ctx.arc(x,y,6,0,Math.PI*2);
    ctx.fill();
  });
}

// ===============================
function getHorseColor(i){
  const colors=["#ff5252","#ff9800","#ffee58","#66bb6a",
                "#42a5f5","#ab47bc","#ec407a","#26c6da"];
  return colors[i];
}

// ===============================
function updateRanking(){

  const sorted=[...horses].sort((a,b)=>b.progress-a.progress);

  rankingDiv.innerHTML=
    sorted.map((h,i)=>`${i+1}位 ${h.name}`).join("<br>");
}

// ===============================
function finishRace(){

  cancelAnimationFrame(animationId);

  const result=[...horses].sort((a,b)=>b.progress-a.progress);

  raceScreen.classList.remove("active");
  resultScreen.classList.add("active");

  resultList.innerHTML=
    result.map((h,i)=>`${i+1}位 ${h.name}`).join("<br>");
}

// ===============================
function getRaceTime(){
  if(raceSetting.distance===1200) return 20;
  if(raceSetting.distance===2400) return 30;
  return 40;
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

// ===============================
// PWA
// ===============================
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("service-worker.js");
}
