# 🌸 FutFul — মাতৃত্ব ও শিশু যত্ন

## 📁 প্রজেক্ট স্ট্রাকচার

```
futful/
├── admin/
│   └── index.html          ← অ্যাডমিন প্যানেল
├── assets/
│   ├── css/
│   │   └── style.css       ← ইউজার অ্যাপ CSS
│   └── js/
│       └── app.js          ← ইউজার অ্যাপ JavaScript
├── README.md
├── admin_index.html        ← Admin redirect
├── app.js                  ← (legacy - assets/js/app.js ব্যবহার করুন)
├── help.html               ← সাহায্য পেজ
├── index.html              ← ইউজার অ্যাপ (মূল পেজ)
├── manifest.json           ← PWA কনফিগারেশন
├── netlify.toml            ← Netlify কনফিগ
└── vercel.json             ← Vercel কনফিগ
```

## 🚀 Deploy করার নিয়ম

### GitHub Pages:
1. GitHub-এ নতুন repository তৈরি করুন
2. সব ফাইল আপলোড করুন (ফোল্ডার সহ)
3. Settings → Pages → Branch: main → Save
4. ইউজার অ্যাপ: `https://username.github.io/futful/`
5. অ্যাডমিন: `https://username.github.io/futful/admin/`

### Netlify (সবচেয়ে সহজ):
1. [netlify.com](https://netlify.com) এ যান
2. "Deploy manually" বেছে নিন
3. পুরো ফোল্ডার drag & drop করুন
4. Instant deploy!

### Vercel:
1. [vercel.com](https://vercel.com) এ যান
2. GitHub repository connect করুন
3. Auto deploy!

## 🔑 Firebase Setup

Firebase Console → Authentication → Sign-in method → Email/Password সক্রিয় করুন

**Admin লগইন:**
- Email: `totul01744@gmail.com`
- Password: আপনার Firebase পাসওয়ার্ড

## 📱 HopWeb দিয়ে Android অ্যাপ

1. HopWeb অ্যাপ খুলুন
2. URL: `https://your-site.netlify.app/`
3. App build করুন → APK ডাউনলোড

---
*FutFul — আপনার শিশুর সেরা যত্নসঙ্গী 🌸*
