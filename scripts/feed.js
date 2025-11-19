const db = firebase.database();

let intervalId = null;
let messageIndex = 0;
let settings = {};

function applySettings(newSettings) {
  settings = newSettings;
  console.log("Settings updated:", settings);

  // Reset message flow
  clearInterval(intervalId);
  messageIndex = 0;

  if (settings.autoPlay) {
    startPosting();
  }
}

function startPosting() {
  intervalId = setInterval(() => {
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

// LISTEN FOR REAL-TIME CHANGES
db.ref("settings").on("value", snapshot => {
  const newSettings = snapshot.val();
  applySettings(newSettings);
});