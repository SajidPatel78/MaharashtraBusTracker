// Bus Service - Handles fetching and processing bus data from Firebase

class BusService {
  constructor() {
    this.buses = {};
    this.stops = {};
    this.routes = {};
    this.busesRef = window.database.ref('buses');
    this.stopsRef = window.database.ref('stops');
    this.routesRef = window.database.ref('routes');
    this.listeners = [];
  }

  // Initialize the bus service and start listening for updates
  init() {
    this.startListeningForBusUpdates();
    this.fetchBusStops();
    this.fetchRoutes();
  }

  // Start listening for real-time bus updates
  startListeningForBusUpdates() {
    // Listen for added/changed buses
    this.busesRef.on('child_added', this.handleBusUpdate.bind(this));
    this.busesRef.on('child_changed', this.handleBusUpdate.bind(this));
    
    // Listen for removed buses
    this.busesRef.on('child_removed', snapshot => {
      const busId = snapshot.key;
      delete this.buses[busId];
      
      // Remove the marker from the map
      if (window.mapController) {
        window.mapController.removeBusMarker(busId);
      }
      
      // Notify listeners
      this.notifyListeners('busRemoved', busId);
    });
  }

  // Handle bus data updates
  handleBusUpdate(snapshot) {
    const busId = snapshot.key;
    const busData = snapshot.val();
    
    if (!busData || !busData.location) {
      console.error('Invalid bus data:', busData);
      return;
    }
    
    // Process and store bus data
    const bus = {
      id: busId,
      busNumber: busData.busNumber || 'Unknown',
      routeId: busData.routeId,
      routeName: busData.routeName || 'Unknown Route',
      location: {
        lat: parseFloat(busData.location.lat),
        lng: parseFloat(busData.location.lng)
      },
      heading: busData.heading !== undefined ? parseFloat(busData.heading) : 0,
      speed: busData.speed !== undefined ? parseFloat(busData.speed) : 0,
      status: busData.status || 'active',
      lastUpdated: busData.lastUpdated || Date.now(),
      nextStop: busData.nextStop || null
    };
    
    // Add route information if available
    if (busData.routeId && this.routes[busData.routeId]) {
      bus.route = this.routes[busData.routeId];
    }
    
    // Calculate ETA for next stop if not provided
    if (bus.nextStop && !bus.nextStop.eta && bus.location && bus.speed > 0) {
      if (bus.nextStop.location) {
        // Simple ETA calculation based on distance and speed
        const distance = this.calculateDistance(
          bus.location.lat, bus.location.lng,
          bus.nextStop.location.lat, bus.nextStop.location.lng
        );
        
        // Convert speed from km/h to m/s if available
        const speedInMs = bus.speed / 3.6;
        if (speedInMs > 0) {
          const etaSeconds = distance / speedInMs;
          const etaMinutes = Math.ceil(etaSeconds / 60);
          
          bus.nextStop.eta = etaMinutes <= 1 ? 'Arriving' : `${etaMinutes} min`;
        }
      }
    }
    
    // Store bus data
    this.buses[busId] = bus;
    
    // Update the map marker
    if (window.mapController) {
      window.mapController.updateBusMarker(bus);
    }
    
    // Notify listeners
    this.notifyListeners('busUpdated', bus);
    
    // Check for nearby buses that are being tracked
    this.checkForNearbyTrackedBuses(bus);
  }

  // Fetch bus stops data
  fetchBusStops() {
    this.stopsRef.once('value')
      .then(snapshot => {
        const stopsData = snapshot.val();
        if (!stopsData) {
          console.warn('No bus stops data available');
          return;
        }
        
        this.stops = stopsData;
        
        // Notify listeners
        this.notifyListeners('stopsLoaded', this.stops);
      })
      .catch(error => {
        console.error('Error fetching bus stops:', error);
      });
  }

  // Fetch routes data
  fetchRoutes() {
    this.routesRef.once('value')
      .then(snapshot => {
        const routesData = snapshot.val();
        if (!routesData) {
          console.warn('No routes data available');
          return;
        }
        
        this.routes = routesData;
        
        // Update buses with route information
        Object.values(this.buses).forEach(bus => {
          if (bus.routeId && this.routes[bus.routeId]) {
            bus.route = this.routes[bus.routeId];
          }
        });
        
        // Notify listeners
        this.notifyListeners('routesLoaded', this.routes);
      })
      .catch(error => {
        console.error('Error fetching routes:', error);
      });
  }

  // Search for buses or stops
  search(query) {
    if (!query || query.trim() === '') {
      return { buses: [], stops: [], routes: [] };
    }
    
    query = query.toLowerCase().trim();
    
    // Search buses
    const matchedBuses = Object.values(this.buses).filter(bus => {
      return bus.busNumber.toLowerCase().includes(query) || 
             (bus.routeName && bus.routeName.toLowerCase().includes(query));
    });
    
    // Search stops
    const matchedStops = Object.values(this.stops).filter(stop => {
      return stop.name.toLowerCase().includes(query);
    });
    
    // Search routes
    const matchedRoutes = Object.values(this.routes).filter(route => {
      return route.name.toLowerCase().includes(query) || 
             (route.from && route.from.toLowerCase().includes(query)) ||
             (route.to && route.to.toLowerCase().includes(query));
    });
    
    return {
      buses: matchedBuses,
      stops: matchedStops,
      routes: matchedRoutes
    };
  }

  // Calculate distance between two points in meters (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }

  // Check if a tracked bus is near the user
  checkForNearbyTrackedBuses(bus) {
    const trackedBuses = JSON.parse(localStorage.getItem('trackedBuses') || '[]');
    
    // If this bus is being tracked and the user has a location
    if (trackedBuses.includes(bus.id) && 
        window.mapController && 
        window.mapController.userLocation) {
      
      const userLocation = window.mapController.userLocation;
      const distance = this.calculateDistance(
        userLocation.lat, userLocation.lng,
        bus.location.lat, bus.location.lng
      );
      
      // If the bus is within 1000 meters (1 km)
      if (distance <= 1000) {
        // Get the last notification time for this bus
        const lastNotificationTime = parseInt(localStorage.getItem(`lastNotification_${bus.id}`) || '0');
        const currentTime = Date.now();
        
        // Only notify if we haven't sent a notification in the last 5 minutes
        if (currentTime - lastNotificationTime > 5 * 60 * 1000) {
          // Send a notification
          if (window.notificationService) {
            window.notificationService.showNearbyBusNotification(bus);
            
            // Update the last notification time
            localStorage.setItem(`lastNotification_${bus.id}`, currentTime.toString());
          }
        }
      }
    }
  }

  // Get a list of all buses
  getAllBuses() {
    return Object.values(this.buses);
  }

  // Get a list of all stops
  getAllStops() {
    return Object.values(this.stops);
  }

  // Get a list of all routes
  getAllRoutes() {
    return Object.values(this.routes);
  }

  // Get a specific bus by ID
  getBusById(busId) {
    return this.buses[busId] || null;
  }

  // Get a specific stop by ID
  getStopById(stopId) {
    return this.stops[stopId] || null;
  }

  // Get a specific route by ID
  getRouteById(routeId) {
    return this.routes[routeId] || null;
  }

  // Add a listener for data updates
  addListener(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  // Remove a listener
  removeListener(callback) {
    const index = this.listeners.indexOf(callback);
    if (index !== -1) {
      this.listeners.splice(index, 1);
    }
  }

  // Notify all listeners about an event
  notifyListeners(event, data) {
    this.listeners.forEach(callback => {
      try {
        callback(event, data);
      } catch (error) {
        console.error('Error in bus service listener:', error);
      }
    });
  }
}

// Initialize the bus service
window.busService = new BusService();
