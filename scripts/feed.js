const db = firebase.database();

let intervalId = null;
let messageIndex = 0;
let settings = {};
let isPaused = false;


// ----------------------------------------
// APPLY SETTINGS WHEN ANYTHING CHANGES
// ----------------------------------------
function applySettings(newSettings) {
  const oldPlayState = settings.playState;

  settings = newSettings;
  console.log("Updated settings:", settings);

  // If play state changed, react immediately
  if (newSettings.playState !== oldPlayState) {
    handlePlayState(newSettings.playState);
  }
}


// ----------------------------------------
// HANDLE playState CHANGES
// ----------------------------------------
function handlePlayState(state) {

  clearInterval(intervalId);
  intervalId = null;

  console.log("Handling play state:", state);

  if (state === "start") {
    startPosting();
  }

  if (state === "pause") {
    pausePosting();
  }

  if (state === "stop") {
    stopPosting();
  }
}


// ----------------------------------------
// START POSTING MESSAGES
// ----------------------------------------
function startPosting() {
  if (!settings.messages || settings.messages.length === 0) return;

  isPaused = false;

  intervalId = setInterval(() => {

    if (isPaused) return;
    if (messageIndex >= settings.messages.length) return;

    const feed = document.getElementById("feed");

    const div = document.createElement("div");
    div.className = "post";
    div.textContent = settings.messages[messageIndex];
    feed.appendChild(div);

    messageIndex++;

    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });

  }, settings.postingInterval);
}


// ----------------------------------------
// PAUSE POSTING
// ----------------------------------------
function pausePosting() {
  isPaused = true;
}


// ----------------------------------------
// STOP / RESET
// ----------------------------------------
function stopPosting() {
  clearInterval(intervalId);
  intervalId = null;

  // Reset state
  isPaused = false;
  messageIndex = 0;

  // Clear feed
  document.getElementById("feed").innerHTML = "";
}


// ----------------------------------------
// REALTIME LISTENER
// ----------------------------------------
db.ref("settings").on("value", snapshot => {
  const newSettings = snapshot.val();
  applySettings(newSettings);
});
