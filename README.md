# 🍼 FutFul — মা ও শিশু যত্ন অ্যাপ

## 📁 ফাইল স্ট্রাকচার
```
FutFul-Project/
├── index.html      ← ইউজার অ্যাপ (সবার জন্য)
├── admin.html      ← Admin Panel (শুধু আপনার জন্য)
├── vercel.json     ← Vercel Routing Config
└── README.md       ← এই ফাইল
```

## 🚀 Deploy করার নিয়ম

### ধাপ ১ — Firebase Config বসান
`index.html` ও `admin.html` দুটোতেই `FB_CFG` খুঁজে আপনার Firebase config দিন:
```js
const FB_CFG = {
  apiKey: "আপনার API Key",
  authDomain: "আপনার-project.firebaseapp.com",
  projectId: "আপনার-project-id",
  storageBucket: "আপনার-project.appspot.com",
  messagingSenderId: "আপনার Sender ID",
  appId: "আপনার App ID"
};
```

### ধাপ ২ — Firestore Rules সেট করুন
Firebase Console → Firestore → Rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if request.auth != null;
      allow create: if request.auth.uid == userId;
      allow update, delete: if request.auth.uid == userId;
    }
    match /banners/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /gifts/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### ধাপ ৩ — Firestore Composite Index তৈরি করুন
Firebase Console → Firestore → Indexes → Add Index:

**Index ১:**
- Collection: `banners`
- Field 1: `active` (Ascending)
- Field 2: `order` (Ascending)

**Index ২:**
- Collection: `gifts`
- Field 1: `active` (Ascending)
- Field 2: `createdAt` (Descending)

### ধাপ ৪ — Admin Account তৈরি করুন
1. ইউজার অ্যাপে রেজিস্ট্রেশন করুন
2. Firebase Console → Firestore → `users` collection → আপনার document → `role: "admin"` করুন

### ধাপ ৫ — GitHub → Vercel Deploy
1. সব ফাইল GitHub এ আপলোড করুন
2. Vercel এ GitHub connect করুন
3. Deploy করুন

## 🌐 URL
- ইউজার অ্যাপ: `yoursite.vercel.app`
- Admin Panel: `yoursite.vercel.app/admin`

## ✨ ফিচার সমূহ
- ✅ রেজিস্ট্রেশন (WhatsApp + Facebook সহ)
- ✅ Firebase Authentication
- ✅ Admin-controlled Banner Slider
- ✅ Gift/Offer System
- ✅ FutFul Help Desk (বাংলা চ্যাটবট)
- ✅ টিকা ক্যালেন্ডার
- ✅ Growth Chart
- ✅ Milestone Tracker
- ✅ Daily Schedule Logger
- ✅ পুষ্টি গাইড
- ✅ মানসিক স্বাস্থ্য পরামর্শ
