// Environment Configuration
// This file is processed by the server to replace environment variables

// Firebase Configuration
window.FIREBASE_API_KEY = "{{ env.FIREBASE_API_KEY }}";
window.FIREBASE_AUTH_DOMAIN = "{{ env.FIREBASE_AUTH_DOMAIN }}";
window.FIREBASE_DATABASE_URL = "{{ env.FIREBASE_DATABASE_URL }}";
window.FIREBASE_PROJECT_ID = "{{ env.FIREBASE_PROJECT_ID }}";
window.FIREBASE_STORAGE_BUCKET = "{{ env.FIREBASE_STORAGE_BUCKET }}";
window.FIREBASE_MESSAGING_SENDER_ID = "{{ env.FIREBASE_MESSAGING_SENDER_ID }}";
window.FIREBASE_APP_ID = "{{ env.FIREBASE_APP_ID }}";
window.FIREBASE_VAPID_KEY = "{{ env.FIREBASE_VAPID_KEY }}";

// Google Maps API Key
window.GOOGLE_MAPS_API_KEY = "{{ env.GOOGLE_MAPS_API_KEY }}";