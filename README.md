# 🌸 FutFul — মাতৃত্ব ও শিশু যত্ন অ্যাপ

বাংলাদেশের মায়েদের জন্য সম্পূর্ণ শিশু যত্ন ওয়েব অ্যাপ্লিকেশন।

---

## 📁 প্রজেক্ট স্ট্রাকচার

```
futful/
│
├── 📱 user-app/                    ← ইউজার অ্যাপ
│   ├── index.html                  ← মূল HTML ফাইল
│   ├── style.css                   ← সম্পূর্ণ CSS ডিজাইন
│   ├── app.js                      ← সব ফিচারের JavaScript
│   └── manifest.json               ← PWA কনফিগারেশন
│
├── 🛡️ admin-app/                   ← অ্যাডমিন প্যানেল
│   ├── index.html                  ← অ্যাডমিন HTML
│   ├── admin-style.css             ← অ্যাডমিন CSS
│   └── admin.js                    ← অ্যাডমিন JavaScript
│
├── 📄 README.md                    ← এই ফাইল
└── 🔒 .gitignore                   ← Git ignore ফাইল
```

---

## 🔑 গুরুত্বপূর্ণ তথ্য

| তথ্য | মান |
|---|---|
| Firebase Project | earning-bot-31c7d |
| Admin UID | HwOGRjEQqQP95ultAQbbSKNkpHn1 |
| Admin Email | mhtotul9@gmail.com |

---

## 🚀 GitHub → Vercel Deploy

1. সব ফাইল GitHub এ আপলোড করুন
2. Vercel → New Project → GitHub connect
3. Deploy করুন

**URL:**
- ইউজার অ্যাপ: `yoursite.vercel.app/user-app/`
- অ্যাডমিন: `yoursite.vercel.app/admin-app/`

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

## ✅ পরিবর্তনের তালিকা (এই ভার্সনে)

- ✅ Google লগইন বাদ — শুধু ইমেইল/পাসওয়ার্ড
- ✅ Help Desk: "নমস্কার" → "আস-সালামু আলাইকুম"
- ✅ Play Game বাটন → https://fut-ful-earning.vercel.app/
- ✅ Start Your Business বাটন → https://new-start-business.vercel.app/
- ✅ পয়েন্ট ও রিডেম সিস্টেম বাদ দেওয়া হয়েছে
- ✅ সব ডেটা Firebase এ সেভ হয় (localStorage নেই)
- ✅ ব্রাউজার ইমেইল/পাসওয়ার্ড autocomplete সক্রিয়

---

*FutFul — আপনার শিশুর সেরা যত্নসঙ্গী 🌸*
