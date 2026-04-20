// ╔══════════════════════════════════════════════════╗
// ║       FutFul Admin Panel — Complete JS           ║
// ╚══════════════════════════════════════════════════╝

const firebaseConfig = {
  apiKey: "AIzaSyCr2G8jyk_XfWgn7TSjBw3br3b9J1xWRH8",
  authDomain: "earning-bot-31c7d.firebaseapp.com",
  databaseURL: "https://earning-bot-31c7d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "earning-bot-31c7d",
  storageBucket: "earning-bot-31c7d.firebasestorage.app",
  messagingSenderId: "396666924900",
  appId: "1:396666924900:web:77a22669bd6c3e3ce6d471"
};
const ADMIN_UID   = "kW8tMNo8IkejWQsMzCnnwjgVaUa2";
const ADMIN_EMAIL = "totul01744@gmail.com";

firebase.initializeApp(firebaseConfig);
const auth    = firebase.auth();
const db      = firebase.database();
const storage = firebase.storage();

let aUser    = null;
let curPage  = 'dashboard';
let charts   = {};
let sbCollapsed = false;

// ══════════════════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  tickClock();
  setInterval(tickClock, 30000);
  auth.onAuthStateChanged(u => {
    if (u && (u.uid === ADMIN_UID || u.email === ADMIN_EMAIL)) {
      aUser = u;
      show('adminApp');
      hid('loginScreen');
      document.getElementById('sbAv').textContent  = (u.displayName || u.email || 'A').charAt(0).toUpperCase();
      document.getElementById('sbName').textContent = u.displayName || u.email;
      aPage('dashboard');
      loadNBadge();
    } else if (u) {
      auth.signOut();
      lgErr('এই অ্যাকাউন্টে অ্যাডমিন অ্যাক্সেস নেই');
    } else {
      show('loginScreen');
      hid('adminApp');
    }
  });
});

function tickClock() {
  const el = document.getElementById('ahClock');
  if (el) el.textContent = new Date().toLocaleString('bn-BD', { weekday:'short', hour:'2-digit', minute:'2-digit' });
}

// ══════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════
async function aLogin() {
  const email = document.getElementById('aEmail')?.value.trim();
  const pass  = document.getElementById('aPass')?.value;
  if (!email || !pass) return lgErr('ইমেইল ও পাসওয়ার্ড দিন');
  lgErr('');
  const btn = document.getElementById('loginBtn');
  if (btn) btn.textContent = 'লগইন হচ্ছে...';
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch(e) {
    lgErr(e.code === 'auth/wrong-password' ? 'পাসওয়ার্ড ভুল' : e.code === 'auth/user-not-found' ? 'ইমেইল পাওয়া যায়নি' : 'লগইন ব্যর্থ');
    if (btn) btn.textContent = 'লগইন করুন';
  }
}

function lgErr(msg) {
  const el = document.getElementById('lgErr');
  if (el) el.textContent = msg;
}

function tgPass() {
  const el = document.getElementById('aPass');
  const btn = document.getElementById('eyeBtn');
  if (!el) return;
  el.type = el.type === 'password' ? 'text' : 'password';
  if (btn) btn.textContent = el.type === 'password' ? '👁' : '🙈';
}

async function aLogout() {
  if (!confirm('অ্যাডমিন প্যানেল থেকে লগআউট করবেন?')) return;
  await auth.signOut();
  aUser = null;
  aTst('লগআউট হয়েছে');
}

// ══════════════════════════════════════════════════════
//  NAVIGATION
// ══════════════════════════════════════════════════════
function aPage(pg) {
  curPage = pg;
  document.querySelectorAll('.si').forEach(s => s.classList.remove('active'));
  const si = document.getElementById('si-' + pg);
  if (si) si.classList.add('active');
  const titles = {
    dashboard:'📊 ড্যাশবোর্ড', users:'👥 ব্যবহারকারী ব্যবস্থাপনা',
    community:'💬 কমিউনিটি মডারেশন', products:'🛍️ পণ্য ব্যবস্থাপনা',
    orders:'📦 অর্ডার ব্যবস্থাপনা', ebooks:'📚 ই-বুক ব্যবস্থাপনা',
    revenue:'💰 রাজস্ব ও পেমেন্ট', banners:'🖼️ ব্যানার ব্যবস্থাপনা',
    notifications:'🔔 বিজ্ঞপ্তি ব্যবস্থাপনা', health:'🏥 স্বাস্থ্য ও টিকা',
    points:'⭐ পয়েন্ট ব্যবস্থাপনা', analytics:'📈 বিশ্লেষণ ও রিপোর্ট',
    settings:'⚙️ সেটিংস ও কনফিগারেশন'
  };
  const titleEl = document.getElementById('pageTitle');
  if (titleEl) titleEl.textContent = titles[pg] || pg;
  // destroy old charts
  Object.values(charts).forEach(c => { try { c.destroy(); } catch(e){} });
  charts = {};
  const pages = { dashboard: pgDashboard, users: pgUsers, community: pgCommunity,
    products: pgProducts, orders: pgOrders, ebooks: pgEbooks, revenue: pgRevenue,
    banners: pgBanners, notifications: pgNotifications, health: pgHealth,
    points: pgPoints, analytics: pgAnalytics, settings: pgSettings };
  const fn = pages[pg];
  if (fn) fn(document.getElementById('aContent'));
  // close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar')?.classList.remove('mob-open');
  }
}

function toggleSB() {
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  if (window.innerWidth <= 768) {
    sb.classList.toggle('mob-open');
  } else {
    sbCollapsed = !sbCollapsed;
    sb.classList.toggle('collapsed', sbCollapsed);
  }
}

// ══════════════════════════════════════════════════════
//  DASHBOARD
// ══════════════════════════════════════════════════════
async function pgDashboard(el) {
  el.innerHTML = `
    <div class="stats-grid" id="statsGrid">
      ${['👥','👶','💬','🛍️','📦','⭐'].map(i=>`<div class="sc pk"><div class="sc-ico">${i}</div><div class="sc-val"><div class="spinner" style="width:16px;height:16px;display:inline-block"></div></div><div class="sc-lbl">লোড হচ্ছে...</div></div>`).join('')}
    </div>
    <div class="g2">
      <div class="chart-panel"><div class="chart-title">📊 মাসিক ব্যবহারকারী বৃদ্ধি</div><canvas id="userChart"></canvas></div>
      <div class="chart-panel"><div class="chart-title">💰 মাসিক রাজস্ব (৳)</div><canvas id="revChart"></canvas></div>
    </div>
    <div class="g2">
      <div class="panel"><div class="ph"><span class="ph-title">🕒 সাম্প্রতিক কার্যকলাপ</span></div><div class="pb" id="recentAct"><div class="spin-c"><div class="spinner"></div></div></div></div>
      <div class="panel"><div class="ph"><span class="ph-title">📦 সাম্প্রতিক অর্ডার</span><button class="btn btn-o btn-sm" onclick="aPage('orders')">সব দেখুন</button></div><div class="pb" id="recentOrders"><div class="spin-c"><div class="spinner"></div></div></div></div>
    </div>`;
  loadDashStats();
  loadDashCharts();
  loadRecentActivity();
  loadRecentOrders();
}

async function loadDashStats() {
  const grid = document.getElementById('statsGrid');
  if (!grid) return;
  try {
    const [uSnap, pSnap, postSnap, ordSnap] = await Promise.all([
      db.ref('users').once('value'),
      db.ref('products').once('value'),
      db.ref('posts').once('value'),
      db.ref('orders').once('value'),
    ]);
    const users    = uSnap.exists()    ? Object.keys(uSnap.val()).length : 0;
    const products = pSnap.exists()    ? Object.keys(pSnap.val()).length : 0;
    const posts    = postSnap.exists() ? Object.keys(postSnap.val()).length : 0;
    const orders   = ordSnap.exists()  ? Object.keys(ordSnap.val()).length : 0;
    let revenue = 0, kids = 0;
    if (ordSnap.exists()) ordSnap.forEach(c => { revenue += c.val().totalPrice || 0; });
    if (uSnap.exists()) {
      uSnap.forEach(c => {
        const d = c.val();
        if (d.children) kids += Object.keys(d.children).length;
      });
    }
    grid.innerHTML = [
      {ico:'👥', val:users,    lbl:'মোট ব্যবহারকারী', cls:'pk', chg:'+12% এই মাসে'},
      {ico:'👶', val:kids,     lbl:'শিশু প্রোফাইল',   cls:'pu', chg:'সক্রিয় প্রোফাইল'},
      {ico:'💬', val:posts,    lbl:'কমিউনিটি পোস্ট',  cls:'bl', chg:'মোট পোস্ট'},
      {ico:'🛍️', val:products, lbl:'মোট পণ্য',        cls:'te', chg:'সক্রিয় পণ্য'},
      {ico:'📦', val:orders,   lbl:'মোট অর্ডার',      cls:'or', chg:'সব অর্ডার'},
      {ico:'💰', val:'৳'+revenue.toLocaleString('bn-BD'), lbl:'মোট রাজস্ব', cls:'re', chg:'সব সময়ের'},
    ].map(s => `
      <div class="sc ${s.cls}">
        <div class="sc-ico">${s.ico}</div>
        <div class="sc-val">${s.val}</div>
        <div class="sc-lbl">${s.lbl}</div>
        <div class="sc-chg up">${s.chg}</div>
      </div>`).join('');
  } catch(e) { grid.innerHTML = '<div class="empty-s">ডেটা লোড করতে সমস্যা হয়েছে</div>'; }
}

function loadDashCharts() {
  const months = ['জান', 'ফেব', 'মার', 'এপ্রি', 'মে', 'জুন', 'জুলাই', 'আগ', 'সেপ', 'অক্টো', 'নভে', 'ডিসে'];
  const cur = new Date().getMonth();
  const lbls = Array.from({length:6}, (_, i) => months[(cur - 5 + i + 12) % 12]);
  const opts = { responsive:true, plugins:{ legend:{display:false} }, scales:{ x:{grid:{color:'rgba(255,255,255,.06)'}, ticks:{color:'rgba(255,255,255,.5)',font:{size:11}}}, y:{grid:{color:'rgba(255,255,255,.06)'}, ticks:{color:'rgba(255,255,255,.5)',font:{size:11}}} } };

  const uc = document.getElementById('userChart');
  if (uc) charts.user = new Chart(uc, { type:'line', data:{ labels:lbls, datasets:[{ data:[18,24,31,40,52,61], borderColor:'#ff6b9d', backgroundColor:'rgba(255,107,157,.12)', fill:true, tension:.4, pointBackgroundColor:'#ff6b9d' }] }, options:opts });

  const rc = document.getElementById('revChart');
  if (rc) charts.rev = new Chart(rc, { type:'bar', data:{ labels:lbls, datasets:[{ data:[4200,5800,7100,8900,11200,13500], backgroundColor:'rgba(199,125,255,.7)', borderRadius:6 }] }, options:opts });
}

async function loadRecentActivity() {
  const el = document.getElementById('recentAct');
  if (!el) return;
  try {
    const [uSnap, oSnap, pSnap] = await Promise.all([
      db.ref('users').orderByChild('createdAt').limitToLast(3).once('value'),
      db.ref('orders').orderByChild('createdAt').limitToLast(3).once('value'),
      db.ref('posts').orderByChild('createdAt').limitToLast(2).once('value'),
    ]);
    const acts = [];
    if (uSnap.exists())  uSnap.forEach(c  => acts.push({dot:'pk', txt:`<b>${c.val().name||'নতুন ব্যবহারকারী'}</b> রেজিস্ট্রেশন করেছেন`, t:c.val().createdAt}));
    if (oSnap.exists())  oSnap.forEach(c  => acts.push({dot:'or', txt:`নতুন অর্ডার — <b>৳${c.val().totalPrice||0}</b>`, t:c.val().createdAt}));
    if (pSnap.exists())  pSnap.forEach(c  => acts.push({dot:'bl', txt:`<b>${c.val().authorName||'ব্যবহারকারী'}</b> পোস্ট করেছেন`, t:c.val().createdAt}));
    acts.sort((a, b) => b.t - a.t);
    el.innerHTML = acts.slice(0, 8).map(a => `<div class="act-item"><div class="act-dot ${a.dot}"></div><div class="act-txt">${a.txt}</div><div class="act-time">${fmtT(a.t)}</div></div>`).join('') || '<div class="empty-s">কোনো কার্যকলাপ নেই</div>';
  } catch(e) { el.innerHTML = '<div class="empty-s">লোড করতে সমস্যা হয়েছে</div>'; }
}

async function loadRecentOrders() {
  const el = document.getElementById('recentOrders');
  if (!el) return;
  try {
    const snap = await db.ref('orders').orderByChild('createdAt').limitToLast(5).once('value');
    if (!snap.exists()) { el.innerHTML = '<div class="empty-s">কোনো অর্ডার নেই</div>'; return; }
    const ords = [];
    snap.forEach(c => ords.push({ id:c.key, ...c.val() }));
    ords.reverse();
    el.innerHTML = `<table class="tbl"><thead><tr><th>অর্ডার</th><th>ক্রেতা</th><th>মূল্য</th><th>স্ট্যাটাস</th></tr></thead><tbody>
      ${ords.map(o => `<tr>
        <td>#${o.id.slice(-5).toUpperCase()}</td>
        <td>${esc(o.userName||'অজানা')}</td>
        <td>৳${o.totalPrice||0}</td>
        <td>${statusBdg(o.status)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  } catch(e) { el.innerHTML = '<div class="empty-s">লোড করতে সমস্যা হয়েছে</div>'; }
}

// ══════════════════════════════════════════════════════
//  USERS
// ══════════════════════════════════════════════════════
let allUsers = [];
async function pgUsers(el) {
  el.innerHTML = `
    <div class="pg-hdr">
      <h2>👥 ব্যবহারকারী তালিকা</h2>
      <button class="btn btn-p" onclick="exportUsers()">📥 CSV রপ্তানি</button>
    </div>
    <div class="fbar">
      <input type="text" class="srch" id="uSrch" placeholder="নাম বা ইমেইল দিয়ে খুঁজুন..." oninput="filterUsers(this.value)">
      <select class="fsel" onchange="filterUsers(document.getElementById('uSrch').value)">
        <option>সব ব্যবহারকারী</option>
        <option>আজ যোগ দিয়েছেন</option>
        <option>এই সপ্তাহে</option>
      </select>
    </div>
    <div class="panel"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>ব্যবহারকারী</th><th>ইমেইল</th><th>ফোন</th><th>পয়েন্ট</th><th>যোগদান</th><th>অ্যাকশন</th></tr></thead>
      <tbody id="uTable"><tr><td colspan="6" class="spin-c"><div class="spinner"></div> লোড হচ্ছে...</td></tr></tbody>
    </table></div></div>
    <div class="pag" id="uPag"></div>`;
  await loadUsers();
}

async function loadUsers() {
  try {
    const snap = await db.ref('users').once('value');
    allUsers = [];
    if (snap.exists()) snap.forEach(c => allUsers.push({ id:c.key, ...c.val() }));
    allUsers.sort((a, b) => (b.createdAt||0) - (a.createdAt||0));
    renderUsers(allUsers);
  } catch(e) { const t = document.getElementById('uTable'); if(t) t.innerHTML = '<tr><td colspan="6" class="empty-s">লোড করতে সমস্যা হয়েছে</td></tr>'; }
}

function filterUsers(term) {
  const filtered = term ? allUsers.filter(u => (u.name||'').toLowerCase().includes(term.toLowerCase()) || (u.email||'').toLowerCase().includes(term.toLowerCase()) || (u.phone||'').includes(term)) : allUsers;
  renderUsers(filtered);
}

function renderUsers(list) {
  const t = document.getElementById('uTable');
  if (!t) return;
  if (!list.length) { t.innerHTML = '<tr><td colspan="6" class="empty-s">কোনো ব্যবহারকারী পাওয়া যায়নি</td></tr>'; return; }
  t.innerHTML = list.map(u => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:9px"><div class="u-av">${(u.name||'U').charAt(0)}</div><div><div style="font-weight:600">${esc(u.name||'অজানা')}</div></div></div></td>
      <td style="color:rgba(255,255,255,.6);font-size:12px">${esc(u.email||'-')}</td>
      <td style="color:rgba(255,255,255,.6);font-size:12px">${u.phone||'-'}</td>
      <td><span class="bdg bdg-g">${u.points||0}</span></td>
      <td style="color:rgba(255,255,255,.5);font-size:12px">${fmtDate(u.createdAt)}</td>
      <td>
        <div style="display:flex;gap:5px">
          <button class="btn btn-b btn-xs" onclick="viewUser('${u.id}')">দেখুন</button>
          <button class="btn btn-d btn-xs" onclick="deleteUser('${u.id}','${esc(u.name||'')}')">মুছুন</button>
        </div>
      </td>
    </tr>`).join('');
}

async function viewUser(uid) {
  const snap = await db.ref('users/' + uid).once('value');
  if (!snap.exists()) return;
  const u = snap.val();
  const kids = u.children ? Object.values(u.children) : [];
  const ptHist = u.pointHistory ? Object.values(u.pointHistory).slice(-5) : [];
  openAModal(`
    <div class="a-modal-title">👤 ব্যবহারকারী বিবরণ</div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div class="sb-av" style="width:44px;height:44px;font-size:18px">${(u.name||'U').charAt(0)}</div>
      <div><div style="font-size:17px;font-weight:700">${esc(u.name||'অজানা')}</div><div style="color:rgba(255,255,255,.5);font-size:13px">${u.email||''}</div></div>
    </div>
    <div class="ir"><span class="ir-l">ফোন</span><span class="ir-r">${u.phone||'-'}</span></div>
    <div class="ir"><span class="ir-l">পয়েন্ট</span><span class="ir-r text-te fw7">${u.points||0}</span></div>
    <div class="ir"><span class="ir-l">যোগদান</span><span class="ir-r">${fmtDate(u.createdAt)}</span></div>
    <div class="ir"><span class="ir-l">শিশু সংখ্যা</span><span class="ir-r">${kids.length}</span></div>
    ${kids.length ? `<div style="margin-top:12px"><div style="color:rgba(255,255,255,.55);font-size:12px;margin-bottom:8px">শিশুসমূহ:</div>${kids.map(k=>`<div style="background:rgba(255,255,255,.05);border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:13px">${k.gender==='মেয়ে'?'👧':'👦'} ${esc(k.name||'')} — ${calcAgeA(k.dob)}</div>`).join('')}</div>` : ''}
    <div style="margin-top:14px">
      <div class="fg2"><label>ম্যানুয়াল পয়েন্ট যোগ/বিয়োগ</label>
        <div style="display:flex;gap:8px">
          <input type="number" class="ai" id="manPts" placeholder="যেমন: 50 বা -10" style="flex:1">
          <button class="btn btn-p" onclick="addPtsManual('${uid}')">প্রয়োগ করুন</button>
        </div>
      </div>
    </div>
    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-d w100" onclick="deleteUser('${uid}','${esc(u.name||'')}')">🗑️ ব্যবহারকারী মুছুন</button>
      <button class="btn btn-o w100" onclick="closeAModal()">বন্ধ করুন</button>
    </div>`);
}

async function addPtsManual(uid) {
  const pts = parseInt(document.getElementById('manPts')?.value || '0');
  if (!pts) return aTst('পয়েন্ট সংখ্যা দিন', 'warn');
  try {
    await db.ref('users/' + uid + '/points').transaction(p => (p || 0) + pts);
    await db.ref('users/' + uid + '/pointHistory').push({ type:'admin_adjust', points:pts, desc:'অ্যাডমিন কর্তৃক সমন্বয়', date:Date.now() });
    aTst((pts > 0 ? '+' : '') + pts + ' পয়েন্ট প্রয়োগ হয়েছে ✓', 'ok');
    closeAModal();
  } catch(e) { aTst('সমস্যা হয়েছে', 'err'); }
}

async function deleteUser(uid, name) {
  if (!confirm(`"${name}" ব্যবহারকারী মুছে ফেলবেন?`)) return;
  try {
    await db.ref('users/' + uid).remove();
    aTst('ব্যবহারকারী মুছে ফেলা হয়েছে', 'ok');
    closeAModal();
    loadUsers();
  } catch(e) { aTst('মুছতে সমস্যা হয়েছে', 'err'); }
}

function exportUsers() {
  if (!allUsers.length) return aTst('কোনো ডেটা নেই', 'warn');
  const rows = [['নাম','ইমেইল','ফোন','পয়েন্ট','যোগদান তারিখ']];
  allUsers.forEach(u => rows.push([u.name||'', u.email||'', u.phone||'', u.points||0, fmtDate(u.createdAt)]));
  const csv = rows.map(r => r.join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
  a.download = 'futful_users_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  aTst('CSV ডাউনলোড হচ্ছে ✓', 'ok');
}

// ══════════════════════════════════════════════════════
//  COMMUNITY
// ══════════════════════════════════════════════════════
let allPosts = [];
async function pgCommunity(el) {
  el.innerHTML = `
    <div class="pg-hdr"><h2>💬 কমিউনিটি মডারেশন</h2></div>
    <div class="stats-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="sc bl"><div class="sc-ico">📝</div><div class="sc-val" id="cTotalPosts">—</div><div class="sc-lbl">মোট পোস্ট</div></div>
      <div class="sc te"><div class="sc-ico">✅</div><div class="sc-val" id="cApproved">—</div><div class="sc-lbl">অনুমোদিত</div></div>
      <div class="sc re"><div class="sc-ico">🚫</div><div class="sc-val" id="cRejected">—</div><div class="sc-lbl">প্রত্যাখ্যাত</div></div>
    </div>
    <div class="fbar">
      <input type="text" class="srch" id="postSrch" placeholder="পোস্ট বা লেখক খুঁজুন..." oninput="filterPosts2(this.value)">
      <select class="fsel" id="postFilter" onchange="filterPosts2(document.getElementById('postSrch').value)">
        <option value="all">সব পোস্ট</option>
        <option value="approved">অনুমোদিত</option>
        <option value="pending">অপেক্ষমান</option>
        <option value="rejected">প্রত্যাখ্যাত</option>
      </select>
    </div>
    <div class="panel"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>লেখক</th><th>পোস্টের বিষয়বস্তু</th><th>লাইক</th><th>সময়</th><th>স্ট্যাটাস</th><th>অ্যাকশন</th></tr></thead>
      <tbody id="postTable"><tr><td colspan="6" class="spin-c"><div class="spinner"></div></td></tr></tbody>
    </table></div></div>`;
  await loadPosts2();
}

async function loadPosts2() {
  try {
    const snap = await db.ref('posts').orderByChild('createdAt').limitToLast(100).once('value');
    allPosts = [];
    if (snap.exists()) snap.forEach(c => allPosts.push({ id:c.key, ...c.val() }));
    allPosts.reverse();
    const total = allPosts.length;
    const approved = allPosts.filter(p => p.status === 'approved').length;
    const rejected = allPosts.filter(p => p.status === 'rejected').length;
    const setV = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
    setV('cTotalPosts', total); setV('cApproved', approved); setV('cRejected', rejected);
    filterPosts2('');
  } catch(e) {}
}

function filterPosts2(term) {
  const filter = document.getElementById('postFilter')?.value || 'all';
  let list = filter === 'all' ? allPosts : allPosts.filter(p => p.status === filter);
  if (term) list = list.filter(p => (p.content||'').toLowerCase().includes(term.toLowerCase()) || (p.authorName||'').includes(term));
  const t = document.getElementById('postTable');
  if (!t) return;
  if (!list.length) { t.innerHTML = '<tr><td colspan="6" class="empty-s">কোনো পোস্ট পাওয়া যায়নি</td></tr>'; return; }
  t.innerHTML = list.map(p => `
    <tr>
      <td><div style="display:flex;align-items:center;gap:8px"><div class="u-av">${(p.authorName||'আ').charAt(0)}</div>${esc(p.authorName||'অজানা')}</div></td>
      <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:rgba(255,255,255,.7);font-size:12px">${esc((p.content||'').slice(0,80))}${p.content?.length>80?'...':''}</td>
      <td><span class="bdg bdg-pk">❤️ ${p.likes||0}</span></td>
      <td style="color:rgba(255,255,255,.5);font-size:12px">${fmtT(p.createdAt)}</td>
      <td>${postStatusBdg(p.status)}</td>
      <td><div style="display:flex;gap:4px">
        <button class="btn btn-s btn-xs" onclick="modPost('${p.id}','approved')" title="অনুমোদন">✓</button>
        <button class="btn btn-d btn-xs" onclick="modPost('${p.id}','rejected')" title="প্রত্যাখ্যান">✕</button>
        <button class="btn btn-d btn-xs" onclick="delPost2('${p.id}')" title="মুছুন">🗑️</button>
      </div></td>
    </tr>`).join('');
}

async function modPost(pid, status) {
  try {
    await db.ref('posts/' + pid + '/status').set(status);
    aTst(status === 'approved' ? 'পোস্ট অনুমোদিত হয়েছে ✓' : 'পোস্ট প্রত্যাখ্যাত হয়েছে', 'ok');
    await loadPosts2();
  } catch(e) { aTst('সমস্যা হয়েছে', 'err'); }
}

async function delPost2(pid) {
  if (!confirm('এই পোস্ট মুছে ফেলবেন?')) return;
  try {
    await db.ref('posts/' + pid).remove();
    aTst('পোস্ট মুছে ফেলা হয়েছে', 'ok');
    await loadPosts2();
  } catch(e) { aTst('সমস্যা হয়েছে', 'err'); }
}

// ══════════════════════════════════════════════════════
//  PRODUCTS
// ══════════════════════════════════════════════════════
let allProdsA = [];
async function pgProducts(el) {
  el.innerHTML = `
    <div class="pg-hdr">
      <h2>🛍️ পণ্য তালিকা</h2>
      <button class="btn btn-p" onclick="openAddProduct()">➕ নতুন পণ্য যোগ করুন</button>
    </div>
    <div class="fbar">
      <input type="text" class="srch" id="prodSrch" placeholder="পণ্য খুঁজুন..." oninput="filterProdsA(this.value)">
      <select class="fsel" onchange="filterProdsA(document.getElementById('prodSrch').value)">
        <option value="all">সব ক্যাটাগরি</option>
        <option value="শিশু খাবার">শিশু খাবার</option>
        <option value="শিশু যত্ন">শিশু যত্ন</option>
        <option value="স্বাস্থ্য">স্বাস্থ্য</option>
        <option value="খেলনা">খেলনা</option>
        <option value="ফ্যাশন">ফ্যাশন</option>
      </select>
    </div>
    <div id="prodGridA" class="prod-grid-a"><div class="spin-c"><div class="spinner"></div> লোড হচ্ছে...</div></div>`;
  await loadProdsA();
}

async function loadProdsA() {
  try {
    const snap = await db.ref('products').once('value');
    allProdsA = [];
    if (snap.exists()) snap.forEach(c => allProdsA.push({ id:c.key, ...c.val() }));
    filterProdsA('');
  } catch(e) { renderProdsA([]); }
}

function filterProdsA(term) {
  const cat = document.querySelector('#prodSrch')?.closest('.a-content')?.querySelector('.fsel')?.value || 'all';
  let list = allProdsA;
  if (cat !== 'all') list = list.filter(p => p.category === cat);
  if (term) list = list.filter(p => (p.name||'').toLowerCase().includes(term.toLowerCase()));
  renderProdsA(list);
}

function renderProdsA(list) {
  const el = document.getElementById('prodGridA');
  if (!el) return;
  if (!list.length) { el.innerHTML = '<div class="empty-s">কোনো পণ্য পাওয়া যায়নি</div>'; return; }
  el.innerHTML = list.map(p => `
    <div class="pca">
      <div class="pca-img">${p.emoji||'🛍️'}</div>
      <div class="pca-body">
        <div class="pca-nm">${esc(p.name)}</div>
        <div class="pca-pr">৳${p.price||0}</div>
        <div class="pca-stk">স্টক: ${p.stock||0} • ${p.category||''}</div>
        <div class="pca-acts">
          <button class="btn btn-b btn-sm" onclick="openEditProduct('${p.id}')">✏️ সম্পাদনা</button>
          <button class="btn btn-d btn-sm" onclick="deleteProd('${p.id}','${esc(p.name)}')">🗑️</button>
          <label class="tog" title="${p.active!==false?'সক্রিয়':'নিষ্ক্রিয়'}">
            <input type="checkbox" ${p.active!==false?'checked':''} onchange="toggleProd('${p.id}',this.checked)">
            <span class="tog-sl"></span>
          </label>
        </div>
      </div>
    </div>`).join('');
}

function openAddProduct() {
  openAModal(`
    <div class="a-modal-title">➕ নতুন পণ্য যোগ করুন</div>
    <div class="frow">
      <div class="fg2"><label>পণ্যের নাম</label><input type="text" class="ai" id="pNm" placeholder="পণ্যের নাম"></div>
      <div class="fg2"><label>ক্যাটাগরি</label>
        <select class="ai" id="pCat">
          <option>শিশু খাবার</option><option>শিশু যত্ন</option><option>স্বাস্থ্য</option><option>খেলনা</option><option>ফ্যাশন</option>
        </select>
      </div>
    </div>
    <div class="frow">
      <div class="fg2"><label>মূল্য (৳)</label><input type="number" class="ai" id="pPr" placeholder="250"></div>
      <div class="fg2"><label>স্টক পরিমাণ</label><input type="number" class="ai" id="pStk" placeholder="50"></div>
    </div>
    <div class="frow">
      <div class="fg2"><label>ইমোজি আইকন</label><input type="text" class="ai" id="pEm" placeholder="🍼" maxlength="4"></div>
      <div class="fg2"><label>রেটিং (১-৫)</label><input type="number" class="ai" id="pRt" placeholder="4.5" min="1" max="5" step="0.1"></div>
    </div>
    <div class="fg2"><label>পণ্যের বিবরণ</label><textarea class="ai" id="pDs" placeholder="পণ্যের বিস্তারিত বিবরণ..." rows="3"></textarea></div>
    <div class="frow">
      <button class="btn btn-p w100" onclick="saveProd(null)">✅ সংরক্ষণ করুন</button>
      <button class="btn btn-o w100" onclick="closeAModal()">বাতিল করুন</button>
    </div>`);
}

function openEditProduct(id) {
  const p = allProdsA.find(x => x.id === id);
  if (!p) return;
  openAModal(`
    <div class="a-modal-title">✏️ পণ্য সম্পাদনা</div>
    <div class="frow">
      <div class="fg2"><label>পণ্যের নাম</label><input type="text" class="ai" id="pNm" value="${esc(p.name||'')}"></div>
      <div class="fg2"><label>ক্যাটাগরি</label>
        <select class="ai" id="pCat">
          ${['শিশু খাবার','শিশু যত্ন','স্বাস্থ্য','খেলনা','ফ্যাশন'].map(c=>`<option ${p.category===c?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="frow">
      <div class="fg2"><label>মূল্য (৳)</label><input type="number" class="ai" id="pPr" value="${p.price||0}"></div>
      <div class="fg2"><label>স্টক পরিমাণ</label><input type="number" class="ai" id="pStk" value="${p.stock||0}"></div>
    </div>
    <div class="frow">
      <div class="fg2"><label>ইমোজি আইকন</label><input type="text" class="ai" id="pEm" value="${p.emoji||'🛍️'}" maxlength="4"></div>
      <div class="fg2"><label>রেটিং</label><input type="number" class="ai" id="pRt" value="${p.rating||4.0}" min="1" max="5" step="0.1"></div>
    </div>
    <div class="fg2"><label>বিবরণ</label><textarea class="ai" id="pDs" rows="3">${esc(p.description||'')}</textarea></div>
    <div class="frow">
      <button class="btn btn-p w100" onclick="saveProd('${id}')">✅ আপডেট করুন</button>
      <button class="btn btn-o w100" onclick="closeAModal()">বাতিল করুন</button>
    </div>`);
}

async function saveProd(id) {
  const nm  = document.getElementById('pNm')?.value.trim();
  const cat = document.getElementById('pCat')?.value;
  const pr  = parseFloat(document.getElementById('pPr')?.value) || 0;
  const stk = parseInt(document.getElementById('pStk')?.value) || 0;
  const em  = document.getElementById('pEm')?.value.trim() || '🛍️';
  const rt  = parseFloat(document.getElementById('pRt')?.value) || 4.0;
  const ds  = document.getElementById('pDs')?.value.trim();
  if (!nm) return aTst('পণ্যের নাম দিন', 'warn');
  const data = { name:nm, category:cat, price:pr, stock:stk, emoji:em, rating:rt, description:ds, active:true, updatedAt:Date.now() };
  try {
    if (id) { await db.ref('products/' + id).update(data); aTst('পণ্য আপডেট হয়েছে ✓', 'ok'); }
    else { data.createdAt = Date.now(); await db.ref('products').push(data); aTst('পণ্য যোগ হয়েছে ✓', 'ok'); }
    closeAModal();
    await loadProdsA();
  } catch(e) { aTst('সংরক্ষণ করতে সমস্যা হয়েছে', 'err'); }
}

async function deleteProd(id, name) {
  if (!confirm(`"${name}" পণ্য মুছে ফেলবেন?`)) return;
  try {
    await db.ref('products/' + id).remove();
    aTst('পণ্য মুছে ফেলা হয়েছে', 'ok');
    await loadProdsA();
  } catch(e) { aTst('মুছতে সমস্যা হয়েছে', 'err'); }
}

async function toggleProd(id, active) {
  await db.ref('products/' + id + '/active').set(active);
  aTst(active ? 'পণ্য সক্রিয় করা হয়েছে' : 'পণ্য নিষ্ক্রিয় করা হয়েছে', 'ok');
}

// ══════════════════════════════════════════════════════
//  ORDERS
// ══════════════════════════════════════════════════════
async function pgOrders(el) {
  el.innerHTML = `
    <div class="pg-hdr"><h2>📦 অর্ডার ব্যবস্থাপনা</h2></div>
    <div class="stats-grid" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="sc or"><div class="sc-ico">⏳</div><div class="sc-val" id="oPending">—</div><div class="sc-lbl">অপেক্ষমান</div></div>
      <div class="sc bl"><div class="sc-ico">⚙️</div><div class="sc-val" id="oProcess">—</div><div class="sc-lbl">প্রক্রিয়াধীন</div></div>
      <div class="sc pu"><div class="sc-ico">🚚</div><div class="sc-val" id="oShipped">—</div><div class="sc-lbl">শিপড</div></div>
      <div class="sc te"><div class="sc-ico">✅</div><div class="sc-val" id="oDelivered">—</div><div class="sc-lbl">ডেলিভারড</div></div>
    </div>
    <div class="fbar">
      <input type="text" class="srch" id="ordSrch" placeholder="অর্ডার ID বা ক্রেতার নাম..." oninput="filterOrders(this.value)">
      <select class="fsel" id="ordFilter" onchange="filterOrders(document.getElementById('ordSrch').value)">
        <option value="all">সব স্ট্যাটাস</option>
        <option value="pending">অপেক্ষমান</option>
        <option value="processing">প্রক্রিয়াধীন</option>
        <option value="shipped">শিপড</option>
        <option value="delivered">ডেলিভারড</option>
        <option value="cancelled">বাতিল</option>
      </select>
    </div>
    <div class="panel"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>অর্ডার ID</th><th>ক্রেতা</th><th>পণ্যসমূহ</th><th>মোট</th><th>ঠিকানা</th><th>তারিখ</th><th>স্ট্যাটাস</th><th>অ্যাকশন</th></tr></thead>
      <tbody id="ordTable"><tr><td colspan="8" class="spin-c"><div class="spinner"></div></td></tr></tbody>
    </table></div></div>`;
  await loadOrders();
}

let allOrders = [];
async function loadOrders() {
  try {
    const snap = await db.ref('orders').orderByChild('createdAt').limitToLast(100).once('value');
    allOrders = [];
    if (snap.exists()) snap.forEach(c => allOrders.push({ id:c.key, ...c.val() }));
    allOrders.reverse();
    const cnt = (s) => allOrders.filter(o => o.status === s).length;
    const sv = (id, v) => { const e=document.getElementById(id); if(e) e.textContent=v; };
    sv('oPending', cnt('pending')); sv('oProcess', cnt('processing'));
    sv('oShipped', cnt('shipped')); sv('oDelivered', cnt('delivered'));
    filterOrders('');
  } catch(e) {}
}

function filterOrders(term) {
  const f = document.getElementById('ordFilter')?.value || 'all';
  let list = f === 'all' ? allOrders : allOrders.filter(o => o.status === f);
  if (term) list = list.filter(o => o.id.toLowerCase().includes(term.toLowerCase()) || (o.userName||'').includes(term) || (o.phone||'').includes(term));
  const t = document.getElementById('ordTable');
  if (!t) return;
  if (!list.length) { t.innerHTML = '<tr><td colspan="8" class="empty-s">কোনো অর্ডার পাওয়া যায়নি</td></tr>'; return; }
  t.innerHTML = list.map(o => `
    <tr>
      <td style="font-weight:700;color:var(--pk)">#${o.id.slice(-6).toUpperCase()}</td>
      <td>${esc(o.userName||'অজানা')}</td>
      <td style="font-size:12px;color:rgba(255,255,255,.6)">${(o.products||[]).map(p=>p.name).join(', ').slice(0,40)}...</td>
      <td><span class="fw7 text-te">৳${o.totalPrice||0}</span></td>
      <td style="font-size:11px;color:rgba(255,255,255,.5);max-width:120px;overflow:hidden;text-overflow:ellipsis">${esc((o.address||'').slice(0,40))}</td>
      <td style="font-size:12px;color:rgba(255,255,255,.5)">${fmtDate(o.createdAt)}</td>
      <td>${statusBdg(o.status)}</td>
      <td>
        <select class="fsel" style="padding:4px 8px;font-size:11px" onchange="updateOrderStatus('${o.id}',this.value)">
          ${['pending','processing','shipped','delivered','cancelled'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${{pending:'অপেক্ষমান',processing:'প্রক্রিয়াধীন',shipped:'শিপড',delivered:'ডেলিভারড',cancelled:'বাতিল'}[s]}</option>`).join('')}
        </select>
      </td>
    </tr>`).join('');
}

async function updateOrderStatus(oid, status) {
  try {
    await db.ref('orders/' + oid + '/status').set(status);
    aTst('অর্ডার স্ট্যাটাস আপডেট হয়েছে ✓', 'ok');
    await loadOrders();
  } catch(e) { aTst('আপডেট করতে সমস্যা হয়েছে', 'err'); }
}

// ══════════════════════════════════════════════════════
//  EBOOKS
// ══════════════════════════════════════════════════════
async function pgEbooks(el) {
  el.innerHTML = `
    <div class="pg-hdr"><h2>📚 ই-বুক ব্যবস্থাপনা</h2><button class="btn btn-p" onclick="openAddEbook()">➕ নতুন ই-বুক যোগ</button></div>
    <div id="ebookTable"><div class="spin-c"><div class="spinner"></div></div></div>`;
  await loadEbooksA();
}

async function loadEbooksA() {
  const el = document.getElementById('ebookTable');
  if (!el) return;
  try {
    const snap = await db.ref('ebooks').once('value');
    if (!snap.exists()) { el.innerHTML = `<div class="empty-s">কোনো ই-বুক নেই। <button class="btn btn-p btn-sm" onclick="openAddEbook()">প্রথমটি যোগ করুন</button></div>`; return; }
    const books = [];
    snap.forEach(c => books.push({ id:c.key, ...c.val() }));
    el.innerHTML = `<div class="panel"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>কভার</th><th>শিরোনাম</th><th>বিভাগ</th><th>ডাউনলোড</th><th>স্ট্যাটাস</th><th>অ্যাকশন</th></tr></thead>
      <tbody>${books.map(b=>`<tr>
        <td style="font-size:28px">${b.emoji||'📖'}</td>
        <td><div style="font-weight:600">${esc(b.title||'')}</div><div style="color:rgba(255,255,255,.5);font-size:12px">${esc(b.description||'').slice(0,50)}</div></td>
        <td><span class="bdg bdg-b">${b.category||'সাধারণ'}</span></td>
        <td><span class="bdg bdg-g">${b.downloads||0} বার</span></td>
        <td><span class="bdg ${b.free!==false?'bdg-g':'bdg-o'}">${b.free!==false?'বিনামূল্যে':'পেইড'}</span></td>
        <td><div style="display:flex;gap:5px">
          <button class="btn btn-b btn-xs" onclick="openEditEbook('${b.id}')">✏️</button>
          <button class="btn btn-d btn-xs" onclick="deleteEbook('${b.id}','${esc(b.title||'')}')">🗑️</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  } catch(e) { el.innerHTML = '<div class="empty-s">লোড করতে সমস্যা হয়েছে</div>'; }
}

function openAddEbook() {
  openAModal(`
    <div class="a-modal-title">📚 নতুন ই-বুক যোগ করুন</div>
    <div class="fg2"><label>শিরোনাম</label><input type="text" class="ai" id="ebTt" placeholder="ই-বুকের শিরোনাম"></div>
    <div class="frow">
      <div class="fg2"><label>বিভাগ</label><select class="ai" id="ebCat"><option>স্বাস্থ্য</option><option>পুষ্টি</option><option>বিকাশ</option><option>মাতৃত্ব</option><option>সাধারণ</option></select></div>
      <div class="fg2"><label>ইমোজি</label><input type="text" class="ai" id="ebEm" placeholder="📖" maxlength="4"></div>
    </div>
    <div class="fg2"><label>বিবরণ</label><textarea class="ai" id="ebDs" rows="2" placeholder="সংক্ষিপ্ত বিবরণ..."></textarea></div>
    <div class="fg2"><label>PDF লিংক (Google Drive / Direct URL)</label><input type="url" class="ai" id="ebUrl" placeholder="https://drive.google.com/..."></div>
    <div class="fg2"><label>বিভাগ</label>
      <label class="tog" style="display:inline-flex;align-items:center;gap:9px"><input type="checkbox" id="ebFree" checked><span class="tog-sl"></span><span style="font-size:13px">বিনামূল্যে</span></label>
    </div>
    <div class="frow">
      <button class="btn btn-p w100" onclick="saveEbook(null)">✅ সংরক্ষণ করুন</button>
      <button class="btn btn-o w100" onclick="closeAModal()">বাতিল করুন</button>
    </div>`);
}

function openEditEbook(id) {
  db.ref('ebooks/' + id).once('value').then(snap => {
    if (!snap.exists()) return;
    const b = snap.val();
    openAModal(`
      <div class="a-modal-title">✏️ ই-বুক সম্পাদনা</div>
      <div class="fg2"><label>শিরোনাম</label><input type="text" class="ai" id="ebTt" value="${esc(b.title||'')}"></div>
      <div class="frow">
        <div class="fg2"><label>বিভাগ</label><select class="ai" id="ebCat">${['স্বাস্থ্য','পুষ্টি','বিকাশ','মাতৃত্ব','সাধারণ'].map(c=>`<option ${b.category===c?'selected':''}>${c}</option>`).join('')}</select></div>
        <div class="fg2"><label>ইমোজি</label><input type="text" class="ai" id="ebEm" value="${b.emoji||'📖'}" maxlength="4"></div>
      </div>
      <div class="fg2"><label>বিবরণ</label><textarea class="ai" id="ebDs" rows="2">${esc(b.description||'')}</textarea></div>
      <div class="fg2"><label>PDF লিংক</label><input type="url" class="ai" id="ebUrl" value="${b.fileUrl||''}"></div>
      <div class="frow">
        <button class="btn btn-p w100" onclick="saveEbook('${id}')">✅ আপডেট করুন</button>
        <button class="btn btn-o w100" onclick="closeAModal()">বাতিল করুন</button>
      </div>`);
  });
}

async function saveEbook(id) {
  const tt  = document.getElementById('ebTt')?.value.trim();
  const cat = document.getElementById('ebCat')?.value;
  const em  = document.getElementById('ebEm')?.value.trim() || '📖';
  const ds  = document.getElementById('ebDs')?.value.trim();
  const url = document.getElementById('ebUrl')?.value.trim();
  const fr  = document.getElementById('ebFree')?.checked !== false;
  if (!tt) return aTst('শিরোনাম দিন', 'warn');
  const data = { title:tt, category:cat, emoji:em, description:ds, fileUrl:url, free:fr, updatedAt:Date.now() };
  try {
    if (id) { await db.ref('ebooks/'+id).update(data); aTst('ই-বুক আপডেট হয়েছে ✓','ok'); }
    else { data.createdAt=Date.now(); data.downloads=0; await db.ref('ebooks').push(data); aTst('ই-বুক যোগ হয়েছে ✓','ok'); }
    closeAModal(); await loadEbooksA();
  } catch(e) { aTst('সংরক্ষণ করতে সমস্যা হয়েছে','err'); }
}

async function deleteEbook(id, title) {
  if (!confirm(`"${title}" মুছে ফেলবেন?`)) return;
  try {
    await db.ref('ebooks/'+id).remove();
    aTst('ই-বুক মুছে ফেলা হয়েছে','ok');
    await loadEbooksA();
  } catch(e) { aTst('মুছতে সমস্যা হয়েছে','err'); }
}

// ══════════════════════════════════════════════════════
//  REVENUE
// ══════════════════════════════════════════════════════
async function pgRevenue(el) {
  el.innerHTML = `
    <div class="pg-hdr"><h2>💰 রাজস্ব ও পেমেন্ট</h2></div>
    <div class="stats-grid" id="revStats"><div class="spin-c"><div class="spinner"></div></div></div>
    <div class="g2">
      <div class="chart-panel"><div class="chart-title">📊 মাসিক রাজস্ব ট্রেন্ড</div><canvas id="revTrendChart"></canvas></div>
      <div class="chart-panel"><div class="chart-title">🛍️ ক্যাটাগরি অনুযায়ী বিক্রয়</div><canvas id="catChart"></canvas></div>
    </div>
    <div class="panel"><div class="ph"><span class="ph-title">💳 সাম্প্রতিক লেনদেন</span></div><div class="pb" id="txTable"><div class="spin-c"><div class="spinner"></div></div></div></div>`;
  await loadRevStats();
  loadRevCharts();
}

async function loadRevStats() {
  const el = document.getElementById('revStats');
  if (!el) return;
  try {
    const snap = await db.ref('orders').once('value');
    let total=0, today=0, month=0, count=0;
    const now = new Date();
    const todayStr = now.toDateString();
    const thisMonth = now.getMonth();
    if (snap.exists()) {
      snap.forEach(c => {
        const o = c.val();
        const pr = o.totalPrice || 0;
        total += pr; count++;
        const d = new Date(o.createdAt || 0);
        if (d.toDateString() === todayStr) today += pr;
        if (d.getMonth() === thisMonth) month += pr;
      });
    }
    el.innerHTML = [
      {ico:'💰',val:'৳'+total.toLocaleString(),lbl:'মোট রাজস্ব',cls:'te'},
      {ico:'📅',val:'৳'+today.toLocaleString(),lbl:'আজকের রাজস্ব',cls:'pk'},
      {ico:'🗓️',val:'৳'+month.toLocaleString(),lbl:'এই মাসের রাজস্ব',cls:'pu'},
      {ico:'📦',val:count,lbl:'মোট অর্ডার',cls:'or'},
      {ico:'📊',val:count>0?'৳'+Math.round(total/count).toLocaleString():'৳০',lbl:'গড় অর্ডার মূল্য',cls:'bl'},
    ].map(s=>`<div class="sc ${s.cls}"><div class="sc-ico">${s.ico}</div><div class="sc-val">${s.val}</div><div class="sc-lbl">${s.lbl}</div></div>`).join('');
    await loadTxTable();
  } catch(e) {}
}

async function loadTxTable() {
  const el = document.getElementById('txTable');
  if (!el) return;
  try {
    const snap = await db.ref('orders').orderByChild('createdAt').limitToLast(10).once('value');
    if (!snap.exists()) { el.innerHTML = '<div class="empty-s">কোনো লেনদেন নেই</div>'; return; }
    const ords = [];
    snap.forEach(c => ords.push({ id:c.key, ...c.val() }));
    ords.reverse();
    el.innerHTML = `<table class="tbl"><thead><tr><th>লেনদেন ID</th><th>ক্রেতা</th><th>পণ্য সংখ্যা</th><th>পরিমাণ</th><th>তারিখ</th><th>স্ট্যাটাস</th></tr></thead><tbody>
      ${ords.map(o=>`<tr>
        <td style="font-weight:600;color:var(--pk)">#${o.id.slice(-6).toUpperCase()}</td>
        <td>${esc(o.userName||'অজানা')}</td>
        <td>${(o.products||[]).length} টি পণ্য</td>
        <td class="fw7 text-te">৳${o.totalPrice||0}</td>
        <td style="color:rgba(255,255,255,.5);font-size:12px">${fmtDate(o.createdAt)}</td>
        <td>${statusBdg(o.status)}</td>
      </tr>`).join('')}
    </tbody></table>`;
  } catch(e) {}
}

function loadRevCharts() {
  const months = ['জান','ফেব','মার','এপ্রি','মে','জুন'];
  const opts = { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'rgba(255,255,255,.06)'},ticks:{color:'rgba(255,255,255,.5)',font:{size:11}}}, y:{grid:{color:'rgba(255,255,255,.06)'},ticks:{color:'rgba(255,255,255,.5)',font:{size:11}}} } };
  const rt = document.getElementById('revTrendChart');
  if (rt) charts.revT = new Chart(rt, { type:'line', data:{ labels:months, datasets:[{ data:[8200,11500,9800,14200,16800,13500], borderColor:'#06d6a0', backgroundColor:'rgba(6,214,160,.1)', fill:true, tension:.4, pointBackgroundColor:'#06d6a0' }] }, options:opts });
  const cc = document.getElementById('catChart');
  if (cc) charts.cat = new Chart(cc, { type:'doughnut', data:{ labels:['শিশু খাবার','শিশু যত্ন','স্বাস্থ্য','খেলনা','ফ্যাশন'], datasets:[{ data:[35,25,20,12,8], backgroundColor:['#ff6b9d','#c77dff','#06d6a0','#ff9f43','#4dabf7'] }] }, options:{ responsive:true, plugins:{ legend:{ position:'bottom', labels:{ color:'rgba(255,255,255,.6)', font:{size:11} } } } } });
}

// ══════════════════════════════════════════════════════
//  BANNERS
// ══════════════════════════════════════════════════════
async function pgBanners(el) {
  el.innerHTML = `
    <div class="pg-hdr"><h2>🖼️ ব্যানার ব্যবস্থাপনা</h2><button class="btn btn-p" onclick="openAddBanner()">➕ নতুন ব্যানার যোগ</button></div>
    <div id="bannerList"><div class="spin-c"><div class="spinner"></div></div></div>`;
  await loadBannersA();
}

async function loadBannersA() {
  const el = document.getElementById('bannerList');
  if (!el) return;
  try {
    const snap = await db.ref('banners').once('value');
    if (!snap.exists()) { el.innerHTML = `<div class="empty-s">কোনো ব্যানার নেই। <button class="btn btn-p btn-sm" onclick="openAddBanner()">প্রথমটি যোগ করুন</button></div>`; return; }
    const banners = [];
    snap.forEach(c => banners.push({ id:c.key, ...c.val() }));
    el.innerHTML = `<div class="panel"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>প্রিভিউ</th><th>শিরোনাম</th><th>লিংক</th><th>সক্রিয়</th><th>অর্ডার</th><th>অ্যাকশন</th></tr></thead>
      <tbody>${banners.map(b=>`<tr>
        <td><div style="width:80px;height:40px;border-radius:6px;background:${b.color||'linear-gradient(135deg,#ff6b9d,#c77dff)'};display:flex;align-items:center;justify-content:center;font-size:20px">${b.emoji||'🌸'}</div></td>
        <td><div style="font-weight:600">${esc(b.title||'')}</div><div style="color:rgba(255,255,255,.5);font-size:11px">${esc(b.subtitle||'')}</div></td>
        <td style="font-size:12px;color:var(--bl)">${b.link?`<a href="${b.link}" target="_blank" style="color:var(--bl)">লিংক দেখুন</a>`:'—'}</td>
        <td><label class="tog"><input type="checkbox" ${b.active?'checked':''} onchange="toggleBanner('${b.id}',this.checked)"><span class="tog-sl"></span></label></td>
        <td style="color:rgba(255,255,255,.6)">${b.order||0}</td>
        <td><div style="display:flex;gap:5px">
          <button class="btn btn-b btn-xs" onclick="openEditBanner('${b.id}')">✏️</button>
          <button class="btn btn-d btn-xs" onclick="deleteBanner('${b.id}','${esc(b.title||'')}')">🗑️</button>
        </div></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  } catch(e) { el.innerHTML = '<div class="empty-s">লোড করতে সমস্যা হয়েছে</div>'; }
}

function openAddBanner() {
  openAModal(`
    <div class="a-modal-title">🖼️ নতুন ব্যানার যোগ করুন</div>
    <div class="fg2"><label>শিরোনাম</label><input type="text" class="ai" id="bnTt" placeholder="ব্যানারের শিরোনাম"></div>
    <div class="fg2"><label>সাব-টাইটেল</label><input type="text" class="ai" id="bnSt" placeholder="সংক্ষিপ্ত বিবরণ"></div>
    <div class="frow">
      <div class="fg2"><label>ইমোজি</label><input type="text" class="ai" id="bnEm" placeholder="🌸" maxlength="4"></div>
      <div class="fg2"><label>ক্লিক লিংক (ঐচ্ছিক)</label><input type="url" class="ai" id="bnLk" placeholder="https://..."></div>
    </div>
    <div class="fg2"><label>ব্যাকগ্রাউন্ড কালার (CSS gradient)</label><input type="text" class="ai" id="bnBg" placeholder="linear-gradient(135deg,#ff6b9d,#c77dff)"></div>
    <div class="fg2"><label>ছবির URL (ঐচ্ছিক)</label><input type="url" class="ai" id="bnImg" placeholder="https://..."></div>
    <div class="fg2"><label>প্রদর্শনের ক্রম</label><input type="number" class="ai" id="bnOrd" value="1" min="1"></div>
    <div class="frow">
      <button class="btn btn-p w100" onclick="saveBanner(null)">✅ সংরক্ষণ করুন</button>
      <button class="btn btn-o w100" onclick="closeAModal()">বাতিল করুন</button>
    </div>`);
}

function openEditBanner(id) {
  db.ref('banners/' + id).once('value').then(snap => {
    if (!snap.exists()) return;
    const b = snap.val();
    openAModal(`
      <div class="a-modal-title">✏️ ব্যানার সম্পাদনা</div>
      <div class="fg2"><label>শিরোনাম</label><input type="text" class="ai" id="bnTt" value="${esc(b.title||'')}"></div>
      <div class="fg2"><label>সাব-টাইটেল</label><input type="text" class="ai" id="bnSt" value="${esc(b.subtitle||'')}"></div>
      <div class="frow">
        <div class="fg2"><label>ইমোজি</label><input type="text" class="ai" id="bnEm" value="${b.emoji||'🌸'}" maxlength="4"></div>
        <div class="fg2"><label>ক্লিক লিংক</label><input type="url" class="ai" id="bnLk" value="${b.link||''}"></div>
      </div>
      <div class="fg2"><label>ব্যাকগ্রাউন্ড কালার</label><input type="text" class="ai" id="bnBg" value="${b.color||''}"></div>
      <div class="fg2"><label>ছবির URL</label><input type="url" class="ai" id="bnImg" value="${b.imageUrl||''}"></div>
      <div class="fg2"><label>ক্রম</label><input type="number" class="ai" id="bnOrd" value="${b.order||1}"></div>
      <div class="frow">
        <button class="btn btn-p w100" onclick="saveBanner('${id}')">✅ আপডেট করুন</button>
        <button class="btn btn-o w100" onclick="closeAModal()">বাতিল করুন</button>
      </div>`);
  });
}

async function saveBanner(id) {
  const tt  = document.getElementById('bnTt')?.value.trim();
  const st  = document.getElementById('bnSt')?.value.trim();
  const em  = document.getElementById('bnEm')?.value.trim() || '🌸';
  const lk  = document.getElementById('bnLk')?.value.trim();
  const bg  = document.getElementById('bnBg')?.value.trim();
  const img = document.getElementById('bnImg')?.value.trim();
  const ord = parseInt(document.getElementById('bnOrd')?.value) || 1;
  if (!tt) return aTst('শিরোনাম দিন', 'warn');
  const data = { title:tt, subtitle:st, emoji:em, link:lk, color:bg, imageUrl:img, order:ord, active:true, updatedAt:Date.now() };
  try {
    if (id) { await db.ref('banners/'+id).update(data); aTst('ব্যানার আপডেট হয়েছে ✓','ok'); }
    else { data.createdAt=Date.now(); await db.ref('banners').push(data); aTst('ব্যানার যোগ হয়েছে ✓','ok'); }
    closeAModal(); await loadBannersA();
  } catch(e) { aTst('সংরক্ষণ করতে সমস্যা হয়েছে','err'); }
}

async function toggleBanner(id, active) {
  await db.ref('banners/' + id + '/active').set(active);
  aTst(active ? 'ব্যানার সক্রিয় ✓' : 'ব্যানার নিষ্ক্রিয়', 'ok');
}

async function deleteBanner(id, title) {
  if (!confirm(`"${title}" ব্যানার মুছে ফেলবেন?`)) return;
  try {
    await db.ref('banners/'+id).remove();
    aTst('ব্যানার মুছে ফেলা হয়েছে','ok');
    await loadBannersA();
  } catch(e) { aTst('মুছতে সমস্যা হয়েছে','err'); }
}

// ══════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════
async function pgNotifications(el) {
  el.innerHTML = `
    <div class="pg-hdr"><h2>🔔 বিজ্ঞপ্তি ব্যবস্থাপনা</h2><button class="btn btn-p" onclick="openSendNotif()">📤 নতুন বিজ্ঞপ্তি পাঠান</button></div>
    <div id="notifTable"><div class="spin-c"><div class="spinner"></div></div></div>`;
  await loadNotifsA();
}

async function loadNotifsA() {
  const el = document.getElementById('notifTable');
  if (!el) return;
  try {
    const snap = await db.ref('notifications').orderByChild('createdAt').limitToLast(30).once('value');
    if (!snap.exists()) { el.innerHTML = '<div class="empty-s">কোনো বিজ্ঞপ্তি পাঠানো হয়নি</div>'; return; }
    const notifs = [];
    snap.forEach(c => notifs.push({ id:c.key, ...c.val() }));
    notifs.reverse();
    el.innerHTML = `<div class="panel"><div class="tbl-wrap"><table class="tbl">
      <thead><tr><th>শিরোনাম</th><th>বিষয়বস্তু</th><th>লক্ষ্য</th><th>পাঠানোর সময়</th><th>অ্যাকশন</th></tr></thead>
      <tbody>${notifs.map(n=>`<tr>
        <td style="font-weight:600">${esc(n.title||'')}</td>
        <td style="color:rgba(255,255,255,.6);font-size:12px;max-width:200px">${esc((n.content||n.body||'').slice(0,70))}...</td>
        <td><span class="bdg bdg-b">${n.targetAll ? 'সব ব্যবহারকারী' : 'নির্দিষ্ট'}</span></td>
        <td style="color:rgba(255,255,255,.5);font-size:12px">${fmtDate(n.createdAt)}</td>
        <td><button class="btn btn-d btn-xs" onclick="deleteNotif('${n.id}')">🗑️</button></td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  } catch(e) { el.innerHTML = '<div class="empty-s">লোড করতে সমস্যা হয়েছে</div>'; }
}

function openSendNotif() {
  openAModal(`
    <div class="a-modal-title">📤 নতুন বিজ্ঞপ্তি পাঠান</div>
    <div class="fg2"><label>শিরোনাম</label><input type="text" class="ai" id="ntTt" placeholder="বিজ্ঞপ্তির শিরোনাম"></div>
    <div class="fg2"><label>বিষয়বস্তু</label><textarea class="ai" id="ntBd" rows="4" placeholder="বিজ্ঞপ্তির বিস্তারিত বিষয়বস্তু..."></textarea></div>
    <div class="fg2"><label>লক্ষ্য দর্শক</label>
      <select class="ai" id="ntTgt">
        <option value="all">সব ব্যবহারকারী</option>
        <option value="active">সক্রিয় ব্যবহারকারী</option>
      </select>
    </div>
    <div class="fg2"><label>লিংক (ঐচ্ছিক)</label><input type="url" class="ai" id="ntLk" placeholder="https://..."></div>
    <div class="frow">
      <button class="btn btn-p w100" onclick="sendNotifNow()">📤 এখনই পাঠান</button>
      <button class="btn btn-o w100" onclick="closeAModal()">বাতিল করুন</button>
    </div>`);
}

async function sendNotifNow() {
  const title = document.getElementById('ntTt')?.value.trim();
  const body  = document.getElementById('ntBd')?.value.trim();
  const tgt   = document.getElementById('ntTgt')?.value;
  const link  = document.getElementById('ntLk')?.value.trim();
  if (!title || !body) return aTst('শিরোনাম ও বিষয়বস্তু দিন', 'warn');
  try {
    await db.ref('notifications').push({ title, content:body, body, link, targetAll:tgt==='all', active:true, isNew:true, createdAt:Date.now(), sentBy:aUser?.uid });
    aTst('বিজ্ঞপ্তি সফলভাবে পাঠানো হয়েছে ✓','ok');
    closeAModal(); await loadNotifsA();
    document.getElementById('nBadge')?.classList.remove('hidden');
  } catch(e) { aTst('পাঠাতে সমস্যা হয়েছে','err'); }
}

async function deleteNotif(id) {
  if (!confirm('এই বিজ্ঞপ্তি মুছে ফেলবেন?')) return;
  try {
    await db.ref('notifications/'+id).remove();
    aTst('বিজ্ঞপ্তি মুছে ফেলা হয়েছে','ok');
    await loadNotifsA();
  } catch(e) {}
}

async function loadNBadge() {
  try {
    const snap = await db.ref('notifications').orderByChild('active').equalTo(true).limitToLast(1).once('value');
    if (snap.exists()) { const el=document.getElementById('nBadge'); if(el){el.textContent='!';el.classList.remove('hidden');} }
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
//  HEALTH & VACCINE
// ══════════════════════════════════════════════════════
async function pgHealth(el) {
  el.innerHTML = `
    <div class="pg-hdr"><h2>🏥 স্বাস্থ্য ও টিকা ব্যবস্থাপনা</h2><button class="btn btn-p" onclick="openAddVaccine()">➕ টিকা যোগ করুন</button></div>
    <div class="g2">
      <div>
        <h3 style="font-size:15px;margin-bottom:12px">💉 টিকাকরণ সময়সূচী</h3>
        <div id="vaccineList"><div class="spin-c"><div class="spinner"></div></div></div>
      </div>
      <div>
        <h3 style="font-size:15px;margin-bottom:12px">🏥 স্বাস্থ্যকেন্দ্র তথ্য</h3>
        <div class="pg-hdr" style="margin-bottom:10px"><span></span><button class="btn btn-b btn-sm" onclick="openAddCenter()">➕ যোগ করুন</button></div>
        <div id="centerList"><div class="spin-c"><div class="spinner"></div></div></div>
      </div>
    </div>`;
  await loadVaccines(); await loadCenters();
}

async function loadVaccines() {
  const el = document.getElementById('vaccineList');
  if (!el) return;
  const defaults = [
    {nm:'বিসিজি (BCG)',time:'জন্মের সময়',desc:'যক্ষ্মা প্রতিরোধ'},
    {nm:'পেন্টাভ্যালেন্ট',time:'৬, ১০, ১৪ সপ্তাহ',desc:'৫টি রোগ প্রতিরোধ'},
    {nm:'হাম-রুবেলা (MR)',time:'৯ মাস',desc:'হাম ও রুবেলা'},
    {nm:'ভিটামিন এ',time:'৯ মাস',desc:'দৃষ্টিশক্তি ও প্রতিরোধ'},
  ];
  try {
    const snap = await db.ref('vaccines').once('value');
    const vacs = [];
    if (snap.exists()) snap.forEach(c => vacs.push({ id:c.key, ...c.val() }));
    const list = vacs.length ? vacs : defaults;
    el.innerHTML = list.map(v => `
      <div class="panel mb12" style="padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-weight:600;font-size:13px">💉 ${esc(v.nm||v.name||'')}</div>
          <div style="color:rgba(255,255,255,.5);font-size:12px">${esc(v.time||'')} • ${esc(v.desc||v.description||'')}</div></div>
          ${v.id ? `<button class="btn btn-d btn-xs" onclick="deleteVaccine('${v.id}')">🗑️</button>` : ''}
        </div>
      </div>`).join('');
  } catch(e) { el.innerHTML = defaults.map(v=>`<div class="panel mb12" style="padding:12px"><div style="font-weight:600">💉 ${v.nm}</div><div style="color:rgba(255,255,255,.5);font-size:12px">${v.time} • ${v.desc}</div></div>`).join(''); }
}

function openAddVaccine() {
  openAModal(`
    <div class="a-modal-title">💉 নতুন টিকা যোগ করুন</div>
    <div class="fg2"><label>টিকার নাম</label><input type="text" class="ai" id="vcNm" placeholder="যেমন: বিসিজি"></div>
    <div class="fg2"><label>সময়সূচী</label><input type="text" class="ai" id="vcTm" placeholder="যেমন: জন্মের সময়, ৬ সপ্তাহ"></div>
    <div class="fg2"><label>বিবরণ</label><input type="text" class="ai" id="vcDs" placeholder="কোন রোগ প্রতিরোধ করে"></div>
    <div class="frow">
      <button class="btn btn-p w100" onclick="saveVaccine()">✅ সংরক্ষণ করুন</button>
      <button class="btn btn-o w100" onclick="closeAModal()">বাতিল করুন</button>
    </div>`);
}

async function saveVaccine() {
  const nm = document.getElementById('vcNm')?.value.trim();
  const tm = document.getElementById('vcTm')?.value.trim();
  const ds = document.getElementById('vcDs')?.value.trim();
  if (!nm) return aTst('টিকার নাম দিন','warn');
  try {
    await db.ref('vaccines').push({ name:nm, time:tm, description:ds, createdAt:Date.now() });
    aTst('টিকা যোগ হয়েছে ✓','ok'); closeAModal(); await loadVaccines();
  } catch(e) { aTst('সমস্যা হয়েছে','err'); }
}

async function deleteVaccine(id) {
  if (!confirm('এই টিকার তথ্য মুছে ফেলবেন?')) return;
  await db.ref('vaccines/'+id).remove();
  aTst('মুছে ফেলা হয়েছে','ok'); await loadVaccines();
}

async function loadCenters() {
  const el = document.getElementById('centerList');
  if (!el) return;
  try {
    const snap = await db.ref('healthCenters').once('value');
    if (!snap.exists()) { el.innerHTML = '<div class="empty-s">কোনো তথ্য নেই</div>'; return; }
    const centers = [];
    snap.forEach(c => centers.push({ id:c.key, ...c.val() }));
    el.innerHTML = centers.map(c => `
      <div class="panel mb12" style="padding:12px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div><div style="font-weight:600;font-size:13px">🏥 ${esc(c.name||'')}</div>
          <div style="color:rgba(255,255,255,.5);font-size:12px">${esc(c.address||'')} • ${c.phone||''}</div></div>
          <button class="btn btn-d btn-xs" onclick="deleteCenter('${c.id}')">🗑️</button>
        </div>
      </div>`).join('');
  } catch(e) {}
}

function openAddCenter() {
  openAModal(`
    <div class="a-modal-title">🏥 স্বাস্থ্যকেন্দ্র যোগ করুন</div>
    <div class="fg2"><label>কেন্দ্রের নাম</label><input type="text" class="ai" id="hcNm" placeholder="কেন্দ্রের নাম"></div>
    <div class="fg2"><label>ঠিকানা</label><input type="text" class="ai" id="hcAd" placeholder="সম্পূর্ণ ঠিকানা"></div>
    <div class="frow">
      <div class="fg2"><label>ফোন</label><input type="tel" class="ai" id="hcPh" placeholder="01XXXXXXXXX"></div>
      <div class="fg2"><label>জেলা</label><input type="text" class="ai" id="hcDt" placeholder="জেলার নাম"></div>
    </div>
    <div class="frow">
      <button class="btn btn-p w100" onclick="saveCenter()">✅ সংরক্ষণ করুন</button>
      <button class="btn btn-o w100" onclick="closeAModal()">বাতিল করুন</button>
    </div>`);
}

async function saveCenter() {
  const nm = document.getElementById('hcNm')?.value.trim();
  const ad = document.getElementById('hcAd')?.value.trim();
  const ph = document.getElementById('hcPh')?.value.trim();
  const dt = document.getElementById('hcDt')?.value.trim();
  if (!nm) return aTst('কেন্দ্রের নাম দিন','warn');
  try {
    await db.ref('healthCenters').push({ name:nm, address:ad, phone:ph, district:dt, createdAt:Date.now() });
    aTst('কেন্দ্র যোগ হয়েছে ✓','ok'); closeAModal(); await loadCenters();
  } catch(e) { aTst('সমস্যা হয়েছে','err'); }
}

async function deleteCenter(id) {
  await db.ref('healthCenters/'+id).remove();
  aTst('মুছে ফেলা হয়েছে','ok'); await loadCenters();
}

// ══════════════════════════════════════════════════════
//  POINTS
// ══════════════════════════════════════════════════════
async function pgPoints(el) {
  el.innerHTML = `
    <div class="pg-hdr"><h2>⭐ পয়েন্ট ব্যবস্থাপনা</h2></div>
    <div class="stats-grid" id="ptStats"></div>
    <div class="g2">
      <div class="panel"><div class="ph"><span class="ph-title">🏆 শীর্ষ পয়েন্ট অর্জনকারী</span></div><div class="pb" id="topPts"></div></div>
      <div class="panel"><div class="ph"><span class="ph-title">⚙️ পয়েন্ট কনফিগারেশন</span></div>
        <div class="pb">
          <div class="fg2"><label>দৈনিক বোনাস পয়েন্ট</label><input type="number" class="ai" id="cfgDailyPts" value="10" min="1"></div>
          <div class="fg2"><label>রেফারেল বোনাস পয়েন্ট</label><input type="number" class="ai" id="cfgRefPts" value="25" min="1"></div>
          <div class="fg2"><label>পোস্ট করলে পয়েন্ট</label><input type="number" class="ai" id="cfgPostPts" value="5" min="0"></div>
          <button class="btn btn-p w100" onclick="savePtConfig()">✅ কনফিগারেশন সংরক্ষণ করুন</button>
        </div>
      </div>
    </div>
    <div class="panel mt12"><div class="ph"><span class="ph-title">📋 সাম্প্রতিক পয়েন্ট লেনদেন</span></div><div class="pb" id="ptLog"><div class="spin-c"><div class="spinner"></div></div></div></div>`;
  await loadPtStats(); await loadPtLog();
}

async function loadPtStats() {
  const el = document.getElementById('ptStats');
  if (!el) return;
  try {
    const snap = await db.ref('users').once('value');
    let total=0, maxPts=0, count=0;
    if (snap.exists()) { snap.forEach(c => { const p=c.val().points||0; total+=p; count++; if(p>maxPts) maxPts=p; }); }
    el.innerHTML = [
      {ico:'⭐',val:total.toLocaleString(),lbl:'মোট বিতরণ পয়েন্ট',cls:'pk'},
      {ico:'👤',val:count,lbl:'পয়েন্ট অর্জনকারী',cls:'pu'},
      {ico:'🏆',val:maxPts,lbl:'সর্বোচ্চ পয়েন্ট',cls:'or'},
      {ico:'📊',val:count>0?Math.round(total/count):0,lbl:'গড় পয়েন্ট',cls:'bl'},
    ].map(s=>`<div class="sc ${s.cls}"><div class="sc-ico">${s.ico}</div><div class="sc-val">${s.val}</div><div class="sc-lbl">${s.lbl}</div></div>`).join('');
  } catch(e) {}
}

async function loadPtLog() {
  const el = document.getElementById('topPts');
  if (!el) return;
  try {
    const snap = await db.ref('users').orderByChild('points').limitToLast(10).once('value');
    if (!snap.exists()) { el.innerHTML = '<div class="empty-s">কোনো তথ্য নেই</div>'; return; }
    const users = [];
    snap.forEach(c => users.push({ id:c.key, ...c.val() }));
    users.sort((a, b) => (b.points||0) - (a.points||0));
    el.innerHTML = users.map((u, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.04)">
        <div style="color:${i<3?'var(--or)':'var(--txt2)'};font-size:14px;font-weight:700;width:20px">${i+1}</div>
        <div class="u-av">${(u.name||'U').charAt(0)}</div>
        <div style="flex:1;font-size:13px">${esc(u.name||'অজানা')}</div>
        <div class="bdg bdg-g">⭐ ${u.points||0}</div>
        <button class="btn btn-b btn-xs" onclick="viewUser('${u.id}')">সম্পাদনা</button>
      </div>`).join('');
  } catch(e) {}

  const logEl = document.getElementById('ptLog');
  if (logEl) logEl.innerHTML = '<div class="empty-s">পয়েন্ট লগ ব্যবহারকারী প্রোফাইলে দেখুন</div>';
}

async function savePtConfig() {
  const daily = parseInt(document.getElementById('cfgDailyPts')?.value) || 10;
  const ref   = parseInt(document.getElementById('cfgRefPts')?.value)   || 25;
  const post  = parseInt(document.getElementById('cfgPostPts')?.value)  || 5;
  try {
    await db.ref('config/points').set({ daily, referral:ref, post, updatedAt:Date.now() });
    aTst('কনফিগারেশন সংরক্ষণ হয়েছে ✓','ok');
  } catch(e) { aTst('সংরক্ষণ করতে সমস্যা হয়েছে','err'); }
}

// ══════════════════════════════════════════════════════
//  ANALYTICS
// ══════════════════════════════════════════════════════
async function pgAnalytics(el) {
  el.innerHTML = `
    <div class="pg-hdr"><h2>📈 বিশ্লেষণ ও রিপোর্ট</h2><button class="btn btn-s" onclick="exportReport()">📥 রিপোর্ট ডাউনলোড</button></div>
    <div class="stats-grid" id="anaStats"><div class="spin-c"><div class="spinner"></div></div></div>
    <div class="g2">
      <div class="chart-panel"><div class="chart-title">👥 ব্যবহারকারী বৃদ্ধির ধারা</div><canvas id="uGrowth"></canvas></div>
      <div class="chart-panel"><div class="chart-title">💬 কমিউনিটি এনগেজমেন্ট</div><canvas id="engChart"></canvas></div>
    </div>
    <div class="chart-panel"><div class="chart-title">📦 অর্ডার স্ট্যাটাস বিতরণ</div><canvas id="ordChart"></canvas></div>`;
  await loadAnaStats();
  loadAnaCharts();
}

async function loadAnaStats() {
  const el = document.getElementById('anaStats');
  if (!el) return;
  try {
    const [uS, pS, oS, postS] = await Promise.all([
      db.ref('users').once('value'), db.ref('products').once('value'),
      db.ref('orders').once('value'), db.ref('posts').once('value'),
    ]);
    const u=uS.exists()?Object.keys(uS.val()).length:0;
    const p=pS.exists()?Object.keys(pS.val()).length:0;
    const o=oS.exists()?Object.keys(oS.val()).length:0;
    const pt=postS.exists()?Object.keys(postS.val()).length:0;
    let rev=0; if(oS.exists()) oS.forEach(c=>rev+=c.val().totalPrice||0);
    el.innerHTML = [
      {ico:'👥',val:u,lbl:'মোট ব্যবহারকারী',cls:'pk'},
      {ico:'🛍️',val:p,lbl:'মোট পণ্য',cls:'pu'},
      {ico:'📦',val:o,lbl:'মোট অর্ডার',cls:'or'},
      {ico:'💬',val:pt,lbl:'মোট পোস্ট',cls:'bl'},
      {ico:'💰',val:'৳'+rev.toLocaleString(),lbl:'মোট রাজস্ব',cls:'te'},
    ].map(s=>`<div class="sc ${s.cls}"><div class="sc-ico">${s.ico}</div><div class="sc-val">${s.val}</div><div class="sc-lbl">${s.lbl}</div></div>`).join('');
  } catch(e) {}
}

function loadAnaCharts() {
  const lb6 = ['জান','ফেব','মার','এপ্রি','মে','জুন'];
  const op = { responsive:true, plugins:{legend:{display:false}}, scales:{ x:{grid:{color:'rgba(255,255,255,.06)'},ticks:{color:'rgba(255,255,255,.5)',font:{size:11}}}, y:{grid:{color:'rgba(255,255,255,.06)'},ticks:{color:'rgba(255,255,255,.5)',font:{size:11}}} } };
  const ug = document.getElementById('uGrowth');
  if (ug) charts.ug = new Chart(ug, { type:'bar', data:{ labels:lb6, datasets:[{ data:[8,15,22,35,48,61], backgroundColor:'rgba(255,107,157,.7)', borderRadius:5 }] }, options:op });
  const eg = document.getElementById('engChart');
  if (eg) charts.eg = new Chart(eg, { type:'line', data:{ labels:lb6, datasets:[
    { label:'পোস্ট', data:[12,18,25,31,42,38], borderColor:'#c77dff', tension:.4 },
    { label:'মন্তব্য', data:[28,35,42,58,71,65], borderColor:'#4dabf7', tension:.4 },
  ] }, options:{...op, plugins:{legend:{position:'top',labels:{color:'rgba(255,255,255,.6)',font:{size:11}}}}} });
  const od = document.getElementById('ordChart');
  if (od) charts.od = new Chart(od, { type:'doughnut', data:{ labels:['অপেক্ষমান','প্রক্রিয়াধীন','শিপড','ডেলিভারড','বাতিল'], datasets:[{ data:[15,25,20,35,5], backgroundColor:['#ff9f43','#4dabf7','#c77dff','#06d6a0','#ff4757'] }] }, options:{ responsive:true, plugins:{ legend:{ position:'right', labels:{ color:'rgba(255,255,255,.6)', font:{size:11} } } } } });
}

async function exportReport() {
  aTst('রিপোর্ট তৈরি হচ্ছে...', 'warn');
  try {
    const [uS, oS] = await Promise.all([db.ref('users').once('value'), db.ref('orders').once('value')]);
    const rows = [['রিপোর্টের ধরন','মান'],['মোট ব্যবহারকারী',uS.exists()?Object.keys(uS.val()).length:0],['মোট অর্ডার',oS.exists()?Object.keys(oS.val()).length:0],['তারিখ',new Date().toLocaleDateString('bn-BD')]];
    const csv = rows.map(r=>r.join(',')).join('\n');
    const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,\uFEFF'+encodeURIComponent(csv); a.download='futful_report_'+new Date().toISOString().split('T')[0]+'.csv'; a.click();
    aTst('রিপোর্ট ডাউনলোড হচ্ছে ✓','ok');
  } catch(e) { aTst('রিপোর্ট তৈরি করতে সমস্যা হয়েছে','err'); }
}

// ══════════════════════════════════════════════════════
//  SETTINGS
// ══════════════════════════════════════════════════════
async function pgSettings(el) {
  let cfg = {};
  try { const s=await db.ref('config/app').once('value'); if(s.exists()) cfg=s.val(); } catch(e) {}
  el.innerHTML = `
    <div class="pg-hdr"><h2>⚙️ সেটিংস ও কনফিগারেশন</h2></div>
    <div class="g2">
      <div class="panel"><div class="ph"><span class="ph-title">🌸 অ্যাপ সেটিংস</span></div>
        <div class="pb">
          <div class="fg2"><label>অ্যাপের নাম</label><input type="text" class="ai" id="cfgAppNm" value="${esc(cfg.name||'FutFul')}"></div>
          <div class="fg2"><label>অ্যাপের বিবরণ</label><textarea class="ai" id="cfgAppDs" rows="2">${esc(cfg.description||'মাতৃত্ব ও শিশু যত্ন অ্যাপ')}</textarea></div>
          <div class="fg2"><label>যোগাযোগ ইমেইল</label><input type="email" class="ai" id="cfgEmail" value="${esc(cfg.email||'totul01744@gmail.com')}"></div>
          <div class="fg2"><label>যোগাযোগ ফোন</label><input type="tel" class="ai" id="cfgPhone" value="${esc(cfg.phone||'')}"></div>
          <button class="btn btn-p w100" onclick="saveAppCfg()">✅ সেটিংস সংরক্ষণ করুন</button>
        </div>
      </div>
      <div class="panel"><div class="ph"><span class="ph-title">🔗 সোশ্যাল মিডিয়া লিংক</span></div>
        <div class="pb">
          <div class="fg2"><label>Facebook</label><input type="url" class="ai" id="cfgFb" value="${esc(cfg.facebook||'')}" placeholder="https://facebook.com/..."></div>
          <div class="fg2"><label>Instagram</label><input type="url" class="ai" id="cfgIg" value="${esc(cfg.instagram||'')}" placeholder="https://instagram.com/..."></div>
          <div class="fg2"><label>YouTube</label><input type="url" class="ai" id="cfgYt" value="${esc(cfg.youtube||'')}" placeholder="https://youtube.com/..."></div>
          <div class="fg2"><label>Telegram</label><input type="url" class="ai" id="cfgTg" value="${esc(cfg.telegram||'https://t.me/futfulcoinearnbot')}" placeholder="https://t.me/..."></div>
          <button class="btn btn-p w100" onclick="saveSocialCfg()">✅ সংরক্ষণ করুন</button>
        </div>
      </div>
    </div>
    <div class="panel"><div class="ph"><span class="ph-title">📜 নীতিমালা ব্যবস্থাপনা</span></div>
      <div class="pb">
        <div class="fg2"><label>গোপনীয়তা নীতি</label><textarea class="ai" id="cfgPrivacy" rows="5" placeholder="গোপনীয়তা নীতির বিষয়বস্তু...">${esc(cfg.privacyPolicy||'')}</textarea></div>
        <div class="fg2"><label>সেবা শর্তাবলী</label><textarea class="ai" id="cfgTos" rows="5" placeholder="সেবা শর্তাবলীর বিষয়বস্তু...">${esc(cfg.termsOfService||'')}</textarea></div>
        <button class="btn btn-p" onclick="savePolicyCfg()">✅ নীতিমালা সংরক্ষণ করুন</button>
      </div>
    </div>
    <div class="panel"><div class="ph"><span class="ph-title">🗄️ ডেটা ব্যাকআপ</span></div>
      <div class="pb">
        <p style="color:rgba(255,255,255,.6);font-size:13px;margin-bottom:14px">ডেটাবেস ব্যাকআপ তৈরি করুন এবং ডাউনলোড করুন।</p>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-s" onclick="backupUsers()">👥 ব্যবহারকারী ব্যাকআপ</button>
          <button class="btn btn-b" onclick="backupOrders()">📦 অর্ডার ব্যাকআপ</button>
          <button class="btn btn-p" onclick="backupAll()">💾 সম্পূর্ণ ব্যাকআপ</button>
        </div>
      </div>
    </div>`;
}

async function saveAppCfg() {
  const nm=document.getElementById('cfgAppNm')?.value.trim();
  const ds=document.getElementById('cfgAppDs')?.value.trim();
  const em=document.getElementById('cfgEmail')?.value.trim();
  const ph=document.getElementById('cfgPhone')?.value.trim();
  try {
    await db.ref('config/app').update({ name:nm, description:ds, email:em, phone:ph, updatedAt:Date.now() });
    aTst('অ্যাপ সেটিংস সংরক্ষণ হয়েছে ✓','ok');
  } catch(e) { aTst('সংরক্ষণ করতে সমস্যা হয়েছে','err'); }
}

async function saveSocialCfg() {
  const fb=document.getElementById('cfgFb')?.value.trim();
  const ig=document.getElementById('cfgIg')?.value.trim();
  const yt=document.getElementById('cfgYt')?.value.trim();
  const tg=document.getElementById('cfgTg')?.value.trim();
  try {
    await db.ref('config/app').update({ facebook:fb, instagram:ig, youtube:yt, telegram:tg, updatedAt:Date.now() });
    aTst('সোশ্যাল লিংক সংরক্ষণ হয়েছে ✓','ok');
  } catch(e) { aTst('সংরক্ষণ করতে সমস্যা হয়েছে','err'); }
}

async function savePolicyCfg() {
  const pv=document.getElementById('cfgPrivacy')?.value.trim();
  const ts=document.getElementById('cfgTos')?.value.trim();
  try {
    await db.ref('config/app').update({ privacyPolicy:pv, termsOfService:ts, updatedAt:Date.now() });
    aTst('নীতিমালা সংরক্ষণ হয়েছে ✓','ok');
  } catch(e) { aTst('সমস্যা হয়েছে','err'); }
}

async function backupUsers() {
  const snap=await db.ref('users').once('value');
  dlJson(snap.val(), 'futful_users_backup');
}
async function backupOrders() {
  const snap=await db.ref('orders').once('value');
  dlJson(snap.val(), 'futful_orders_backup');
}
async function backupAll() {
  const [uS,oS,pS]=await Promise.all([db.ref('users').once('value'),db.ref('orders').once('value'),db.ref('products').once('value')]);
  dlJson({ users:uS.val(), orders:oS.val(), products:pS.val(), exportedAt:new Date().toISOString() }, 'futful_full_backup');
}
function dlJson(data, fname) {
  const a=document.createElement('a');
  a.href='data:application/json;charset=utf-8,'+encodeURIComponent(JSON.stringify(data,null,2));
  a.download=fname+'_'+new Date().toISOString().split('T')[0]+'.json'; a.click();
  aTst('ব্যাকআপ ডাউনলোড হচ্ছে ✓','ok');
}

// ══════════════════════════════════════════════════════
//  MODAL & TOAST HELPERS
// ══════════════════════════════════════════════════════
function openAModal(html) {
  const bg=document.getElementById('aModal');
  const bd=document.getElementById('aModalBody');
  if(bg&&bd){ bd.innerHTML=html; bg.classList.remove('hidden'); }
}
function closeAModal() { document.getElementById('aModal')?.classList.add('hidden'); }

function aTst(msg, type='') {
  const el=document.getElementById('aToast');
  if(!el) return;
  el.textContent=msg;
  el.className='a-toast'+(type?' '+type:'');
  el.classList.remove('hidden');
  clearTimeout(el._t);
  el._t=setTimeout(()=>el.classList.add('hidden'), 3200);
}

// ══════════════════════════════════════════════════════
//  UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════
function show(id) { document.getElementById(id)?.classList.remove('hidden'); }
function hid(id)  { document.getElementById(id)?.classList.add('hidden'); }

function fmtT(ts) {
  if(!ts) return '';
  const d=new Date(ts), n=new Date(), diff=n-d;
  if(diff<60000) return 'এইমাত্র';
  if(diff<3600000) return Math.floor(diff/60000)+' মি. আগে';
  if(diff<86400000) return Math.floor(diff/3600000)+' ঘ. আগে';
  return Math.floor(diff/86400000)+' দিন আগে';
}

function fmtDate(ts) {
  if(!ts) return '—';
  return new Date(ts).toLocaleDateString('bn-BD',{day:'numeric',month:'short',year:'numeric'});
}

function calcAgeA(dob) {
  if(!dob) return 'অজানা';
  const b=new Date(dob), n=new Date();
  const mo=(n.getFullYear()-b.getFullYear())*12+(n.getMonth()-b.getMonth());
  if(mo<1) return Math.floor((n-b)/86400000)+' দিন';
  if(mo<12) return mo+' মাস';
  return Math.floor(mo/12)+' বছর';
}

function esc(t) {
  if(!t) return '';
  return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function statusBdg(s) {
  const m={pending:'<span class="bdg bdg-o">অপেক্ষমান</span>',processing:'<span class="bdg bdg-b">প্রক্রিয়াধীন</span>',shipped:'<span class="bdg bdg-p">শিপড</span>',delivered:'<span class="bdg bdg-g">ডেলিভারড</span>',cancelled:'<span class="bdg bdg-r">বাতিল</span>'};
  return m[s] || `<span class="bdg bdg-o">${s||'অজানা'}</span>`;
}

function postStatusBdg(s) {
  const m={approved:'<span class="bdg bdg-g">অনুমোদিত</span>',rejected:'<span class="bdg bdg-r">প্রত্যাখ্যাত</span>',pending:'<span class="bdg bdg-o">অপেক্ষমান</span>'};
  return m[s] || '<span class="bdg bdg-o">অজানা</span>';
}
