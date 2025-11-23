const PASSWORD = "crowns&coins94";
var db = firebase.database();


// -------------------------------
// LOGIN HANDLING
// -------------------------------
document.getElementById("enter-admin").addEventListener("click", () => {
  const inputPass = document.getElementById("admin-pass").value;

  if (inputPass === PASSWORD) {
    document.getElementById("password-screen").classList.add("hidden");
    document.getElementById("admin-panel").classList.remove("hidden");
    loadSettings();
  }
});


// -------------------------------
// LOAD SETTINGS FROM FIREBASE
// -------------------------------
function loadSettings() {
  db.ref("settings").once("value").then(snapshot => {
    const s = snapshot.val();

    if (!s) {
      alert("No settings found in Firebase. Add them manually to /settings.");
      return;
    }

    document.getElementById("interval-input").value = s.postingInterval;
    document.getElementById("speed-input").value = s.scrollSpeed;
    document.getElementById("autoplay-input").value = s.autoPlay;
    document.getElementById("messages-input").value = s.messages.join("\n");

    // If you want to show current play state:
    console.log("Current playState:", s.playState);
  });
}


// -------------------------------
// SAVE SETTINGS TO FIREBASE
// -------------------------------
document.getElementById("save-settings").addEventListener("click", () => {
  const updated = {
    postingInterval: parseInt(document.getElementById("interval-input").value),
    scrollSpeed: parseFloat(document.getElementById("speed-input").value),
    autoPlay: document.getElementById("autoplay-input").value === "true",
    messages: document.getElementById("messages-input").value.split("\n"),
  };

  // Ensure currentIndex exists
  db.ref("settings/currentIndex").once("value").then(snapshot => {
    if (snapshot.val() === null) {
      updated.currentIndex = 0;
    }

    db.ref("settings").update(updated)
      .then(() => alert("Settings updated for ALL viewers."))
      .catch(err => alert("Firebase error: " + err.message));
  });
});



// -------------------------------
// PLAYBACK CONTROL BUTTONS
// -------------------------------
document.getElementById("start-btn").addEventListener("click", () => {
  db.ref("settings").update({ playState: "start" })
    .then(() => alert("Feed started."))
    .catch(err => alert("Error: " + err.message));
});

document.getElementById("pause-btn").addEventListener("click", () => {
  db.ref("settings").update({ playState: "pause" })
    .then(() => alert("Feed paused."))
    .catch(err => alert("Error: " + err.message));
});

document.getElementById("stop-btn").addEventListener("click", () => {
  db.ref("settings").update({ playState: "stop" })
    .then(() => alert("Feed stopped/reset."))
    .catch(err => alert("Error: " + err.message));
});
