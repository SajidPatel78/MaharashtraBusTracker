// Map Controller - Handles the Google Maps integration and bus tracking visualization

class MapController {
  constructor() {
    this.map = null;
    this.markers = {};
    this.selectedBusId = null;
    this.centerUpdated = false;
    this.userLocation = null;
    this.infoWindow = null;
    this.busRoutePaths = {};
    this.userLocationMarker = null;
    this.defaultLocation = { lat: 19.0760, lng: 72.8777 }; // Mumbai default
  }

  // Initialize the Google Maps
  initMap() {
    // Create a map instance
    this.map = new google.maps.Map(document.getElementById('map'), {
      center: this.defaultLocation,
      zoom: 12,
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
      zoomControlOptions: {
        position: google.maps.ControlPosition.RIGHT_BOTTOM
      }
    });

    // Create info window for markers
    this.infoWindow = new google.maps.InfoWindow();
    
    // Try to get user's current location
    this.getUserLocation()
      .then(position => {
        this.userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // Add user location marker
        this.addUserLocationMarker();
        
        if (!this.centerUpdated) {
          this.map.setCenter(this.userLocation);
          this.centerUpdated = true;
        }
      })
      .catch(error => {
        console.warn('Error getting user location:', error);
      });
    
    // Add map controls
    this.addMapControls();
    
    // Add map event listeners
    this.map.addListener('click', () => {
      // Close any open info windows
      this.infoWindow.close();
      
      // Hide bus info panel if it's open
      const busInfoPanel = document.getElementById('bus-info-panel');
      if (busInfoPanel.classList.contains('active')) {
        busInfoPanel.classList.remove('active');
      }
    });
    
    return this.map;
  }
  
  // Get user's current location
  getUserLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    });
  }
  
  // Add user location marker to the map
  addUserLocationMarker() {
    if (!this.userLocation) return;
    
    if (this.userLocationMarker) {
      this.userLocationMarker.setPosition(this.userLocation);
    } else {
      // Create custom marker for user location
      this.userLocationMarker = new google.maps.Marker({
        position: this.userLocation,
        map: this.map,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2
        },
        title: 'Your Location'
      });
    }
  }
  
  // Add custom controls to the map
  addMapControls() {
    // Create a custom control for centering on user location
    const locationControlDiv = document.createElement('div');
    locationControlDiv.className = 'custom-map-control';
    locationControlDiv.innerHTML = `
      <button class="mdl-button mdl-js-button mdl-button--fab mdl-button--mini-fab mdl-js-ripple-effect">
        <i class="material-icons">my_location</i>
      </button>
    `;
    
    locationControlDiv.addEventListener('click', () => {
      if (this.userLocation) {
        this.map.panTo(this.userLocation);
        this.map.setZoom(15);
      } else {
        this.getUserLocation()
          .then(position => {
            this.userLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            this.addUserLocationMarker();
            this.map.panTo(this.userLocation);
            this.map.setZoom(15);
          })
          .catch(error => {
            console.warn('Error getting user location:', error);
            showSnackbar('Could not get your location. Please check your settings.');
          });
      }
    });
    
    this.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(locationControlDiv);
  }
  
  // Add or update a bus marker on the map
  updateBusMarker(bus) {
    if (!bus || !bus.id || !bus.location || !bus.location.lat || !bus.location.lng) {
      console.error('Invalid bus data:', bus);
      return;
    }
    
    const position = {
      lat: parseFloat(bus.location.lat),
      lng: parseFloat(bus.location.lng)
    };
    
    // Check if marker already exists
    if (this.markers[bus.id]) {
      // Update existing marker position
      this.markers[bus.id].setPosition(position);
    } else {
      // Create new marker
      const markerElement = document.createElement('div');
      markerElement.className = 'bus-marker';
      markerElement.title = `Bus ${bus.busNumber}`;
      
      // Create custom marker
      const marker = new google.maps.Marker({
        position: position,
        map: this.map,
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: '#0066cc',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 1,
          rotation: bus.heading || 0
        },
        title: `Bus ${bus.busNumber} - ${bus.routeName || 'Unknown Route'}`
      });
      
      // Add click listener to the marker
      marker.addListener('click', () => {
        this.selectBus(bus.id, bus);
      });
      
      this.markers[bus.id] = marker;
    }
    
    // Update marker rotation if heading is available
    if (bus.heading !== undefined) {
      const icon = this.markers[bus.id].getIcon();
      icon.rotation = bus.heading;
      this.markers[bus.id].setIcon(icon);
    }
    
    // If this is the selected bus, update the info panel
    if (this.selectedBusId === bus.id) {
      this.updateBusInfoPanel(bus);
    }
  }
  
  // Select a bus and show its info
  selectBus(busId, busData) {
    // Deselect previous bus
    if (this.selectedBusId && this.markers[this.selectedBusId]) {
      const previousIcon = this.markers[this.selectedBusId].getIcon();
      previousIcon.fillColor = '#0066cc';
      previousIcon.scale = 5;
      this.markers[this.selectedBusId].setIcon(previousIcon);
    }
    
    this.selectedBusId = busId;
    
    // Highlight selected bus
    if (this.markers[busId]) {
      const icon = this.markers[busId].getIcon();
      icon.fillColor = '#ff9800';
      icon.scale = 6;
      this.markers[busId].setIcon(icon);
      
      // Center the map on the selected bus
      this.map.panTo(this.markers[busId].getPosition());
      
      // Show bus info
      this.showBusInfo(busData);
    }
  }
  
  // Show bus information in the panel
  showBusInfo(bus) {
    const busInfoPanel = document.getElementById('bus-info-panel');
    
    document.getElementById('bus-number').textContent = `Bus ${bus.busNumber}`;
    document.getElementById('bus-route').textContent = bus.routeName || 'Not available';
    document.getElementById('bus-from').textContent = bus.route?.from || 'Not available';
    document.getElementById('bus-to').textContent = bus.route?.to || 'Not available';
    document.getElementById('next-stop').textContent = bus.nextStop?.name || 'Not available';
    document.getElementById('bus-eta').textContent = bus.nextStop?.eta || 'Not available';
    
    // Show the panel
    busInfoPanel.classList.add('active');
    
    // Setup track button
    const trackBusBtn = document.getElementById('track-bus');
    trackBusBtn.setAttribute('data-bus-id', bus.id);
    
    // Check if bus is already being tracked
    const trackedBuses = JSON.parse(localStorage.getItem('trackedBuses') || '[]');
    if (trackedBuses.includes(bus.id)) {
      trackBusBtn.textContent = 'Stop Tracking';
      trackBusBtn.classList.add('tracked');
    } else {
      trackBusBtn.textContent = 'Track This Bus';
      trackBusBtn.classList.remove('tracked');
    }
    
    // Add event listener for the track button
    trackBusBtn.onclick = () => {
      this.toggleBusTracking(bus);
    };
    
    // Draw bus route if available
    if (bus.route && bus.route.path) {
      this.drawBusRoute(bus);
    }
  }
  
  // Toggle tracking for a bus
  toggleBusTracking(bus) {
    const trackBusBtn = document.getElementById('track-bus');
    const trackedBuses = JSON.parse(localStorage.getItem('trackedBuses') || '[]');
    
    if (trackedBuses.includes(bus.id)) {
      // Remove from tracked buses
      const index = trackedBuses.indexOf(bus.id);
      trackedBuses.splice(index, 1);
      trackBusBtn.textContent = 'Track This Bus';
      trackBusBtn.classList.remove('tracked');
      
      // Unsubscribe from notifications for this bus
      if (window.notificationService) {
        window.notificationService.unsubscribeFromBus(bus.id);
      }
      
      showSnackbar(`Stopped tracking Bus ${bus.busNumber}`);
    } else {
      // Add to tracked buses
      trackedBuses.push(bus.id);
      trackBusBtn.textContent = 'Stop Tracking';
      trackBusBtn.classList.add('tracked');
      
      // Subscribe to notifications for this bus
      if (window.notificationService) {
        window.notificationService.subscribeToNotifications()
          .then(() => {
            window.notificationService.subscribeToBus(bus.id, bus.busNumber);
            showSnackbar(`Now tracking Bus ${bus.busNumber}. You'll be notified when it's nearby.`);
          })
          .catch(error => {
            console.error('Failed to subscribe to notifications:', error);
            showSnackbar('Could not enable notifications. Please check your browser settings.');
          });
      } else {
        showSnackbar(`Now tracking Bus ${bus.busNumber}.`);
      }
    }
    
    localStorage.setItem('trackedBuses', JSON.stringify(trackedBuses));
    
    // Update the favorites list if visible
    if (document.getElementById('favorites-list')) {
      window.app.updateFavoritesList();
    }
  }
  
  // Draw bus route on the map
  drawBusRoute(bus) {
    // Remove any existing route path
    if (this.currentRoutePath) {
      this.currentRoutePath.setMap(null);
    }
    
    // If no path data, exit
    if (!bus.route || !bus.route.path || !Array.isArray(bus.route.path)) {
      return;
    }
    
    const routePath = bus.route.path.map(point => ({
      lat: parseFloat(point.lat),
      lng: parseFloat(point.lng)
    }));
    
    this.currentRoutePath = new google.maps.Polyline({
      path: routePath,
      geodesic: true,
      strokeColor: '#FF6D00',
      strokeOpacity: 0.8,
      strokeWeight: 3
    });
    
    this.currentRoutePath.setMap(this.map);
    
    // Add stop markers if available
    if (bus.route.stops && Array.isArray(bus.route.stops)) {
      // Remove existing stop markers
      if (this.stopMarkers) {
        this.stopMarkers.forEach(marker => marker.setMap(null));
      }
      
      this.stopMarkers = bus.route.stops.map(stop => {
        return new google.maps.Marker({
          position: { lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) },
          map: this.map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: '#FF6D00',
            fillOpacity: 0.7,
            strokeColor: '#FFFFFF',
            strokeWeight: 1
          },
          title: stop.name
        });
      });
    }
  }
  
  // Update bus info panel with latest data
  updateBusInfoPanel(bus) {
    if (!document.getElementById('bus-info-panel').classList.contains('active')) {
      return;
    }
    
    document.getElementById('next-stop').textContent = bus.nextStop?.name || 'Not available';
    document.getElementById('bus-eta').textContent = bus.nextStop?.eta || 'Not available';
  }
  
  // Remove a bus marker from the map
  removeBusMarker(busId) {
    if (this.markers[busId]) {
      this.markers[busId].setMap(null);
      delete this.markers[busId];
      
      // If this was the selected bus, close the info panel
      if (this.selectedBusId === busId) {
        document.getElementById('bus-info-panel').classList.remove('active');
        this.selectedBusId = null;
      }
    }
  }
  
  // Clear all bus markers from the map
  clearAllMarkers() {
    Object.values(this.markers).forEach(marker => {
      marker.setMap(null);
    });
    
    this.markers = {};
    this.selectedBusId = null;
  }
}

// Initialize the map controller
window.mapController = new MapController();

// Function to initialize Google Maps
function initMap() {
  window.mapController.initMap();
}

// Make initMap globally available for Google Maps callback
window.initMap = initMap;
