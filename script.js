document.addEventListener('DOMContentLoaded', () => {
console.log('✅ script.js loaded and running');

  // ------------------------
  // Game search & filter
  // ------------------------
  const searchInput = document.querySelector('.search input');
  const gameCards = Array.from(document.querySelectorAll('.game-card'));
  const searchResults = document.getElementById('search-results');

const suggestButton =
  document.getElementById('sbSuggest') ||
  document.getElementById('suggestButton');
  const modal = document.getElementById('suggestionForm');
  const closeBtns = document.querySelectorAll('.modal .close');
  const sendBtn = document.getElementById('sendSuggestion');

  const webhookURL = "https://discord.com/api/webhooks/1415474812037628005/qPca1ARqtULY44_5dbar6dSSLiMvaKrVRchKjXPULxwJElh-M0U2zeogMrs34jv2OWuB";
  const reportWebhookURL = "https://discord.com/api/webhooks/1415474903880171632/FlXBps-LswodW8fRTjkx4VWHAs19CuUR3iuFm63FMa5pLay5uI8jPvxSRVVPRrlQHDAr";

  let currentFilter = 'all';
  const popularityAliases = { hot: ['hot','trending'], trending: ['hot','trending'] };

  function applyFilter(filter = currentFilter) {
    const f = (filter || 'all').toLowerCase();
    gameCards.forEach(card => {
      const genre = (card.getAttribute('data-genre') || '').toLowerCase();
      const popularity = (card.getAttribute('data-popularity') || '').toLowerCase();
      let show = f === 'all' || f === '' || f === genre || f === popularity || (popularityAliases[f] && popularityAliases[f].includes(popularity));
      card.style.display = show ? '' : 'none';
    });
  }

  function updateGames() {
    const searchTerm = (searchInput.value || '').trim().toLowerCase();
    searchResults.innerHTML = '';
    if (!searchTerm) { searchResults.style.display='none'; applyFilter(); return; }

    let found = 0;
    gameCards.forEach(card => {
      const name = (card.querySelector('h3')?.innerText || '').toLowerCase();
      const matches = name.includes(searchTerm);
      card.style.display = matches ? '' : 'none';
      if (matches) {
        const clone = card.cloneNode(true);
        clone.addEventListener('click', () => {
          const link = clone.getAttribute('data-link');
          if (link) window.open(link,'_blank'); else alert("This game doesn't have a link yet.");
        });
        searchResults.appendChild(clone);
        found++;
      }
    });
    searchResults.style.display = found > 0 ? 'flex' : 'none';
  }

  if (searchInput) searchInput.addEventListener('input', updateGames);

  // ------------------------
  // Suggestion modal
  // ------------------------
  if (suggestButton && modal) {
    suggestButton.addEventListener('click', () => { modal.style.display='flex'; });
  }
  closeBtns.forEach(btn => btn.addEventListener('click', () => {
    const m = btn.closest('.modal');
    if (m) m.style.display='none';
  }));
  window.addEventListener('click', e => {
    if (e.target.classList.contains('modal')) e.target.style.display='none';
  });

  if (sendBtn) {
    sendBtn.addEventListener('click', () => {
      const name = document.getElementById('gameName')?.value.trim();
      const details = document.getElementById('gameDetails')?.value.trim();
      if (!name) { alert('Please enter a game name.'); return; }
      fetch(webhookURL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ content:`🎮 **New Game Suggestion**\n**Game:** ${name}\n**Details:** ${details || '(none)'}` })
      }).then(() => {
        alert('Suggestion sent!');
        modal.style.display='none';
      }).catch(err => { console.error(err); alert('Failed to send suggestion.'); });
    });
  }

  // ------------------------
  // Report modal
  // ------------------------
const reportButton =
  document.getElementById('sbReport') ||
  document.getElementById('reportButton'); 
const reportModal = document.getElementById('reportForm');
const sendReportBtn = document.getElementById('sendReport');

  if (reportButton && reportModal) reportButton.addEventListener('click', () => reportModal.style.display='flex');
  if (sendReportBtn) {
    sendReportBtn.addEventListener('click', () => {
      const title = document.getElementById('problemTitle')?.value.trim();
      const details = document.getElementById('problemDetails')?.value.trim();
      if (!title) { alert('Enter a problem title.'); return; }
      fetch(reportWebhookURL, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ content:`🚨 **Problem Reported**\n**Title:** ${title}\n**Details:** ${details || '(none)'}` })
      }).then(() => { alert('Report sent!'); reportModal.style.display='none'; })
        .catch(err => { console.error(err); alert('Failed to send report.'); });
    });
  }

  // ------------------------
  // Game card clicks
  // ------------------------
  gameCards.forEach(card => {
    card.addEventListener('click', () => {
      const link = card.getAttribute('data-link');
      if (link) window.open(link,'_blank'); else alert("This game doesn't have a link yet.");
    });
  });

  // ------------------------
  // Nav filters
  // ------------------------
  const navLinks = document.querySelectorAll('.site-nav a');
  const allSections = document.querySelectorAll('.games-section');
  navLinks.forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');

      const filter = (link.getAttribute('data-filter') || 'all').toLowerCase();
      const unifiedContainer = document.getElementById('search-results');
      unifiedContainer.innerHTML='';

      if (filter==='all') {
        unifiedContainer.style.display='none';
        allSections.forEach(section => section.style.display='block');
        document.querySelectorAll('.game-card').forEach(card => card.style.display='');
        return;
      }

      allSections.forEach(section => section.style.display='none');
      unifiedContainer.style.display='flex';

      let found = 0;
      document.querySelectorAll('.game-card').forEach(card => {
        const genre = (card.getAttribute('data-genre') || '').toLowerCase();
        const popularity = (card.getAttribute('data-popularity') || '').toLowerCase();
        if (filter===genre || filter===popularity) {
          const clone = card.cloneNode(true);
          clone.addEventListener('click', () => {
            const link = clone.getAttribute('data-link');
            if (link) window.open(link,'_blank');
          });
          unifiedContainer.appendChild(clone);
          found++;
        }
      });

      if (found===0) unifiedContainer.innerHTML='<p>No games found.</p>';
    });
  });

  // ------------------------
  // Horizontal scrolling grids (smooth + fast)
  // ------------------------
document.querySelectorAll('.games-row').forEach(row => {
  const grid = row.querySelector('.games-grid');
  const leftBtn = row.querySelector('.scroll-btn.left');
  const rightBtn = row.querySelector('.scroll-btn.right');

  let scrolling = false;
  let direction = 0;
  const scrollSpeed = 5000; // ⚡ pixels per second — adjust for faster/slower
  let lastTime = 0;

  function step(timestamp) {
    if (!scrolling) {
      lastTime = 0; // reset timer when not scrolling
      return;
    }

    if (!lastTime) lastTime = timestamp;
    const delta = (timestamp - lastTime) / 1000; // convert ms → seconds
    lastTime = timestamp;

    // Scroll smoothly
    grid.scrollLeft += direction * scrollSpeed * delta;

    requestAnimationFrame(step);
  }

  const startScroll = dir => {
    direction = dir;
    if (!scrolling) {
      scrolling = true;
      lastTime = 0;
      requestAnimationFrame(step);
    }
  };

  const stopScroll = () => {
    scrolling = false;
  };

  // 🖱️ Mouse events
  leftBtn.addEventListener('mousedown', () => startScroll(-1));
  rightBtn.addEventListener('mousedown', () => startScroll(1));
  ['mouseup', 'mouseleave'].forEach(event => {
    leftBtn.addEventListener(event, stopScroll);
    rightBtn.addEventListener(event, stopScroll);
  });

  // 📱 Touch events
  leftBtn.addEventListener('touchstart', () => startScroll(-1));
  rightBtn.addEventListener('touchstart', () => startScroll(1));
  ['touchend', 'touchcancel'].forEach(event => {
    leftBtn.addEventListener(event, stopScroll);
    rightBtn.addEventListener(event, stopScroll);
  });
});



// ------------------------
// Firebase Shoutouts
// ------------------------
const firebaseConfig = {
  apiKey: "AIzaSyDyk5FAyCRyAn6ll5_nfSV5e16mvi1l-n4",
  authDomain: "mrsalt56-e6066.firebaseapp.com",
  databaseURL: "https://mrsalt56-e6066-default-rtdb.firebaseio.com",
  projectId: "mrsalt56-e6066",
  storageBucket: "mrsalt56-e6066.appspot.com",
  messagingSenderId: "716178119141",
  appId: "1:716178119141:web:2c39c7f79213699a38b70c",
  measurementId: "G-FZWFSV1K2D"
};

// Initialize Firebase (compat)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const submitBtn = document.getElementById("submitBtn");
const userNameInput = document.getElementById("userName");
const queueList = document.getElementById("queueList");
const cooldownMsg = document.getElementById("cooldownMsg");
const COOLDOWN = 60 * 1000;

// Submit a shoutout
submitBtn.addEventListener("click", () => {
  const name = userNameInput.value.trim();
  if (!name) return alert("Name submitted✅");

  const lastTime = localStorage.getItem("lastShoutout") || 0;
  if (Date.now() - lastTime < COOLDOWN) {
    cooldownMsg.textContent = "Please wait before submitting again!";
    return;
  }

  localStorage.setItem("lastShoutout", Date.now());
  cooldownMsg.textContent = "";

  // Push to Firebase
  db.ref("shoutouts").push({ name, timestamp: Date.now() });

  // Clear input
  userNameInput.value = "";

  // Send to Discord webhook
  fetch("https://discord.com/api/webhooks/1424618718499176601/6IfTXj3Tdl4FE2YUdrWIBDwOSabR61paQ3YhzCEMfVAK9SLVpXFAbyT7GpiFyCFsAInO", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: `📢 New shoutout request: **${name}**` })
  }).catch(console.error);
});

// Listen for updates and display shoutouts
db.ref("shoutouts").orderByChild("timestamp").on("value", snapshot => {
  const shoutouts = [];
  snapshot.forEach(childSnap => {
    shoutouts.push({ key: childSnap.key, name: childSnap.val().name });
  });

  // Keep oldest first (first-come-first-serve)
  shoutouts.sort((a, b) => a.timestamp - b.timestamp);

  // Display first 10
  const MAX_VISIBLE = 10;
  const visibleShoutouts = shoutouts.slice(0, MAX_VISIBLE);
  const hiddenCount = shoutouts.length - visibleShoutouts.length;

  // Update the list
  queueList.innerHTML = "";
  visibleShoutouts.forEach(entry => {
    const li = document.createElement("li");
    li.textContent = entry.name;
    li.style.color = "black"; // black font
    li.style.marginBottom = "4px";

    // Remove button
    const removeBtn = document.createElement("button");
    removeBtn.textContent = "Remove";
    removeBtn.className = "remove-btn";
    removeBtn.onclick = () => {
      const password = prompt("Enter admin password:");
      if (password === "56") db.ref(`shoutouts/${entry.key}`).remove();
    };

    li.appendChild(removeBtn);
    queueList.appendChild(li);
  });

  // Show "and X more" if needed
  if (hiddenCount > 0) {
    const moreLi = document.createElement("li");
    moreLi.textContent = `and ${hiddenCount} more`;
    moreLi.style.color = "black";
    moreLi.style.fontStyle = "italic";
    queueList.appendChild(moreLi);
  }
});
  // ------------------------
  // Initialize filter
  // ------------------------
  applyFilter('all');
});
