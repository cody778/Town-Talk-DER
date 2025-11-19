const PASSWORD = "crowns&coins94";
var db = firebase.database();

document.getElementById("enter-admin").addEventListener("click", () => {
  if (document.getElementById("admin-pass").value === PASSWORD) {
    document.getElementById("password-screen").classList.add("hidden");
    document.getElementById("admin-panel").classList.remove("hidden");
    loadSettings();
  }
});


function loadSettings() {
  db.ref("settings").once("value").then(snapshot => {
    const s = snapshot.val();

    document.getElementById("interval-input").value = s.postingInterval;
    document.getElementById("speed-input").value = s.scrollSpeed;
    document.getElementById("autoplay-input").value = s.autoPlay;
    document.getElementById("messages-input").value = s.messages.join("\n");
  });
}

document.getElementById("save-settings").addEventListener("click", () => {
  const updated = {
    postingInterval: parseInt(document.getElementById("interval-input").value),
    scrollSpeed: parseFloat(document.getElementById("speed-input").value),
    autoPlay: document.getElementById("autoplay-input").value === "true",
    messages: document.getElementById("messages-input").value.split("\n")
  };

  db.ref("settings").update(updated);
  alert("Settings updated for ALL viewers.");
});

// Start posting messages
document.getElementById("start-btn").addEventListener("click", () => {
  db.ref("settings").update({ playState: "start" });
  alert("Feed started.");
});

// Pause posting messages
document.getElementById("pause-btn").addEventListener("click", () => {
  db.ref("settings").update({ playState: "pause" });
  alert("Feed paused.");
});

// Stop/reset feed
document.getElementById("stop-btn").addEventListener("click", () => {
  db.ref("settings").update({ playState: "stop" });
  alert("Feed stopped/reset.");
});

