// Notification Service - Handles push notifications and alerts

class NotificationService {
  constructor() {
    this.fcmToken = localStorage.getItem('fcmToken') || null;
    this.permissionGranted = false;
    this.subscribedTopics = JSON.parse(localStorage.getItem('subscribedTopics') || '[]');
  }

  // Initialize the notification service
  init() {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }
    
    // Check if permission is already granted
    if (Notification.permission === 'granted') {
      this.permissionGranted = true;
    }
    
    // If messaging is supported, setup FCM
    if (window.messaging) {
      this.setupFCM();
    }
    
    return true;
  }

  // Setup Firebase Cloud Messaging
  setupFCM() {
    // Handle FCM messages when the app is in the foreground
    window.messaging.onMessage(payload => {
      console.log('Message received:', payload);
      
      this.showLocalNotification(
        payload.notification.title,
        payload.notification.body,
        payload.data
      );
    });
  }

  // Subscribe to notifications (request permission if needed)
  subscribeToNotifications() {
    return new Promise((resolve, reject) => {
      if (this.permissionGranted) {
        resolve();
        return;
      }
      
      Notification.requestPermission()
        .then(permission => {
          if (permission === 'granted') {
            this.permissionGranted = true;
            
            // Get FCM token if available
            if (window.messaging) {
              window.requestNotificationPermission()
                .then(token => {
                  this.fcmToken = token;
                  resolve();
                })
                .catch(reject);
            } else {
              resolve();
            }
          } else {
            reject(new Error('Notification permission denied'));
          }
        })
        .catch(reject);
    });
  }

  // Subscribe to a specific bus's notifications
  subscribeToBus(busId, busNumber) {
    if (!busId) return;
    
    // Store locally that we're subscribed to this bus
    if (!this.subscribedTopics.includes(busId)) {
      this.subscribedTopics.push(busId);
      localStorage.setItem('subscribedTopics', JSON.stringify(this.subscribedTopics));
    }
    
    // If FCM is available, subscribe to the bus topic
    if (this.fcmToken && window.messaging) {
      const topic = `bus_${busId}`;
      
      // In a real app, we would make an API call to subscribe to this topic
      // For this example, we'll just log it
      console.log(`Subscribed to notifications for bus ${busNumber} (ID: ${busId})`);
    }
  }

  // Unsubscribe from a specific bus's notifications
  unsubscribeFromBus(busId) {
    if (!busId) return;
    
    // Remove from local storage
    const index = this.subscribedTopics.indexOf(busId);
    if (index !== -1) {
      this.subscribedTopics.splice(index, 1);
      localStorage.setItem('subscribedTopics', JSON.stringify(this.subscribedTopics));
    }
    
    // If FCM is available, unsubscribe from the bus topic
    if (this.fcmToken && window.messaging) {
      const topic = `bus_${busId}`;
      
      // In a real app, we would make an API call to unsubscribe from this topic
      // For this example, we'll just log it
      console.log(`Unsubscribed from notifications for bus ID: ${busId}`);
    }
  }

  // Show a local notification (for app in foreground)
  showLocalNotification(title, body, data = {}) {
    if (!this.permissionGranted) return;
    
    // Use the Notifications API directly
    const options = {
      body: body,
      icon: 'assets/icon.svg',
      data: data,
      vibrate: [100, 50, 100]
    };
    
    const notification = new Notification(title, options);
    
    notification.onclick = () => {
      notification.close();
      
      // Handle notification click
      if (data.busId) {
        // Focus on the specific bus
        window.focus();
        if (window.mapController && window.busService) {
          const bus = window.busService.getBusById(data.busId);
          if (bus) {
            window.mapController.selectBus(data.busId, bus);
          }
        }
      } else {
        window.focus();
      }
    };
  }

  // Show notification for nearby bus
  showNearbyBusNotification(bus) {
    if (!bus) return;
    
    const title = 'Bus Approaching';
    const body = `Bus ${bus.busNumber} is nearby (${bus.routeName || 'Unknown Route'})`;
    const data = { busId: bus.id };
    
    this.showLocalNotification(title, body, data);
  }

  // Show a notification for a bus arrival
  showBusArrivalNotification(stop, bus, eta) {
    if (!stop || !bus) return;
    
    const title = 'Bus Arrival Update';
    const body = `Bus ${bus.busNumber} will arrive at ${stop.name} in ${eta}`;
    const data = { busId: bus.id, stopId: stop.id };
    
    this.showLocalNotification(title, body, data);
  }

  // Show a generic alert using the snackbar
  showAlert(message, actionText = null, actionHandler = null) {
    const snackbarContainer = document.querySelector('.mdl-snackbar');
    const data = {
      message: message,
      timeout: 4000
    };
    
    if (actionText && actionHandler) {
      data.actionText = actionText;
      data.actionHandler = actionHandler;
    }
    
    snackbarContainer.MaterialSnackbar.showSnackbar(data);
  }
}

// Initialize the notification service
window.notificationService = new NotificationService();

// Helper function to show a snackbar notification
function showSnackbar(message, actionText = null, actionHandler = null) {
  const snackbarContainer = document.querySelector('.mdl-snackbar');
  const data = {
    message: message,
    timeout: 4000
  };
  
  if (actionText && actionHandler) {
    data.actionText = actionText;
    data.actionHandler = actionHandler;
  }
  
  snackbarContainer.MaterialSnackbar.showSnackbar(data);
}

// Make showSnackbar globally available
window.showSnackbar = showSnackbar;
