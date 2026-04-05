// ===== FutFul User App - Complete JavaScript =====

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCr2G8jyk_XfWgn7TSjBw3br3b9J1xWRH8",
  authDomain: "earning-bot-31c7d.firebaseapp.com",
  databaseURL: "https://earning-bot-31c7d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "earning-bot-31c7d",
  storageBucket: "earning-bot-31c7d.firebasestorage.app",
  messagingSenderId: "396666924900",
  appId: "1:396666924900:web:77a22669bd6c3e3ce6d471"
};

const GEMINI_API_KEY = "AIzaSyC_placeholder"; // Replace with actual Gemini API Key
const ADMIN_UID = "HwOGRjEQqQP95ultAQbbSKNkpHn1";

// Init Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();

// App State
let currentUser = null;
let currentPage = 'home';
let cart = [];
let chatHistory = [];
let bannerInterval = null;
let currentBanner = 0;
let allProducts = [];
let milestones = {};
let cachedPosts = [];

// ===== INIT =====
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    auth.onAuthStateChanged(user => {
      document.getElementById('splash').style.display = 'none';
      if (user) {
        currentUser = user;
        showMainApp();
      } else {
        show('authScreen');
      }
    });
  }, 2000);
});

function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}

// ===== AUTH =====
function showLogin() {
  document.getElementById('loginForm').classList.remove('hidden');
  document.getElementById('registerForm').classList.add('hidden');
}
function showRegister() {
  document.getElementById('loginForm').classList.add('hidden');
  document.getElementById('registerForm').classList.remove('hidden');
}

async function loginWithEmail() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPassword').value;
  if (!email || !pass) return showToast('ইমেইল এবং পাসওয়ার্ড দিন', 'error');
  try {
    showToast('লগইন হচ্ছে...');
    await auth.signInWithEmailAndPassword(email, pass);
    showToast('সফলভাবে লগইন হয়েছে ✓', 'success');
  } catch(e) {
    showToast('লগইন ব্যর্থ: ' + getErrMsg(e.code), 'error');
  }
}

async function registerUser() {
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const phone = document.getElementById('regPhone').value.trim();
  const pass = document.getElementById('regPassword').value;
  if (!name || !email || !pass) return showToast('সব ঘর পূরণ করুন', 'error');
  if (pass.length < 6) return showToast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'error');
  try {
    showToast('রেজিস্ট্রেশন হচ্ছে...');
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    await db.ref('users/' + cred.user.uid).set({ name, email, phone, createdAt: Date.now(), points: 0 });
    showToast('রেজিস্ট্রেশন সফল! ✓', 'success');
  } catch(e) {
    showToast('রেজিস্ট্রেশন ব্যর্থ: ' + getErrMsg(e.code), 'error');
  }
}

async function loginWithGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const user = result.user;
    const snap = await db.ref('users/' + user.uid).once('value');
    if (!snap.exists()) {
      await db.ref('users/' + user.uid).set({ name: user.displayName, email: user.email, createdAt: Date.now(), points: 0 });
    }
    showToast('Google লগইন সফল ✓', 'success');
  } catch(e) {
    showToast('Google লগইন ব্যর্থ', 'error');
  }
}

function getErrMsg(code) {
  const msgs = { 'auth/user-not-found': 'ব্যবহারকারী পাওয়া যায়নি', 'auth/wrong-password': 'পাসওয়ার্ড ভুল', 'auth/email-already-in-use': 'ইমেইল ইতিমধ্যে ব্যবহৃত', 'auth/invalid-email': 'ইমেইল সঠিক নয়' };
  return msgs[code] || 'সমস্যা হয়েছে';
}

// ===== MAIN APP =====
function showMainApp() {
  show('mainApp');
  document.getElementById('chatFab').classList.remove('hidden');
  loadUserData();
  showPage('home');
  checkDailyBonus();
  loadNotifications();
}

async function loadUserData() {
  if (!currentUser) return;
  const snap = await db.ref('users/' + currentUser.uid).once('value');
  if (snap.exists()) {
    const data = snap.val();
    currentUser.dbData = data;
  }
}

function showPage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('nav-' + page)?.classList.add('active');
  const content = document.getElementById('pageContent');
  switch(page) {
    case 'home': renderHome(content); break;
    case 'community': renderCommunity(content); break;
    case 'products': renderProducts(content); break;
    case 'earn': renderEarn(content); break;
    case 'tools': renderTools(content); break;
    case 'profile': renderProfile(content); break;
  }
}

// ===== HOME PAGE =====
function renderHome(el) {
  el.innerHTML = `
    <div class="section-pad">
      <!-- Banner -->
      <div class="banner-slider" id="bannerSlider">
        <div class="banner-track" id="bannerTrack"></div>
      </div>
      <div class="banner-dots" id="bannerDots"></div>
      
      <!-- AI Chatbot Banner -->
      <div class="chatbot-banner" onclick="toggleChatbot()">
        <div class="chatbot-banner-icon">🤖</div>
        <div class="chatbot-banner-text">
          <h3>FutFul Help Desk</h3>
          <p>AI-চালিত শিশু যত্ন পরামর্শ - ২৪/৭ উপলব্ধ</p>
          <button class="open-btn" onclick="event.stopPropagation(); toggleChatbot()">চ্যাট করুন →</button>
        </div>
      </div>
      
      <!-- Feature Grid -->
      <div class="section-header">
        <h2 class="section-title">মূল সেবাসমূহ</h2>
      </div>
      <div class="feature-grid">
        <div class="feature-card" onclick="openHealthHub()">
          <div class="feature-icon">❤️‍🩹</div>
          <div class="feature-name">স্বাস্থ্য কেন্দ্র</div>
          <div class="feature-desc">টিকা, বৃদ্ধি ট্র্যাকিং</div>
        </div>
        <div class="feature-card" onclick="openNutrition()">
          <div class="feature-icon">🥗</div>
          <div class="feature-name">পুষ্টি গাইড</div>
          <div class="feature-desc">বয়স অনুযায়ী খাবার</div>
        </div>
        <div class="feature-card" onclick="openDevelopment()">
          <div class="feature-icon">🌱</div>
          <div class="feature-name">বিকাশ ট্র্যাকার</div>
          <div class="feature-desc">মাইলস্টোন চেক করুন</div>
        </div>
        <div class="feature-card" onclick="openScheduler()">
          <div class="feature-icon">📅</div>
          <div class="feature-name">দৈনিক সময়সূচী</div>
          <div class="feature-desc">রুটিন ও রিমাইন্ডার</div>
        </div>
      </div>
      
      <!-- Quick Stats -->
      <div id="homeChildInfo"></div>
      
      <!-- Recent Posts -->
      <div class="section-header">
        <h2 class="section-title">কমিউনিটি</h2>
        <span class="see-all" onclick="showPage('community')">সব দেখুন →</span>
      </div>
      <div id="homePosts"><div class="loading-spinner"><div class="spinner"></div> লোড হচ্ছে...</div></div>
    </div>
  `;
  loadBanners();
  loadHomeChildInfo();
  loadRecentPostsHome();
}

async function loadBanners() {
  const track = document.getElementById('bannerTrack');
  const dotsEl = document.getElementById('bannerDots');
  if (!track) return;
  
  const defaultBanners = [
    { color: 'linear-gradient(135deg, #ff6b9d, #c77dff)', emoji: '🌸', title: 'FutFul-এ স্বাগতম', subtitle: 'আপনার শিশুর সেরা যত্নসঙ্গী' },
    { color: 'linear-gradient(135deg, #06d6a0, #4dabf7)', emoji: '👶', title: 'শিশুর সুস্বাস্থ্য', subtitle: 'টিকা ও বৃদ্ধি ট্র্যাক করুন' },
    { color: 'linear-gradient(135deg, #ff9f43, #ff6b9d)', emoji: '🥗', title: 'সুষম পুষ্টি', subtitle: 'বয়স উপযোগী খাবার পরিকল্পনা' }
  ];
  
  let banners = defaultBanners;
  try {
    const snap = await db.ref('banners').orderByChild('active').equalTo(true).once('value');
    if (snap.exists()) {
      const fbBanners = [];
      snap.forEach(c => fbBanners.push(c.val()));
      if (fbBanners.length > 0) banners = fbBanners;
    }
  } catch(e) {}
  
  track.innerHTML = banners.map((b, i) => `
    <div class="banner-slide" onclick="${b.link ? `window.open('${b.link}','_blank')` : ''}">
      ${b.imageUrl ? 
        `<img src="${b.imageUrl}" alt="${b.title}" onerror="this.parentNode.innerHTML='<div class=\\'banner-placeholder\\' style=\\'background:${b.color || 'linear-gradient(135deg,#ff6b9d,#c77dff)'}\\'>'+b.emoji+'<br>'+b.title+'</div>'">` :
        `<div class="banner-placeholder" style="background:${b.color || 'linear-gradient(135deg,#ff6b9d,#c77dff)'}"><div style="font-size:40px;margin-bottom:8px">${b.emoji || '🌸'}</div><div style="font-size:18px;font-weight:700">${b.title || ''}</div><div style="font-size:13px;opacity:0.8;margin-top:4px">${b.subtitle || ''}</div></div>`
      }
    </div>
  `).join('');
  
  dotsEl.innerHTML = banners.map((_, i) => `<div class="banner-dot ${i===0?'active':''}" onclick="goBanner(${i})"></div>`).join('');
  
  clearInterval(bannerInterval);
  currentBanner = 0;
  bannerInterval = setInterval(() => goBanner((currentBanner+1) % banners.length), 3500);
}

function goBanner(i) {
  currentBanner = i;
  const track = document.getElementById('bannerTrack');
  if (track) track.style.transform = `translateX(-${i*100}%)`;
  document.querySelectorAll('.banner-dot').forEach((d, idx) => d.classList.toggle('active', idx===i));
}

async function loadHomeChildInfo() {
  const el = document.getElementById('homeChildInfo');
  if (!el || !currentUser) return;
  try {
    const snap = await db.ref('users/' + currentUser.uid + '/children').once('value');
    if (!snap.exists()) {
      el.innerHTML = `
        <div class="card" style="text-align:center;cursor:pointer" onclick="openAddChild()">
          <div style="font-size:36px;margin-bottom:8px">👶</div>
          <div style="color:white;font-weight:600;font-size:15px">শিশুর প্রোফাইল যোগ করুন</div>
          <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-top:4px">টিকা ও মাইলস্টোন ট্র্যাক করতে</div>
        </div>
      `;
    } else {
      const children = [];
      snap.forEach(c => children.push({id: c.key, ...c.val()}));
      el.innerHTML = `
        <div class="section-header" style="margin-top:4px">
          <h2 class="section-title">আমার শিশু</h2>
          <span class="see-all" onclick="showPage('profile')">সম্পাদনা →</span>
        </div>
        <div class="children-scroll">
          ${children.map(c => `
            <div class="child-card" onclick="openChildDetail('${c.id}')">
              <div class="child-avatar">${c.gender==='মেয়ে'?'👧':'👦'}</div>
              <div class="child-name">${c.name}</div>
              <div class="child-age">${calcAge(c.dob)}</div>
            </div>
          `).join('')}
          <div class="child-card add-child" onclick="openAddChild()">
            <div class="child-avatar">➕</div>
            <div class="child-name" style="color:var(--pink)">যোগ করুন</div>
          </div>
        </div>
      `;
    }
  } catch(e) {}
}

async function loadRecentPostsHome() {
  const el = document.getElementById('homePosts');
  if (!el) return;
  try {
    const snap = await db.ref('posts').orderByChild('createdAt').limitToLast(3).once('value');
    if (!snap.exists()) {
      el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;font-size:14px;padding:16px">এখনো কোনো পোস্ট নেই</p>';
      return;
    }
    const posts = [];
    snap.forEach(c => posts.push({id: c.key, ...c.val()}));
    posts.reverse();
    el.innerHTML = posts.map(p => renderPostCard(p)).join('');
  } catch(e) {
    el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;font-size:14px;padding:16px">লোড করতে সমস্যা হয়েছে</p>';
  }
}

// ===== COMMUNITY PAGE =====
function renderCommunity(el) {
  el.innerHTML = `
    <div class="section-pad">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input type="text" id="postSearch" placeholder="পোস্ট খুঁজুন..." oninput="filterPosts(this.value)">
      </div>
      
      <div class="post-composer">
        <textarea class="post-input" id="newPostText" placeholder="আপনার অভিজ্ঞতা শেয়ার করুন..." rows="3"></textarea>
        <input type="file" id="postImageFile" accept="image/*" style="display:none" onchange="previewPostImage(this)">
        <div id="postImagePreview" style="margin:8px 0"></div>
        <div class="post-actions">
          <button class="post-media-btn" onclick="document.getElementById('postImageFile').click()">📷 ছবি যোগ করুন</button>
          <button class="post-submit" onclick="submitPost()">পোস্ট করুন →</button>
        </div>
      </div>
      
      <div id="postsContainer"><div class="loading-spinner"><div class="spinner"></div> লোড হচ্ছে...</div></div>
    </div>
  `;
  loadPosts();
}

async function loadPosts(searchTerm = '') {
  const el = document.getElementById('postsContainer');
  if (!el) return;
  try {
    const snap = await db.ref('posts').orderByChild('createdAt').limitToLast(30).once('value');
    cachedPosts = [];
    if (snap.exists()) {
      snap.forEach(c => { const d = c.val(); if(d.status !== 'rejected') cachedPosts.push({id: c.key, ...d}); });
      cachedPosts.reverse();
    }
    filterPosts(searchTerm);
  } catch(e) {
    el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">লোড করতে সমস্যা হয়েছে</p>';
  }
}

function filterPosts(term) {
  const el = document.getElementById('postsContainer');
  if (!el) return;
  const filtered = term ? cachedPosts.filter(p => p.content?.toLowerCase().includes(term.toLowerCase()) || p.authorName?.includes(term)) : cachedPosts;
  if (!filtered.length) {
    el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">কোনো পোস্ট পাওয়া যায়নি</p>';
    return;
  }
  el.innerHTML = filtered.map(p => renderPostCard(p)).join('');
}

function renderPostCard(p) {
  const liked = p.likedBy && p.likedBy[currentUser?.uid];
  return `
    <div class="post-card" id="post-${p.id}">
      <div class="post-header">
        <div class="post-avatar">${(p.authorName||'আ').charAt(0)}</div>
        <div class="post-meta">
          <h4>${p.authorName || 'অজানা ব্যবহারকারী'}</h4>
          <span>${formatTime(p.createdAt)}</span>
        </div>
        ${p.userId === currentUser?.uid ? `<button onclick="deletePost('${p.id}')" style="margin-left:auto;background:rgba(255,59,48,0.2);border:none;border-radius:20px;padding:4px 10px;color:#ff6b6b;font-size:11px;cursor:pointer;font-family:inherit">মুছুন</button>` : ''}
      </div>
      <div class="post-content">${escapeHtml(p.content || '')}</div>
      ${p.imageUrl ? `<img src="${p.imageUrl}" class="post-image" alt="পোস্ট ছবি" onerror="this.style.display='none'">` : ''}
      <div class="post-footer">
        <button class="post-action ${liked?'liked':''}" onclick="likePost('${p.id}', ${liked})">
          ${liked?'❤️':'🤍'} ${p.likes || 0}
        </button>
        <button class="post-action" onclick="openComments('${p.id}')">
          💬 ${Object.keys(p.comments || {}).length}
        </button>
        <button class="post-action" onclick="sharePost('${p.id}')">📤</button>
      </div>
    </div>
  `;
}

function previewPostImage(input) {
  const preview = document.getElementById('postImagePreview');
  if (!preview || !input.files[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    preview.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:120px;border-radius:10px;margin-top:4px"> <button onclick="document.getElementById('postImageFile').value='';document.getElementById('postImagePreview').innerHTML=''" style="background:rgba(255,59,48,0.2);border:none;border-radius:20px;padding:4px 10px;color:#ff6b6b;font-size:11px;cursor:pointer;font-family:inherit;margin-top:4px">ছবি সরান</button>`;
  };
  reader.readAsDataURL(input.files[0]);
}

async function submitPost() {
  const text = document.getElementById('newPostText')?.value.trim();
  if (!text) return showToast('পোস্টের বিষয়বস্তু লিখুন', 'error');
  if (!currentUser) return showToast('প্রথমে লগইন করুন', 'error');
  showToast('পোস্ট করা হচ্ছে...');
  try {
    const postData = {
      userId: currentUser.uid,
      authorName: currentUser.displayName || 'ব্যবহারকারী',
      content: text,
      createdAt: Date.now(),
      likes: 0,
      status: 'approved'
    };
    const fileInput = document.getElementById('postImageFile');
    if (fileInput?.files[0]) {
      const file = fileInput.files[0];
      const ref = storage.ref('posts/' + currentUser.uid + '_' + Date.now());
      await ref.put(file);
      postData.imageUrl = await ref.getDownloadURL();
    }
    await db.ref('posts').push(postData);
    document.getElementById('newPostText').value = '';
    document.getElementById('postImageFile').value = '';
    document.getElementById('postImagePreview').innerHTML = '';
    showToast('পোস্ট সফলভাবে হয়েছে ✓', 'success');
    loadPosts();
  } catch(e) {
    showToast('পোস্ট করতে সমস্যা হয়েছে', 'error');
  }
}

async function likePost(postId, isLiked) {
  if (!currentUser) return showToast('প্রথমে লগইন করুন', 'error');
  const ref = db.ref('posts/' + postId);
  try {
    await ref.transaction(post => {
      if (post) {
        if (!post.likedBy) post.likedBy = {};
        if (isLiked) { delete post.likedBy[currentUser.uid]; post.likes = Math.max(0, (post.likes||0)-1); }
        else { post.likedBy[currentUser.uid] = true; post.likes = (post.likes||0)+1; }
      }
      return post;
    });
    loadPosts();
  } catch(e) {}
}

async function deletePost(postId) {
  if (!confirm('এই পোস্টটি মুছে ফেলবেন?')) return;
  try {
    await db.ref('posts/' + postId).remove();
    showToast('পোস্ট মুছে ফেলা হয়েছে', 'success');
    loadPosts();
  } catch(e) {}
}

function sharePost(postId) {
  if (navigator.share) {
    navigator.share({ title: 'FutFul পোস্ট', text: 'FutFul কমিউনিটিতে এই পোস্টটি দেখুন', url: window.location.href });
  } else {
    showToast('লিংক কপি করা হয়েছে', 'success');
  }
}

function openComments(postId) {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">💬 মন্তব্য</div>
    <div id="commentsList" style="max-height:200px;overflow-y:auto;margin-bottom:12px">
      <div class="loading-spinner"><div class="spinner"></div></div>
    </div>
    <div style="display:flex;gap:8px">
      <input type="text" id="commentInput" class="dark-input" placeholder="মন্তব্য লিখুন..." style="flex:1">
      <button onclick="submitComment('${postId}')" class="btn-sm">পাঠান</button>
    </div>
  `);
  loadComments(postId);
}

async function loadComments(postId) {
  const snap = await db.ref('posts/' + postId + '/comments').once('value');
  const el = document.getElementById('commentsList');
  if (!el) return;
  if (!snap.exists()) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:13px;padding:8px">এখনো কোনো মন্তব্য নেই</p>'; return; }
  const cmts = [];
  snap.forEach(c => cmts.push(c.val()));
  el.innerHTML = cmts.map(c => `
    <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:10px;margin-bottom:8px">
      <div style="color:var(--pink);font-size:12px;font-weight:600;margin-bottom:4px">${c.authorName || 'ব্যবহারকারী'}</div>
      <div style="color:rgba(255,255,255,0.85);font-size:13px">${escapeHtml(c.text || '')}</div>
    </div>
  `).join('');
}

async function submitComment(postId) {
  const text = document.getElementById('commentInput')?.value.trim();
  if (!text || !currentUser) return;
  try {
    await db.ref('posts/' + postId + '/comments').push({ authorName: currentUser.displayName || 'ব্যবহারকারী', userId: currentUser.uid, text, createdAt: Date.now() });
    document.getElementById('commentInput').value = '';
    loadComments(postId);
    showToast('মন্তব্য যোগ হয়েছে ✓', 'success');
  } catch(e) {}
}

// ===== PRODUCTS PAGE =====
function renderProducts(el) {
  el.innerHTML = `
    <div class="section-pad">
      <div class="search-bar">
        <span class="search-icon">🔍</span>
        <input type="text" id="productSearch" placeholder="পণ্য খুঁজুন..." oninput="filterProducts(this.value)">
      </div>
      
      <div class="category-scroll" id="catScroll">
        <button class="cat-chip active" onclick="filterByCategory('সব', this)">সব পণ্য</button>
        <button class="cat-chip" onclick="filterByCategory('শিশু খাবার', this)">শিশু খাবার</button>
        <button class="cat-chip" onclick="filterByCategory('শিশু যত্ন', this)">শিশু যত্ন</button>
        <button class="cat-chip" onclick="filterByCategory('স্বাস্থ্য', this)">স্বাস্থ্য</button>
        <button class="cat-chip" onclick="filterByCategory('খেলনা', this)">শিক্ষামূলক খেলনা</button>
        <button class="cat-chip" onclick="filterByCategory('ফ্যাশন', this)">ফ্যাশন</button>
      </div>
      
      <div class="section-header">
        <h2 class="section-title">📚 ই-বুক সমূহ</h2>
        <span class="see-all" onclick="showEbooks()">সব দেখুন →</span>
      </div>
      <div id="ebookSection"></div>
      
      <h2 class="section-title" style="margin-top:4px">🛍️ পণ্য সমূহ</h2>
      <div id="productGrid" class="product-grid"><div class="loading-spinner" style="grid-column:1/-1"><div class="spinner"></div> লোড হচ্ছে...</div></div>
    </div>
  `;
  loadProducts();
  loadEbooks();
}

async function loadProducts(category = 'সব') {
  const el = document.getElementById('productGrid');
  if (!el) return;
  try {
    let query = db.ref('products');
    const snap = await query.once('value');
    allProducts = [];
    if (snap.exists()) {
      snap.forEach(c => { const d = c.val(); if (d.active !== false) allProducts.push({id: c.key, ...d}); });
    }
    if (!allProducts.length) {
      allProducts = getDefaultProducts();
    }
    renderProductGrid(category === 'সব' ? allProducts : allProducts.filter(p => p.category === category));
  } catch(e) {
    allProducts = getDefaultProducts();
    renderProductGrid(allProducts);
  }
}

function getDefaultProducts() {
  return [
    { id: 'd1', name: 'সেরেলাক শিশু খাবার', category: 'শিশু খাবার', price: 280, rating: 4.5, emoji: '🍼', stock: 50 },
    { id: 'd2', name: 'জনসন বেবি শ্যাম্পু', category: 'শিশু যত্ন', price: 220, rating: 4.3, emoji: '🧴', stock: 30 },
    { id: 'd3', name: 'নরম ভেলক্রো জুতো', category: 'ফ্যাশন', price: 450, rating: 4.0, emoji: '👟', stock: 20 },
    { id: 'd4', name: 'শিশু থার্মোমিটার', category: 'স্বাস্থ্য', price: 350, rating: 4.7, emoji: '🌡️', stock: 15 },
    { id: 'd5', name: 'রঙিন বিল্ডিং ব্লক', category: 'খেলনা', price: 550, rating: 4.8, emoji: '🧩', stock: 25 },
    { id: 'd6', name: 'শিশু লোশন', category: 'শিশু যত্ন', price: 180, rating: 4.2, emoji: '🧴', stock: 40 },
  ];
}

function renderProductGrid(products) {
  const el = document.getElementById('productGrid');
  if (!el) return;
  if (!products.length) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;grid-column:1/-1;padding:20px">কোনো পণ্য পাওয়া যায়নি</p>'; return; }
  el.innerHTML = products.map(p => `
    <div class="product-card" onclick="openProduct('${p.id}')">
      <div class="product-img">${p.emoji || '🛍️'}</div>
      <div class="product-info">
        <div class="product-name">${p.name}</div>
        <div class="product-rating">${'★'.repeat(Math.round(p.rating||4))}${'☆'.repeat(5-Math.round(p.rating||4))} ${p.rating||4}</div>
        <div class="product-price">৳${p.price || 0}</div>
        <button class="add-to-cart" onclick="event.stopPropagation(); addToCart('${p.id}')">কার্টে যোগ করুন</button>
      </div>
    </div>
  `).join('');
}

function filterProducts(term) {
  const filtered = allProducts.filter(p => p.name?.toLowerCase().includes(term.toLowerCase()) || p.category?.includes(term));
  renderProductGrid(filtered);
}

function filterByCategory(cat, btn) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
  btn.classList.add('active');
  renderProductGrid(cat === 'সব' ? allProducts : allProducts.filter(p => p.category === cat));
}

function openProduct(id) {
  const p = allProducts.find(x => x.id === id);
  if (!p) return;
  openModal(`
    <div class="modal-handle"></div>
    <div style="text-align:center;font-size:60px;margin:8px 0">${p.emoji || '🛍️'}</div>
    <div class="modal-title" style="text-align:center">${p.name}</div>
    <div style="color:var(--pink);font-size:24px;font-weight:700;text-align:center;margin:8px 0">৳${p.price}</div>
    <div style="color:rgba(255,255,255,0.55);font-size:13px;text-align:center;margin-bottom:12px">${p.category}</div>
    <div class="info-row"><span class="info-label">রেটিং</span><span class="info-value">${'★'.repeat(Math.round(p.rating||4))} ${p.rating}</span></div>
    <div class="info-row"><span class="info-label">স্টক</span><span class="info-value">${p.stock > 0 ? p.stock + ' টি পাওয়া যাচ্ছে' : 'স্টক নেই'}</span></div>
    ${p.description ? `<p style="color:rgba(255,255,255,0.7);font-size:14px;margin:12px 0;line-height:1.6">${p.description}</p>` : ''}
    <button onclick="addToCart('${p.id}'); closeModal()" class="btn-primary" style="margin-top:16px">কার্টে যোগ করুন 🛒</button>
  `);
}

function addToCart(productId) {
  const p = allProducts.find(x => x.id === productId);
  if (!p) { showToast('পণ্য পাওয়া যায়নি', 'error'); return; }
  const existing = cart.find(x => x.id === productId);
  if (existing) existing.qty++;
  else cart.push({...p, qty: 1});
  updateCartBadge();
  showToast(`${p.name} কার্টে যোগ হয়েছে ✓`, 'success');
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const badge = document.getElementById('cartBadge');
  if (badge) { badge.textContent = total; badge.classList.toggle('hidden', total === 0); }
}

function showCart() {
  const el = document.getElementById('cartPanel');
  el.classList.remove('hidden');
  renderCart();
}

function closeCart() {
  document.getElementById('cartPanel')?.classList.add('hidden');
}

function renderCart() {
  const el = document.getElementById('cartItems');
  const totalEl = document.getElementById('cartTotal');
  if (!el) return;
  if (!cart.length) { el.innerHTML = '<div class="empty-cart">🛒<br>কার্ট খালি</div>'; if(totalEl) totalEl.textContent = '৳০'; return; }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (totalEl) totalEl.textContent = '৳' + total;
  el.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="cart-item-img">${item.emoji || '🛍️'}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${item.name}</div>
        <div class="cart-item-price">৳${item.price * item.qty}</div>
        <div class="cart-item-qty">
          <button class="qty-btn" onclick="changeQty(${idx}, -1)">−</button>
          <span class="qty-display">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${idx}, 1)">+</button>
        </div>
      </div>
      <button class="remove-btn" onclick="removeFromCart(${idx})">✕</button>
    </div>
  `).join('');
}

function changeQty(idx, delta) {
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  updateCartBadge();
  renderCart();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  updateCartBadge();
  renderCart();
}

async function checkout() {
  if (!currentUser) return showToast('প্রথমে লগইন করুন', 'error');
  if (!cart.length) return showToast('কার্ট খালি', 'error');
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">🛒 চেকআউট</div>
    <div class="input-group"><label>ডেলিভারি ঠিকানা</label><textarea class="dark-input" id="checkoutAddress" placeholder="সম্পূর্ণ ঠিকানা লিখুন..." rows="3"></textarea></div>
    <div class="input-group"><label>ফোন নম্বর</label><input type="tel" class="dark-input" id="checkoutPhone" placeholder="01XXXXXXXXX"></div>
    <div style="background:rgba(255,255,255,0.07);border-radius:10px;padding:12px;margin-bottom:12px">
      ${cart.map(i => `<div class="info-row"><span class="info-label">${i.name} ×${i.qty}</span><span class="info-value">৳${i.price * i.qty}</span></div>`).join('')}
      <div class="info-row" style="border-top:1px solid rgba(255,255,255,0.1);padding-top:10px"><span style="color:white;font-weight:700">মোট</span><span style="color:var(--pink);font-weight:700;font-size:17px">৳${cart.reduce((s,i)=>s+i.price*i.qty,0)}</span></div>
    </div>
    <button onclick="placeOrder()" class="btn-primary">অর্ডার নিশ্চিত করুন</button>
  `);
}

async function placeOrder() {
  const address = document.getElementById('checkoutAddress')?.value.trim();
  const phone = document.getElementById('checkoutPhone')?.value.trim();
  if (!address || !phone) return showToast('ঠিকানা ও ফোন নম্বর দিন', 'error');
  try {
    const orderData = {
      userId: currentUser.uid,
      userName: currentUser.displayName || 'ব্যবহারকারী',
      products: cart.map(i => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      totalPrice: cart.reduce((s, i) => s + i.price * i.qty, 0),
      address, phone,
      status: 'pending',
      createdAt: Date.now()
    };
    await db.ref('orders').push(orderData);
    cart = [];
    updateCartBadge();
    closeCart();
    closeModal();
    showToast('অর্ডার সফলভাবে দেওয়া হয়েছে ✓', 'success');
  } catch(e) {
    showToast('অর্ডার দিতে সমস্যা হয়েছে', 'error');
  }
}

async function loadEbooks() {
  const el = document.getElementById('ebookSection');
  if (!el) return;
  const defaultEbooks = [
    { title: 'শিশু যত্নের সম্পূর্ণ গাইড', desc: '০-২ বছর বয়সী শিশুর পূর্ণাঙ্গ যত্ন', emoji: '📖', size: '২.৫ MB' },
    { title: 'মায়ের পুষ্টি গাইড', desc: 'গর্ভকালীন ও স্তন্যদানকালীন পুষ্টি', emoji: '🥗', size: '১.৮ MB' },
    { title: 'শিশুর মাইলস্টোন', desc: 'বিকাশের ধাপগুলি বুঝুন', emoji: '🌱', size: '১.২ MB' },
  ];
  el.innerHTML = defaultEbooks.map(e => `
    <div class="ebook-card">
      <div class="ebook-icon">${e.emoji}</div>
      <div class="ebook-info">
        <h4>${e.title}</h4>
        <p>${e.desc} • ${e.size}</p>
      </div>
      <button class="ebook-download" onclick="downloadEbook('${e.title}')">ডাউনলোড</button>
    </div>
  `).join('');
}

function downloadEbook(title) {
  showToast(`"${title}" ডাউনলোড শুরু হয়েছে ✓`, 'success');
}

function showEbooks() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">📚 সব ই-বুক</div>
    <div id="allEbooks"></div>
  `);
  loadAllEbooks();
}

async function loadAllEbooks() {
  const el = document.getElementById('allEbooks');
  if (!el) return;
  try {
    const snap = await db.ref('ebooks').once('value');
    if (!snap.exists()) { el.innerHTML = '<p style="color:rgba(255,255,255,0.5);text-align:center;padding:20px">কোনো ই-বুক পাওয়া যায়নি</p>'; return; }
    const books = [];
    snap.forEach(c => books.push({id: c.key, ...c.val()}));
    el.innerHTML = books.map(b => `
      <div class="ebook-card">
        <div class="ebook-icon">${b.emoji || '📖'}</div>
        <div class="ebook-info"><h4>${b.title}</h4><p>${b.description || ''}</p></div>
        <button class="ebook-download" onclick="${b.fileUrl ? `window.open('${b.fileUrl}','_blank')` : `downloadEbook('${b.title}')`}">ডাউনলোড</button>
      </div>
    `).join('');
  } catch(e) {}
}

// ===== EARN PAGE =====
async function renderEarn(el) {
  let points = 0, streak = 0, bonusClaimed = false;
  try {
    const snap = await db.ref('users/' + currentUser.uid).once('value');
    if (snap.exists()) {
      const d = snap.val();
      points = d.points || 0;
      const bonusSnap = await db.ref('dailyBonus/' + currentUser.uid).once('value');
      if (bonusSnap.exists()) {
        const bd = bonusSnap.val();
        streak = bd.streak || 0;
        const today = new Date().toDateString();
        bonusClaimed = bd.lastLoginDate === today;
      }
    }
  } catch(e) {}
  
  el.innerHTML = `
    <div class="section-pad">
      <div class="points-hero">
        <h2>আমার পয়েন্ট</h2>
        <div class="points-value" id="pointsDisplay">${points}</div>
        <div class="points-label">মোট পয়েন্ট</div>
        <div style="margin-top:12px;display:flex;gap:12px;justify-content:center">
          <div style="text-align:center"><div style="color:white;font-size:20px;font-weight:700">${streak}</div><div style="color:rgba(255,255,255,0.7);font-size:11px">ধারাবাহিক দিন</div></div>
          <div style="width:1px;background:rgba(255,255,255,0.2)"></div>
          <div style="text-align:center"><div style="color:white;font-size:20px;font-weight:700">${Math.floor(points/100)}</div><div style="color:rgba(255,255,255,0.7);font-size:11px">ব্যাজ</div></div>
        </div>
      </div>
      
      <!-- Daily Bonus -->
      <div class="earn-card daily" id="dailyBonusCard">
        <div class="earn-card-header">
          <div class="earn-icon">🎁</div>
          <div class="earn-info">
            <h3>দৈনিক লগইন বোনাস</h3>
            <p>প্রতিদিন লগইন করুন ও ১০ পয়েন্ট পান</p>
          </div>
          <div class="earn-badge ${bonusClaimed ? 'green' : ''}">${bonusClaimed ? '✓ পাওয়া গেছে' : '+১০ পয়েন্ট'}</div>
        </div>
        <div class="streak-bar">
          <div class="streak-label"><span>ধারা: ${streak} দিন</span><span>পরবর্তী মাইলস্টোন: ${(Math.floor(streak/7)+1)*7} দিন</span></div>
          <div class="progress-track"><div class="progress-fill" style="width:${(streak%7)/7*100}%"></div></div>
        </div>
        ${bonusClaimed ? '<div class="claimed-overlay"><span>✓ আজ বোনাস পেয়েছেন</span></div>' : `<button onclick="claimDailyBonus()" class="btn-primary" style="margin-top:12px;width:100%">বোনাস নিন 🎁</button>`}
      </div>
      
      <!-- Telegram Bots -->
      <div class="earn-card telegram" onclick="window.open('https://t.me/futfulcoinearnbot','_blank')">
        <div class="earn-card-header">
          <div class="earn-icon">📱</div>
          <div class="earn-info">
            <h3>Easy Earning Bot</h3>
            <p>@futfulcoinearnbot - সহজ কাজ করে পয়েন্ট অর্জন করুন</p>
          </div>
          <div class="earn-badge green">খুলুন</div>
        </div>
        <div style="margin-top:10px;color:rgba(255,255,255,0.6);font-size:12px">📌 সার্ভে, রেফারেল ও টাস্ক সম্পূর্ণ করুন</div>
      </div>
      
      <div class="earn-card game" onclick="window.open('https://t.me/gameplaywithfriendbot','_blank')">
        <div class="earn-card-header">
          <div class="earn-icon">🎮</div>
          <div class="earn-info">
            <h3>Game Play Bot</h3>
            <p>@gameplaywithfriendbot - গেম খেলে পয়েন্ট অর্জন</p>
          </div>
          <div class="earn-badge">খুলুন</div>
        </div>
        <div style="margin-top:10px;color:rgba(255,255,255,0.6);font-size:12px">🎯 কুইজ, পাজল ও বন্ধুদের সাথে খেলুন</div>
      </div>
      
      <!-- Point History -->
      <h2 class="section-title">📊 পয়েন্ট ইতিহাস</h2>
      <div id="pointHistory"><div class="loading-spinner"><div class="spinner"></div></div></div>
    </div>
  `;
  loadPointHistory();
}

async function claimDailyBonus() {
  if (!currentUser) return;
  const today = new Date().toDateString();
  const ref = db.ref('dailyBonus/' + currentUser.uid);
  try {
    const snap = await ref.once('value');
    if (snap.exists() && snap.val().lastLoginDate === today) { showToast('আজ ইতিমধ্যে বোনাস নিয়েছেন', 'error'); return; }
    const currentStreak = (snap.exists() && snap.val().lastLoginDate === new Date(Date.now()-86400000).toDateString()) ? (snap.val().streak || 0) + 1 : 1;
    await ref.set({ lastLoginDate: today, streak: currentStreak, lastClaimed: Date.now() });
    await db.ref('users/' + currentUser.uid + '/points').transaction(p => (p || 0) + 10);
    
    const logRef = db.ref('users/' + currentUser.uid + '/pointHistory');
    await logRef.push({ type: 'daily_bonus', points: 10, desc: 'দৈনিক লগইন বোনাস', date: Date.now() });
    
    showToast('🎉 ১০ পয়েন্ট পেয়েছেন!', 'success');
    renderEarn(document.getElementById('pageContent'));
  } catch(e) {
    showToast('বোনাস নিতে সমস্যা হয়েছে', 'error');
  }
}

async function loadPointHistory() {
  const el = document.getElementById('pointHistory');
  if (!el || !currentUser) return;
  try {
    const snap = await db.ref('users/' + currentUser.uid + '/pointHistory').orderByChild('date').limitToLast(10).once('value');
    if (!snap.exists()) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;font-size:13px;padding:16px">কোনো পয়েন্ট ইতিহাস নেই</p>'; return; }
    const hist = [];
    snap.forEach(c => hist.push(c.val()));
    hist.reverse();
    el.innerHTML = hist.map(h => `
      <div class="info-row">
        <div><div style="color:white;font-size:13px;font-weight:500">${h.desc || h.type}</div><div style="color:rgba(255,255,255,0.4);font-size:11px">${formatTime(h.date)}</div></div>
        <div style="color:${h.points>0?'var(--teal)':'#ff6b6b'};font-size:14px;font-weight:700">${h.points>0?'+':''}${h.points}</div>
      </div>
    `).join('');
  } catch(e) {}
}

async function checkDailyBonus() {
  if (!currentUser) return;
  try {
    const snap = await db.ref('dailyBonus/' + currentUser.uid).once('value');
    const today = new Date().toDateString();
    if (!snap.exists() || snap.val().lastLoginDate !== today) {
      setTimeout(() => showToast('🎁 আজকের দৈনিক বোনাস নিন! উপার্জন সেকশনে যান', 'success'), 3000);
    }
  } catch(e) {}
}

// ===== TOOLS PAGE =====
function renderTools(el) {
  el.innerHTML = `
    <div class="section-pad">
      <h2 class="section-title">🚨 জরুরি যোগাযোগ</h2>
      <div class="emergency-section">
        <div class="emergency-card" onclick="callNumber('999')">
          <div class="emg-icon">🚑</div>
          <div class="emg-info"><h4>জরুরি সেবা</h4><p>অ্যাম্বুলেন্স / পুলিশ / ফায়ার</p></div>
          <button class="emg-call">📞 999</button>
        </div>
        <div class="emergency-card" onclick="callNumber('16000')">
          <div class="emg-icon">🏥</div>
          <div class="emg-info"><h4>স্বাস্থ্য বাতায়ন</h4><p>সরকারি স্বাস্থ্যসেবা হেল্পলাইন</p></div>
          <button class="emg-call">📞 16000</button>
        </div>
        <div class="emergency-card" onclick="callNumber('10921')">
          <div class="emg-icon">👩‍⚕️</div>
          <div class="emg-info"><h4>শিশু সুরক্ষা হেল্পলাইন</h4><p>শিশু সংক্রান্ত সমস্যায় কল করুন</p></div>
          <button class="emg-call">📞 10921</button>
        </div>
      </div>
      
      <h2 class="section-title">🛠️ সহায়ক সরঞ্জাম</h2>
      <div class="tools-grid">
        <div class="tool-card" onclick="openAgeCalc()">
          <div class="tool-icon">🎂</div>
          <div class="tool-name">বয়স ক্যালকুলেটর</div>
        </div>
        <div class="tool-card" onclick="openWeightCalc()">
          <div class="tool-icon">⚖️</div>
          <div class="tool-name">ওজন রূপান্তর</div>
        </div>
        <div class="tool-card" onclick="openDoseCalc()">
          <div class="tool-icon">💊</div>
          <div class="tool-name">ডোজ ক্যালকুলেটর</div>
        </div>
        <div class="tool-card" onclick="openNameSuggestion()">
          <div class="tool-icon">✨</div>
          <div class="tool-name">নামকরণ সাজেশন</div>
        </div>
        <div class="tool-card" onclick="openNearbyHospital()">
          <div class="tool-icon">🏥</div>
          <div class="tool-name">নিকটস্থ হাসপাতাল</div>
        </div>
        <div class="tool-card" onclick="openNewsletterSignup()">
          <div class="tool-icon">📰</div>
          <div class="tool-name">নিউজলেটার</div>
        </div>
      </div>
      
      <h2 class="section-title">💡 সাপ্তাহিক টিপস</h2>
      <div id="weeklyTips"></div>
    </div>
  `;
  loadWeeklyTips();
}

function callNumber(num) {
  window.location.href = 'tel:' + num;
}

function loadWeeklyTips() {
  const el = document.getElementById('weeklyTips');
  if (!el) return;
  const tips = [
    '🌡️ শিশুর জ্বর ১০০.৪°F (৩৮°C) এর বেশি হলে ডাক্তারের পরামর্শ নিন',
    '🥛 ৬ মাস পর্যন্ত শুধু মায়ের দুধ শিশুর জন্য সর্বোত্তম',
    '💤 নবজাতক শিশু দিনে ১৬-১৭ ঘণ্টা ঘুমায়, এটা স্বাভাবিক',
    '🎵 শিশুর সাথে কথা বলুন ও গান গাইলে মস্তিষ্কের বিকাশ ত্বরান্বিত হয়',
    '🧼 শিশুর যত্নে সাবান ও পানি দিয়ে হাত ধোয়া সংক্রমণ প্রতিরোধ করে',
  ];
  el.innerHTML = tips.map(t => `<div class="tip-card">${t}</div>`).join('');
}

function openAgeCalc() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">🎂 বয়স ক্যালকুলেটর</div>
    <div class="input-group"><label>জন্ম তারিখ</label><input type="date" class="dark-input" id="ageDob" max="${new Date().toISOString().split('T')[0]}"></div>
    <button onclick="calculateAge()" class="btn-primary">বয়স হিসাব করুন</button>
    <div id="ageResult"></div>
  `);
}

function calculateAge() {
  const dob = document.getElementById('ageDob')?.value;
  const el = document.getElementById('ageResult');
  if (!dob || !el) return;
  const birth = new Date(dob);
  const now = new Date();
  let years = now.getFullYear() - birth.getFullYear();
  let months = now.getMonth() - birth.getMonth();
  let days = now.getDate() - birth.getDate();
  if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
  if (months < 0) { years--; months += 12; }
  el.innerHTML = `<div class="calc-result">${years > 0 ? years + ' বছর ' : ''}${months > 0 ? months + ' মাস ' : ''}${days} দিন</div>`;
}

function openWeightCalc() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">⚖️ ওজন রূপান্তর</div>
    <div class="two-col">
      <div class="input-group"><label>কেজি (kg)</label><input type="number" class="dark-input" id="wKg" placeholder="0.0" oninput="convertWeight('kg')"></div>
      <div class="input-group"><label>পাউন্ড (lb)</label><input type="number" class="dark-input" id="wLb" placeholder="0.0" oninput="convertWeight('lb')"></div>
    </div>
    <div class="two-col">
      <div class="input-group"><label>গ্রাম (g)</label><input type="number" class="dark-input" id="wG" placeholder="0" oninput="convertWeight('g')"></div>
      <div class="input-group"><label>আউন্স (oz)</label><input type="number" class="dark-input" id="wOz" placeholder="0.0" oninput="convertWeight('oz')"></div>
    </div>
  `);
}

function convertWeight(from) {
  const vals = { kg: parseFloat(document.getElementById('wKg')?.value)||0, lb: parseFloat(document.getElementById('wLb')?.value)||0, g: parseFloat(document.getElementById('wG')?.value)||0, oz: parseFloat(document.getElementById('wOz')?.value)||0 };
  let kg;
  if (from === 'kg') kg = vals.kg;
  else if (from === 'lb') kg = vals.lb * 0.4536;
  else if (from === 'g') kg = vals.g / 1000;
  else kg = vals.oz * 0.0283;
  const kgEl = document.getElementById('wKg'), lbEl = document.getElementById('wLb'), gEl = document.getElementById('wG'), ozEl = document.getElementById('wOz');
  if (from !== 'kg' && kgEl) kgEl.value = kg.toFixed(3);
  if (from !== 'lb' && lbEl) lbEl.value = (kg / 0.4536).toFixed(2);
  if (from !== 'g' && gEl) gEl.value = (kg * 1000).toFixed(0);
  if (from !== 'oz' && ozEl) ozEl.value = (kg / 0.0283).toFixed(2);
}

function openDoseCalc() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">💊 ডোজ ক্যালকুলেটর</div>
    <p style="color:rgba(255,255,255,0.6);font-size:12px;margin-bottom:14px">⚠️ এটি শুধু তথ্যমূলক। সর্বদা ডাক্তারের পরামর্শ নিন।</p>
    <div class="input-group"><label>শিশুর ওজন (কেজি)</label><input type="number" class="dark-input" id="doseWeight" placeholder="5.5"></div>
    <div class="input-group"><label>ওষুধ নির্বাচন করুন</label>
      <select class="dark-input" id="doseMed">
        <option value="paracetamol">প্যারাসিটামল (১৫mg/kg)</option>
        <option value="ibuprofen">আইবুপ্রোফেন (১০mg/kg)</option>
        <option value="amoxicillin">অ্যামক্সিসিলিন (২৫mg/kg)</option>
      </select>
    </div>
    <button onclick="calcDose()" class="btn-primary">ডোজ হিসাব করুন</button>
    <div id="doseResult"></div>
  `);
}

function calcDose() {
  const w = parseFloat(document.getElementById('doseWeight')?.value) || 0;
  const med = document.getElementById('doseMed')?.value;
  const el = document.getElementById('doseResult');
  if (!w || !el) return;
  const doses = { paracetamol: 15, ibuprofen: 10, amoxicillin: 25 };
  const mg = w * (doses[med] || 15);
  el.innerHTML = `<div class="calc-result">প্রস্তাবিত ডোজ: ${mg.toFixed(0)} mg<br><span style="font-size:13px;opacity:0.7">প্রতি ডোজে</span></div><div class="tip-card" style="margin-top:8px">⚠️ ডাক্তারের পরামর্শ ছাড়া ওষুধ দেবেন না।</div>`;
}

function openNameSuggestion() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">✨ শিশুর নামকরণ</div>
    <div class="input-group"><label>লিঙ্গ</label>
      <select class="dark-input" id="nameGender"><option value="ছেলে">ছেলে</option><option value="মেয়ে">মেয়ে</option></select>
    </div>
    <div class="input-group"><label>পছন্দের অক্ষর (ঐচ্ছিক)</label><input type="text" class="dark-input" id="nameStart" placeholder="যেমন: ম, ফ, স..."></div>
    <button onclick="suggestNames()" class="btn-primary">নাম সাজেস্ট করুন</button>
    <div id="nameSuggestions"></div>
  `);
}

function suggestNames() {
  const gender = document.getElementById('nameGender')?.value;
  const start = document.getElementById('nameStart')?.value.trim();
  const el = document.getElementById('nameSuggestions');
  if (!el) return;
  const boyNames = ['আবির', 'আহান', 'ইয়ান', 'উবাইদ', 'এহসান', 'ওমর', 'কাইয়ুম', 'ফারহান', 'মাহির', 'রায়ান', 'সামির', 'তানজিম', 'নাফিস', 'জাহিদ', 'হামজা', 'আরিয়ান', 'রিয়াদ', 'সাকিব', 'মিলান', 'তাহমিদ'];
  const girlNames = ['আয়েশা', 'আনিকা', 'ইরা', 'উমাইরা', 'এলাহ', 'ওয়ার্দা', 'ফাইজা', 'মাহিরা', 'রাফা', 'সাবিহা', 'তাহিয়া', 'নাফিসা', 'জান্নাত', 'হুমায়রা', 'আরিবা', 'রিমা', 'সুমাইয়া', 'মিষ্টি', 'তৃষা', 'নিলুফার'];
  let names = gender === 'ছেলে' ? boyNames : girlNames;
  if (start) names = names.filter(n => n.startsWith(start));
  el.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">${names.slice(0,12).map(n => `<div style="background:rgba(255,107,157,0.15);border:1px solid rgba(255,107,157,0.3);border-radius:20px;padding:6px 14px;color:white;font-size:14px;cursor:pointer" onclick="copyName('${n}')">${n}</div>`).join('')}</div>`;
}

function copyName(name) {
  navigator.clipboard?.writeText(name).then(() => showToast(`"${name}" কপি হয়েছে ✓`, 'success')).catch(() => showToast(`নাম: ${name}`, 'success'));
}

function openNearbyHospital() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const url = `https://www.google.com/maps/search/hospital+near+me/@${pos.coords.latitude},${pos.coords.longitude},14z`;
      window.open(url, '_blank');
    }, () => window.open('https://www.google.com/maps/search/hospital+near+me', '_blank'));
  } else {
    window.open('https://www.google.com/maps/search/hospital+near+me', '_blank');
  }
}

function openNewsletterSignup() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">📰 নিউজলেটার সাবস্ক্রিপশন</div>
    <p style="color:rgba(255,255,255,0.65);font-size:14px;margin-bottom:16px">সাপ্তাহিক শিশু যত্নের টিপস ও আপডেট পেতে সাবস্ক্রাইব করুন</p>
    <div class="input-group"><label>ইমেইল</label><input type="email" class="dark-input" id="nlEmail" placeholder="আপনার ইমেইল" value="${currentUser?.email || ''}"></div>
    <button onclick="subscribeNewsletter()" class="btn-primary">সাবস্ক্রাইব করুন</button>
  `);
}

async function subscribeNewsletter() {
  const email = document.getElementById('nlEmail')?.value.trim();
  if (!email) return showToast('ইমেইল দিন', 'error');
  try {
    await db.ref('newsletter/' + currentUser.uid).set({ email, subscribedAt: Date.now() });
    showToast('সাবস্ক্রিপশন সফল হয়েছে ✓', 'success');
    closeModal();
  } catch(e) { showToast('সমস্যা হয়েছে', 'error'); }
}

// ===== PROFILE PAGE =====
async function renderProfile(el) {
  const userName = currentUser?.displayName || 'ব্যবহারকারী';
  const userEmail = currentUser?.email || '';
  let points = 0, childCount = 0, orderCount = 0;
  try {
    const snap = await db.ref('users/' + currentUser.uid).once('value');
    if (snap.exists()) {
      const d = snap.val();
      points = d.points || 0;
      const childSnap = await db.ref('users/' + currentUser.uid + '/children').once('value');
      childCount = childSnap.exists() ? Object.keys(childSnap.val()).length : 0;
    }
    const ordSnap = await db.ref('orders').orderByChild('userId').equalTo(currentUser.uid).once('value');
    if (ordSnap.exists()) orderCount = Object.keys(ordSnap.val()).length;
  } catch(e) {}
  
  el.innerHTML = `
    <div class="section-pad">
      <div class="profile-header">
        <div class="profile-avatar" onclick="changeProfilePic()">
          ${currentUser?.photoURL ? `<img src="${currentUser.photoURL}" alt="প্রোফাইল">` : userName.charAt(0)}
          <div style="position:absolute;bottom:0;right:0;background:var(--pink);border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px">✏️</div>
        </div>
        <div class="profile-name">${userName}</div>
        <div class="profile-email">${userEmail}</div>
      </div>
      
      <div class="profile-stats">
        <div class="stat-card"><div class="stat-value">${points}</div><div class="stat-label">পয়েন্ট</div></div>
        <div class="stat-card"><div class="stat-value">${childCount}</div><div class="stat-label">শিশু</div></div>
        <div class="stat-card"><div class="stat-value">${orderCount}</div><div class="stat-label">অর্ডার</div></div>
      </div>
      
      <h2 class="section-title" style="margin-top:4px">👶 আমার শিশু</h2>
      <div id="profileChildren"><div class="loading-spinner"><div class="spinner"></div></div></div>
      
      <div style="margin-top:8px">
        <button class="btn-primary" style="width:100%" onclick="openAddChild()">➕ নতুন শিশু যোগ করুন</button>
      </div>
      
      <h2 class="section-title" style="margin-top:20px">⚙️ সেটিংস</h2>
      <div class="menu-list">
        <div class="menu-item" onclick="editProfile()"><span class="menu-icon">✏️</span><span class="menu-text">প্রোফাইল সম্পাদনা</span><span class="menu-arrow">›</span></div>
        <div class="menu-item" onclick="changePassword()"><span class="menu-icon">🔒</span><span class="menu-text">পাসওয়ার্ড পরিবর্তন</span><span class="menu-arrow">›</span></div>
        <div class="menu-item" onclick="showPage('earn')"><span class="menu-icon">💰</span><span class="menu-text">আমার পয়েন্ট ও উপার্জন</span><span class="menu-arrow">›</span></div>
        <div class="menu-item" onclick="showOrderHistory()"><span class="menu-icon">📦</span><span class="menu-text">অর্ডার ইতিহাস</span><span class="menu-arrow">›</span></div>
        <div class="menu-item" onclick="showNotificationsPage()"><span class="menu-icon">🔔</span><span class="menu-text">নোটিফিকেশন</span><span class="menu-arrow">›</span></div>
        <div class="menu-item" onclick="openPrivacyPolicy()"><span class="menu-icon">🛡️</span><span class="menu-text">গোপনীয়তা নীতি</span><span class="menu-arrow">›</span></div>
        <div class="menu-item" onclick="openAbout()"><span class="menu-icon">ℹ️</span><span class="menu-text">FutFul সম্পর্কে</span><span class="menu-arrow">›</span></div>
      </div>
      
      <button onclick="logout()" class="btn-logout">লগআউট করুন</button>
      <div style="height:20px"></div>
    </div>
  `;
  loadProfileChildren();
}

async function loadProfileChildren() {
  const el = document.getElementById('profileChildren');
  if (!el || !currentUser) return;
  try {
    const snap = await db.ref('users/' + currentUser.uid + '/children').once('value');
    if (!snap.exists()) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);font-size:13px;padding:8px 0">এখনো কোনো শিশুর প্রোফাইল যোগ করা হয়নি</p>'; return; }
    const children = [];
    snap.forEach(c => children.push({id: c.key, ...c.val()}));
    el.innerHTML = `<div class="children-scroll">
      ${children.map(c => `
        <div class="child-card">
          <div class="child-avatar">${c.gender==='মেয়ে'?'👧':'👦'}</div>
          <div class="child-name">${c.name}</div>
          <div class="child-age">${calcAge(c.dob)}</div>
          <div style="display:flex;gap:6px;margin-top:8px;justify-content:center">
            <button onclick="editChild('${c.id}')" style="background:rgba(255,255,255,0.1);border:none;border-radius:6px;padding:4px 8px;color:white;font-size:11px;cursor:pointer;font-family:inherit">✏️</button>
            <button onclick="deleteChild('${c.id}')" style="background:rgba(255,59,48,0.2);border:none;border-radius:6px;padding:4px 8px;color:#ff6b6b;font-size:11px;cursor:pointer;font-family:inherit">🗑️</button>
          </div>
        </div>
      `).join('')}
    </div>`;
  } catch(e) {}
}

function openAddChild() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">👶 শিশুর প্রোফাইল যোগ করুন</div>
    <div class="input-group"><label>শিশুর নাম</label><input type="text" class="dark-input" id="childName" placeholder="নাম লিখুন"></div>
    <div class="input-group"><label>জন্ম তারিখ</label><input type="date" class="dark-input" id="childDob" max="${new Date().toISOString().split('T')[0]}"></div>
    <div class="input-group"><label>লিঙ্গ</label>
      <select class="dark-input" id="childGender"><option value="ছেলে">ছেলে</option><option value="মেয়ে">মেয়ে</option></select>
    </div>
    <div class="two-col">
      <div class="input-group"><label>জন্ম ওজন (কেজি)</label><input type="number" class="dark-input" id="childBW" placeholder="3.2" step="0.1"></div>
      <div class="input-group"><label>জন্ম উচ্চতা (সেমি)</label><input type="number" class="dark-input" id="childBH" placeholder="50"></div>
    </div>
    <button onclick="saveChild()" class="btn-primary">সংরক্ষণ করুন</button>
  `);
}

async function saveChild() {
  const name = document.getElementById('childName')?.value.trim();
  const dob = document.getElementById('childDob')?.value;
  const gender = document.getElementById('childGender')?.value;
  const bw = document.getElementById('childBW')?.value;
  const bh = document.getElementById('childBH')?.value;
  if (!name || !dob) return showToast('নাম ও জন্ম তারিখ দিন', 'error');
  try {
    await db.ref('users/' + currentUser.uid + '/children').push({ name, dob, gender, birthWeight: parseFloat(bw) || 0, birthHeight: parseFloat(bh) || 0, createdAt: Date.now() });
    showToast('শিশুর প্রোফাইল সংরক্ষণ হয়েছে ✓', 'success');
    closeModal();
    if (currentPage === 'profile') renderProfile(document.getElementById('pageContent'));
    else loadHomeChildInfo();
  } catch(e) { showToast('সংরক্ষণ করতে সমস্যা হয়েছে', 'error'); }
}

async function deleteChild(childId) {
  if (!confirm('এই শিশুর প্রোফাইল মুছে ফেলবেন?')) return;
  try {
    await db.ref('users/' + currentUser.uid + '/children/' + childId).remove();
    showToast('শিশুর প্রোফাইল মুছে ফেলা হয়েছে', 'success');
    loadProfileChildren();
  } catch(e) {}
}

function editChild(childId) {
  db.ref('users/' + currentUser.uid + '/children/' + childId).once('value').then(snap => {
    const c = snap.val();
    openModal(`
      <div class="modal-handle"></div>
      <div class="modal-title">✏️ শিশুর তথ্য সম্পাদনা</div>
      <div class="input-group"><label>নাম</label><input type="text" class="dark-input" id="editChildName" value="${c.name || ''}"></div>
      <div class="input-group"><label>জন্ম তারিখ</label><input type="date" class="dark-input" id="editChildDob" value="${c.dob || ''}"></div>
      <div class="input-group"><label>লিঙ্গ</label>
        <select class="dark-input" id="editChildGender"><option value="ছেলে" ${c.gender==='ছেলে'?'selected':''}>ছেলে</option><option value="মেয়ে" ${c.gender==='মেয়ে'?'selected':''}>মেয়ে</option></select>
      </div>
      <button onclick="updateChild('${childId}')" class="btn-primary">আপডেট করুন</button>
    `);
  });
}

async function updateChild(childId) {
  const name = document.getElementById('editChildName')?.value.trim();
  const dob = document.getElementById('editChildDob')?.value;
  const gender = document.getElementById('editChildGender')?.value;
  if (!name) return showToast('নাম দিন', 'error');
  try {
    await db.ref('users/' + currentUser.uid + '/children/' + childId).update({ name, dob, gender });
    showToast('তথ্য আপডেট হয়েছে ✓', 'success');
    closeModal();
    loadProfileChildren();
  } catch(e) {}
}

function editProfile() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">✏️ প্রোফাইল সম্পাদনা</div>
    <div class="input-group"><label>নাম</label><input type="text" class="dark-input" id="editName" value="${currentUser?.displayName || ''}"></div>
    <div class="input-group"><label>ফোন</label><input type="tel" class="dark-input" id="editPhone" placeholder="01XXXXXXXXX"></div>
    <button onclick="updateProfile()" class="btn-primary">আপডেট করুন</button>
  `);
  db.ref('users/' + currentUser.uid).once('value').then(snap => {
    if (snap.exists() && document.getElementById('editPhone')) {
      document.getElementById('editPhone').value = snap.val().phone || '';
    }
  });
}

async function updateProfile() {
  const name = document.getElementById('editName')?.value.trim();
  const phone = document.getElementById('editPhone')?.value.trim();
  if (!name) return showToast('নাম দিন', 'error');
  try {
    await currentUser.updateProfile({ displayName: name });
    await db.ref('users/' + currentUser.uid).update({ name, phone });
    showToast('প্রোফাইল আপডেট হয়েছে ✓', 'success');
    closeModal();
    renderProfile(document.getElementById('pageContent'));
  } catch(e) { showToast('আপডেট করতে সমস্যা হয়েছে', 'error'); }
}

function changePassword() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">🔒 পাসওয়ার্ড পরিবর্তন</div>
    <div class="input-group"><label>বর্তমান পাসওয়ার্ড</label><input type="password" class="dark-input" id="oldPass"></div>
    <div class="input-group"><label>নতুন পাসওয়ার্ড</label><input type="password" class="dark-input" id="newPass"></div>
    <div class="input-group"><label>নতুন পাসওয়ার্ড নিশ্চিত করুন</label><input type="password" class="dark-input" id="confirmPass"></div>
    <button onclick="updatePassword()" class="btn-primary">পরিবর্তন করুন</button>
  `);
}

async function updatePassword() {
  const oldPass = document.getElementById('oldPass')?.value;
  const newPass = document.getElementById('newPass')?.value;
  const confirmPass = document.getElementById('confirmPass')?.value;
  if (!oldPass || !newPass) return showToast('পাসওয়ার্ড দিন', 'error');
  if (newPass !== confirmPass) return showToast('পাসওয়ার্ড মিলছে না', 'error');
  if (newPass.length < 6) return showToast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর', 'error');
  try {
    const cred = firebase.auth.EmailAuthProvider.credential(currentUser.email, oldPass);
    await currentUser.reauthenticateWithCredential(cred);
    await currentUser.updatePassword(newPass);
    showToast('পাসওয়ার্ড পরিবর্তন হয়েছে ✓', 'success');
    closeModal();
  } catch(e) { showToast('পাসওয়ার্ড পরিবর্তন ব্যর্থ', 'error'); }
}

function showOrderHistory() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">📦 অর্ডার ইতিহাস</div>
    <div id="orderHistoryList"><div class="loading-spinner"><div class="spinner"></div></div></div>
  `);
  loadOrderHistory();
}

async function loadOrderHistory() {
  const el = document.getElementById('orderHistoryList');
  if (!el) return;
  try {
    const snap = await db.ref('orders').orderByChild('userId').equalTo(currentUser.uid).once('value');
    if (!snap.exists()) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">কোনো অর্ডার নেই</p>'; return; }
    const orders = [];
    snap.forEach(c => orders.push({id: c.key, ...c.val()}));
    orders.sort((a, b) => b.createdAt - a.createdAt);
    el.innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-header">
          <span class="order-id">অর্ডার #${o.id.slice(-6).toUpperCase()}</span>
          <span class="order-status ${o.status}">${{pending:'অপেক্ষমান', processing:'প্রক্রিয়াধীন', shipped:'শিপড', delivered:'ডেলিভারড', cancelled:'বাতিল'}[o.status] || o.status}</span>
        </div>
        <div style="color:rgba(255,255,255,0.65);font-size:12px;margin-bottom:8px">${formatTime(o.createdAt)}</div>
        ${(o.products||[]).map(p => `<div class="info-row"><span class="info-label">${p.name} ×${p.qty}</span><span class="info-value">৳${p.price*p.qty}</span></div>`).join('')}
        <div style="color:var(--pink);font-weight:700;font-size:15px;text-align:right;margin-top:8px">মোট: ৳${o.totalPrice}</div>
      </div>
    `).join('');
  } catch(e) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">লোড করতে সমস্যা হয়েছে</p>'; }
}

async function logout() {
  if (!confirm('লগআউট করবেন?')) return;
  await auth.signOut();
  cart = [];
  currentUser = null;
  document.getElementById('chatFab').classList.add('hidden');
  show('authScreen');
  showToast('লগআউট হয়েছে', 'success');
}

// ===== HEALTH HUB =====
function openHealthHub() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">❤️‍🩹 স্বাস্থ্য কেন্দ্র</div>
    <div class="health-tabs">
      <button class="health-tab active" onclick="showHealthTab('vaccine', this)">💉 টিকা</button>
      <button class="health-tab" onclick="showHealthTab('growth', this)">📊 বৃদ্ধি</button>
      <button class="health-tab" onclick="showHealthTab('illness', this)">🤒 অসুস্থতা</button>
    </div>
    <div id="healthTabContent"></div>
  `);
  showHealthTab('vaccine', document.querySelector('.health-tab.active'));
}

function showHealthTab(tab, btn) {
  document.querySelectorAll('.health-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('healthTabContent');
  if (!el) return;
  if (tab === 'vaccine') {
    el.innerHTML = `
      <p style="color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:12px">বাংলাদেশ সরকারি ইপিআই কর্মসূচি অনুযায়ী</p>
      ${[
        { name: 'বিসিজি (BCG)', time: 'জন্মের সময়', status: 'done', desc: 'যক্ষ্মা প্রতিরোধ' },
        { name: 'পেন্টাভ্যালেন্ট ১ম', time: '৬ সপ্তাহ', status: 'done', desc: 'ডিপথেরিয়া, টিটেনাস, কাশি, হেপাটাইটিস বি, হিব' },
        { name: 'পেন্টাভ্যালেন্ট ২য়', time: '১০ সপ্তাহ', status: 'due', desc: 'ডিপথেরিয়া, টিটেনাস, কাশি, হেপাটাইটিস বি, হিব' },
        { name: 'পেন্টাভ্যালেন্ট ৩য়', time: '১৪ সপ্তাহ', status: 'upcoming', desc: 'ডিপথেরিয়া, টিটেনাস, কাশি, হেপাটাইটিস বি, হিব' },
        { name: 'হাম-রুবেলা (MR)', time: '৯ মাস', status: 'upcoming', desc: 'হাম ও রুবেলা প্রতিরোধ' },
        { name: 'ভিটামিন এ', time: '৯ মাস', status: 'upcoming', desc: 'দৃষ্টিশক্তি ও রোগ প্রতিরোধ' },
      ].map(v => `
        <div class="vaccine-item">
          <div class="vaccine-check ${v.status}">${v.status==='done'?'✓':v.status==='due'?'⚡':'○'}</div>
          <div class="vaccine-info"><h4>${v.name}</h4><p>${v.time} • ${v.desc}</p></div>
        </div>
      `).join('')}
    `;
  } else if (tab === 'growth') {
    el.innerHTML = `
      <p style="color:rgba(255,255,255,0.55);font-size:12px;margin-bottom:12px">শিশুর বৃদ্ধির রেকর্ড করুন</p>
      <div class="two-col">
        <div class="input-group"><label>ওজন (কেজি)</label><input type="number" class="dark-input" id="growthWeight" placeholder="8.5" step="0.1"></div>
        <div class="input-group"><label>উচ্চতা (সেমি)</label><input type="number" class="dark-input" id="growthHeight" placeholder="72"></div>
      </div>
      <button onclick="saveGrowthRecord()" class="btn-primary">রেকর্ড সংরক্ষণ করুন</button>
      <div class="chart-container" style="margin-top:16px">
        <div style="color:rgba(255,255,255,0.65);font-size:12px;margin-bottom:10px">বয়স অনুযায়ী স্বাভাবিক পরিসর (WHO)</div>
        <div class="chart-bar-wrap"><div class="chart-bar-label"><span>ওজন (৬ মাস)</span><span>৬.৫-৯.৫ কেজি</span></div><div class="chart-bar-track"><div class="chart-bar-fill weight" style="width:75%"></div></div></div>
        <div class="chart-bar-wrap"><div class="chart-bar-label"><span>উচ্চতা (৬ মাস)</span><span>৬২-৭২ সেমি</span></div><div class="chart-bar-track"><div class="chart-bar-fill height" style="width:82%"></div></div></div>
      </div>
    `;
  } else {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:10px">
        ${[
          { title: '🌡️ জ্বর', tips: 'হালকা জ্বর (৯৯-১০০°F): পর্যাপ্ত পানি পান, মাথায় ভেজা কাপড়। ১০২°F এর বেশি হলে ডাক্তার দেখান।' },
          { title: '🤧 সর্দি-কাশি', tips: 'বুকের দুধ বেশি দিন, নাক পরিষ্কার রাখুন। শ্বাসকষ্ট হলে সাথে সাথে হাসপাতালে যান।' },
          { title: '🚽 ডায়রিয়া', tips: 'ওআরএস (স্যালাইন) দিন। ৬ ঘণ্টার বেশি প্রস্রাব না হলে বা রক্তমিশ্রিত হলে ডাক্তার দেখান।' },
          { title: '🤮 বমি', tips: 'অল্প অল্প করে পানি বা বুকের দুধ দিন। ১২ ঘণ্টার বেশি চললে ডাক্তারের পরামর্শ নিন।' },
        ].map(i => `<div class="tip-card"><strong>${i.title}</strong><br>${i.tips}</div>`).join('')}
      </div>
    `;
  }
}

async function saveGrowthRecord() {
  const w = parseFloat(document.getElementById('growthWeight')?.value);
  const h = parseFloat(document.getElementById('growthHeight')?.value);
  if (!w && !h) return showToast('ওজন বা উচ্চতা দিন', 'error');
  try {
    await db.ref('users/' + currentUser.uid + '/growthRecords').push({ weight: w, height: h, date: Date.now() });
    showToast('বৃদ্ধির রেকর্ড সংরক্ষণ হয়েছে ✓', 'success');
  } catch(e) { showToast('সংরক্ষণ করতে সমস্যা হয়েছে', 'error'); }
}

// ===== NUTRITION HUB =====
function openNutrition() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">🥗 পুষ্টি গাইড</div>
    <div class="nutrition-age-tabs">
      <button class="age-tab active" onclick="showNutritionAge(0, this)">০-৬ মাস</button>
      <button class="age-tab" onclick="showNutritionAge(6, this)">৬-১২ মাস</button>
      <button class="age-tab" onclick="showNutritionAge(12, this)">১-২ বছর</button>
      <button class="age-tab" onclick="showNutritionAge(24, this)">২+ বছর</button>
    </div>
    <div id="nutritionContent"></div>
  `);
  showNutritionAge(0, document.querySelector('.age-tab.active'));
}

function showNutritionAge(age, btn) {
  document.querySelectorAll('.age-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('nutritionContent');
  if (!el) return;
  const guides = {
    0: { title: '০-৬ মাস: শুধু বুকের দুধ', items: ['মায়ের দুধই সর্বোত্তম খাবার', 'দিনে ৮-১২ বার খাওয়ান', 'পানিও দেওয়ার প্রয়োজন নেই', 'মায়ের খাবার: মাছ, ডাল, শাকসবজি বেশি খান', 'স্তন্যদানে সমস্যা হলে বিশেষজ্ঞের পরামর্শ নিন'] },
    6: { title: '৬-১২ মাস: শুরু হোক বাড়তি খাবার', items: ['মায়ের দুধের পাশাপাশি নরম খাবার শুরু', 'খিচুড়ি, ডাল, নরম ভাত', 'ফল: কলা, পেঁপে, আপেল', 'একটি করে নতুন খাবার ৩-৪ দিন দিয়ে দেখুন', 'মাছ, ডিম, মুরগির মাংস'] },
    12: { title: '১-২ বছর: পারিবারিক খাবারে অভ্যস্ত', items: ['পরিবারের সাথে একই খাবার', 'দিনে ৩ বেলা প্রধান ও ২ বার হালকা খাবার', 'দুধ: দিনে ৪০০-৫০০ মিলি', 'বাদাম, ফল, শাকসবজি বেশি দিন', 'লবণ ও চিনি কম দিন'] },
    24: { title: '২+ বছর: সুষম ও বৈচিত্র্যময় খাবার', items: ['সব ধরনের খাবার দিন', 'দিনে ৫ বার ফল বা সবজি', 'জাংক ফুড এড়িয়ে চলুন', 'পানি ও তাজা ফলের রস বেশি দিন', 'খাওয়ার সময় পরিবেশ আনন্দময় রাখুন'] },
  };
  const g = guides[age];
  el.innerHTML = `
    <div style="color:white;font-size:14px;font-weight:700;margin-bottom:10px">${g.title}</div>
    ${g.items.map(i => `<div class="tip-card">✅ ${i}</div>`).join('')}
    <div style="margin-top:14px"><div style="color:rgba(255,255,255,0.65);font-size:13px;margin-bottom:8px">স্থানীয় রেসিপি</div>
    ${[
      { name: 'সহজ খিচুড়ি', emoji: '🍚', desc: 'চাল, ডাল, সবজি দিয়ে নরম খিচুড়ি' },
      { name: 'সবজি পিউরি', emoji: '🥦', desc: 'আলু, গাজর, মিষ্টিকুমড়া মিশিয়ে' },
    ].map(r => `<div class="recipe-card"><div class="recipe-img">${r.emoji}</div><div class="recipe-body"><h4>${r.name}</h4><p>${r.desc}</p></div></div>`).join('')}
    </div>
  `;
}

// ===== DEVELOPMENT TRACKER =====
function openDevelopment() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">🌱 বিকাশ ট্র্যাকার</div>
    <div class="health-tabs">
      <button class="health-tab active" onclick="showDevTab('milestone', this)">🏆 মাইলস্টোন</button>
      <button class="health-tab" onclick="showDevTab('activities', this)">🎮 কার্যকলাপ</button>
    </div>
    <div id="devTabContent"></div>
  `);
  showDevTab('milestone', document.querySelector('.health-tab.active'));
}

function showDevTab(tab, btn) {
  document.querySelectorAll('.health-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('devTabContent');
  if (!el) return;
  if (tab === 'milestone') {
    const ms = [
      { id: 'm1', text: 'হাসতে শুরু করেছে', age: '২ মাস' },
      { id: 'm2', text: 'মাথা সোজা রাখতে পারছে', age: '৩ মাস' },
      { id: 'm3', text: 'গড়িয়ে পড়তে পারছে', age: '৫ মাস' },
      { id: 'm4', text: 'সাহায্য ছাড়া বসতে পারছে', age: '৮ মাস' },
      { id: 'm5', text: '"মা" "বাবা" বলতে পারছে', age: '১০ মাস' },
      { id: 'm6', text: 'একা দাঁড়াতে পারছে', age: '১২ মাস' },
      { id: 'm7', text: 'হাঁটতে শুরু করেছে', age: '১৩-১৫ মাস' },
      { id: 'm8', text: '২০+ শব্দ বলতে পারছে', age: '১৮ মাস' },
    ];
    el.innerHTML = `
      <p style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:12px">অর্জিত মাইলস্টোন চিহ্নিত করুন</p>
      ${ms.map(m => `
        <div class="milestone-item" onclick="toggleMilestone('${m.id}', this)">
          <div class="milestone-check ${milestones[m.id]?'done':''}" id="mcheck-${m.id}">${milestones[m.id]?'✓':''}</div>
          <div style="flex:1">
            <div class="milestone-text">${m.text}</div>
            <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:2px">সাধারণত ${m.age}-এ</div>
          </div>
        </div>
      `).join('')}
    `;
  } else {
    el.innerHTML = `
      ${[
        { emoji: '🎵', title: 'গান ও ছড়া', desc: 'শিশুর সাথে ছড়া ও গান করুন - ভাষা বিকাশে সহায়ক' },
        { emoji: '🏗️', title: 'ব্লক দিয়ে খেলা', desc: 'রঙিন ব্লক দিয়ে খেলা মোটর দক্ষতা বাড়ায়' },
        { emoji: '📚', title: 'ছবির বই', desc: 'রঙিন ছবির বই দেখুন - কল্পনাশক্তি বাড়ায়' },
        { emoji: '🎨', title: 'আঁকাআঁকি', desc: '১৮ মাস বয়স থেকে আঙুলে রঙ দিয়ে আঁকতে দিন' },
        { emoji: '🫧', title: 'পানি খেলা', desc: 'গোসলের সময় পানি খেলা ইন্দ্রিয় বিকাশে সাহায্য করে' },
      ].map(a => `
        <div class="ebook-card">
          <div class="ebook-icon">${a.emoji}</div>
          <div class="ebook-info"><h4>${a.title}</h4><p>${a.desc}</p></div>
        </div>
      `).join('')}
    `;
  }
}

function toggleMilestone(id, el) {
  milestones[id] = !milestones[id];
  const check = document.getElementById('mcheck-' + id);
  if (check) { check.className = 'milestone-check' + (milestones[id] ? ' done' : ''); check.textContent = milestones[id] ? '✓' : ''; }
  if (currentUser) db.ref('users/' + currentUser.uid + '/milestones/' + id).set(milestones[id]);
  if (milestones[id]) showToast('মাইলস্টোন অর্জিত! ✓', 'success');
}

// ===== DAILY SCHEDULER =====
function openScheduler() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">📅 দৈনিক সময়সূচী</div>
    <div class="health-tabs">
      <button class="health-tab active" onclick="showScheduleTab('add', this)">➕ যোগ করুন</button>
      <button class="health-tab" onclick="showScheduleTab('list', this)">📋 তালিকা</button>
      <button class="health-tab" onclick="showScheduleTab('mental', this)">🧠 মানসিক</button>
    </div>
    <div id="scheduleTabContent"></div>
  `);
  showScheduleTab('add', document.querySelector('.health-tab.active'));
}

function showScheduleTab(tab, btn) {
  document.querySelectorAll('.health-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const el = document.getElementById('scheduleTabContent');
  if (!el) return;
  if (tab === 'add') {
    el.innerHTML = `
      <div class="input-group"><label>কার্যকলাপের ধরন</label>
        <select class="dark-input" id="schedType">
          <option value="খাওয়ানো">🍼 খাওয়ানো</option>
          <option value="ঘুম">😴 ঘুম</option>
          <option value="ডায়াপার পরিবর্তন">🧷 ডায়াপার পরিবর্তন</option>
          <option value="ওষুধ">💊 ওষুধ</option>
          <option value="খেলা">🎮 খেলা</option>
          <option value="গোসল">🛁 গোসল</option>
        </select>
      </div>
      <div class="input-group"><label>সময়</label><input type="time" class="dark-input" id="schedTime"></div>
      <div class="input-group"><label>নোট (ঐচ্ছিক)</label><input type="text" class="dark-input" id="schedNote" placeholder="বিস্তারিত লিখুন..."></div>
      <button onclick="saveSchedule()" class="btn-primary">সময়সূচী সংরক্ষণ করুন</button>
    `;
  } else if (tab === 'list') {
    el.innerHTML = `<div id="scheduleList"><div class="loading-spinner"><div class="spinner"></div></div></div>`;
    loadSchedule();
  } else {
    el.innerHTML = `
      <div style="color:rgba(255,255,255,0.65);font-size:13px;margin-bottom:12px">প্রসবোত্তর মানসিক স্বাস্থ্য</div>
      ${[
        { title: 'পোস্টপার্টাম ডিপ্রেশন', icon: '💙', desc: 'সন্তান প্রসবের পর বিষণ্নতা, উদ্বেগ স্বাভাবিক। পরিবারের সহায়তা নিন।' },
        { title: 'ব্যায়াম ও শ্বাস-প্রশ্বাস', icon: '🧘', desc: 'গভীর শ্বাস নিন: ৪ গণনায় শ্বাস নিন, ৭ গণনায় ধরুন, ৮ গণনায় ছাড়ুন।' },
        { title: 'পেশাদার সাহায্য', icon: '👩‍⚕️', desc: 'কান পেতে রই: 01779-554391 (মানসিক স্বাস্থ্য হেল্পলাইন)' },
      ].map(t => `<div class="card" style="display:flex;gap:12px;align-items:flex-start"><div style="font-size:28px">${t.icon}</div><div><div style="color:white;font-size:14px;font-weight:600;margin-bottom:4px">${t.title}</div><div style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.5">${t.desc}</div></div></div>`).join('')}
    `;
  }
}

async function saveSchedule() {
  const type = document.getElementById('schedType')?.value;
  const time = document.getElementById('schedTime')?.value;
  const note = document.getElementById('schedNote')?.value;
  if (!time) return showToast('সময় দিন', 'error');
  try {
    await db.ref('users/' + currentUser.uid + '/schedule').push({ type, time, note, date: new Date().toDateString(), createdAt: Date.now() });
    showToast('সময়সূচী সংরক্ষণ হয়েছে ✓', 'success');
  } catch(e) { showToast('সমস্যা হয়েছে', 'error'); }
}

async function loadSchedule() {
  const el = document.getElementById('scheduleList');
  if (!el) return;
  try {
    const today = new Date().toDateString();
    const snap = await db.ref('users/' + currentUser.uid + '/schedule').orderByChild('date').equalTo(today).once('value');
    if (!snap.exists()) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;font-size:13px;padding:16px">আজকের কোনো সময়সূচী নেই</p>'; return; }
    const items = [];
    snap.forEach(c => items.push({id: c.key, ...c.val()}));
    items.sort((a, b) => a.time > b.time ? 1 : -1);
    el.innerHTML = items.map(i => `
      <div class="info-row">
        <div><div style="color:white;font-size:13px;font-weight:600">${i.type}</div>${i.note ? `<div style="color:rgba(255,255,255,0.5);font-size:11px">${i.note}</div>` : ''}</div>
        <div style="color:rgba(255,255,255,0.55);font-size:13px">${i.time}</div>
      </div>
    `).join('');
  } catch(e) {}
}

// ===== NOTIFICATIONS =====
async function loadNotifications() {
  if (!currentUser) return;
  try {
    const snap = await db.ref('notifications').orderByChild('active').equalTo(true).limitToLast(5).once('value');
    if (snap.exists()) {
      const count = Object.keys(snap.val()).length;
      const badge = document.getElementById('notifBadge');
      if (badge && count > 0) { badge.textContent = count; badge.classList.remove('hidden'); }
    }
  } catch(e) {}
}

function showNotifications() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">🔔 বিজ্ঞপ্তি</div>
    <div id="notifList"><div class="loading-spinner"><div class="spinner"></div></div></div>
  `);
  loadNotifList();
}

async function loadNotifList() {
  const el = document.getElementById('notifList');
  if (!el) return;
  try {
    const snap = await db.ref('notifications').orderByChild('createdAt').limitToLast(20).once('value');
    if (!snap.exists()) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">কোনো বিজ্ঞপ্তি নেই</p>'; return; }
    const notifs = [];
    snap.forEach(c => notifs.push({id: c.key, ...c.val()}));
    notifs.reverse();
    el.innerHTML = notifs.map(n => `
      <div class="notif-item ${n.isNew ? 'unread' : ''}">
        <h4>${n.title || 'বিজ্ঞপ্তি'}</h4>
        <p>${n.content || n.body || ''}</p>
        <div style="color:rgba(255,255,255,0.3);font-size:11px;margin-top:4px">${formatTime(n.createdAt)}</div>
      </div>
    `).join('');
  } catch(e) { el.innerHTML = '<p style="color:rgba(255,255,255,0.4);text-align:center;padding:20px">লোড করতে সমস্যা হয়েছে</p>'; }
}

function showNotificationsPage() { showNotifications(); }

function openChildDetail(childId) {
  db.ref('users/' + currentUser.uid + '/children/' + childId).once('value').then(snap => {
    if (!snap.exists()) return;
    const c = snap.val();
    openModal(`
      <div class="modal-handle"></div>
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:56px">${c.gender==='মেয়ে'?'👧':'👦'}</div>
        <div style="color:white;font-size:20px;font-weight:700;margin-top:8px">${c.name}</div>
        <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-top:4px">${calcAge(c.dob)}</div>
      </div>
      <div class="info-row"><span class="info-label">জন্ম তারিখ</span><span class="info-value">${c.dob || '-'}</span></div>
      <div class="info-row"><span class="info-label">লিঙ্গ</span><span class="info-value">${c.gender}</span></div>
      <div class="info-row"><span class="info-label">জন্ম ওজন</span><span class="info-value">${c.birthWeight ? c.birthWeight + ' কেজি' : '-'}</span></div>
      <div class="info-row"><span class="info-label">জন্ম উচ্চতা</span><span class="info-value">${c.birthHeight ? c.birthHeight + ' সেমি' : '-'}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
        <button onclick="closeModal();openHealthHub()" class="btn-sm">💉 টিকা</button>
        <button onclick="closeModal();openDevelopment()" class="btn-sm">🌱 বিকাশ</button>
      </div>
    `);
  });
}

function changeProfilePic() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    showToast('ছবি আপলোড হচ্ছে...');
    try {
      const ref = storage.ref('profilePics/' + currentUser.uid);
      await ref.put(file);
      const url = await ref.getDownloadURL();
      await currentUser.updateProfile({ photoURL: url });
      await db.ref('users/' + currentUser.uid).update({ profileImage: url });
      showToast('প্রোফাইল ছবি আপডেট হয়েছে ✓', 'success');
      renderProfile(document.getElementById('pageContent'));
    } catch(e) { showToast('আপলোড করতে সমস্যা হয়েছে', 'error'); }
  };
  input.click();
}

function openPrivacyPolicy() {
  openModal(`
    <div class="modal-handle"></div>
    <div class="modal-title">🛡️ গোপনীয়তা নীতি</div>
    <div style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.8">
      <p><strong style="color:white">FutFul</strong> আপনার ব্যক্তিগত তথ্যের সুরক্ষাকে সর্বোচ্চ অগ্রাধিকার দেয়।</p><br>
      <p><strong style="color:white">আমরা সংগ্রহ করি:</strong> ইমেইল, নাম, ফোন নম্বর, শিশুর তথ্য (শুধু আপনার সুবিধার জন্য)</p><br>
      <p><strong style="color:white">আমরা শেয়ার করি না:</strong> তৃতীয় পক্ষের কাছে আপনার কোনো ব্যক্তিগত তথ্য বিক্রি বা শেয়ার করা হয় না।</p><br>
      <p><strong style="color:white">নিরাপত্তা:</strong> Firebase এর সর্বোচ্চ নিরাপত্তা ব্যবস্থা ব্যবহার করা হয়।</p><br>
      <p>যোগাযোগ: mhtotul9@gmail.com</p>
    </div>
  `);
}

function openAbout() {
  openModal(`
    <div class="modal-handle"></div>
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:60px;margin-bottom:8px">🌸</div>
      <div style="color:white;font-size:28px;font-weight:700">FutFul</div>
      <div style="color:rgba(255,255,255,0.55);font-size:13px;margin-top:4px">সংস্করণ ১.০.০</div>
    </div>
    <div style="color:rgba(255,255,255,0.7);font-size:13px;line-height:1.8;text-align:center">
      <p>FutFul একটি সম্পূর্ণ মাতৃত্ব ও শিশু যত্ন অ্যাপ্লিকেশন।</p>
      <p style="margin-top:8px">বাংলাদেশের মায়েদের জন্য তৈরি - বাংলা ভাষায়।</p>
    </div>
    <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px">
      <div class="info-row"><span class="info-label">ডেভেলপার</span><span class="info-value">FutFul Team</span></div>
      <div class="info-row"><span class="info-label">ইমেইল</span><span class="info-value">mhtotul9@gmail.com</span></div>
      <div class="info-row"><span class="info-label">ওয়েবসাইট</span><span class="info-value">futful.app</span></div>
    </div>
  `);
}

// ===== CHATBOT =====
function toggleChatbot() {
  const panel = document.getElementById('chatbotPanel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    document.getElementById('chatInput')?.focus();
  }
}

async function sendChat() {
  const input = document.getElementById('chatInput');
  const msg = input?.value.trim();
  if (!msg) return;
  input.value = '';
  
  appendChatMsg(msg, 'user');
  appendChatMsg('...', 'bot', true);
  
  try {
    const systemPrompt = `আপনি FutFul Help Desk, একটি বাংলা ভাষার AI সহকারী। আপনি শিশু যত্ন, মাতৃস্বাস্থ্য, শিশু পুষ্টি, টিকাদান, শিশু বিকাশ এবং মায়ের মানসিক স্বাস্থ্য সম্পর্কে পরামর্শ দেন। সর্বদা বাংলায় উত্তর দিন এবং বন্ধুসুলভ, সহানুভূতিশীল থাকুন। চিকিৎসার জন্য সর্বদা ডাক্তারের পরামর্শ নেওয়ার কথা বলুন।`;
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=AIzaSyDummyKey`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt + '\n\nপ্রশ্ন: ' + msg }] }] })
    });
    
    let botReply;
    if (response.ok) {
      const data = await response.json();
      botReply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'উত্তর দিতে সমস্যা হয়েছে।';
    } else {
      throw new Error('API error');
    }
    
    updateLastBotMsg(botReply);
  } catch(e) {
    const fallbacks = [
      'শিশুর যত্নের বিষয়ে আপনার প্রশ্নের জন্য ধন্যবাদ। শিশুর কোনো স্বাস্থ্য সমস্যায় সর্বদা একজন শিশু বিশেষজ্ঞের পরামর্শ নিন। 👩‍⚕️',
      'আপনার শিশুর সুস্বাস্থ্য নিশ্চিত করতে নিয়মিত টিকা দিন এবং বৃদ্ধি পর্যবেক্ষণ করুন। 💉',
      '৬ মাস পর্যন্ত শুধু বুকের দুধ শিশুর জন্য সর্বোত্তম। কোনো প্রশ্ন থাকলে ডাক্তারের সাথে পরামর্শ করুন। 🍼',
    ];
    updateLastBotMsg(fallbacks[Math.floor(Math.random() * fallbacks.length)]);
  }
  
  chatHistory.push({ role: 'user', content: msg });
}

function appendChatMsg(text, type, isLoading = false) {
  const container = document.getElementById('chatMessages');
  if (!container) return;
  const div = document.createElement('div');
  div.className = 'chat-msg ' + type;
  if (isLoading) div.id = 'loadingMsg';
  div.innerHTML = `<span>${text}</span>`;
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

function updateLastBotMsg(text) {
  const loading = document.getElementById('loadingMsg');
  if (loading) { loading.innerHTML = `<span>${text}</span>`; loading.id = ''; }
  const container = document.getElementById('chatMessages');
  if (container) container.scrollTop = container.scrollHeight;
}

// ===== MODAL =====
function openModal(html) {
  const overlay = document.getElementById('modalOverlay');
  const content = document.getElementById('modalContent');
  if (overlay && content) {
    content.innerHTML = html;
    overlay.classList.remove('hidden');
    content.scrollTop = 0;
  }
}

function closeModal() {
  document.getElementById('modalOverlay')?.classList.add('hidden');
}

// ===== UTILITIES =====
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'toast' + (type ? ' ' + type : '');
  toast.classList.remove('hidden');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'এইমাত্র';
  if (diff < 3600000) return Math.floor(diff/60000) + ' মিনিট আগে';
  if (diff < 86400000) return Math.floor(diff/3600000) + ' ঘণ্টা আগে';
  return d.toLocaleDateString('bn-BD');
}

function calcAge(dob) {
  if (!dob) return 'বয়স অজানা';
  const birth = new Date(dob);
  const now = new Date();
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 1) return Math.floor((now - birth) / (1000 * 60 * 60 * 24)) + ' দিন';
  if (months < 12) return months + ' মাস';
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return years + ' বছর' + (rem > 0 ? ' ' + rem + ' মাস' : '');
}

function escapeHtml(text) {
  return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
