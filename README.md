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

## 🚀 GitHub-এ আপলোড করার নিয়ম

### ধাপ ১: GitHub অ্যাকাউন্ট তৈরি করুন
- [github.com](https://github.com) এ যান
- নতুন অ্যাকাউন্ট তৈরি করুন বা লগইন করুন

### ধাপ ২: নতুন Repository তৈরি করুন
1. GitHub-এ লগইন করার পর ডানদিকে **"+"** বাটনে ক্লিক করুন
2. **"New repository"** সিলেক্ট করুন
3. Repository name: `futful` দিন
4. **Public** বা **Private** সিলেক্ট করুন
5. **"Create repository"** ক্লিক করুন

### ধাপ ৩: ফাইল আপলোড করুন (সহজ পদ্ধতি)

**পদ্ধতি A — GitHub ওয়েবসাইট থেকে (সবচেয়ে সহজ):**
1. Repository পেজে **"uploading an existing file"** লিংকে ক্লিক করুন
2. নিচের ফাইলগুলো ফোল্ডার সহ drag & drop করুন:
   ```
   user-app/index.html
   user-app/style.css
   user-app/app.js
   user-app/manifest.json
   admin-app/index.html
   admin-app/admin-style.css
   admin-app/admin.js
   README.md
   ```
3. **"Commit changes"** ক্লিক করুন

**পদ্ধতি B — Git Command Line:**
```bash
# প্রথমে Git ইন্সটল করুন: https://git-scm.com
git init
git add .
git commit -m "FutFul প্রথম কমিট"
git branch -M main
git remote add origin https://github.com/আপনার-username/futful.git
git push -u origin main
```

### ধাপ ৪: GitHub Pages দিয়ে লাইভ করুন (ফ্রি হোস্টিং)
1. Repository → **Settings** → **Pages**
2. Source: **"Deploy from a branch"**
3. Branch: **main** → folder: **/ (root)**
4. **Save** ক্লিক করুন
5. কিছুক্ষণ পর লাইভ লিংক পাবেন:
   - ইউজার অ্যাপ: `https://username.github.io/futful/user-app/`
   - অ্যাডমিন: `https://username.github.io/futful/admin-app/`

---

## 📱 HopWeb দিয়ে Android অ্যাপ বানানোর নিয়ম

1. **HopWeb** অ্যাপ ডাউনলোড করুন (Play Store)
2. অ্যাপ খুলুন → **"New App"** ক্লিক করুন
3. URL দিন: `https://username.github.io/futful/user-app/`
4. অ্যাপের নাম: **FutFul** দিন
5. **Build** করুন এবং APK ডাউনলোড করুন
6. ফোনে ইন্সটল করুন

> **Admin App-এর জন্য:** আলাদাভাবে `admin-app/` URL দিয়ে আরেকটি অ্যাপ বানান

---

## 🔧 Firebase সেটআপ (গুরুত্বপূর্ণ)

### Authentication সক্রিয় করুন:
1. [console.firebase.google.com](https://console.firebase.google.com) এ যান
2. আপনার প্রজেক্ট সিলেক্ট করুন: `earning-bot-31c7d`
3. **Authentication** → **Sign-in method**
4. সক্রিয় করুন:
   - ✅ **Email/Password**
   - ✅ **Google**

### Authorized Domains যোগ করুন:
1. **Authentication** → **Settings** → **Authorized domains**
2. যোগ করুন:
   - `username.github.io`
   - `localhost`

### Firebase Storage Rules:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### Firebase Database Rules:
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
    "posts": {
      ".read": true,
      ".write": "auth != null"
    },
    "products": {
      ".read": true,
      ".write": "root.child('adminUsers/' + auth.uid).exists()"
    },
    "banners": {
      ".read": true,
      ".write": "root.child('adminUsers/' + auth.uid).exists()"
    },
    "notifications": {
      ".read": "auth != null",
      ".write": "root.child('adminUsers/' + auth.uid).exists()"
    },
    "orders": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

---

## ✅ ফিচার চেকলিস্ট

### 📱 ইউজার অ্যাপ
- ✅ Email/Password ও Google লগইন
- ✅ হোম — ব্যানার স্লাইডার, AI চ্যাটবট
- ✅ স্বাস্থ্য কেন্দ্র — টিকা, বৃদ্ধি ট্র্যাকিং
- ✅ পুষ্টি গাইড — বয়স অনুযায়ী খাবার
- ✅ বিকাশ ট্র্যাকার — মাইলস্টোন চেকলিস্ট
- ✅ দৈনিক সময়সূচী — রুটিন ও মানসিক সহায়তা
- ✅ কমিউনিটি — পোস্ট, লাইক, কমেন্ট
- ✅ পণ্য — কার্ট, চেকআউট, অর্ডার
- ✅ উপার্জন — দৈনিক বোনাস, পয়েন্ট
- ✅ সরঞ্জাম — ৮টি ক্যালকুলেটর, জরুরি কল
- ✅ প্রোফাইল — শিশু প্রোফাইল, অর্ডার ইতিহাস
- ✅ Gemini AI চ্যাটবট (বাংলায়)

### 🛡️ অ্যাডমিন প্যানেল
- ✅ সুরক্ষিত অ্যাডমিন লগইন
- ✅ ড্যাশবোর্ড — রিয়েল-টাইম পরিসংখ্যান ও চার্ট
- ✅ ব্যবহারকারী ব্যবস্থাপনা — CRUD, পয়েন্ট সমন্বয়
- ✅ কমিউনিটি মডারেশন — পোস্ট অনুমোদন/প্রত্যাখ্যান
- ✅ পণ্য ব্যবস্থাপনা — যোগ/সম্পাদনা/মুছুন
- ✅ অর্ডার ট্র্যাকিং — স্ট্যাটাস আপডেট
- ✅ ই-বুক ব্যবস্থাপনা
- ✅ রাজস্ব ড্যাশবোর্ড ও চার্ট
- ✅ ব্যানার ব্যবস্থাপনা
- ✅ পুশ নোটিফিকেশন পাঠানো
- ✅ টিকা ও স্বাস্থ্যকেন্দ্র ব্যবস্থাপনা
- ✅ পয়েন্ট কনফিগারেশন
- ✅ বিশ্লেষণ ও রিপোর্ট
- ✅ সেটিংস ও ডেটা ব্যাকআপ

---

## 🔑 গুরুত্বপূর্ণ তথ্য

| তথ্য | মান |
|------|-----|
| Firebase Project | earning-bot-31c7d |
| Admin UID | HwOGRjEQqQP95ultAQbbSKNkpHn1 |
| Admin Email | mhtotul9@gmail.com |
| Database Region | asia-southeast1 |

---

## 📞 সাপোর্ট

যেকোনো সমস্যায়: **mhtotul9@gmail.com**

---
*FutFul — আপনার শিশুর সেরা যত্নসঙ্গী 🌸*
