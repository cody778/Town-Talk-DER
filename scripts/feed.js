const db = firebase.database();

let intervalId = null;
let settings = {};
let isPaused = false;
let hasInitialized = false;

// ----------------------------------------
// PARSE MESSAGE FORMAT
// Supports: "emoji|username|handle|message" or object format
// ----------------------------------------
function parseMessage(messageData) {
  // If it's already an object with the right structure
  if (typeof messageData === 'object' && messageData.username) {
    return {
      emoji: messageData.emoji || getRandomEmoji(),
      username: messageData.username,
      handle: messageData.handle || `@${messageData.username.toLowerCase().replace(/\s+/g, '')}`,
      message: messageData.message
    };
  }
  
  // If it's a string, try to parse it
  if (typeof messageData === 'string') {
    const parts = messageData.split('|');
    if (parts.length >= 4) {
      return {
        emoji: parts[0].trim() || getRandomEmoji(),
        username: parts[1].trim(),
        handle: parts[2].trim() || `@${parts[1].toLowerCase().replace(/\s+/g, '')}`,
        message: parts.slice(3).join('|').trim()
      };
    }
    // Fallback: treat entire string as message, generate username/handle
    return {
      emoji: getRandomEmoji(),
      username: generateRandomUsername(),
      handle: generateRandomHandle(),
      message: messageData
    };
  }
  
  // Default fallback
  return {
    emoji: getRandomEmoji(),
    username: generateRandomUsername(),
    handle: generateRandomHandle(),
    message: String(messageData)
  };
}

// ----------------------------------------
// GENERATE RANDOM EMOJI
// ----------------------------------------
function getRandomEmoji() {
  const emojis = ['👤', '🧑', '👨', '👩', '🧑‍💼', '👨‍💼', '👩‍💼', '🧑‍🎓', '👨‍🎓', '👩‍🎓', 
                  '🧑‍🔬', '👨‍🔬', '👩‍🔬', '🧑‍⚕️', '👨‍⚕️', '👩‍⚕️', '🧑‍🏫', '👨‍🏫', '👩‍🏫',
                  '🧑‍🎨', '👨‍🎨', '👩‍🎨', '🧑‍🚀', '👨‍🚀', '👩‍🚀', '🧑‍✈️', '👨‍✈️', '👩‍✈️',
                  '🤴', '👸', '🦸', '🦹', '🧙', '🧚', '🧛', '🧜', '🧝', '🧞', '🧟',
                  '🎭', '🎪', '🎨', '🎬', '🎤', '🎧', '🎮', '🎯', '🎲', '🎸', '🎺'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// ----------------------------------------
// GENERATE RANDOM USERNAME
// ----------------------------------------
function generateRandomUsername() {
  const names = ['TownCrier', 'GossipGuild', 'NewsBearer', 'MessageMaster', 
                 'InfoKeeper', 'UpdateUser', 'FeedFriend', 'PostPerson'];
  return names[Math.floor(Math.random() * names.length)];
}

// ----------------------------------------
// GENERATE RANDOM HANDLE
// ----------------------------------------
function generateRandomHandle() {
  const handles = ['@towncrier', '@gossipguild', '@newsbearer', '@messagemaster',
                   '@infokeeper', '@updateuser', '@feedfriend', '@postperson'];
  return handles[Math.floor(Math.random() * handles.length)];
}

// ----------------------------------------
// LISTEN TO POSTED MESSAGES FROM FIREBASE
// ----------------------------------------
function listenToFeed() {
  const feedRef = db.ref("feed/posts");
  
  feedRef.on("child_added", snapshot => {
    const post = snapshot.val();
    if (post) {
      const parsedPost = parseMessage(post.message || post);
      addPostToFeed(parsedPost, post.timestamp);
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
        const parsedPost = parseMessage(post.message || post);
        addPostToFeed(parsedPost, post.timestamp, false);
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
// ADD POST TO FEED (UI) - Twitter-like format
// ----------------------------------------
function addPostToFeed(postData, timestamp, scroll = true) {
  const feed = document.getElementById("feed");
  
  const postDiv = document.createElement("div");
  postDiv.className = "tweet";
  
  // Profile picture (emoji)
  const profilePic = document.createElement("div");
  profilePic.className = "profile-pic";
  profilePic.textContent = postData.emoji || '👤';
  
  // Post content container
  const contentDiv = document.createElement("div");
  contentDiv.className = "tweet-content";
  
  // Header with username and handle
  const headerDiv = document.createElement("div");
  headerDiv.className = "tweet-header";
  
  const usernameSpan = document.createElement("span");
  usernameSpan.className = "username";
  usernameSpan.textContent = postData.username || 'User';
  
  const handleSpan = document.createElement("span");
  handleSpan.className = "handle";
  handleSpan.textContent = postData.handle || '@user';
  
  headerDiv.appendChild(usernameSpan);
  headerDiv.appendChild(handleSpan);
  
  // Message text
  const messageDiv = document.createElement("div");
  messageDiv.className = "tweet-message";
  messageDiv.textContent = postData.message || '';
  
  // Assemble the tweet
  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(messageDiv);
  
  postDiv.appendChild(profilePic);
  postDiv.appendChild(contentDiv);
  
  feed.appendChild(postDiv);

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

  // Store old settings for comparison
  const wasEmpty = Object.keys(settings).length === 0;
  
  settings = newSettings;
  console.log("Updated settings:", settings);

  // On first load, check if we should auto-start
  if (wasEmpty && newSettings.playState === "start" && newSettings.autoPlay === true) {
    handlePlayState(newSettings.playState, newSettings.autoPlay);
    hasInitialized = true;
  }
  // If play state changed (manual button click), always react
  else if (newSettings.playState !== oldPlayState) {
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

  if (state === "start") {
    // Always start when playState is "start" (manual start button click)
    // autoPlay only affects automatic starting on page load
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
  if (!settings.messages || settings.messages.length === 0) {
    console.log("No messages to post");
    return;
  }
  
  // Clear any existing interval first
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  isPaused = false;

  // Get current posted count from Firebase
  db.ref("feed/posts").once("value", snapshot => {
    const posts = snapshot.val();
    const currentCount = posts ? Object.keys(posts).length : 0;
    
    if (currentCount >= settings.messages.length) {
      console.log("All messages already posted");
      return;
    }

    // Start the interval to post messages
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
        const parsedMessage = parseMessage(messageToPost);
        
        const postData = {
          message: parsedMessage, // Store as structured object
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
