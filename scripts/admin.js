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
    
    // Handle messages - convert objects back to format string if needed
    if (s.messages && Array.isArray(s.messages)) {
      const formattedMessages = s.messages.map(msg => {
        if (typeof msg === 'object' && msg.username) {
          // Convert object back to format: emoji|username|handle|message
          return `${msg.emoji || '👤'}|${msg.username}|${msg.handle || '@' + msg.username.toLowerCase()}|${msg.message}`;
        }
        return msg;
      });
      document.getElementById("messages-input").value = formattedMessages.join("\n");
    } else {
      document.getElementById("messages-input").value = "";
    }

    // If you want to show current play state:
    console.log("Current playState:", s.playState);
  });
}


// -------------------------------
// SAVE SETTINGS TO FIREBASE
// -------------------------------
document.getElementById("save-settings").addEventListener("click", () => {
  const updated = {
    postingInterval: parseInt(document.getElementById("interval-input").value) || 3000,
    scrollSpeed: parseFloat(document.getElementById("speed-input").value) || 1,
    autoPlay: document.getElementById("autoplay-input").value === "true",
    messages: document.getElementById("messages-input").value.split("\n").filter(m => m.trim() !== ""),
  };

  // Ensure currentIndex exists
  db.ref("settings/currentIndex").once("value").then(snapshot => {
    if (snapshot.val() === null) {
      updated.currentIndex = 0;
    }
    
    // Preserve playState if it exists
    db.ref("settings/playState").once("value").then(playStateSnapshot => {
      if (playStateSnapshot.val()) {
        updated.playState = playStateSnapshot.val();
      } else {
        updated.playState = "stop";
      }

      db.ref("settings").update(updated)
        .then(() => alert("Settings updated for ALL viewers."))
        .catch(err => alert("Firebase error: " + err.message));
    });
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
  // Clear the feed and reset
  db.ref("feed/posts").remove().then(() => {
    return db.ref("settings").update({ 
      playState: "stop",
      currentIndex: 0
    });
  })
    .then(() => alert("Feed stopped/reset. All messages cleared."))
    .catch(err => alert("Error: " + err.message));
});
