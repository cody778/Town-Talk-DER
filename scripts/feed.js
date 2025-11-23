const db = firebase.database();

let intervalId = null;
let settings = {};
let isPaused = false;
let hasInitialized = false;

// ----------------------------------------
// LISTEN TO POSTED MESSAGES FROM FIREBASE
// ----------------------------------------
function listenToFeed() {
  const feedRef = db.ref("feed/posts");
  
  feedRef.on("child_added", snapshot => {
    const post = snapshot.val();
    if (post && post.message) {
      addPostToFeed(post.message, post.timestamp);
    }
  });

  // Load existing posts when page loads
  feedRef.once("value", snapshot => {
    const posts = snapshot.val();
    if (posts) {
      const feed = document.getElementById("feed");
      feed.innerHTML = "";
      
      // Sort by timestamp and display all existing posts
      const sortedPosts = Object.values(posts).sort((a, b) => a.timestamp - b.timestamp);
      sortedPosts.forEach(post => {
        addPostToFeed(post.message, post.timestamp, false);
      });
      
      // Scroll to bottom after loading
      setTimeout(() => {
        window.scrollTo({
          top: document.body.scrollHeight,
          behavior: "auto"
        });
      }, 100);
    }
  });
}

// ----------------------------------------
// ADD POST TO FEED (UI)
// ----------------------------------------
function addPostToFeed(message, timestamp, scroll = true) {
  const feed = document.getElementById("feed");
  const div = document.createElement("div");
  div.className = "post";
  div.textContent = message;
  feed.appendChild(div);

  if (scroll) {
    window.scrollTo({
      top: document.body.scrollHeight,
      behavior: "smooth"
    });
  }
}

// ----------------------------------------
// APPLY SETTINGS WHEN ANYTHING CHANGES
// ----------------------------------------
function applySettings(newSettings) {
  const oldPlayState = settings.playState;
  const oldAutoPlay = settings.autoPlay;

  settings = newSettings;
  console.log("Updated settings:", settings);

  // If play state or autoPlay changed, react immediately
  if (newSettings.playState !== oldPlayState || newSettings.autoPlay !== oldAutoPlay) {
    handlePlayState(newSettings.playState, newSettings.autoPlay);
  }
}

// ----------------------------------------
// HANDLE playState CHANGES
// ----------------------------------------
function handlePlayState(state, autoPlay) {
  clearInterval(intervalId);
  intervalId = null;

  console.log("Handling play state:", state, "autoPlay:", autoPlay);

  // Only start if playState is "start" AND (autoPlay is true OR this is the first initialization)
  if (state === "start" && (autoPlay || !hasInitialized)) {
    startPosting();
    hasInitialized = true;
  } else if (state === "pause") {
    pausePosting();
  } else if (state === "stop") {
    stopPosting();
  }
}

// ----------------------------------------
// START POSTING MESSAGES
// ----------------------------------------
function startPosting() {
  if (!settings.messages || settings.messages.length === 0) return;
  if (isPaused) return;

  // Check if we should actually post (respect autoPlay)
  if (settings.autoPlay === false && hasInitialized) {
    console.log("AutoPlay is disabled, not starting posting");
    return;
  }

  // Get current posted count from Firebase
  db.ref("feed/posts").once("value", snapshot => {
    const posts = snapshot.val();
    const currentCount = posts ? Object.keys(posts).length : 0;
    
    if (currentCount >= settings.messages.length) {
      console.log("All messages already posted");
      return;
    }

    isPaused = false;

    intervalId = setInterval(() => {
      if (isPaused) return;
      
      // Check current count again to prevent race conditions
      db.ref("feed/posts").once("value", snapshot => {
        const posts = snapshot.val();
        const currentCount = posts ? Object.keys(posts).length : 0;
        
        if (currentCount >= settings.messages.length) {
          clearInterval(intervalId);
          intervalId = null;
          return;
        }

        // Post the next message to Firebase (this will trigger all listeners)
        const messageToPost = settings.messages[currentCount];
        const postData = {
          message: messageToPost,
          timestamp: Date.now()
        };

        db.ref("feed/posts").push(postData).catch(err => {
          console.error("Error posting message:", err);
        });

        // Update currentIndex in Firebase for tracking
        db.ref("settings/currentIndex").set(currentCount + 1);
      });
    }, settings.postingInterval || 3000);
  });
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

  isPaused = false;
  
  // Clear the feed in Firebase (this will update all clients)
  db.ref("feed/posts").remove();
  
  // Reset Firebase counter
  db.ref("settings/currentIndex").set(0);
  
  // Clear local feed
  document.getElementById("feed").innerHTML = "";
}

// ----------------------------------------
// REALTIME LISTENER FOR SETTINGS
// ----------------------------------------
db.ref("settings").on("value", snapshot => {
  const newSettings = snapshot.val();
  if (!newSettings) return;

  applySettings(newSettings);
});

// ----------------------------------------
// INITIALIZE: LISTEN TO FEED
// ----------------------------------------
listenToFeed();
