# 🌸 FutFul — মাতৃত্ব ও শিশু যত্ন অ্যাপ

বাংলাদেশের মায়েদের জন্য সম্পূর্ণ শিশু যত্ন ওয়েব অ্যাপ্লিকেশন।

---

## 📁 প্রজেক্ট স্ট্রাকচার

```
futful/
│
├── 📁 admin/
│   └── index.html              ← অ্যাডমিন প্যানেল
│
├── 📁 assets/
│   ├── 📁 css/
│   │   ├── style.css           ← ইউজার অ্যাপ CSS
│   │   └── admin-style.css     ← অ্যাডমিন CSS
│   └── 📁 js/
│       ├── app.js              ← ইউজার অ্যাপ JavaScript
│       └── admin.js            ← অ্যাডমিন JavaScript
│
├── index.html                  ← ইউজার অ্যাপ (মূল পেজ)
├── admin_index.html            ← অ্যাডমিন রিডাইরেক্ট
├── help.html                   ← সাহায্য পেজ
├── app.js                      ← রুট JS হেল্পার
├── netlify.toml                ← Netlify কনফিগ
├── vercel.json                 ← Vercel কনফিগ
└── README.md                   ← এই ফাইল
```

---

## 🔑 Firebase তথ্য

| তথ্য | মান |
|---|---|
| Firebase Project | earning-bot-31c7d |
| Admin UID | HwOGRjEQqQP95ultAQbbSKNkpHn1 |
| Admin Email | mhtotul9@gmail.com |

---

## 🚀 Deploy করার নিয়ম

### GitHub → Vercel
1. সব ফাইল GitHub repository তে আপলোড করুন
2. Vercel.com → New Project → GitHub repo connect করুন
3. Deploy করুন

**URL:**
- ইউজার অ্যাপ: `https://yoursite.vercel.app/`
- অ্যাডমিন: `https://yoursite.vercel.app/admin`

### GitHub → Netlify
1. Netlify.com → New site from Git
2. GitHub repo select করুন
3. Deploy করুন

---

## 🔧 Firebase Realtime Database Rules

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null",
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid || root.child('adminUsers/' + auth.uid).exists()",
        ".write": "$uid === auth.uid || root.child('adminUsers/' + auth.uid).exists()"
      }
    },
    "posts": { ".read": true, ".write": "auth != null" },
    "products": { ".read": true, ".write": "root.child('adminUsers/' + auth.uid).exists()" },
    "banners": { ".read": true, ".write": "root.child('adminUsers/' + auth.uid).exists()" },
    "orders": { ".read": "auth != null", ".write": "auth != null" }
  }
}
```

---

## ✅ ফিচার তালিকা

### ইউজার অ্যাপ
- ✅ Email/Password লগইন (Google বাদ)
- ✅ FutFul Help Desk (আস-সালামু আলাইকুম সহ)
- ✅ ব্যানার স্লাইডার
- ✅ স্বাস্থ্য কেন্দ্র — টিকা ও বৃদ্ধি ট্র্যাকিং
- ✅ পুষ্টি গাইড
- ✅ কমিউনিটি — পোস্ট, লাইক, কমেন্ট
- ✅ পণ্য — কার্ট, চেকআউট, অর্ডার
- ✅ Play Game → fut-ful-earning.vercel.app
- ✅ Start Your Business → new-start-business.vercel.app
- ✅ প্রোফাইল ও অর্ডার ইতিহাস

### অ্যাডমিন প্যানেল
- ✅ সুরক্ষিত লগইন (UID & Email যাচাই)
- ✅ ড্যাশবোর্ড — রিয়েল-টাইম পরিসংখ্যান
- ✅ **পণ্য যোগ/সম্পাদনা/মুছে দেওয়া**
- ✅ **অর্ডার দেখা ও স্ট্যাটাস আপডেট**
- ✅ ব্যবহারকারী ব্যবস্থাপনা
- ✅ কমিউনিটি মডারেশন
- ✅ ব্যানার ব্যবস্থাপনা
- ✅ বিজ্ঞপ্তি পাঠানো

---

*FutFul — আপনার শিশুর সেরা যত্নসঙ্গী 🌸*
