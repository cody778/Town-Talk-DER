const db = firebase.database();

let intervalId = null;
let settings = {};
let isPaused = false;
let hasInitialized = false;
let displayedPostIds = new Set(); // Track displayed posts to prevent duplicates
let isPostingLocked = false; // Prevent multiple simultaneous posts
let postingCheckInterval = null; // Interval to check if it's time to post

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
// FORMAT TIMESTAMP
// ----------------------------------------
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) {
    return "now";
  } else if (diffMins < 60) {
    return `${diffMins}m`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}d`;
  } else {
    // Format as date
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
  }
}

// ----------------------------------------
// LISTEN TO POSTED MESSAGES FROM FIREBASE
// ----------------------------------------
function listenToFeed() {
  const feedRef = db.ref("feed/posts");
  
  // Track if we've loaded initial posts to prevent duplicates from child_added
  let initialLoadComplete = false;
  
  // Load existing posts when page loads first
  feedRef.once("value", snapshot => {
    const posts = snapshot.val();
    if (posts) {
      const feed = document.getElementById("feed");
      feed.innerHTML = "";
      displayedPostIds.clear();
      
      // Sort by timestamp DESCENDING (newest first)
      const sortedPosts = Object.entries(posts)
        .map(([id, post]) => ({ id, ...post }))
        .sort((a, b) => b.timestamp - a.timestamp);
      
      sortedPosts.forEach(post => {
        if (!displayedPostIds.has(post.id)) {
          const parsedPost = parseMessage(post.message || post);
          addPostToFeed(parsedPost, post.timestamp, false, post.id);
          displayedPostIds.add(post.id);
        }
      });
      
      // Mark initial load as complete
      initialLoadComplete = true;
      
      // Scroll to top after loading (newest at top)
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: "auto"
        });
      }, 100);
    } else {
      initialLoadComplete = true;
    }
    
    // Now set up listener for new posts (only after initial load)
    feedRef.on("child_added", snapshot => {
      // Only process if initial load is complete to avoid duplicates
      if (!initialLoadComplete) return;
      
      const postId = snapshot.key;
      const post = snapshot.val();
      
      // Skip if we've already displayed this post
      if (displayedPostIds.has(postId)) {
        return;
      }
      
      if (post) {
        const parsedPost = parseMessage(post.message || post);
        addPostToFeed(parsedPost, post.timestamp, true, postId);
        displayedPostIds.add(postId);
      }
    });
  });
}

// ----------------------------------------
// ADD POST TO FEED (UI) - Twitter-like format
// ----------------------------------------
function addPostToFeed(postData, timestamp, scroll = true, postId = null) {
  const feed = document.getElementById("feed");
  
  // Use postId as data attribute to track duplicates
  const postDiv = document.createElement("div");
  postDiv.className = "tweet";
  if (postId) {
    postDiv.setAttribute("data-post-id", postId);
  }
  
  // Profile picture (emoji)
  const profilePic = document.createElement("div");
  profilePic.className = "profile-pic";
  profilePic.textContent = postData.emoji || '👤';
  
  // Post content container
  const contentDiv = document.createElement("div");
  contentDiv.className = "tweet-content";
  
  // Header with username, handle, and timestamp
  const headerDiv = document.createElement("div");
  headerDiv.className = "tweet-header";
  
  const usernameSpan = document.createElement("span");
  usernameSpan.className = "username";
  usernameSpan.textContent = postData.username || 'User';
  
  const handleSpan = document.createElement("span");
  handleSpan.className = "handle";
  handleSpan.textContent = postData.handle || '@user';
  
  const timestampSpan = document.createElement("span");
  timestampSpan.className = "timestamp";
  timestampSpan.textContent = formatTimestamp(timestamp);
  
  headerDiv.appendChild(usernameSpan);
  headerDiv.appendChild(handleSpan);
  headerDiv.appendChild(timestampSpan);
  
  // Message text
  const messageDiv = document.createElement("div");
  messageDiv.className = "tweet-message";
  messageDiv.textContent = postData.message || '';
  
  // Assemble the tweet
  contentDiv.appendChild(headerDiv);
  contentDiv.appendChild(messageDiv);
  
  postDiv.appendChild(profilePic);
  postDiv.appendChild(contentDiv);
  
  // Insert at the top (newest first) - insert before first child or append if empty
  if (feed.firstChild) {
    feed.insertBefore(postDiv, feed.firstChild);
  } else {
    feed.appendChild(postDiv);
  }

  if (scroll) {
    // Scroll to top when new post is added
    window.scrollTo({
      top: 0,
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
  
  // Clear any existing intervals first
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (postingCheckInterval) {
    clearInterval(postingCheckInterval);
    postingCheckInterval = null;
  }
  
  isPaused = false;
  
  // Initialize posting timing in Firebase
  const startTime = Date.now();
  const postingInterval = settings.postingInterval || 3000;
  
  // Set start time and last post time in Firebase (only if not already set)
  db.ref("settings/postingStartTime").once("value", snapshot => {
    if (!snapshot.exists()) {
      db.ref("settings").update({
        postingStartTime: startTime,
        lastPostTime: startTime,
        nextPostTime: startTime + postingInterval
      });
    }
    
    // Post first message immediately
    postNextMessage();
    
    // Start checking every second if it's time to post
    postingCheckInterval = setInterval(() => {
      checkAndPostIfReady();
    }, 1000);
  });
}

// ----------------------------------------
// CHECK IF IT'S TIME TO POST AND POST IF READY
// ----------------------------------------
function checkAndPostIfReady() {
  if (isPaused) return;
  if (isPostingLocked) return;
  
  // Check Firebase for timing info
  db.ref("settings").once("value", snapshot => {
    const settingsData = snapshot.val();
    if (!settingsData) return;
    
    const nextPostTime = settingsData.nextPostTime;
    const postingLock = settingsData.postingLock;
    const now = Date.now();
    
    // Clear stale lock (if lock exists but has expired)
    if (postingLock && postingLock < now) {
      db.ref("settings/postingLock").set(null);
    }
    
    // Only proceed if it's time to post (with 500ms tolerance) and no one else is posting
    if (nextPostTime && now >= (nextPostTime - 500)) {
      if (!postingLock || postingLock < now) {
        // Try to acquire lock
        const lockExpiry = now + 2000; // Lock expires in 2 seconds
        db.ref("settings/postingLock").set(lockExpiry)
          .then(() => {
            // Verify we got the lock (check again in case another browser got it)
            db.ref("settings/postingLock").once("value", lockSnapshot => {
              if (lockSnapshot.val() === lockExpiry) {
                postNextMessage();
              }
            });
          })
          .catch(() => {
            // Lock acquisition failed, another browser is posting
          });
      }
    }
  });
}

// ----------------------------------------
// POST NEXT MESSAGE (with proper delay)
// ----------------------------------------
function postNextMessage() {
  if (isPaused) return;
  if (isPostingLocked) {
    return;
  }
  
  // Use a transaction-like approach to prevent race conditions
  isPostingLocked = true;
  
  // Get timing info and check if we should post
  db.ref("settings").once("value", settingsSnapshot => {
    const settingsData = settingsSnapshot.val();
    if (!settingsData) {
      isPostingLocked = false;
      return;
    }
    
    const nextPostTime = settingsData.nextPostTime;
    const now = Date.now();
    
    // Double-check timing (another browser might have already posted)
    if (nextPostTime && now < (nextPostTime - 1000)) {
      isPostingLocked = false;
      return;
    }
    
    // Check current count and get the next message index atomically
    db.ref("feed/posts").once("value", snapshot => {
      const posts = snapshot.val();
      const currentCount = posts ? Object.keys(posts).length : 0;
      
      if (currentCount >= settings.messages.length) {
        // Clear intervals
        if (postingCheckInterval) {
          clearInterval(postingCheckInterval);
          postingCheckInterval = null;
        }
        isPostingLocked = false;
        console.log("All messages posted");
        return;
      }

      // Get the message content to check for duplicates
      const messageToPost = settings.messages[currentCount];
      const parsedMessage = parseMessage(messageToPost);
      
      // Check if this exact message was already posted (by content + timestamp proximity)
      let messageAlreadyPosted = false;
      if (posts) {
        const recentPosts = Object.values(posts)
          .filter(p => Math.abs(p.timestamp - Date.now()) < 5000); // Within 5 seconds
        messageAlreadyPosted = recentPosts.some(p => {
          const existingMsg = parseMessage(p.message || p);
          return existingMsg.message === parsedMessage.message &&
                 existingMsg.username === parsedMessage.username;
        });
      }
      
      if (messageAlreadyPosted) {
        console.log("Message already posted, skipping duplicate");
        // Update next post time and release lock
        const postingInterval = settings.postingInterval || 3000;
        const newNextPostTime = now + postingInterval;
        db.ref("settings").update({
          nextPostTime: newNextPostTime,
          postingLock: null // Release lock
        });
        isPostingLocked = false;
        return;
      }

      // Post the next message to Firebase (this will trigger all listeners)
      const postData = {
        message: parsedMessage, // Store as structured object
        timestamp: Date.now()
      };

      db.ref("feed/posts").push(postData)
        .then(() => {
          // Update currentIndex in Firebase for tracking
          const postingInterval = settings.postingInterval || 3000;
          const newLastPostTime = Date.now();
          const newNextPostTime = newLastPostTime + postingInterval;
          
          // Update all timing info atomically and release lock
          db.ref("settings").update({
            currentIndex: currentCount + 1,
            lastPostTime: newLastPostTime,
            nextPostTime: newNextPostTime,
            postingLock: null // Release lock
          });
          
          isPostingLocked = false;
          console.log(`Posted message ${currentCount + 1} at ${new Date(newLastPostTime).toLocaleTimeString()}, next post at ${new Date(newNextPostTime).toLocaleTimeString()}`);
        })
        .catch(err => {
          console.error("Error posting message:", err);
          // Release lock on error
          db.ref("settings/postingLock").set(null);
          isPostingLocked = false;
        });
    });
  });
}

// ----------------------------------------
// PAUSE POSTING
// ----------------------------------------
function pausePosting() {
  isPaused = true;
  // Calculate remaining time and adjust nextPostTime
  db.ref("settings").once("value", snapshot => {
    const settingsData = snapshot.val();
    if (settingsData && settingsData.nextPostTime) {
      const pausedTime = Date.now();
      const remainingTime = settingsData.nextPostTime - pausedTime;
      // Store the remaining time so we can resume properly
      db.ref("settings/pausedRemainingTime").set(Math.max(0, remainingTime));
    }
  });
}

// ----------------------------------------
// STOP / RESET
// ----------------------------------------
function stopPosting() {
  clearInterval(intervalId);
  intervalId = null;
  if (postingCheckInterval) {
    clearInterval(postingCheckInterval);
    postingCheckInterval = null;
  }

  isPaused = false;
  isPostingLocked = false;
  
  // Clear the feed in Firebase (this will update all clients)
  db.ref("feed/posts").remove();
  
  // Reset Firebase counter and timing
  db.ref("settings").update({
    currentIndex: 0,
    postingStartTime: null,
    lastPostTime: null,
    nextPostTime: null,
    postingLock: null
  });
  
  // Clear local feed and tracking
  document.getElementById("feed").innerHTML = "";
  displayedPostIds.clear();
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
