// ============================================
// FutFul - Shared Firebase Data Store (store.js)
// ============================================
// Replace the firebaseConfig below with your own Firebase project config!

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAzd17RdhVyyZIsGtcitOxVUO2TqM8NJxg",
  authDomain: "futful.firebaseapp.com",
  projectId: "futful",
  storageBucket: "futful.firebasestorage.app",
  messagingSenderId: "435987261629",
  appId: "1:435987261629:web:e8f489ba52163663836fd4",
  measurementId: "G-CB5Z8XBDLG"
};

const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY"; // <-- Replace with your Gemini API key

// ---- Firebase Init ----
let db, auth, storage;

function initFirebase() {
  if (typeof firebase !== 'undefined' && !firebase.apps?.length) {
    firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage();
  } else if (typeof firebase !== 'undefined') {
    db = firebase.firestore();
    auth = firebase.auth();
    storage = firebase.storage();
  }
}

// ============================================
// Auth Store
// ============================================
const AuthStore = {
  currentUser: null,
  listeners: [],

  init() {
    initFirebase();
    auth.onAuthStateChanged(user => {
      this.currentUser = user;
      this.listeners.forEach(fn => fn(user));
    });
  },

  async register(email, password, displayName, photoURL = null) {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName });
    await db.collection('users').doc(cred.user.uid).set({
      uid: cred.user.uid,
      email,
      displayName,
      photoURL: photoURL || null,
      role: 'user',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      children: []
    });
    return cred.user;
  },

  async login(email, password) {
    return await auth.signInWithEmailAndPassword(email, password);
  },

  async logout() {
    return await auth.signOut();
  },

  onAuthChange(fn) {
    this.listeners.push(fn);
  },

  async getUserProfile(uid) {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists ? doc.data() : null;
  },

  async updateProfile(uid, data) {
    return await db.collection('users').doc(uid).update(data);
  }
};

// ============================================
// Banner Store
// ============================================
const BannerStore = {
  async getBanners() {
    const snap = await db.collection('banners').where('active', '==', true).orderBy('order').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async getAllBanners() {
    const snap = await db.collection('banners').orderBy('order').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async addBanner(data) {
    return await db.collection('banners').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  },
  async updateBanner(id, data) {
    return await db.collection('banners').doc(id).update(data);
  },
  async deleteBanner(id) {
    return await db.collection('banners').doc(id).delete();
  }
};

// ============================================
// Gift / Announcement Store
// ============================================
const GiftStore = {
  async getGifts() {
    const snap = await db.collection('gifts').where('active', '==', true).orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async getAllGifts() {
    const snap = await db.collection('gifts').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async addGift(data) {
    return await db.collection('gifts').add({ ...data, active: true, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  },
  async updateGift(id, data) {
    return await db.collection('gifts').doc(id).update(data);
  },
  async deleteGift(id) {
    return await db.collection('gifts').doc(id).delete();
  }
};

// ============================================
// Child Profile Store
// ============================================
const ChildStore = {
  async getChildren(uid) {
    const snap = await db.collection('users').doc(uid).collection('children').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async addChild(uid, data) {
    return await db.collection('users').doc(uid).collection('children').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  },
  async updateChild(uid, childId, data) {
    return await db.collection('users').doc(uid).collection('children').doc(childId).update(data);
  },
  async deleteChild(uid, childId) {
    return await db.collection('users').doc(uid).collection('children').doc(childId).delete();
  }
};

// ============================================
// Health / Growth Store
// ============================================
const HealthStore = {
  async getGrowthRecords(uid, childId) {
    const snap = await db.collection('users').doc(uid).collection('children').doc(childId).collection('growth').orderBy('date').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async addGrowthRecord(uid, childId, data) {
    return await db.collection('users').doc(uid).collection('children').doc(childId).collection('growth').add({ ...data, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  },
  async getVaccineStatus(uid, childId) {
    const snap = await db.collection('users').doc(uid).collection('children').doc(childId).collection('vaccines').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async updateVaccineStatus(uid, childId, vaccineId, data) {
    return await db.collection('users').doc(uid).collection('children').doc(childId).collection('vaccines').doc(vaccineId).set(data, { merge: true });
  }
};

// ============================================
// Daily Schedule Store
// ============================================
const ScheduleStore = {
  async getTodayLogs(uid, childId) {
    const today = new Date().toISOString().split('T')[0];
    const snap = await db.collection('users').doc(uid).collection('children').doc(childId).collection('logs').where('date', '==', today).orderBy('time').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async addLog(uid, childId, data) {
    const today = new Date().toISOString().split('T')[0];
    return await db.collection('users').doc(uid).collection('children').doc(childId).collection('logs').add({ ...data, date: today, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  }
};

// ============================================
// Milestone Store
// ============================================
const MilestoneStore = {
  async getMilestones(uid, childId) {
    const snap = await db.collection('users').doc(uid).collection('children').doc(childId).collection('milestones').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  async setMilestone(uid, childId, milestoneKey, achieved) {
    return await db.collection('users').doc(uid).collection('children').doc(childId).collection('milestones').doc(milestoneKey).set({ achieved, achievedAt: achieved ? firebase.firestore.FieldValue.serverTimestamp() : null }, { merge: true });
  }
};

// ============================================
// Chat History Store
// ============================================
const ChatStore = {
  getHistory(key = 'futful_chat') {
    try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
  },
  saveHistory(messages, key = 'futful_chat') {
    localStorage.setItem(key, JSON.stringify(messages.slice(-50))); // keep last 50
  },
  clearHistory(key = 'futful_chat') {
    localStorage.removeItem(key);
  }
};

// ============================================
// Gemini AI Store
// ============================================
const GeminiStore = {
  async chat(messages) {
    const contents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{
            text: `তুমি FutFul Help Desk, একটি বাংলা মা-শিশু স্বাস্থ্য সহায়তা AI। তুমি শুধুমাত্র বাংলায় উত্তর দেবে। তোমার কাজ হলো:
- শিশু যত্ন সম্পর্কিত প্রশ্নের উত্তর দেওয়া
- মা ও শিশুর স্বাস্থ্য পরামর্শ দেওয়া
- পুষ্টি গাইডেন্স প্রদান করা
- টিকাকরণ তথ্য দেওয়া
- বিকাশ মাইলস্টোন সম্পর্কে জানানো
সর্বদা সহানুভূতিশীল, বন্ধুত্বপূর্ণ এবং সহায়ক থাকো। জরুরি স্বাস্থ্য সমস্যায় অবশ্যই ডাক্তারের কাছে যেতে বলো।`
          }]
        },
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 }
      })
    });

    const data = await resp.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'দুঃখিত, এই মুহূর্তে উত্তর দিতে পারছি না।';
  }
};

// ============================================
// Admin Store
// ============================================
const AdminStore = {
  async isAdmin(uid) {
    const doc = await db.collection('users').doc(uid).get();
    return doc.exists && doc.data().role === 'admin';
  },

  async getAllUsers() {
    const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  },

  async updateUserRole(uid, role) {
    return await db.collection('users').doc(uid).update({ role });
  },

  async deleteUser(uid) {
    return await db.collection('users').doc(uid).delete();
  },

  async getStats() {
    const users = await db.collection('users').get();
    const banners = await db.collection('banners').get();
    const gifts = await db.collection('gifts').get();
    return {
      totalUsers: users.size,
      totalBanners: banners.size,
      totalGifts: gifts.size
    };
  }
};

// ============================================
// Utility Functions
// ============================================
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

function getAgeInMonths(birthDate) {
  const now = new Date();
  const bd = new Date(birthDate);
  return (now.getFullYear() - bd.getFullYear()) * 12 + (now.getMonth() - bd.getMonth());
}

function formatDate(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleDateString('bn-BD', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatTime(date) {
  if (!date) return '';
  const d = date.toDate ? date.toDate() : new Date(date);
  return d.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' });
}

// Bangladesh Vaccine Schedule
const BD_VACCINES = [
  { key: 'bcg', name: 'বিসিজি (যক্ষ্মা)', ageMonths: 0, description: 'জন্মের সাথে সাথে' },
  { key: 'opv0', name: 'ওপিভি-০ (পোলিও)', ageMonths: 0, description: 'জন্মের সাথে সাথে' },
  { key: 'penta1', name: 'পেন্টাভ্যালেন্ট-১', ageMonths: 1.5, description: '৬ সপ্তাহে' },
  { key: 'opv1', name: 'ওপিভি-১', ageMonths: 1.5, description: '৬ সপ্তাহে' },
  { key: 'pcv1', name: 'পিসিভি-১ (নিউমোনিয়া)', ageMonths: 1.5, description: '৬ সপ্তাহে' },
  { key: 'penta2', name: 'পেন্টাভ্যালেন্ট-২', ageMonths: 2.5, description: '১০ সপ্তাহে' },
  { key: 'opv2', name: 'ওপিভি-২', ageMonths: 2.5, description: '১০ সপ্তাহে' },
  { key: 'pcv2', name: 'পিসিভি-২', ageMonths: 2.5, description: '১০ সপ্তাহে' },
  { key: 'penta3', name: 'পেন্টাভ্যালেন্ট-৩', ageMonths: 3.5, description: '১৪ সপ্তাহে' },
  { key: 'opv3', name: 'ওপিভি-৩', ageMonths: 3.5, description: '১৪ সপ্তাহে' },
  { key: 'pcv3', name: 'পিসিভি-৩', ageMonths: 3.5, description: '১৪ সপ্তাহে' },
  { key: 'ipv', name: 'আইপিভি', ageMonths: 3.5, description: '১৪ সপ্তাহে' },
  { key: 'measles1', name: 'হাম-রুবেলা-১', ageMonths: 9, description: '৯ মাসে' },
  { key: 'measles2', name: 'হাম-রুবেলা-২', ageMonths: 15, description: '১৫ মাসে' }
];

// Milestone Data
const MILESTONES = {
  1: ['হাসি দেয়', 'মুখের কাছে হাত আনে', 'শব্দে সাড়া দেয়'],
  2: ['মাথা উপরে তোলে', 'আওয়াজ করে', 'বস্তু ধরতে চেষ্টা করে'],
  4: ['মাথা স্থির রাখে', 'হাত থেকে হাতে বস্তু নেয়', 'গড়াগড়ি দেয়'],
  6: ['বসতে পারে সাহায্যে', 'খাবারে আগ্রহ দেখায়', 'নাম ডাকলে সাড়া দেয়'],
  9: ['সাহায্য ছাড়া বসে', 'হাঁটু দিয়ে হামাগুড়ি দেয়', '"মামা/দাদা" বলে'],
  12: ['একা দাঁড়ায়', 'প্রথম পদক্ষেপ', '২-৩টি শব্দ বলে'],
  18: ['ভালো হাঁটে', '১০+ শব্দ বলে', 'খেলনা ঠেলে চলে'],
  24: ['দৌড়ায়', '২-৩ শব্দের বাক্য', 'কাপড় খোলে']
};
