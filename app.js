// ╔══════════════════════════════════════════════════╗
// ║        FutFul User App — Complete JS             ║
// ╚══════════════════════════════════════════════════╝

// ── Firebase Config ──────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCr2G8jyk_XfWgn7TSjBw3br3b9J1xWRH8",
  authDomain: "earning-bot-31c7d.firebaseapp.com",
  databaseURL: "https://earning-bot-31c7d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "earning-bot-31c7d",
  storageBucket: "earning-bot-31c7d.firebasestorage.app",
  messagingSenderId: "396666924900",
  appId: "1:396666924900:web:77a22669bd6c3e3ce6d471"
};
const GEMINI_KEY = "AIzaSyBHQsv6Sxuhy9i6BbhRqE_iVExkVgRnnuE"; // Gemini API Key
const ADMIN_UID  = "HwOGRjEQqQP95ultAQbbSKNkpHn1";

firebase.initializeApp(firebaseConfig);
const auth    = firebase.auth();
const db      = firebase.database();
const storage = firebase.storage();

// ── Firebase Auth Persistence: ইমেইল/পাসওয়ার্ড Browser-এ সেভ থাকবে ──
// LOCAL = ব্রাউজার বন্ধ করলেও সেশন থাকবে, বার বার লগইন লাগবে না
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// ── NO localStorage/sessionStorage/cookie — সব data Firebase-এ ──

// ── App State ─────────────────────────────────────────
let cUser       = null;   // current Firebase user
let cPage       = 'home';
let cart        = [];
let allProds    = [];
let cachedPosts = [];
let milestones  = {};
let bannerTimer = null;
let curBanner   = 0;

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 60000);
  setTimeout(() => {
    auth.onAuthStateChanged(u => {
      hide('splash');
      if (u) { cUser = u; bootApp(); }
      else     showScreen('authScreen');
    });
  }, 2200);
});

function updateClock() {
  const now = new Date();
  const el = document.getElementById('headerClock');
  if (el) el.textContent = now.toLocaleTimeString('bn-BD', {hour:'2-digit', minute:'2-digit'});
}

// ══════════════════════════════════════════════════════
//  SCREEN HELPERS
// ══════════════════════════════════════════════════════
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(id)?.classList.remove('hidden');
}
function hide(id) { document.getElementById(id)?.style ? document.getElementById(id).style.display = 'none' : null; }
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hid(id)  { document.getElementById(id)?.classList.add('hidden'); }

// ══════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════
function showReg()   { hid('loginBox'); show('regBox'); }
function showLogin() { hid('regBox'); show('loginBox'); }

function togglePass(id, btn) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === 'password') { el.type = 'text'; btn.textContent = '🙈'; }
  else { el.type = 'password'; btn.textContent = '👁'; }
}

async function doLogin() {
  const email = document.getElementById('loginEmail')?.value.trim();
  const pass  = document.getElementById('loginPass')?.value;
  if (!email || !pass) return toast('ইমেইল ও পাসওয়ার্ড দিন', 'error');
  toast('লগইন হচ্ছে...');
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    // Firebase auth persistence handles browser credential saving automatically
  } catch(e) { toast(authErr(e.code), 'error'); }
}

async function doRegister() {
  const name  = document.getElementById('rName')?.value.trim();
  const email = document.getElementById('rEmail')?.value.trim();
  const phone = document.getElementById('rPhone')?.value.trim();
  const pass  = document.getElementById('rPass')?.value;
  if (!name)  return toast('আপনার নাম দিন', 'error');
  if (!email) return toast('ইমেইল দিন', 'error');
  if (!pass || pass.length < 6) return toast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর হতে হবে', 'error');
  toast('রেজিস্ট্রেশন হচ্ছে...');
  try {
    const c = await auth.createUserWithEmailAndPassword(email, pass);
    await c.user.updateProfile({ displayName: name });
    // সব ডেটা Firebase-এ সেভ হবে — কোনো localStorage নয়
    await db.ref('users/' + c.user.uid).set({
      name, email,
      phone: phone || '',
      createdAt: Date.now(),
      role: 'user'
    });
    toast('রেজিস্ট্রেশন সফল হয়েছে ✓', 'success');
  } catch(e) { toast(authErr(e.code), 'error'); }
}

// Google login সরানো হয়েছে — শুধু ম্যানুয়াল Email/Password

function authErr(code) {
  const m = {
    'auth/user-not-found':      'ব্যবহারকারী পাওয়া যায়নি',
    'auth/wrong-password':      'পাসওয়ার্ড ভুল',
    'auth/email-already-in-use':'ইমেইল ইতিমধ্যে ব্যবহৃত',
    'auth/invalid-email':       'ইমেইল সঠিক নয়',
    'auth/network-request-failed':'নেটওয়ার্ক সমস্যা',
    'auth/too-many-requests':   'অনেকবার চেষ্টা হয়েছে, পরে আবার চেষ্টা করুন'
  };
  return m[code] || 'সমস্যা হয়েছে';
}

// ══════════════════════════════════════════════════════
//  BOOT APP
// ══════════════════════════════════════════════════════
async function bootApp() {
  showScreen('mainApp');
  show('chatFab');
  await loadUserData();
  goPage('home');
  loadNotifBadge();
}

async function loadUserData() {
  if (!cUser) return;
  try {
    const snap = await db.ref('users/' + cUser.uid).once('value');
    if (snap.exists()) cUser.dbData = snap.val();
    // load milestones
    const mSnap = await db.ref('users/' + cUser.uid + '/milestones').once('value');
    if (mSnap.exists()) milestones = mSnap.val();
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════
function goPage(pg) {
  cPage = pg;
  document.querySelectorAll('.bn').forEach(b => b.classList.remove('active'));
  document.getElementById('bn-' + pg)?.classList.add('active');
  const area = document.getElementById('pageArea');
  if (!area) return;
  const pages = { home, community, products, earn, tools, profile };
  if (pages[pg]) pages[pg](area);
}

// ══════════════════════════════════════════════════════
//  HOME PAGE
// ══════════════════════════════════════════════════════
function home(el) {
  el.innerHTML = `
  <div class="pad">
    <div class="banner-wrap"><div class="banner-track" id="bTrack"></div></div>
    <div class="bdots" id="bDots"></div>

    <div class="ai-banner" onclick="toggleChat()">
      <div class="ai-ico">🤖</div>
      <div class="ai-txt">
        <h3>FutFul Help Desk</h3>
        <p>AI-চালিত শিশু যত্ন পরামর্শ • ২৪/৭ বাংলায়</p>
        <button class="ai-btn" onclick="event.stopPropagation();toggleChat()">চ্যাট শুরু করুন →</button>
      </div>
    </div>

    <div class="sec-hdr">
      <h2 class="sec-title">🌟 মূল সেবাসমূহ</h2>
    </div>
    <div class="feat-grid">
      <div class="feat-card" onclick="openHealth()">
        <div class="feat-ico">❤️‍🩹</div>
        <div class="feat-nm">স্বাস্থ্য কেন্দ্র</div>
        <div class="feat-ds">টিকা, বৃদ্ধি ট্র্যাকিং</div>
      </div>
      <div class="feat-card" onclick="openNutrition()">
        <div class="feat-ico">🥗</div>
        <div class="feat-nm">পুষ্টি গাইড</div>
        <div class="feat-ds">বয়স অনুযায়ী খাবার</div>
      </div>
      <div class="feat-card" onclick="openDevelopment()">
        <div class="feat-ico">🌱</div>
        <div class="feat-nm">বিকাশ ট্র্যাকার</div>
        <div class="feat-ds">মাইলস্টোন চেকলিস্ট</div>
      </div>
      <div class="feat-card" onclick="openScheduler()">
        <div class="feat-ico">📅</div>
        <div class="feat-nm">দৈনিক সময়সূচী</div>
        <div class="feat-ds">রুটিন ও রিমাইন্ডার</div>
      </div>
    </div>

    <div id="homeChildren"></div>

    <div class="sec-hdr">
      <h2 class="sec-title">👥 কমিউনিটি</h2>
      <button class="see-all" onclick="goPage('community')">সব দেখুন →</button>
    </div>
    <div id="homePosts"><div class="spin-wrap"><div class="spinner"></div> লোড হচ্ছে...</div></div>
  </div>`;
  loadBanners();
  loadHomeChildren();
  loadRecentPosts();
}

async function loadBanners() {
  const track = document.getElementById('bTrack');
  const dots  = document.getElementById('bDots');
  if (!track) return;
  let slides = [
    { bg:'linear-gradient(135deg,#ff6b9d,#c77dff)', em:'🌸', t:'FutFul-এ স্বাগতম', s:'আপনার শিশুর সেরা যত্নসঙ্গী' },
    { bg:'linear-gradient(135deg,#06d6a0,#4dabf7)', em:'👶', t:'শিশুর সুস্বাস্থ্য', s:'টিকা ও বৃদ্ধি ট্র্যাক করুন' },
    { bg:'linear-gradient(135deg,#ff9f43,#ff6b9d)', em:'🥗', t:'সুষম পুষ্টি', s:'বয়স উপযোগী খাবার পরিকল্পনা' },
  ];
  try {
    const snap = await db.ref('banners').orderByChild('active').equalTo(true).once('value');
    if (snap.exists()) {
      const fb = [];
      snap.forEach(c => { const d = c.val(); if (d.active) fb.push(d); });
      if (fb.length) slides = fb.map(b => ({
        bg: b.color || 'linear-gradient(135deg,#ff6b9d,#c77dff)',
        em: b.emoji || '🌸', t: b.title || '', s: b.subtitle || '',
        img: b.imageUrl || '', link: b.link || ''
      }));
    }
  } catch(e) {}

  track.innerHTML = slides.map((sl, i) => `
    <div class="banner-slide" onclick="${sl.link ? `window.open('${sl.link}','_blank')` : ''}">
      ${sl.img
        ? `<img src="${sl.img}" style="width:100%;height:155px;object-fit:cover;border-radius:18px" onerror="this.parentNode.querySelector('.banner-ph').style.display='flex';this.style.display='none'">`
        : ''}
      <div class="banner-ph" style="background:${sl.bg};${sl.img ? 'display:none' : ''}">
        <div class="bi">${sl.em}</div>
        <div class="bt">${sl.t}</div>
        <div class="bs">${sl.s}</div>
      </div>
    </div>`).join('');

  dots.innerHTML = slides.map((_, i) => `<div class="bdot ${i===0?'on':''}" onclick="goBanner(${i})"></div>`).join('');
  clearInterval(bannerTimer);
  curBanner = 0;
  bannerTimer = setInterval(() => goBanner((curBanner + 1) % slides.length), 3600);
}

function goBanner(i) {
  curBanner = i;
  const t = document.getElementById('bTrack');
  if (t) t.style.transform = `translateX(-${i * 100}%)`;
  document.querySelectorAll('.bdot').forEach((d, idx) => d.classList.toggle('on', idx === i));
}

async function loadHomeChildren() {
  const el = document.getElementById('homeChildren');
  if (!el || !cUser) return;
  try {
    const snap = await db.ref('users/' + cUser.uid + '/children').once('value');
    if (!snap.exists()) {
      el.innerHTML = `
        <div class="g-card" style="text-align:center;cursor:pointer;margin-bottom:18px" onclick="openAddChild()">
          <div style="font-size:36px;margin-bottom:7px">👶</div>
          <div style="color:#fff;font-weight:700;font-size:15px">শিশুর প্রোফাইল যোগ করুন</div>
          <div style="color:rgba(255,255,255,.5);font-size:13px;margin-top:3px">টিকা ও মাইলস্টোন ট্র্যাক করতে</div>
        </div>`;
      return;
    }
    const kids = [];
    snap.forEach(c => kids.push({ id: c.key, ...c.val() }));
    el.innerHTML = `
      <div class="sec-hdr" style="margin-top:4px">
        <h2 class="sec-title">👶 আমার শিশু</h2>
        <button class="see-all" onclick="goPage('profile')">সম্পাদনা →</button>
      </div>
      <div class="child-scroll">
        ${kids.map(k => `
          <div class="child-card" onclick="openChildDetail('${k.id}')">
            <div class="ch-av">${k.gender === 'মেয়ে' ? '👧' : '👦'}</div>
            <div class="ch-nm">${k.name}</div>
            <div class="ch-age">${calcAge(k.dob)}</div>
          </div>`).join('')}
        <div class="child-card add-ch" onclick="openAddChild()">
          <div class="ch-av">➕</div>
          <div class="ch-nm" style="color:var(--pk)">যোগ করুন</div>
        </div>
      </div>`;
  } catch(e) {}
}

async function loadRecentPosts() {
  const el = document.getElementById('homePosts');
  if (!el) return;
  try {
    const snap = await db.ref('posts').orderByChild('createdAt').limitToLast(3).once('value');
    if (!snap.exists()) { el.innerHTML = '<div class="empty-state">এখনো কোনো পোস্ট নেই</div>'; return; }
    const posts = [];
    snap.forEach(c => { const d = c.val(); if (d.status !== 'rejected') posts.push({ id: c.key, ...d }); });
    posts.reverse();
    el.innerHTML = posts.map(renderPost).join('');
  } catch(e) { el.innerHTML = '<div class="empty-state">লোড করতে সমস্যা হয়েছে</div>'; }
}

// ══════════════════════════════════════════════════════
//  COMMUNITY PAGE
// ══════════════════════════════════════════════════════
function community(el) {
  el.innerHTML = `
  <div class="pad">
    <div class="search-bar"><span class="sico">🔍</span><input type="text" placeholder="পোস্ট খুঁজুন..." id="postSrch" oninput="filterPosts(this.value)"></div>
    <div class="post-composer">
      <textarea class="post-ta" id="newPostTxt" placeholder="আপনার অভিজ্ঞতা শেয়ার করুন..." rows="3"></textarea>
      <div id="postImgPrev"></div>
      <div class="post-actions">
        <button class="btn-media" onclick="document.getElementById('postImgFile').click()">📷 ছবি যোগ করুন</button>
        <button class="btn-post" onclick="submitPost()">পোস্ট করুন →</button>
      </div>
      <input type="file" id="postImgFile" accept="image/*" style="display:none" onchange="prevPostImg(this)">
    </div>
    <div id="postsWrap"><div class="spin-wrap"><div class="spinner"></div> লোড হচ্ছে...</div></div>
  </div>`;
  loadPosts();
}

async function loadPosts(term = '') {
  const el = document.getElementById('postsWrap');
  if (!el) return;
  try {
    const snap = await db.ref('posts').orderByChild('createdAt').limitToLast(40).once('value');
    cachedPosts = [];
    if (snap.exists()) {
      snap.forEach(c => {
        const d = c.val();
        if (d.status !== 'rejected') cachedPosts.push({ id: c.key, ...d });
      });
      cachedPosts.reverse();
    }
    filterPosts(term);
  } catch(e) { if (el) el.innerHTML = '<div class="empty-state">লোড করতে সমস্যা হয়েছে</div>'; }
}

function filterPosts(term) {
  const el = document.getElementById('postsWrap');
  if (!el) return;
  const filtered = term
    ? cachedPosts.filter(p => (p.content || '').toLowerCase().includes(term.toLowerCase()) || (p.authorName || '').includes(term))
    : cachedPosts;
  el.innerHTML = filtered.length ? filtered.map(renderPost).join('') : '<div class="empty-state">কোনো পোস্ট পাওয়া যায়নি</div>';
}

function renderPost(p) {
  const liked = p.likedBy && p.likedBy[cUser?.uid];
  const cmtCount = Object.keys(p.comments || {}).length;
  return `
    <div class="post-card" id="pc-${p.id}">
      <div class="post-hdr">
        <div class="post-av">${(p.authorPhotoURL ? `<img src="${p.authorPhotoURL}" onerror="this.parentNode.textContent='${(p.authorName||'আ').charAt(0)}'">` : (p.authorName||'আ').charAt(0))}</div>
        <div class="post-meta">
          <h4>${esc(p.authorName || 'ব্যবহারকারী')}</h4>
          <span>${fmtTime(p.createdAt)}</span>
        </div>
        ${p.userId === cUser?.uid ? `<button class="p-del" onclick="delPost('${p.id}')">🗑️ মুছুন</button>` : ''}
      </div>
      <div class="post-body">${esc(p.content || '')}</div>
      ${p.imageUrl ? `<img src="${p.imageUrl}" class="post-img" onerror="this.style.display='none'" alt="পোস্ট ছবি">` : ''}
      <div class="post-ftr">
        <button class="p-act ${liked ? 'liked' : ''}" onclick="likePost('${p.id}',${!!liked})">${liked ? '❤️' : '🤍'} ${p.likes || 0}</button>
        <button class="p-act" onclick="openComments('${p.id}')">💬 ${cmtCount}</button>
        <button class="p-act" onclick="sharePost('${p.id}')">📤 শেয়ার</button>
      </div>
    </div>`;
}

function prevPostImg(inp) {
  const el = document.getElementById('postImgPrev');
  if (!el || !inp.files[0]) return;
  const r = new FileReader();
  r.onload = e => {
    el.innerHTML = `<div style="position:relative;display:inline-block;margin-top:7px">
      <img src="${e.target.result}" style="max-width:100%;max-height:110px;border-radius:10px">
      <button onclick="document.getElementById('postImgFile').value='';document.getElementById('postImgPrev').innerHTML=''"
        style="position:absolute;top:-5px;right:-5px;background:var(--re);border:none;border-radius:50%;width:20px;height:20px;color:#fff;font-size:11px;cursor:pointer">✕</button>
    </div>`;
  };
  r.readAsDataURL(inp.files[0]);
}

async function submitPost() {
  const txt = document.getElementById('newPostTxt')?.value.trim();
  if (!txt) return toast('পোস্টের বিষয়বস্তু লিখুন', 'error');
  if (!cUser) return toast('প্রথমে লগইন করুন', 'error');
  toast('পোস্ট করা হচ্ছে...');
  try {
    const data = {
      userId: cUser.uid,
      authorName: cUser.displayName || 'ব্যবহারকারী',
      authorPhotoURL: cUser.photoURL || '',
      content: txt,
      createdAt: Date.now(),
      likes: 0,
      status: 'approved'
    };
    const fileInp = document.getElementById('postImgFile');
    if (fileInp?.files[0]) {
      const ref = storage.ref(`posts/${cUser.uid}_${Date.now()}`);
      await ref.put(fileInp.files[0]);
      data.imageUrl = await ref.getDownloadURL();
    }
    await db.ref('posts').push(data);
    document.getElementById('newPostTxt').value = '';
    document.getElementById('postImgFile').value = '';
    document.getElementById('postImgPrev').innerHTML = '';
    toast('পোস্ট সফলভাবে হয়েছে ✓', 'success');
    loadPosts();
  } catch(e) { toast('পোস্ট করতে সমস্যা হয়েছে', 'error'); }
}

async function likePost(pid, isLiked) {
  if (!cUser) return toast('প্রথমে লগইন করুন', 'error');
  try {
    await db.ref('posts/' + pid).transaction(post => {
      if (post) {
        if (!post.likedBy) post.likedBy = {};
        if (isLiked) { delete post.likedBy[cUser.uid]; post.likes = Math.max(0, (post.likes || 0) - 1); }
        else { post.likedBy[cUser.uid] = true; post.likes = (post.likes || 0) + 1; }
      }
      return post;
    });
    loadPosts(document.getElementById('postSrch')?.value || '');
  } catch(e) {}
}

async function delPost(pid) {
  if (!confirm('এই পোস্টটি মুছে ফেলবেন?')) return;
  try {
    await db.ref('posts/' + pid).remove();
    toast('পোস্ট মুছে ফেলা হয়েছে', 'success');
    loadPosts();
  } catch(e) {}
}

function sharePost(pid) {
  if (navigator.share) {
    navigator.share({ title: 'FutFul পোস্ট', text: 'FutFul কমিউনিটিতে এই পোস্টটি দেখুন', url: window.location.href });
  } else { toast('লিংক কপি হয়েছে ✓', 'success'); }
}

function openComments(pid) {
  openSheet(`
    <div class="modal-title">💬 মন্তব্যসমূহ</div>
    <div id="cmtList" style="max-height:220px;overflow-y:auto;margin-bottom:12px">
      <div class="spin-wrap"><div class="spinner"></div></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center">
      <input type="text" id="cmtInp" class="dark-inp" placeholder="মন্তব্য লিখুন..." style="flex:1" onkeypress="if(event.key==='Enter')postComment('${pid}')">
      <button class="btn-sm" onclick="postComment('${pid}')">পাঠান</button>
    </div>`);
  loadComments(pid);
}

async function loadComments(pid) {
  const el = document.getElementById('cmtList');
  if (!el) return;
  try {
    const snap = await db.ref('posts/' + pid + '/comments').orderByChild('createdAt').once('value');
    if (!snap.exists()) { el.innerHTML = '<div style="color:rgba(255,255,255,.4);font-size:13px;padding:8px">এখনো কোনো মন্তব্য নেই</div>'; return; }
    const cmts = [];
    snap.forEach(c => cmts.push(c.val()));
    el.innerHTML = cmts.map(c => `
      <div style="background:rgba(255,255,255,.06);border-radius:10px;padding:10px;margin-bottom:8px">
        <div style="color:var(--pk);font-size:12px;font-weight:600;margin-bottom:3px">${esc(c.authorName || 'ব্যবহারকারী')}</div>
        <div style="color:rgba(255,255,255,.85);font-size:13px">${esc(c.text || '')}</div>
      </div>`).join('');
  } catch(e) {}
}

async function postComment(pid) {
  const txt = document.getElementById('cmtInp')?.value.trim();
  if (!txt || !cUser) return;
  try {
    await db.ref('posts/' + pid + '/comments').push({
      authorName: cUser.displayName || 'ব্যবহারকারী',
      userId: cUser.uid, text: txt, createdAt: Date.now()
    });
    document.getElementById('cmtInp').value = '';
    loadComments(pid);
    toast('মন্তব্য যোগ হয়েছে ✓', 'success');
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
//  PRODUCTS PAGE
// ══════════════════════════════════════════════════════
function products(el) {
  el.innerHTML = `
  <div class="pad">
    <div class="search-bar"><span class="sico">🔍</span><input type="text" id="prodSrch" placeholder="পণ্য খুঁজুন..." oninput="filterProds(this.value)"></div>
    <div class="cat-scroll" id="catBar">
      <button class="cat-chip on" onclick="catFilter('সব',this)">সব পণ্য</button>
      <button class="cat-chip" onclick="catFilter('শিশু খাবার',this)">🍼 শিশু খাবার</button>
      <button class="cat-chip" onclick="catFilter('শিশু যত্ন',this)">🧴 শিশু যত্ন</button>
      <button class="cat-chip" onclick="catFilter('স্বাস্থ্য',this)">🏥 স্বাস্থ্য</button>
      <button class="cat-chip" onclick="catFilter('খেলনা',this)">🧩 শিক্ষামূলক খেলনা</button>
      <button class="cat-chip" onclick="catFilter('ফ্যাশন',this)">👗 ফ্যাশন</button>
    </div>
    <div class="sec-hdr">
      <h2 class="sec-title">📚 ই-বুক</h2>
      <button class="see-all" onclick="openAllEbooks()">সব দেখুন →</button>
    </div>
    <div id="ebooksWrap"></div>
    <h2 class="sec-title" style="margin-top:6px">🛍️ পণ্য সমূহ</h2>
    <div id="prodGrid" class="prod-grid"><div class="spin-wrap" style="grid-column:1/-1"><div class="spinner"></div> লোড হচ্ছে...</div></div>
  </div>`;
  loadProducts();
  loadEbooks();
}

async function loadProducts(cat = 'সব') {
  try {
    const snap = await db.ref('products').once('value');
    allProds = [];
    if (snap.exists()) {
      snap.forEach(c => { const d = c.val(); if (d.active !== false) allProds.push({ id: c.key, ...d }); });
    }
    if (!allProds.length) allProds = defaultProducts();
    renderProds(cat === 'সব' ? allProds : allProds.filter(p => p.category === cat));
  } catch(e) { allProds = defaultProducts(); renderProds(allProds); }
}

function defaultProducts() {
  return [
    { id:'p1', name:'সেরেলাক শিশু খাবার', category:'শিশু খাবার', price:280, rating:4.5, emoji:'🍼', stock:50, description:'৬ মাস+ শিশুর জন্য পুষ্টিকর সিরিয়াল' },
    { id:'p2', name:'জনসন বেবি শ্যাম্পু', category:'শিশু যত্ন', price:220, rating:4.3, emoji:'🧴', stock:30, description:'কান্না-মুক্ত ফর্মুলা' },
    { id:'p3', name:'নরম ভেলক্রো জুতো', category:'ফ্যাশন', price:450, rating:4.0, emoji:'👟', stock:20, description:'শিশুর প্রথম পদক্ষেপের জন্য' },
    { id:'p4', name:'ডিজিটাল থার্মোমিটার', category:'স্বাস্থ্য', price:350, rating:4.7, emoji:'🌡️', stock:15, description:'দ্রুত ও নির্ভুল তাপমাত্রা পরিমাপ' },
    { id:'p5', name:'রঙিন বিল্ডিং ব্লক', category:'খেলনা', price:550, rating:4.8, emoji:'🧩', stock:25, description:'মস্তিষ্ক বিকাশে সহায়ক' },
    { id:'p6', name:'বেবি লোশন ১০০মিল', category:'শিশু যত্ন', price:180, rating:4.2, emoji:'🧴', stock:40, description:'ময়েশ্চারাইজিং ফর্মুলা' },
    { id:'p7', name:'শিশু খাদ্যপ্রাণ সিরাপ', category:'স্বাস্থ্য', price:310, rating:4.6, emoji:'💊', stock:60, description:'ভিটামিন ডি ও ক্যালসিয়াম' },
    { id:'p8', name:'বোনা সুতির পোশাক', category:'ফ্যাশন', price:380, rating:4.1, emoji:'👕', stock:35, description:'নরম ও আরামদায়ক কটন' },
  ];
}

function renderProds(list) {
  const el = document.getElementById('prodGrid');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="empty-state" style="grid-column:1/-1">কোনো পণ্য পাওয়া যায়নি</div>'; return; }
  el.innerHTML = list.map(p => `
    <div class="prod-card" onclick="openProduct('${p.id}')">
      <div class="prod-img">${p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.parentNode.textContent='${p.emoji||'🛍️'}'">` : (p.emoji || '🛍️')}</div>
      <div class="prod-body">
        <div class="prod-nm">${p.name}</div>
        <div class="prod-rt">${'★'.repeat(Math.round(p.rating||4))}${'☆'.repeat(5-Math.round(p.rating||4))} ${p.rating||4}</div>
        <div class="prod-pr">৳${p.price||0}</div>
        ${p.stock <= 5 ? '<span class="prod-badge">কম স্টক</span>' : ''}
        <button class="btn-cart" onclick="event.stopPropagation();addToCart('${p.id}')">🛒 কার্টে যোগ</button>
      </div>
    </div>`).join('');
}

function catFilter(cat, btn) {
  document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('on'));
  btn.classList.add('on');
  renderProds(cat === 'সব' ? allProds : allProds.filter(p => p.category === cat));
}

function filterProds(term) {
  const filtered = allProds.filter(p => (p.name||'').toLowerCase().includes(term.toLowerCase()) || (p.category||'').includes(term));
  renderProds(filtered);
}

function openProduct(id) {
  const p = allProds.find(x => x.id === id);
  if (!p) return;
  openSheet(`
    <div style="text-align:center">
      <div style="font-size:64px;margin:6px 0">${p.emoji||'🛍️'}</div>
      <div class="modal-title" style="text-align:center">${p.name}</div>
      <div style="color:var(--pk);font-size:26px;font-weight:700;margin:6px 0">৳${p.price}</div>
      <div style="color:rgba(255,255,255,.5);font-size:13px;margin-bottom:14px">${p.category}</div>
    </div>
    <div class="info-row"><span class="ir-lbl">রেটিং</span><span class="ir-val">${'★'.repeat(Math.round(p.rating||4))} ${p.rating}</span></div>
    <div class="info-row"><span class="ir-lbl">স্টক</span><span class="ir-val">${p.stock > 0 ? p.stock + ' টি আছে' : '❌ স্টক নেই'}</span></div>
    <div class="info-row"><span class="ir-lbl">ক্যাটাগরি</span><span class="ir-val">${p.category}</span></div>
    ${p.description ? `<p style="color:rgba(255,255,255,.7);font-size:13px;margin:12px 0;line-height:1.65">${p.description}</p>` : ''}
    <button onclick="addToCart('${p.id}');closeSheet()" class="btn-main w100" style="margin-top:14px">🛒 কার্টে যোগ করুন</button>`);
}

function addToCart(id) {
  const p = allProds.find(x => x.id === id);
  if (!p) return toast('পণ্য পাওয়া যায়নি', 'error');
  const ex = cart.find(x => x.id === id);
  if (ex) ex.qty++;
  else cart.push({ ...p, qty: 1 });
  updateCartBadge();
  toast(`${p.name} কার্টে যোগ হয়েছে ✓`, 'success');
}

function updateCartBadge() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const el = document.getElementById('cartCount');
  if (el) { el.textContent = total; el.classList.toggle('hidden', total === 0); }
}

async function loadEbooks() {
  const el = document.getElementById('ebooksWrap');
  if (!el) return;
  const def = [
    { title:'শিশু যত্নের সম্পূর্ণ গাইড', desc:'০-২ বছর বয়সী শিশুর পূর্ণাঙ্গ যত্ন', emoji:'📖', size:'২.৫ MB' },
    { title:'মায়ের পুষ্টি গাইড', desc:'গর্ভকালীন ও স্তন্যদানকালীন পুষ্টি', emoji:'🥗', size:'১.৮ MB' },
  ];
  try {
    const snap = await db.ref('ebooks').once('value');
    const books = [];
    if (snap.exists()) snap.forEach(c => books.push({ id: c.key, ...c.val() }));
    const show = books.length ? books.slice(0, 2) : def;
    el.innerHTML = show.map(b => `
      <div class="ebook-card">
        <div class="ebook-ico">${b.emoji||'📖'}</div>
        <div class="ebook-inf"><h4>${b.title}</h4><p>${b.desc||b.description||''} ${b.size ? '• ' + b.size : ''}</p></div>
        <button class="btn-dl" onclick="${b.fileUrl ? `window.open('${b.fileUrl}','_blank')` : `dlEbook('${b.title}')`}">⬇️ ডাউনলোড</button>
      </div>`).join('');
  } catch(e) {
    el.innerHTML = def.map(b => `
      <div class="ebook-card">
        <div class="ebook-ico">${b.emoji}</div>
        <div class="ebook-inf"><h4>${b.title}</h4><p>${b.desc} • ${b.size}</p></div>
        <button class="btn-dl" onclick="dlEbook('${b.title}')">⬇️ ডাউনলোড</button>
      </div>`).join('');
  }
}

function dlEbook(title) { toast(`"${title}" ডাউনলোড শুরু হয়েছে ✓`, 'success'); }

async function openAllEbooks() {
  openFPM('📚 সব ই-বুক');
  const el = document.getElementById('fpmBody');
  el.innerHTML = '<div class="spin-wrap"><div class="spinner"></div> লোড হচ্ছে...</div>';
  try {
    const snap = await db.ref('ebooks').once('value');
    if (!snap.exists()) { el.innerHTML = '<div class="empty-state">কোনো ই-বুক পাওয়া যায়নি</div>'; return; }
    const books = [];
    snap.forEach(c => books.push({ id: c.key, ...c.val() }));
    el.innerHTML = books.map(b => `
      <div class="ebook-card">
        <div class="ebook-ico">${b.emoji||'📖'}</div>
        <div class="ebook-inf"><h4>${b.title}</h4><p>${b.description||''}</p></div>
        <button class="btn-dl" onclick="${b.fileUrl ? `window.open('${b.fileUrl}','_blank')` : `dlEbook('${b.title}')`}">⬇️ ডাউনলোড</button>
      </div>`).join('');
  } catch(e) { el.innerHTML = '<div class="empty-state">লোড করতে সমস্যা হয়েছে</div>'; }
}

// CART
function openCart() {
  show('cartPanel');
  renderCart();
}
function closeCart() { hid('cartPanel'); }

function renderCart() {
  const body = document.getElementById('cartBody');
  const tot  = document.getElementById('cartTotal');
  if (!body) return;
  if (!cart.length) {
    body.innerHTML = '<div class="empty-cart">🛒<br><br>কার্ট খালি</div>';
    if (tot) tot.textContent = '৳০';
    return;
  }
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  if (tot) tot.textContent = '৳' + total;
  body.innerHTML = cart.map((item, idx) => `
    <div class="cart-item">
      <div class="ci-img">${item.emoji || '🛍️'}</div>
      <div class="ci-inf">
        <div class="ci-nm">${item.name}</div>
        <div class="ci-pr">৳${item.price * item.qty}</div>
        <div class="ci-qty">
          <button class="qty-b" onclick="chQty(${idx},-1)">−</button>
          <span class="qty-n">${item.qty}</span>
          <button class="qty-b" onclick="chQty(${idx},1)">+</button>
        </div>
      </div>
      <button class="ci-del" onclick="rmCart(${idx})">✕</button>
    </div>`).join('');
}

function chQty(i, d) { cart[i].qty += d; if (cart[i].qty <= 0) cart.splice(i, 1); updateCartBadge(); renderCart(); }
function rmCart(i)   { cart.splice(i, 1); updateCartBadge(); renderCart(); }

function startCheckout() {
  if (!cUser) return toast('প্রথমে লগইন করুন', 'error');
  if (!cart.length) return toast('কার্ট খালি', 'error');
  closeCart();
  openSheet(`
    <div class="modal-title">🛒 চেকআউট</div>
    <div class="input-group"><label>ডেলিভারি ঠিকানা</label><textarea class="dark-inp" id="chkAddr" placeholder="সম্পূর্ণ ঠিকানা লিখুন..." rows="3"></textarea></div>
    <div class="input-group"><label>ফোন নম্বর</label><input type="tel" class="dark-inp" id="chkPhone" placeholder="01XXXXXXXXX"></div>
    <div style="background:rgba(255,255,255,.06);border-radius:11px;padding:12px;margin-bottom:13px">
      ${cart.map(i => `<div class="info-row"><span class="ir-lbl">${i.name} ×${i.qty}</span><span class="ir-val">৳${i.price*i.qty}</span></div>`).join('')}
      <div class="info-row"><span style="color:#fff;font-weight:700">মোট</span><span style="color:var(--pk);font-weight:700;font-size:17px">৳${cart.reduce((s,i)=>s+i.price*i.qty,0)}</span></div>
    </div>
    <button onclick="placeOrder()" class="btn-main w100">✅ অর্ডার নিশ্চিত করুন</button>`);
}

async function placeOrder() {
  const addr  = document.getElementById('chkAddr')?.value.trim();
  const phone = document.getElementById('chkPhone')?.value.trim();
  if (!addr || !phone) return toast('ঠিকানা ও ফোন নম্বর দিন', 'error');
  try {
    await db.ref('orders').push({
      userId: cUser.uid,
      userName: cUser.displayName || 'ব্যবহারকারী',
      products: cart.map(i => ({ id:i.id, name:i.name, price:i.price, qty:i.qty })),
      totalPrice: cart.reduce((s,i) => s+i.price*i.qty, 0),
      address: addr, phone,
      status: 'pending',
      createdAt: Date.now()
    });
    cart = [];
    updateCartBadge();
    closeSheet();
    toast('🎉 অর্ডার সফলভাবে দেওয়া হয়েছে!', 'success');
  } catch(e) { toast('অর্ডার দিতে সমস্যা হয়েছে', 'error'); }
}

// ══════════════════════════════════════════════════════
//  EARN PAGE
// ══════════════════════════════════════════════════════
async function earn(el) {
  el.innerHTML = `
  <div class="pad">

    <!-- Hero Banner -->
    <div style="background:linear-gradient(135deg,#ff6b9d,#c77dff,#06d6a0);border-radius:var(--R);padding:26px 20px;text-align:center;margin-bottom:20px;box-shadow:0 12px 32px rgba(255,107,157,.28)">
      <div style="font-size:52px;margin-bottom:8px">💸</div>
      <div style="color:#fff;font-size:22px;font-weight:700;margin-bottom:6px">উপার্জন করুন</div>
      <div style="color:rgba(255,255,255,.8);font-size:14px;line-height:1.6">গেম খেলুন অথবা ব্যবসা শুরু করুন<br>এবং আপনার আয় বাড়ান</div>
    </div>

    <!-- Play Game Button -->
    <div class="earn-card game" style="cursor:pointer" onclick="window.open('https://fut-ful-earning.vercel.app/','_blank')">
      <div class="earn-hdr">
        <div class="earn-ico">🎮</div>
        <div class="earn-inf">
          <h3>Play Game</h3>
          <p>গেম খেলুন এবং আয় করুন — মজার সাথে উপার্জন</p>
        </div>
        <div class="earn-tag" style="background:var(--or)">খুলুন ↗</div>
      </div>
      <div style="margin-top:12px">
        <button onclick="event.stopPropagation();window.open('https://fut-ful-earning.vercel.app/','_blank')" 
          style="width:100%;padding:11px;background:linear-gradient(135deg,#ff9f43,#ff6b9d);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:.5px">
          🎮 Play Game — এখনই শুরু করুন
        </button>
      </div>
    </div>

    <!-- Start Your Business Button -->
    <div class="earn-card tele" style="cursor:pointer" onclick="window.open('https://new-start-business.vercel.app/','_blank')">
      <div class="earn-hdr">
        <div class="earn-ico">💼</div>
        <div class="earn-inf">
          <h3>Start Your Business</h3>
          <p>আপনার নিজের ব্যবসা শুরু করুন — সফলতার পথে এগিয়ে যান</p>
        </div>
        <div class="earn-tag green">খুলুন ↗</div>
      </div>
      <div style="margin-top:12px">
        <button onclick="event.stopPropagation();window.open('https://new-start-business.vercel.app/','_blank')" 
          style="width:100%;padding:11px;background:linear-gradient(135deg,#06d6a0,#4dabf7);border:none;border-radius:10px;color:#fff;font-size:14px;font-weight:700;font-family:inherit;cursor:pointer;letter-spacing:.5px">
          💼 Start Your Business — এখনই শুরু করুন
        </button>
      </div>
    </div>

    <!-- Info Cards -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:6px">
      <div style="background:rgba(255,107,157,.1);border:1px solid rgba(255,107,157,.2);border-radius:var(--R);padding:16px;text-align:center">
        <div style="font-size:30px;margin-bottom:7px">🎯</div>
        <div style="color:#fff;font-size:13px;font-weight:700">গেম খেলুন</div>
        <div style="color:rgba(255,255,255,.55);font-size:11px;margin-top:3px;line-height:1.5">মজার গেম খেলে প্রতিদিন আয় করুন</div>
      </div>
      <div style="background:rgba(6,214,160,.1);border:1px solid rgba(6,214,160,.2);border-radius:var(--R);padding:16px;text-align:center">
        <div style="font-size:30px;margin-bottom:7px">🚀</div>
        <div style="color:#fff;font-size:13px;font-weight:700">ব্যবসা শুরু করুন</div>
        <div style="color:rgba(255,255,255,.55);font-size:11px;margin-top:3px;line-height:1.5">নিজের ব্যবসা গড়ে তুলুন সহজেই</div>
      </div>
    </div>

  </div>`;
}

// ══════════════════════════════════════════════════════
//  TOOLS PAGE
// ══════════════════════════════════════════════════════
function tools(el) {
  el.innerHTML = `
  <div class="pad">
    <h2 class="sec-title">🚨 জরুরি যোগাযোগ</h2>
    <div class="emg-card" onclick="callNum('999')"><div class="emg-ico">🚑</div><div class="emg-inf"><h4>জরুরি সেবা</h4><p>অ্যাম্বুলেন্স / পুলিশ / ফায়ার</p></div><button class="emg-call">📞 999</button></div>
    <div class="emg-card" onclick="callNum('16000')"><div class="emg-ico">🏥</div><div class="emg-inf"><h4>স্বাস্থ্য বাতায়ন</h4><p>সরকারি স্বাস্থ্যসেবা হেল্পলাইন</p></div><button class="emg-call">📞 16000</button></div>
    <div class="emg-card" onclick="callNum('10921')"><div class="emg-ico">👶</div><div class="emg-inf"><h4>শিশু সুরক্ষা</h4><p>শিশু বিষয়ক হেল্পলাইন</p></div><button class="emg-call">📞 10921</button></div>
    <div class="emg-card" onclick="callNum('16430')"><div class="emg-ico">👩‍⚕️</div><div class="emg-inf"><h4>মা ও শিশু হেল্পলাইন</h4><p>মাতৃস্বাস্থ্য সেবা</p></div><button class="emg-call">📞 16430</button></div>

    <h2 class="sec-title" style="margin-top:6px">🛠️ সহায়ক সরঞ্জাম</h2>
    <div class="tools-grid">
      <div class="tool-card" onclick="openAgeCalc()"><div class="tool-ico">🎂</div><div class="tool-nm">বয়স ক্যালকুলেটর</div></div>
      <div class="tool-card" onclick="openWeightConv()"><div class="tool-ico">⚖️</div><div class="tool-nm">ওজন রূপান্তর</div></div>
      <div class="tool-card" onclick="openDoseCalc()"><div class="tool-ico">💊</div><div class="tool-nm">ডোজ ক্যালকুলেটর</div></div>
      <div class="tool-card" onclick="openNameGen()"><div class="tool-ico">✨</div><div class="tool-nm">নামকরণ সাজেশন</div></div>
      <div class="tool-card" onclick="openNearbyHosp()"><div class="tool-ico">🏥</div><div class="tool-nm">নিকটস্থ হাসপাতাল</div></div>
      <div class="tool-card" onclick="openNewsletter()"><div class="tool-ico">📰</div><div class="tool-nm">নিউজলেটার</div></div>
      <div class="tool-card" onclick="openHeightConv()"><div class="tool-ico">📏</div><div class="tool-nm">উচ্চতা রূপান্তর</div></div>
      <div class="tool-card" onclick="openBMICalc()"><div class="tool-ico">📊</div><div class="tool-nm">BMI ক্যালকুলেটর</div></div>
    </div>

    <h2 class="sec-title">💡 সাপ্তাহিক স্বাস্থ্য টিপস</h2>
    <div id="wTips"></div>
  </div>`;
  loadWTips();
}

function callNum(n) { window.location.href = 'tel:' + n; }

function loadWTips() {
  const el = document.getElementById('wTips');
  if (!el) return;
  const tips = [
    '🌡️ শিশুর জ্বর ১০০.৪°F (৩৮°C) এর বেশি হলে ডাক্তারের পরামর্শ নিন',
    '🥛 ৬ মাস পর্যন্ত শুধু মায়ের দুধ শিশুর জন্য সর্বোত্তম — পানিও না',
    '💤 নবজাতক শিশু দিনে ১৬-১৭ ঘণ্টা ঘুমায়, এটা সম্পূর্ণ স্বাভাবিক',
    '🎵 শিশুর সাথে কথা বলুন ও গান গাইলে মস্তিষ্কের বিকাশ ত্বরান্বিত হয়',
    '🧼 শিশুর যত্নে সাবান-পানিতে হাত ধোয়া সংক্রমণ ৫০% কমায়',
    '☀️ শিশুকে সকালের মৃদু রোদে রাখুন — ভিটামিন ডি এর জন্য',
  ];
  el.innerHTML = tips.map(t => `<div class="tip-card">${t}</div>`).join('');
}

function openAgeCalc() {
  openSheet(`
    <div class="modal-title">🎂 বয়স ক্যালকুলেটর</div>
    <div class="input-group"><label>জন্ম তারিখ</label><input type="date" class="dark-inp" id="ageDob" max="${new Date().toISOString().split('T')[0]}"></div>
    <button onclick="calcAge2()" class="btn-main w100">বয়স হিসাব করুন</button>
    <div id="ageOut"></div>`);
}
function calcAge2() {
  const dob = document.getElementById('ageDob')?.value;
  const el = document.getElementById('ageOut');
  if (!dob || !el) return;
  const b = new Date(dob), n = new Date();
  let y = n.getFullYear()-b.getFullYear(), m = n.getMonth()-b.getMonth(), d = n.getDate()-b.getDate();
  if (d<0){m--;d+=new Date(n.getFullYear(),n.getMonth(),0).getDate()}
  if (m<0){y--;m+=12}
  el.innerHTML = `<div class="calc-result">${y>0?y+' বছর ':''}${m>0?m+' মাস ':''} ${d} দিন</div>
    <div class="tip-card" style="margin-top:8px">মোট দিন: ${Math.floor((n-b)/86400000)} দিন</div>`;
}

function openWeightConv() {
  openSheet(`
    <div class="modal-title">⚖️ ওজন রূপান্তর</div>
    <div class="two-col">
      <div class="input-group"><label>কেজি (kg)</label><input type="number" class="dark-inp" id="wKg" placeholder="0.0" step="0.001" oninput="cvtW('kg')"></div>
      <div class="input-group"><label>পাউন্ড (lb)</label><input type="number" class="dark-inp" id="wLb" placeholder="0.0" step="0.01" oninput="cvtW('lb')"></div>
    </div>
    <div class="two-col">
      <div class="input-group"><label>গ্রাম (g)</label><input type="number" class="dark-inp" id="wGm" placeholder="0" oninput="cvtW('g')"></div>
      <div class="input-group"><label>আউন্স (oz)</label><input type="number" class="dark-inp" id="wOz" placeholder="0.0" step="0.01" oninput="cvtW('oz')"></div>
    </div>`);
}
function cvtW(from) {
  const vals = {
    kg:parseFloat(document.getElementById('wKg')?.value)||0,
    lb:parseFloat(document.getElementById('wLb')?.value)||0,
    g:parseFloat(document.getElementById('wGm')?.value)||0,
    oz:parseFloat(document.getElementById('wOz')?.value)||0
  };
  let kg = from==='kg'?vals.kg:from==='lb'?vals.lb*0.4536:from==='g'?vals.g/1000:vals.oz*0.0283;
  const set = (id,v) => { const e=document.getElementById(id); if(e) e.value=v; };
  if(from!=='kg') set('wKg', kg.toFixed(3));
  if(from!=='lb') set('wLb', (kg/0.4536).toFixed(2));
  if(from!=='g')  set('wGm', (kg*1000).toFixed(0));
  if(from!=='oz') set('wOz', (kg/0.0283).toFixed(2));
}

function openDoseCalc() {
  openSheet(`
    <div class="modal-title">💊 ডোজ ক্যালকুলেটর</div>
    <p style="color:rgba(255,255,255,.5);font-size:12px;margin-bottom:13px">⚠️ শুধুমাত্র তথ্যমূলক। সর্বদা ডাক্তারের পরামর্শ নিন।</p>
    <div class="input-group"><label>শিশুর ওজন (কেজি)</label><input type="number" class="dark-inp" id="doseWt" placeholder="5.5" step="0.1"></div>
    <div class="input-group"><label>ওষুধ নির্বাচন</label>
      <select class="dark-inp" id="doseMed">
        <option value="15">প্যারাসিটামল (১৫ mg/kg)</option>
        <option value="10">আইবুপ্রোফেন (১০ mg/kg)</option>
        <option value="25">অ্যামক্সিসিলিন (২৫ mg/kg)</option>
        <option value="20">সেফুরক্সিম (২০ mg/kg)</option>
      </select>
    </div>
    <div class="input-group"><label>দৈনিক ডোজ বিভাজন</label>
      <select class="dark-inp" id="doseTimes"><option value="2">দিনে ২ বার</option><option value="3">দিনে ৩ বার</option><option value="4">দিনে ৪ বার</option></select>
    </div>
    <button onclick="calcDose()" class="btn-main w100">ডোজ হিসাব করুন</button>
    <div id="doseOut"></div>`);
}
function calcDose() {
  const w = parseFloat(document.getElementById('doseWt')?.value)||0;
  const mg = parseInt(document.getElementById('doseMed')?.value)||15;
  const times = parseInt(document.getElementById('doseTimes')?.value)||3;
  const el = document.getElementById('doseOut');
  if (!w || !el) return;
  const total = w * mg;
  const perDose = total / times;
  el.innerHTML = `<div class="calc-result">
    মোট দৈনিক ডোজ: ${total.toFixed(0)} mg<br>
    <span style="font-size:14px;opacity:.8">প্রতি ডোজে: ${perDose.toFixed(0)} mg (দিনে ${times} বার)</span>
  </div>
  <div class="tip-card" style="margin-top:8px">⚠️ ডাক্তারের প্রেসক্রিপশন ছাড়া ওষুধ দেবেন না।</div>`;
}

function openHeightConv() {
  openSheet(`
    <div class="modal-title">📏 উচ্চতা রূপান্তর</div>
    <div class="two-col">
      <div class="input-group"><label>সেন্টিমিটার (cm)</label><input type="number" class="dark-inp" id="hCm" placeholder="70" oninput="cvtH('cm')"></div>
      <div class="input-group"><label>ইঞ্চি (inch)</label><input type="number" class="dark-inp" id="hIn" placeholder="27.5" step="0.1" oninput="cvtH('in')"></div>
    </div>
    <div class="two-col">
      <div class="input-group"><label>মিটার (m)</label><input type="number" class="dark-inp" id="hMt" placeholder="0.70" step="0.01" oninput="cvtH('m')"></div>
      <div class="input-group"><label>ফুট + ইঞ্চি</label><input type="text" class="dark-inp" id="hFt" placeholder="2'3&quot;" readonly></div>
    </div>`);
}
function cvtH(from) {
  let cm;
  const gcm=document.getElementById('hCm'),gin=document.getElementById('hIn'),gmt=document.getElementById('hMt'),gft=document.getElementById('hFt');
  if(from==='cm') cm=parseFloat(gcm?.value)||0;
  else if(from==='in') cm=(parseFloat(gin?.value)||0)*2.54;
  else cm=(parseFloat(gmt?.value)||0)*100;
  if(gcm&&from!=='cm') gcm.value=cm.toFixed(1);
  if(gin&&from!=='in') gin.value=(cm/2.54).toFixed(1);
  if(gmt&&from!=='m')  gmt.value=(cm/100).toFixed(2);
  if(gft){const f=Math.floor(cm/30.48);const i=Math.round((cm/2.54)%12);gft.value=`${f}'${i}"`;}
}

function openBMICalc() {
  openSheet(`
    <div class="modal-title">📊 BMI ক্যালকুলেটর</div>
    <div class="two-col">
      <div class="input-group"><label>ওজন (কেজি)</label><input type="number" class="dark-inp" id="bmiW" placeholder="65" step="0.1"></div>
      <div class="input-group"><label>উচ্চতা (সেমি)</label><input type="number" class="dark-inp" id="bmiH" placeholder="165"></div>
    </div>
    <button onclick="calcBMI()" class="btn-main w100">BMI হিসাব করুন</button>
    <div id="bmiOut"></div>`);
}
function calcBMI() {
  const w=parseFloat(document.getElementById('bmiW')?.value)||0;
  const h=(parseFloat(document.getElementById('bmiH')?.value)||0)/100;
  const el=document.getElementById('bmiOut');
  if(!w||!h||!el) return;
  const bmi=(w/(h*h)).toFixed(1);
  const cat = bmi<18.5?'কম ওজন':bmi<25?'স্বাভাবিক':bmi<30?'বেশি ওজন':'স্থূলকায়';
  const col = bmi<18.5||bmi>=30?'var(--re)':bmi<25?'var(--te)':'var(--or)';
  el.innerHTML = `<div class="calc-result">BMI: ${bmi}<br><span style="font-size:14px;color:${col}">${cat}</span></div>`;
}

function openNameGen() {
  openSheet(`
    <div class="modal-title">✨ শিশুর নামকরণ</div>
    <div class="input-group"><label>লিঙ্গ</label>
      <select class="dark-inp" id="nmGender"><option value="ছেলে">ছেলে</option><option value="মেয়ে">মেয়ে</option></select>
    </div>
    <div class="input-group"><label>পছন্দের প্রথম অক্ষর (ঐচ্ছিক)</label>
      <input type="text" class="dark-inp" id="nmStart" placeholder="যেমন: ম, ফ, স, আ...">
    </div>
    <button onclick="genNames()" class="btn-main w100">নাম সাজেস্ট করুন</button>
    <div id="nmOut"></div>`);
}
function genNames() {
  const g=document.getElementById('nmGender')?.value;
  const s=document.getElementById('nmStart')?.value.trim();
  const el=document.getElementById('nmOut');
  if(!el) return;
  const boys=['আবির','আহান','আরিয়ান','ইয়ান','উবাইদ','এহসান','ওমর','কাইয়ুম','ফারহান','ফাহিম','মাহির','মিলান','রায়ান','রিয়াদ','সামির','সাকিব','তানজিম','তাহমিদ','নাফিস','নাবিল','জাহিদ','হামজা','হাসান','হোসেন','আল-আমিন'];
  const girls=['আয়েশা','আনিকা','আরিবা','ইরা','উমাইরা','এলাহ','ওয়ার্দা','ফাইজা','ফাহমিদা','মাহিরা','মিষ্টি','রাফা','রিমা','সাবিহা','সুমাইয়া','তাহিয়া','তৃষা','নাফিসা','নিলুফার','জান্নাত','হুমায়রা'];
  let names=g==='ছেলে'?boys:girls;
  if(s) names=names.filter(n=>n.startsWith(s));
  el.innerHTML=names.length
    ?`<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:13px">${names.slice(0,16).map(n=>`<div onclick="copyTxt('${n}')" style="background:rgba(255,107,157,.13);border:1px solid rgba(255,107,157,.28);border-radius:20px;padding:6px 14px;color:#fff;font-size:14px;cursor:pointer">${n}</div>`).join('')}</div>`
    :'<div class="empty-state">কোনো নাম পাওয়া যায়নি</div>';
}
function copyTxt(t) { navigator.clipboard?.writeText(t).then(()=>toast(`"${t}" কপি হয়েছে ✓`,'success')).catch(()=>toast(`নাম: ${t}`,'success')); }

function openNearbyHosp() {
  navigator.geolocation
    ? navigator.geolocation.getCurrentPosition(
        p => window.open(`https://www.google.com/maps/search/hospital/@${p.coords.latitude},${p.coords.longitude},14z`,'_blank'),
        () => window.open('https://www.google.com/maps/search/hospital+near+me','_blank'))
    : window.open('https://www.google.com/maps/search/hospital+near+me','_blank');
}

async function openNewsletter() {
  openSheet(`
    <div class="modal-title">📰 নিউজলেটার সাবস্ক্রিপশন</div>
    <p style="color:rgba(255,255,255,.6);font-size:13px;margin-bottom:15px">সাপ্তাহিক শিশু যত্নের টিপস ও আপডেট পেতে সাবস্ক্রাইব করুন</p>
    <div class="input-group"><label>ইমেইল</label><input type="email" class="dark-inp" id="nlMail" placeholder="আপনার ইমেইল" value="${cUser?.email||''}"></div>
    <button onclick="subNewsletter()" class="btn-main w100">সাবস্ক্রাইব করুন</button>`);
}
async function subNewsletter() {
  const mail=document.getElementById('nlMail')?.value.trim();
  if(!mail) return toast('ইমেইল দিন','error');
  try {
    await db.ref('newsletter/'+cUser.uid).set({email:mail, subscribedAt:Date.now()});
    toast('সাবস্ক্রিপশন সফল ✓','success'); closeSheet();
  } catch(e) { toast('সমস্যা হয়েছে','error'); }
}

// ══════════════════════════════════════════════════════
//  PROFILE PAGE
// ══════════════════════════════════════════════════════
async function profile(el) {
  const nm  = cUser?.displayName || 'ব্যবহারকারী';
  const em  = cUser?.email || '';
  let kids=0, ords=0;
  try {
    const ks = await db.ref('users/'+cUser.uid+'/children').once('value');
    if(ks.exists()) kids=Object.keys(ks.val()).length;
    const os = await db.ref('orders').orderByChild('userId').equalTo(cUser.uid).once('value');
    if(os.exists()) ords=Object.keys(os.val()).length;
  } catch(e) {}

  el.innerHTML = `
  <div class="pad">
    <div class="prof-hdr">
      <div class="prof-av" onclick="changePic()">
        ${cUser?.photoURL?`<img src="${cUser.photoURL}" alt="প্রোফাইল">`:(nm.charAt(0)||'U')}
        <div class="av-edit">✏️</div>
      </div>
      <div class="prof-nm">${esc(nm)}</div>
      <div class="prof-em">${em}</div>
    </div>
    <div class="prof-stats">
      <div class="ps-card"><div class="ps-val">${kids}</div><div class="ps-lbl">শিশু প্রোফাইল</div></div>
      <div class="ps-card"><div class="ps-val">${ords}</div><div class="ps-lbl">মোট অর্ডার</div></div>
      <div class="ps-card" onclick="goPage('earn')" style="cursor:pointer"><div class="ps-val">💰</div><div class="ps-lbl">উপার্জন</div></div>
    </div>

    <div class="sec-hdr" style="margin-top:6px">
      <h2 class="sec-title">👶 আমার শিশু</h2>
    </div>
    <div id="profKids"><div class="spin-wrap"><div class="spinner"></div></div></div>
    <button class="btn-main w100" style="margin-top:10px" onclick="openAddChild()">➕ নতুন শিশু যোগ করুন</button>

    <h2 class="sec-title" style="margin-top:20px">⚙️ সেটিংস ও আরো</h2>
    <div class="menu-list">
      <div class="menu-item" onclick="editProf()"><span class="m-ico">✏️</span><span class="m-txt">প্রোফাইল সম্পাদনা</span><span class="m-arr">›</span></div>
      <div class="menu-item" onclick="changePass()"><span class="m-ico">🔒</span><span class="m-txt">পাসওয়ার্ড পরিবর্তন</span><span class="m-arr">›</span></div>
      <div class="menu-item" onclick="goPage('earn')"><span class="m-ico">💰</span><span class="m-txt">উপার্জন সেকশন</span><span class="m-arr">›</span></div>
      <div class="menu-item" onclick="openOrderHist()"><span class="m-ico">📦</span><span class="m-txt">অর্ডার ইতিহাস</span><span class="m-arr">›</span></div>
      <div class="menu-item" onclick="openNotifications()"><span class="m-ico">🔔</span><span class="m-txt">নোটিফিকেশন</span><span class="m-arr">›</span></div>
      <div class="menu-item" onclick="openPrivacy()"><span class="m-ico">🛡️</span><span class="m-txt">গোপনীয়তা নীতি</span><span class="m-arr">›</span></div>
      <div class="menu-item" onclick="openAbout()"><span class="m-ico">ℹ️</span><span class="m-txt">FutFul সম্পর্কে</span><span class="m-arr">›</span></div>
    </div>
    <button onclick="doLogout()" class="btn-logout">লগআউট করুন</button>
    <div style="height:20px"></div>
  </div>`;
  loadProfKids();
}

async function loadProfKids() {
  const el=document.getElementById('profKids');
  if(!el||!cUser) return;
  try {
    const snap=await db.ref('users/'+cUser.uid+'/children').once('value');
    if(!snap.exists()){el.innerHTML='<div class="empty-state">এখনো কোনো শিশুর প্রোফাইল যোগ করা হয়নি</div>';return;}
    const kids=[]; snap.forEach(c=>kids.push({id:c.key,...c.val()}));
    el.innerHTML=`<div class="child-scroll">
      ${kids.map(k=>`
        <div class="child-card">
          <div class="ch-av">${k.gender==='মেয়ে'?'👧':'👦'}</div>
          <div class="ch-nm">${esc(k.name)}</div>
          <div class="ch-age">${calcAge(k.dob)}</div>
          <div class="ch-acts">
            <button class="btn-ch-e" onclick="editKid('${k.id}')">✏️ সম্পাদনা</button>
            <button class="btn-ch-d" onclick="delKid('${k.id}')">🗑️</button>
          </div>
        </div>`).join('')}
    </div>`;
  } catch(e) {}
}

function openAddChild() {
  openSheet(`
    <div class="modal-title">👶 শিশুর প্রোফাইল যোগ করুন</div>
    <div class="input-group"><label>শিশুর নাম</label><input type="text" class="dark-inp" id="cnm" placeholder="নাম লিখুন"></div>
    <div class="input-group"><label>জন্ম তারিখ</label><input type="date" class="dark-inp" id="cdob" max="${new Date().toISOString().split('T')[0]}"></div>
    <div class="input-group"><label>লিঙ্গ</label>
      <select class="dark-inp" id="cgen"><option value="ছেলে">ছেলে</option><option value="মেয়ে">মেয়ে</option></select>
    </div>
    <div class="two-col">
      <div class="input-group"><label>জন্ম ওজন (কেজি)</label><input type="number" class="dark-inp" id="cbw" placeholder="3.2" step="0.1"></div>
      <div class="input-group"><label>জন্ম উচ্চতা (সেমি)</label><input type="number" class="dark-inp" id="cbh" placeholder="50"></div>
    </div>
    <button onclick="saveKid()" class="btn-main w100">সংরক্ষণ করুন</button>`);
}
async function saveKid() {
  const nm=document.getElementById('cnm')?.value.trim();
  const dob=document.getElementById('cdob')?.value;
  const gen=document.getElementById('cgen')?.value;
  const bw=parseFloat(document.getElementById('cbw')?.value)||0;
  const bh=parseFloat(document.getElementById('cbh')?.value)||0;
  if(!nm||!dob) return toast('নাম ও জন্ম তারিখ দিন','error');
  try {
    await db.ref('users/'+cUser.uid+'/children').push({name:nm,dob,gender:gen,birthWeight:bw,birthHeight:bh,createdAt:Date.now()});
    toast('শিশুর প্রোফাইল সংরক্ষণ হয়েছে ✓','success');
    closeSheet();
    if(cPage==='profile') profile(document.getElementById('pageArea'));
    else loadHomeChildren();
  } catch(e) { toast('সংরক্ষণ করতে সমস্যা হয়েছে','error'); }
}

async function delKid(kid) {
  if(!confirm('এই শিশুর প্রোফাইল মুছে ফেলবেন?')) return;
  try {
    await db.ref('users/'+cUser.uid+'/children/'+kid).remove();
    toast('শিশুর প্রোফাইল মুছে ফেলা হয়েছে','success');
    loadProfKids();
  } catch(e) {}
}

function editKid(kid) {
  db.ref('users/'+cUser.uid+'/children/'+kid).once('value').then(snap=>{
    const k=snap.val();
    openSheet(`
      <div class="modal-title">✏️ শিশুর তথ্য সম্পাদনা</div>
      <div class="input-group"><label>নাম</label><input type="text" class="dark-inp" id="eknm" value="${esc(k.name||'')}"></div>
      <div class="input-group"><label>জন্ম তারিখ</label><input type="date" class="dark-inp" id="ekdob" value="${k.dob||''}"></div>
      <div class="input-group"><label>লিঙ্গ</label>
        <select class="dark-inp" id="ekgen">
          <option value="ছেলে" ${k.gender==='ছেলে'?'selected':''}>ছেলে</option>
          <option value="মেয়ে" ${k.gender==='মেয়ে'?'selected':''}>মেয়ে</option>
        </select>
      </div>
      <button onclick="updateKid('${kid}')" class="btn-main w100">আপডেট করুন</button>`);
  });
}
async function updateKid(kid) {
  const nm=document.getElementById('eknm')?.value.trim();
  const dob=document.getElementById('ekdob')?.value;
  const gen=document.getElementById('ekgen')?.value;
  if(!nm) return toast('নাম দিন','error');
  try {
    await db.ref('users/'+cUser.uid+'/children/'+kid).update({name:nm,dob,gender:gen});
    toast('তথ্য আপডেট হয়েছে ✓','success'); closeSheet(); loadProfKids();
  } catch(e) {}
}

function editProf() {
  openSheet(`
    <div class="modal-title">✏️ প্রোফাইল সম্পাদনা</div>
    <div class="input-group"><label>নাম</label><input type="text" class="dark-inp" id="enm" value="${esc(cUser?.displayName||'')}"></div>
    <div class="input-group"><label>ফোন</label><input type="tel" class="dark-inp" id="eph" placeholder="01XXXXXXXXX"></div>
    <button onclick="saveProf()" class="btn-main w100">আপডেট করুন</button>`);
  db.ref('users/'+cUser.uid).once('value').then(s=>{if(s.exists()&&document.getElementById('eph')) document.getElementById('eph').value=s.val().phone||'';});
}
async function saveProf() {
  const nm=document.getElementById('enm')?.value.trim();
  const ph=document.getElementById('eph')?.value.trim();
  if(!nm) return toast('নাম দিন','error');
  try {
    await cUser.updateProfile({displayName:nm});
    await db.ref('users/'+cUser.uid).update({name:nm,phone:ph});
    toast('প্রোফাইল আপডেট হয়েছে ✓','success'); closeSheet();
    profile(document.getElementById('pageArea'));
  } catch(e) { toast('আপডেট করতে সমস্যা হয়েছে','error'); }
}

function changePass() {
  openSheet(`
    <div class="modal-title">🔒 পাসওয়ার্ড পরিবর্তন</div>
    <div class="input-group"><label>বর্তমান পাসওয়ার্ড</label><input type="password" class="dark-inp" id="cpOld"></div>
    <div class="input-group"><label>নতুন পাসওয়ার্ড</label><input type="password" class="dark-inp" id="cpNew"></div>
    <div class="input-group"><label>নতুন পাসওয়ার্ড নিশ্চিত</label><input type="password" class="dark-inp" id="cpCon"></div>
    <button onclick="doChangePass()" class="btn-main w100">পরিবর্তন করুন</button>`);
}
async function doChangePass() {
  const old=document.getElementById('cpOld')?.value;
  const nw=document.getElementById('cpNew')?.value;
  const con=document.getElementById('cpCon')?.value;
  if(!old||!nw) return toast('পাসওয়ার্ড দিন','error');
  if(nw!==con) return toast('নতুন পাসওয়ার্ড মিলছে না','error');
  if(nw.length<6) return toast('পাসওয়ার্ড কমপক্ষে ৬ অক্ষর','error');
  try {
    const cred=firebase.auth.EmailAuthProvider.credential(cUser.email,old);
    await cUser.reauthenticateWithCredential(cred);
    await cUser.updatePassword(nw);
    toast('পাসওয়ার্ড পরিবর্তন হয়েছে ✓','success'); closeSheet();
  } catch(e) { toast('পাসওয়ার্ড পরিবর্তন ব্যর্থ — পুরানো পাসওয়ার্ড ভুল','error'); }
}

function changePic() {
  const inp=document.createElement('input');
  inp.type='file'; inp.accept='image/*';
  inp.onchange=async e=>{
    const f=e.target.files[0]; if(!f) return;
    toast('ছবি আপলোড হচ্ছে...');
    try {
      const ref=storage.ref('profilePics/'+cUser.uid);
      await ref.put(f);
      const url=await ref.getDownloadURL();
      await cUser.updateProfile({photoURL:url});
      await db.ref('users/'+cUser.uid).update({profileImage:url});
      toast('প্রোফাইল ছবি আপডেট হয়েছে ✓','success');
      profile(document.getElementById('pageArea'));
    } catch(e){toast('আপলোড করতে সমস্যা হয়েছে','error');}
  };
  inp.click();
}

async function openOrderHist() {
  openFPM('📦 অর্ডার ইতিহাস');
  const el=document.getElementById('fpmBody');
  el.innerHTML='<div class="spin-wrap"><div class="spinner"></div> লোড হচ্ছে...</div>';
  try {
    const snap=await db.ref('orders').orderByChild('userId').equalTo(cUser.uid).once('value');
    if(!snap.exists()){el.innerHTML='<div class="empty-state">কোনো অর্ডার নেই</div>';return;}
    const ords=[]; snap.forEach(c=>ords.push({id:c.key,...c.val()}));
    ords.sort((a,b)=>b.createdAt-a.createdAt);
    el.innerHTML=ords.map(o=>`
      <div class="order-card">
        <div class="order-hdr">
          <span class="order-id">অর্ডার #${o.id.slice(-6).toUpperCase()}</span>
          <span class="ostatus os-${o.status||'pending'}">${{pending:'অপেক্ষমান',processing:'প্রক্রিয়াধীন',shipped:'শিপড',delivered:'ডেলিভারড',cancelled:'বাতিল'}[o.status]||o.status}</span>
        </div>
        <div style="color:rgba(255,255,255,.45);font-size:12px;margin-bottom:8px">${fmtTime(o.createdAt)}</div>
        ${(o.products||[]).map(p=>`<div class="info-row"><span class="ir-lbl">${p.name} ×${p.qty}</span><span class="ir-val">৳${p.price*p.qty}</span></div>`).join('')}
        <div style="color:var(--pk);font-weight:700;font-size:15px;text-align:right;margin-top:7px">মোট: ৳${o.totalPrice}</div>
      </div>`).join('');
  } catch(e){el.innerHTML='<div class="empty-state">লোড করতে সমস্যা হয়েছে</div>';}
}

function openPrivacy() {
  openSheet(`
    <div class="modal-title">🛡️ গোপনীয়তা নীতি</div>
    <div style="color:rgba(255,255,255,.75);font-size:13px;line-height:1.85">
      <p><strong style="color:#fff">FutFul</strong> আপনার ব্যক্তিগত তথ্যের সুরক্ষাকে সর্বোচ্চ অগ্রাধিকার দেয়।</p><br>
      <p><strong style="color:#fff">🔒 আমরা যা সংগ্রহ করি:</strong> ইমেইল, নাম, ফোন নম্বর, শিশুর তথ্য — শুধুমাত্র আপনার সুবিধার জন্য।</p><br>
      <p><strong style="color:#fff">🚫 আমরা শেয়ার করি না:</strong> তৃতীয় পক্ষের কাছে আপনার কোনো ব্যক্তিগত তথ্য বিক্রি বা শেয়ার করা হয় না।</p><br>
      <p><strong style="color:#fff">🔐 নিরাপত্তা:</strong> Firebase-এর সর্বোচ্চ নিরাপত্তা এনক্রিপশন ব্যবহার করা হয়।</p><br>
      <p>📧 যোগাযোগ: mhtotul9@gmail.com</p>
    </div>`);
}

function openAbout() {
  openSheet(`
    <div style="text-align:center;padding:16px 0">
      <div style="font-size:60px;margin-bottom:8px">🌸</div>
      <div style="color:#fff;font-size:28px;font-weight:700">FutFul</div>
      <div style="color:rgba(255,255,255,.5);font-size:13px;margin-top:3px">সংস্করণ ১.০.০</div>
      <div style="color:rgba(255,255,255,.6);font-size:13px;margin-top:14px;line-height:1.75">
        FutFul হল বাংলাদেশের মায়েদের জন্য<br>একটি সম্পূর্ণ শিশু যত্ন অ্যাপ্লিকেশন।
      </div>
    </div>
    <div class="info-row"><span class="ir-lbl">ডেভেলপার</span><span class="ir-val">FutFul Team</span></div>
    <div class="info-row"><span class="ir-lbl">ইমেইল</span><span class="ir-val">mhtotul9@gmail.com</span></div>
    <div class="info-row"><span class="ir-lbl">সংস্করণ</span><span class="ir-val">1.0.0</span></div>`);
}

async function doLogout() {
  if(!confirm('লগআউট করবেন?')) return;
  await auth.signOut();
  cart=[]; cUser=null;
  hid('chatFab');
  showScreen('authScreen');
  toast('লগআউট হয়েছে','success');
}

// ══════════════════════════════════════════════════════
//  HEALTH HUB
// ══════════════════════════════════════════════════════
function openHealth() {
  openFPM('❤️‍🩹 স্বাস্থ্য কেন্দ্র');
  const el=document.getElementById('fpmBody');
  el.innerHTML=`
    <div class="htabs" id="htabs">
      <button class="htab on" onclick="hTab('vaccine',this)">💉 টিকাকরণ</button>
      <button class="htab" onclick="hTab('growth',this)">📊 বৃদ্ধি</button>
      <button class="htab" onclick="hTab('illness',this)">🤒 অসুস্থতা</button>
    </div>
    <div id="htContent"></div>`;
  hTab('vaccine', el.querySelector('.htab.on'));
}

function hTab(tab, btn) {
  document.querySelectorAll('.htab').forEach(t=>t.classList.remove('on'));
  btn?.classList.add('on');
  const el=document.getElementById('htContent');
  if(!el) return;
  if(tab==='vaccine') {
    el.innerHTML=`
      <p style="color:rgba(255,255,255,.5);font-size:12px;margin-bottom:11px">বাংলাদেশ সরকারি ইপিআই কর্মসূচি অনুযায়ী</p>
      ${[
        {nm:'বিসিজি (BCG)',time:'জন্মের সময়',st:'done',desc:'যক্ষ্মা প্রতিরোধ'},
        {nm:'পেন্টাভ্যালেন্ট ১ম',time:'৬ সপ্তাহ',st:'done',desc:'ডিপথেরিয়া, টিটেনাস, হেপাটাইটিস বি, হিব'},
        {nm:'পেন্টাভ্যালেন্ট ২য়',time:'১০ সপ্তাহ',st:'due',desc:'বুস্টার ডোজ'},
        {nm:'পেন্টাভ্যালেন্ট ৩য়',time:'১৪ সপ্তাহ',st:'up',desc:'তৃতীয় ডোজ'},
        {nm:'আইপিভি (IPV)',time:'১৪ সপ্তাহ',st:'up',desc:'পোলিও'},
        {nm:'পিসিভি ১ম (PCV)',time:'৬ সপ্তাহ',st:'done',desc:'নিউমোনিয়া প্রতিরোধ'},
        {nm:'হাম-রুবেলা (MR)',time:'৯ মাস',st:'up',desc:'হাম ও রুবেলা প্রতিরোধ'},
        {nm:'ভিটামিন এ ক্যাপসুল',time:'৯ মাস',st:'up',desc:'দৃষ্টিশক্তি ও রোগ প্রতিরোধ'},
      ].map(v=>`
        <div class="vacc-item">
          <div class="vacc-dot ${v.st==='done'?'vd-done':v.st==='due'?'vd-due':'vd-up'}">${v.st==='done'?'✓':v.st==='due'?'⚡':'○'}</div>
          <div class="vacc-inf"><h4>${v.nm}</h4><p>${v.time} • ${v.desc}</p></div>
          ${v.st==='due'?'<span style="background:rgba(255,159,67,.2);color:var(--or);font-size:10px;padding:2px 8px;border-radius:9px;white-space:nowrap;flex-shrink:0">শীঘ্রই</span>':''}
        </div>`).join('')}`;
  } else if(tab==='growth') {
    el.innerHTML=`
      <div class="two-col">
        <div class="input-group"><label>ওজন (কেজি)</label><input type="number" class="dark-inp" id="gWt" placeholder="8.5" step="0.1"></div>
        <div class="input-group"><label>উচ্চতা (সেমি)</label><input type="number" class="dark-inp" id="gHt" placeholder="72"></div>
      </div>
      <div class="input-group"><label>পরিমাপের তারিখ</label><input type="date" class="dark-inp" id="gDt" value="${new Date().toISOString().split('T')[0]}"></div>
      <button onclick="saveGrowth()" class="btn-main w100">রেকর্ড সংরক্ষণ করুন</button>
      <div style="margin-top:16px">
        <div style="color:rgba(255,255,255,.6);font-size:12px;margin-bottom:10px">WHO মানদণ্ড অনুযায়ী স্বাভাবিক বৃদ্ধি</div>
        ${[
          {lbl:'ওজন (৬ মাস)',rng:'৬.৫-৯.৫ কেজি',w:74,cls:'gf-w'},
          {lbl:'উচ্চতা (৬ মাস)',rng:'৬২-৭২ সেমি',w:82,cls:'gf-h'},
          {lbl:'ওজন (১২ মাস)',rng:'৮.৫-১২ কেজি',w:68,cls:'gf-w'},
          {lbl:'উচ্চতা (১২ মাস)',rng:'৭২-৮০ সেমি',w:78,cls:'gf-h'},
        ].map(b=>`
          <div style="margin-bottom:11px">
            <div style="display:flex;justify-content:space-between;color:rgba(255,255,255,.6);font-size:11px;margin-bottom:5px"><span>${b.lbl}</span><span>${b.rng}</span></div>
            <div class="growth-track"><div class="growth-fill ${b.cls}" style="width:${b.w}%"></div></div>
          </div>`).join('')}
      </div>
      <h4 style="color:#fff;font-size:14px;margin:14px 0 9px">📋 বৃদ্ধির ইতিহাস</h4>
      <div id="growthHist"><div class="spin-wrap"><div class="spinner"></div></div></div>`;
    loadGrowthHist();
  } else {
    el.innerHTML=`
      ${[
        {ti:'🌡️ জ্বর',tx:'হালকা জ্বর (৯৯-১০০°F): পর্যাপ্ত পানি পান করান, মাথায় ভেজা কাপড় দিন। ১০২°F বা ৩৮.৮°C এর বেশি হলে বা ৩ মাসের কম বয়সী শিশুর যেকোনো জ্বরে সঙ্গে সঙ্গে ডাক্তার দেখান।'},
        {ti:'🤧 সর্দি-কাশি',tx:'বুকের দুধ বেশি দিন, নাক স্যালাইন দিয়ে পরিষ্কার করুন। ঘরে আর্দ্রতা বাড়ান। শ্বাসকষ্ট বা বুক ডেবে যাওয়া দেখলে সঙ্গে সঙ্গে হাসপাতালে যান।'},
        {ti:'🚽 ডায়রিয়া',tx:'ওআরএস (স্যালাইন) দিন — প্রতিবার পাতলা পায়খানার পর। বুকের দুধ চালিয়ে যান। ৬ ঘণ্টার বেশি প্রস্রাব না হলে বা রক্তমিশ্রিত হলে ডাক্তার দেখান।'},
        {ti:'🤮 বমি',tx:'অল্প অল্প করে তরল খাবার দিন। ১২ ঘণ্টার বেশি বমি, রক্তমিশ্রিত বমি বা পানিশূন্যতার লক্ষণ দেখলে ডাক্তার দেখান।'},
        {ti:'🚨 ডাক্তারের কাছে যাওয়ার জরুরি লক্ষণ',tx:'শ্বাসকষ্ট • নীলচে ঠোঁট বা মুখ • ৩ মাসের নিচে যেকোনো জ্বর • খুব দুর্বল, সাড়া দিচ্ছে না • খিঁচুনি • বুকে ঢেবে যাওয়া'},
      ].map(i=>`<div class="tip-card"><strong>${i.ti}</strong><br>${i.tx}</div>`).join('')}`;
  }
}

async function saveGrowth() {
  const w=parseFloat(document.getElementById('gWt')?.value)||0;
  const h=parseFloat(document.getElementById('gHt')?.value)||0;
  const dt=document.getElementById('gDt')?.value;
  if(!w&&!h) return toast('ওজন বা উচ্চতা দিন','error');
  try {
    await db.ref('users/'+cUser.uid+'/growthRecords').push({weight:w,height:h,date:dt||new Date().toISOString().split('T')[0],createdAt:Date.now()});
    toast('বৃদ্ধির রেকর্ড সংরক্ষণ হয়েছে ✓','success');
    loadGrowthHist();
  } catch(e){toast('সংরক্ষণ করতে সমস্যা হয়েছে','error');}
}
async function loadGrowthHist() {
  const el=document.getElementById('growthHist');
  if(!el||!cUser) return;
  try {
    const snap=await db.ref('users/'+cUser.uid+'/growthRecords').orderByChild('createdAt').limitToLast(10).once('value');
    if(!snap.exists()){el.innerHTML='<div class="empty-state">কোনো রেকর্ড নেই</div>';return;}
    const recs=[]; snap.forEach(c=>recs.push(c.val())); recs.reverse();
    el.innerHTML=recs.map(r=>`
      <div class="info-row">
        <span class="ir-lbl">${r.date||'অজানা তারিখ'}</span>
        <span class="ir-val">${r.weight?r.weight+'কেজি':''} ${r.height?r.height+'সেমি':''}</span>
      </div>`).join('');
  } catch(e){}
}

// ══════════════════════════════════════════════════════
//  NUTRITION
// ══════════════════════════════════════════════════════
function openNutrition() {
  openFPM('🥗 পুষ্টি গাইড');
  const el=document.getElementById('fpmBody');
  el.innerHTML=`
    <div class="age-tabs" id="ageTabs">
      <button class="age-tab on" onclick="nTab(0,this)">০-৬ মাস</button>
      <button class="age-tab" onclick="nTab(6,this)">৬-১২ মাস</button>
      <button class="age-tab" onclick="nTab(12,this)">১-২ বছর</button>
      <button class="age-tab" onclick="nTab(24,this)">২+ বছর</button>
    </div>
    <div id="nContent"></div>`;
  nTab(0, el.querySelector('.age-tab.on'));
}

function nTab(age, btn) {
  document.querySelectorAll('.age-tab').forEach(t=>t.classList.remove('on'));
  btn?.classList.add('on');
  const el=document.getElementById('nContent');
  if(!el) return;
  const g={
    0:{t:'০-৬ মাস: শুধুমাত্র বুকের দুধ',it:['মায়ের দুধই সর্বোত্তম ও সম্পূর্ণ খাবার — পানিও দেওয়ার প্রয়োজন নেই','দিনে ৮-১২ বার খাওয়ান — চাহিদামতো','সঠিক পজিশন: শিশুর পেট মায়ের পেটের দিকে','স্তন্যদান সমস্যায় বুকের দুধ ব্যাংক বা বিশেষজ্ঞের পরামর্শ নিন','মায়ের খাবার: মাছ, ডাল, শাকসবজি, পানি বেশি খান']},
    6:{t:'৬-১২ মাস: বুকের দুধের পাশে বাড়তি খাবার শুরু',it:['মায়ের দুধ চালিয়ে যান','নরম খিচুড়ি দিয়ে শুরু করুন','প্রতি সপ্তাহে একটি নতুন খাবার — অ্যালার্জি পর্যবেক্ষণ করুন','ফল: কলা, পেঁপে, আপেল — মাড়াই করা','ডিম, মাছ, মুরগি পরিচয় করিয়ে দিন']},
    12:{t:'১-২ বছর: পারিবারিক খাবারে অভ্যস্ত',it:['পরিবারের সাথে একই খাবার (লবণ-চিনি কম)','দিনে ৩ বেলা প্রধান + ২ বার হালকা খাবার','দুধ: দিনে ৩৫০-৪৫০ মিলি (মায়ের দুধ বা গরুর দুধ)','শাকসবজি, ফল, ডাল, মাছ নিয়মিত দিন','খাবারের সময় জোর করবেন না — খেলার মেজাজে']},
    24:{t:'২+ বছর: সুষম ও বৈচিত্র্যময় খাবার',it:['সব ধরনের খাবার — বৈচিত্র্য রাখুন','দিনে ৫ বার ফল বা সবজি','প্রচুর পানি পান করান — দিনে ৮-১০ গ্লাস','জাংক ফুড, অতিরিক্ত মিষ্টি এড়িয়ে চলুন','পরিবারের সাথে একসাথে খাওয়া — ইতিবাচক অভিজ্ঞতা']},
  };
  const gu=g[age];
  el.innerHTML=`
    <div style="color:#fff;font-size:14px;font-weight:700;margin-bottom:10px">${gu.t}</div>
    ${gu.it.map(i=>`<div class="tip-card">✅ ${i}</div>`).join('')}
    <h4 style="color:#fff;font-size:14px;margin:16px 0 10px">🍳 স্থানীয় রেসিপি</h4>
    ${[
      {nm:'সহজ খিচুড়ি',em:'🍚',ds:'চাল, মসুর ডাল, গাজর, আলু দিয়ে পুষ্টিকর নরম খিচুড়ি'},
      {nm:'সবজি পিউরি',em:'🥦',ds:'মিষ্টিকুমড়া, আলু, গাজর একসাথে সেদ্ধ করে ব্লেন্ড করুন'},
      {nm:'ডিমের হালুয়া',em:'🥚',ds:'ডিম, দুধ, চিনি কম দিয়ে তৈরি পুষ্টিকর মিষ্টি'},
    ].map(r=>`<div class="recipe-card"><div class="recipe-img">${r.em}</div><div class="recipe-body"><h4>${r.nm}</h4><p>${r.ds}</p></div></div>`).join('')}`;
}

// ══════════════════════════════════════════════════════
//  DEVELOPMENT
// ══════════════════════════════════════════════════════
function openDevelopment() {
  openFPM('🌱 বিকাশ ট্র্যাকার');
  const el=document.getElementById('fpmBody');
  el.innerHTML=`
    <div class="htabs">
      <button class="htab on" onclick="dTab('ms',this)">🏆 মাইলস্টোন</button>
      <button class="htab" onclick="dTab('act',this)">🎮 কার্যকলাপ</button>
    </div>
    <div id="dContent"></div>`;
  dTab('ms', el.querySelector('.htab.on'));
}

function dTab(tab, btn) {
  document.querySelectorAll('.htab').forEach(t=>t.classList.remove('on'));
  btn?.classList.add('on');
  const el=document.getElementById('dContent');
  if(!el) return;
  if(tab==='ms') {
    const ms=[
      {id:'m1',tx:'হাসতে শুরু করেছে',ag:'২ মাস'},
      {id:'m2',tx:'মাথা সোজা রাখতে পারছে',ag:'৩ মাস'},
      {id:'m3',tx:'হাতে জিনিস ধরতে পারছে',ag:'৪ মাস'},
      {id:'m4',tx:'গড়িয়ে পড়তে পারছে',ag:'৫ মাস'},
      {id:'m5',tx:'পেট ভর দিয়ে বুক তুলতে পারছে',ag:'৬ মাস'},
      {id:'m6',tx:'সাহায্য ছাড়া বসতে পারছে',ag:'৮ মাস'},
      {id:'m7',tx:'"মা" "বাবা" বলতে পারছে',ag:'১০ মাস'},
      {id:'m8',tx:'একা দাঁড়াতে পারছে',ag:'১২ মাস'},
      {id:'m9',tx:'হাঁটতে শুরু করেছে',ag:'১৩-১৫ মাস'},
      {id:'m10',tx:'২০+ শব্দ বলতে পারছে',ag:'১৮ মাস'},
    ];
    el.innerHTML=`<p style="color:rgba(255,255,255,.5);font-size:12px;margin-bottom:11px">✅ অর্জিত মাইলস্টোন চিহ্নিত করুন</p>
      ${ms.map(m=>`
        <div class="ms-item" onclick="toggleMS('${m.id}',this)">
          <div class="ms-chk ${milestones[m.id]?'done':''}" id="mck-${m.id}">${milestones[m.id]?'✓':''}</div>
          <div style="flex:1"><div class="ms-txt">${m.tx}</div><div style="color:rgba(255,255,255,.38);font-size:11px;margin-top:2px">সাধারণত ${m.ag}-এ অর্জন হয়</div></div>
        </div>`).join('')}`;
  } else {
    el.innerHTML=[
      {em:'🎵',ti:'গান ও ছড়া',ds:'প্রতিদিন শিশুর সাথে ছড়া ও গান করুন — ভাষা বিকাশে সবচেয়ে কার্যকর'},
      {em:'🏗️',ti:'ব্লক দিয়ে খেলা',ds:'রঙিন ব্লক সাজানো ও ভাঙা — হাত-চোখের সমন্বয় ও সৃজনশীলতা বাড়ায়'},
      {em:'📚',ti:'ছবির বই দেখা',ds:'রঙিন ছবির বই একসাথে দেখুন — মনোযোগ ও কল্পনাশক্তি বাড়ায়'},
      {em:'🎨',ti:'আঁকাআঁকি',ds:'১৮ মাস বয়স থেকে অ-বিষাক্ত রঙ দিয়ে আঁকতে দিন'},
      {em:'🫧',ti:'পানি খেলা',ds:'গোসলের সময় পানি খেলা ইন্দ্রিয় বিকাশ ও মোটর দক্ষতায় সহায়ক'},
      {em:'🤸',ti:'শরীরচর্চা',ds:'শিশুকে মেঝেতে খেলতে দিন — বুকে ভর দেওয়া, গড়িয়ে যাওয়া স্বাভাবিক বিকাশের জন্য জরুরি'},
    ].map(a=>`<div class="ebook-card"><div class="ebook-ico">${a.em}</div><div class="ebook-inf"><h4>${a.ti}</h4><p>${a.ds}</p></div></div>`).join('');
  }
}

function toggleMS(id, row) {
  milestones[id]=!milestones[id];
  const chk=document.getElementById('mck-'+id);
  if(chk){chk.className='ms-chk'+(milestones[id]?' done':'');chk.textContent=milestones[id]?'✓':'';}
  if(cUser) db.ref('users/'+cUser.uid+'/milestones/'+id).set(milestones[id]);
  if(milestones[id]) toast('🏆 মাইলস্টোন অর্জিত! দারুণ!','success');
}

// ══════════════════════════════════════════════════════
//  SCHEDULER
// ══════════════════════════════════════════════════════
function openScheduler() {
  openFPM('📅 দৈনিক সময়সূচী');
  const el=document.getElementById('fpmBody');
  el.innerHTML=`
    <div class="htabs">
      <button class="htab on" onclick="schTab('add',this)">➕ যোগ করুন</button>
      <button class="htab" onclick="schTab('list',this)">📋 আজকের তালিকা</button>
      <button class="htab" onclick="schTab('mental',this)">🧠 মানসিক সহায়তা</button>
    </div>
    <div id="schContent"></div>`;
  schTab('add', el.querySelector('.htab.on'));
}

function schTab(tab, btn) {
  document.querySelectorAll('.htab').forEach(t=>t.classList.remove('on'));
  btn?.classList.add('on');
  const el=document.getElementById('schContent');
  if(!el) return;
  if(tab==='add') {
    el.innerHTML=`
      <div class="input-group"><label>কার্যকলাপের ধরন</label>
        <select class="dark-inp" id="sType">
          <option>🍼 খাওয়ানো</option><option>😴 ঘুম</option>
          <option>🧷 ডায়াপার পরিবর্তন</option><option>💊 ওষুধ</option>
          <option>🎮 খেলা</option><option>🛁 গোসল</option>
          <option>🌙 রাতের ঘুম</option>
        </select>
      </div>
      <div class="two-col">
        <div class="input-group"><label>সময়</label><input type="time" class="dark-inp" id="sTime"></div>
        <div class="input-group"><label>সময়কাল (মিনিট)</label><input type="number" class="dark-inp" id="sDur" placeholder="30" min="1" max="600"></div>
      </div>
      <div class="input-group"><label>নোট (ঐচ্ছিক)</label><input type="text" class="dark-inp" id="sNote" placeholder="বিস্তারিত লিখুন..."></div>
      <button onclick="saveSch()" class="btn-main w100">✅ সময়সূচী সংরক্ষণ করুন</button>`;
  } else if(tab==='list') {
    el.innerHTML='<div id="schList"><div class="spin-wrap"><div class="spinner"></div></div></div>';
    loadSch();
  } else {
    el.innerHTML=[
      {ic:'💙',ti:'প্রসবোত্তর বিষণ্নতা',tx:'সন্তান প্রসবের পর বিষণ্নতা, কান্না, উদ্বেগ সম্পূর্ণ স্বাভাবিক। একা সামলাতে না পারলে পরিবার ও চিকিৎসকের সহায়তা নিন।'},
      {ic:'🧘',ti:'শ্বাস-প্রশ্বাসের ব্যায়াম',tx:'৪ গণনায় শ্বাস নিন → ৭ গণনায় ধরুন → ৮ গণনায় ছাড়ুন। দিনে ৩ বার করুন।'},
      {ic:'👩‍⚕️',ti:'পেশাদার সাহায্য',tx:'কান পেতে রই: 01779-554391 (মানসিক স্বাস্থ্য হেল্পলাইন) • কিরণ হেল্পলাইন: 1800-599-0019'},
      {ic:'🤝',ti:'সাপোর্ট গ্রুপ',tx:'FutFul কমিউনিটিতে অন্য মায়েদের সাথে অভিজ্ঞতা শেয়ার করুন। একা নন!'},
    ].map(t=>`<div class="g-card" style="display:flex;gap:12px;align-items:flex-start"><div style="font-size:28px">${t.ic}</div><div><div style="color:#fff;font-size:14px;font-weight:700;margin-bottom:4px">${t.ti}</div><div style="color:rgba(255,255,255,.6);font-size:13px;line-height:1.6">${t.tx}</div></div></div>`).join('');
  }
}

async function saveSch() {
  const type=document.getElementById('sType')?.value;
  const time=document.getElementById('sTime')?.value;
  const dur=document.getElementById('sDur')?.value;
  const note=document.getElementById('sNote')?.value;
  if(!time) return toast('সময় দিন','error');
  try {
    await db.ref('users/'+cUser.uid+'/schedule').push({type,time,duration:parseInt(dur)||0,note,date:new Date().toDateString(),createdAt:Date.now()});
    toast('সময়সূচী সংরক্ষণ হয়েছে ✓','success');
    document.getElementById('sTime').value='';
    document.getElementById('sNote').value='';
  } catch(e){toast('সমস্যা হয়েছে','error');}
}

async function loadSch() {
  const el=document.getElementById('schList');
  if(!el||!cUser) return;
  try {
    const today=new Date().toDateString();
    const snap=await db.ref('users/'+cUser.uid+'/schedule').orderByChild('date').equalTo(today).once('value');
    if(!snap.exists()){el.innerHTML='<div class="empty-state">আজকের কোনো সময়সূচী নেই</div>';return;}
    const items=[]; snap.forEach(c=>items.push({id:c.key,...c.val()}));
    items.sort((a,b)=>a.time>b.time?1:-1);
    el.innerHTML=items.map(i=>`
      <div class="info-row">
        <div>
          <div style="color:#fff;font-size:13px;font-weight:600">${i.type}</div>
          ${i.note?`<div style="color:rgba(255,255,255,.45);font-size:11px">${i.note}</div>`:''}
          ${i.duration?`<div style="color:rgba(255,255,255,.35);font-size:11px">${i.duration} মিনিট</div>`:''}
        </div>
        <div style="text-align:right">
          <div style="color:rgba(255,255,255,.55);font-size:13px">${i.time}</div>
          <button onclick="delSch('${i.id}')" style="background:none;border:none;color:var(--re);font-size:11px;cursor:pointer;font-family:inherit;margin-top:3px">মুছুন</button>
        </div>
      </div>`).join('');
  } catch(e){}
}

async function delSch(id) {
  await db.ref('users/'+cUser.uid+'/schedule/'+id).remove();
  toast('মুছে ফেলা হয়েছে','success');
  loadSch();
}

// ══════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════
async function loadNotifBadge() {
  if(!cUser) return;
  try {
    const snap=await db.ref('notifications').orderByChild('active').equalTo(true).limitToLast(5).once('value');
    if(snap.exists()) {
      const n=Object.keys(snap.val()).length;
      const el=document.getElementById('notifCount');
      if(el&&n>0){el.textContent=n;el.classList.remove('hidden');}
    }
  } catch(e){}
}

function openNotifications() {
  openFPM('🔔 বিজ্ঞপ্তিসমূহ');
  const el=document.getElementById('fpmBody');
  el.innerHTML='<div class="spin-wrap"><div class="spinner"></div> লোড হচ্ছে...</div>';
  loadNotifs(el);
}

async function loadNotifs(el) {
  try {
    const snap=await db.ref('notifications').orderByChild('createdAt').limitToLast(30).once('value');
    if(!snap.exists()){el.innerHTML='<div class="empty-state">কোনো বিজ্ঞপ্তি নেই</div>';return;}
    const ns=[]; snap.forEach(c=>ns.push({id:c.key,...c.val()})); ns.reverse();
    el.innerHTML=ns.map(n=>`
      <div class="notif-item ${n.isNew?'unread':''}">
        <h4>${n.title||'বিজ্ঞপ্তি'}</h4>
        <p>${n.content||n.body||''}</p>
        <div class="notif-time">${fmtTime(n.createdAt)}</div>
      </div>`).join('');
  } catch(e){el.innerHTML='<div class="empty-state">লোড করতে সমস্যা হয়েছে</div>';}
}

function openChildDetail(kid) {
  db.ref('users/'+cUser.uid+'/children/'+kid).once('value').then(snap=>{
    if(!snap.exists()) return;
    const k=snap.val();
    openSheet(`
      <div style="text-align:center;margin-bottom:14px">
        <div style="font-size:56px">${k.gender==='মেয়ে'?'👧':'👦'}</div>
        <div style="color:#fff;font-size:20px;font-weight:700;margin-top:7px">${esc(k.name)}</div>
        <div style="color:rgba(255,255,255,.5);font-size:13px;margin-top:3px">${calcAge(k.dob)}</div>
      </div>
      <div class="info-row"><span class="ir-lbl">জন্ম তারিখ</span><span class="ir-val">${k.dob||'-'}</span></div>
      <div class="info-row"><span class="ir-lbl">লিঙ্গ</span><span class="ir-val">${k.gender}</span></div>
      <div class="info-row"><span class="ir-lbl">জন্ম ওজন</span><span class="ir-val">${k.birthWeight?k.birthWeight+' কেজি':'-'}</span></div>
      <div class="info-row"><span class="ir-lbl">জন্ম উচ্চতা</span><span class="ir-val">${k.birthHeight?k.birthHeight+' সেমি':'-'}</span></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:16px">
        <button onclick="closeSheet();openHealth()" class="btn-sm">💉 টিকা দেখুন</button>
        <button onclick="closeSheet();openDevelopment()" class="btn-sm">🌱 বিকাশ দেখুন</button>
      </div>`);
  });
}

// ══════════════════════════════════════════════════════
//  AI CHATBOT — Gemini API
// ══════════════════════════════════════════════════════
function toggleChat() {
  const panel=document.getElementById('chatPanel');
  if(panel.classList.contains('hidden')){
    panel.classList.remove('hidden');
    document.getElementById('chatInput')?.focus();
  } else {
    panel.classList.add('hidden');
  }
}

async function sendMsg() {
  const inp=document.getElementById('chatInput');
  const msg=inp?.value.trim();
  if(!msg) return;
  inp.value='';
  appendMsg(msg,'user');
  const loadId='load'+Date.now();
  appendMsg('টাইপ করছে...','bot',loadId);
  try {
    const sysPrompt=`আপনি FutFul Help Desk, একটি বাংলা ভাষার বিশেষজ্ঞ AI সহকারী। আপনি বিশেষভাবে শিশু যত্ন, মাতৃস্বাস্থ্য, শিশু পুষ্টি, টিকাদান কার্যক্রম, শিশু বিকাশ এবং মায়ের মানসিক স্বাস্থ্য বিষয়ে পরামর্শ দেন। সর্বদা বাংলায় উত্তর দিন। সালাম দিয়ে শুরু করুন (আস-সালামু আলাইকুম বা ওয়া আলাইকুমুস সালাম)। সংক্ষিপ্ত, স্পষ্ট এবং বন্ধুসুলভ হন। গুরুতর স্বাস্থ্য সমস্যায় সর্বদা ডাক্তারের পরামর্শ নেওয়ার কথা বলুন।`;
    const resp=await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_KEY}`,
      { method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ contents:[{role:'user',parts:[{text:sysPrompt+'\n\nপ্রশ্ন: '+msg}]}] })
      });
    if(resp.ok) {
      const data=await resp.json();
      const reply=data.candidates?.[0]?.content?.parts?.[0]?.text||fallbackReply(msg);
      updateMsg(loadId, reply);
    } else { updateMsg(loadId, fallbackReply(msg)); }
  } catch(e) { updateMsg(loadId, fallbackReply(msg)); }
}

function fallbackReply(msg) {
  const f=[
    'ওয়া আলাইকুমুস সালাম! শিশুর স্বাস্থ্য বিষয়ে আপনার প্রশ্নের জন্য ধন্যবাদ। গুরুতর কোনো সমস্যায় অবশ্যই একজন শিশু বিশেষজ্ঞের পরামর্শ নিন। 👩‍⚕️',
    'আস-সালামু আলাইকুম! নিয়মিত টিকাদান শিশুকে অনেক রোগ থেকে রক্ষা করে। বাংলাদেশের EPI কর্মসূচি অনুসরণ করুন। 💉',
    'ওয়া আলাইকুমুস সালাম! ৬ মাস পর্যন্ত শুধু বুকের দুধ শিশুর জন্য সর্বোত্তম। এরপর বয়স অনুযায়ী পরিপূরক খাবার শুরু করুন। 🍼',
    'আস-সালামু আলাইকুম! শিশুর জ্বর ৩৮°C এর বেশি হলে বা ৩ মাসের কম বয়সে যেকোনো জ্বরে দ্রুত ডাক্তার দেখান। 🌡️',
  ];
  return f[Math.floor(Math.random()*f.length)];
}

function appendMsg(txt, type, id='') {
  const c=document.getElementById('chatMsgs');
  if(!c) return;
  const d=document.createElement('div');
  d.className='msg '+type;
  if(id) d.id=id;
  d.innerHTML=`<div class="bubble">${txt}</div>`;
  c.appendChild(d);
  c.scrollTop=c.scrollHeight;
}

function updateMsg(id, txt) {
  const el=document.getElementById(id);
  if(el) el.innerHTML=`<div class="bubble">${txt.replace(/\n/g,'<br>')}</div>`;
  const c=document.getElementById('chatMsgs');
  if(c) c.scrollTop=c.scrollHeight;
}

// ══════════════════════════════════════════════════════
//  MODAL HELPERS
// ══════════════════════════════════════════════════════
function openSheet(html) {
  const bg=document.getElementById('sheetBg');
  const body=document.getElementById('sheetBody');
  if(bg&&body){ body.innerHTML=html; bg.classList.remove('hidden'); }
}
function closeSheet() { document.getElementById('sheetBg')?.classList.add('hidden'); }

function openFPM(title) {
  document.getElementById('fpmTitle').textContent=title;
  document.getElementById('fpmBody').innerHTML='';
  document.getElementById('fpm')?.classList.remove('hidden');
}
function closeFPM() { document.getElementById('fpm')?.classList.add('hidden'); }

// ══════════════════════════════════════════════════════
//  TOAST
// ══════════════════════════════════════════════════════
function toast(msg, type='') {
  const el=document.getElementById('toast');
  if(!el) return;
  el.textContent=msg;
  el.className='toast'+(type?' '+type:'');
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.classList.add('hidden'),3200);
}

// ══════════════════════════════════════════════════════
//  UTILITIES
// ══════════════════════════════════════════════════════
function fmtTime(ts) {
  if(!ts) return '';
  const d=new Date(ts), n=new Date(), diff=n-d;
  if(diff<60000) return 'এইমাত্র';
  if(diff<3600000) return Math.floor(diff/60000)+' মিনিট আগে';
  if(diff<86400000) return Math.floor(diff/3600000)+' ঘণ্টা আগে';
  if(diff<604800000) return Math.floor(diff/86400000)+' দিন আগে';
  return d.toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'});
}

function calcAge(dob) {
  if(!dob) return 'বয়স অজানা';
  const b=new Date(dob), n=new Date();
  let mo=(n.getFullYear()-b.getFullYear())*12+(n.getMonth()-b.getMonth());
  const days=Math.floor((n-b)/86400000);
  if(mo<1) return days+' দিন';
  if(mo<12) return mo+' মাস';
  const y=Math.floor(mo/12), rem=mo%12;
  return y+' বছর'+(rem>0?' '+rem+' মাস':'');
}

function esc(t) {
  if(!t) return '';
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
