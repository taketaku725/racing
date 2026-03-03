const oddsScreen = document.getElementById("oddsScreen");
const raceScreen = document.getElementById("raceScreen");
const resultScreen = document.getElementById("resultScreen");

document.getElementById("startRaceBtn").onclick = () => {
  oddsScreen.classList.remove("active");
  raceScreen.classList.add("active");
};

document.getElementById("backBtn").onclick = () => {
  resultScreen.classList.remove("active");
  oddsScreen.classList.add("active");
};

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js");
}
