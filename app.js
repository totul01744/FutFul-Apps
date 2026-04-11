// FutFul Root App.js
// This file handles root-level routing and shared utilities

// Detect if user should go to admin or user app
(function() {
  'use strict';
  
  // Check if current page needs any initialization
  const path = window.location.pathname;
  
  // Auto-redirect /admin to /admin/index.html if needed
  if (path === '/admin' || path === '/admin/') {
    window.location.replace('/admin/index.html');
  }
  
  // Log app version
  console.log('FutFul v2.0 | mhtotul9@gmail.com');
})();
