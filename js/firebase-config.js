// Firebase configuration
const firebaseConfig = {
  apiKey: window.FIREBASE_API_KEY || "",
  authDomain: window.FIREBASE_AUTH_DOMAIN || "",
  databaseURL: window.FIREBASE_DATABASE_URL || "",
  projectId: window.FIREBASE_PROJECT_ID || "",
  storageBucket: window.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: window.FIREBASE_APP_ID || ""
};

// Initialize Firebase
const firebaseApp = firebase.initializeApp(firebaseConfig);
const database = firebase.database();
let messaging = null;

// Initialize Firebase Cloud Messaging if browser supports it
if (firebase.messaging.isSupported()) {
  messaging = firebase.messaging();
  
  // Request permission for notifications
  messaging.onMessage((payload) => {
    console.log('Message received:', payload);
    
    // Show notification using the Notification API if the app is in the foreground
    if ('Notification' in window && Notification.permission === 'granted') {
      const notificationOptions = {
        body: payload.notification.body,
        icon: 'assets/icon.svg'
      };
      
      new Notification(payload.notification.title, notificationOptions);
    }
  });
}

// Function to request notification permission
function requestNotificationPermission() {
  return new Promise((resolve, reject) => {
    if (!messaging) {
      reject(new Error('This browser does not support notifications'));
      return;
    }
    
    Notification.requestPermission()
      .then(permission => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
          
          // Get FCM token
          messaging.getToken({ vapidKey: window.FIREBASE_VAPID_KEY || "" })
            .then(token => {
              console.log('FCM Token:', token);
              // Store the token in localStorage
              localStorage.setItem('fcmToken', token);
              resolve(token);
            })
            .catch(err => {
              console.error('Error getting FCM token:', err);
              reject(err);
            });
        } else {
          console.warn('Notification permission denied');
          reject(new Error('Permission denied'));
        }
      })
      .catch(err => {
        console.error('Error requesting notification permission:', err);
        reject(err);
      });
  });
}

// Export Firebase references
window.firebaseApp = firebaseApp;
window.database = database;
window.messaging = messaging;
window.requestNotificationPermission = requestNotificationPermission;
