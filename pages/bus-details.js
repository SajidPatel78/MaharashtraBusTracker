// Bus Details page controller - Handles detailed bus information display

class BusDetailsPage {
  constructor() {
    this.currentBus = null;
    this.routePath = null; // For storing polyline of the route
    this.stopMarkers = []; // For storing markers of stops
  }

  // Show details for a specific bus
  showBusDetails(busId) {
    if (!window.busService) {
      console.error('Bus service not found');
      return;
    }
    
    const bus = window.busService.getBusById(busId);
    if (!bus) {
      console.error(`Bus with ID ${busId} not found`);
      return;
    }
    
    this.currentBus = bus;
    
    // Update UI with bus details
    this.updateBusDetailsUI();
    
    // Draw route on map if route data is available
    if (bus.route && bus.route.path) {
      this.drawBusRoute();
    }
    
    // Subscribe to updates for this bus
    window.busService.addListener((event, data) => {
      if (event === 'busUpdated' && data.id === busId) {
        this.currentBus = data;
        this.updateBusDetailsUI();
      }
    });
  }

  // Update the UI with bus details
  updateBusDetailsUI() {
    if (!this.currentBus) return;
    
    const bus = this.currentBus;
    
    // Update the bus info panel
    document.getElementById('bus-number').textContent = `Bus ${bus.busNumber}`;
    document.getElementById('bus-route').textContent = bus.routeName || 'Not available';
    document.getElementById('bus-from').textContent = bus.route?.from || 'Not available';
    document.getElementById('bus-to').textContent = bus.route?.to || 'Not available';
    document.getElementById('next-stop').textContent = bus.nextStop?.name || 'Not available';
    document.getElementById('bus-eta').textContent = bus.nextStop?.eta || 'Not available';
    
    // Update map if not already centered on the bus
    if (window.mapController && window.mapController.map) {
      // Center map on bus location
      const busPosition = {
        lat: parseFloat(bus.location.lat),
        lng: parseFloat(bus.location.lng)
      };
      
      // Only recenter map if the bus has moved significantly
      const map = window.mapController.map;
      const mapCenter = map.getCenter();
      const distance = this.calculateDistance(
        mapCenter.lat(), mapCenter.lng(),
        busPosition.lat, busPosition.lng
      );
      
      if (distance > 300) { // More than 300 meters from center
        map.panTo(busPosition);
      }
    }
  }

  // Draw the bus route on the map
  drawBusRoute() {
    if (!this.currentBus || !this.currentBus.route || !this.currentBus.route.path ||
        !window.mapController || !window.mapController.map) {
      return;
    }
    
    const route = this.currentBus.route;
    const map = window.mapController.map;
    
    // Clear existing route if any
    if (this.routePath) {
      this.routePath.setMap(null);
    }
    
    // Clear existing stop markers
    this.stopMarkers.forEach(marker => marker.setMap(null));
    this.stopMarkers = [];
    
    // Create route path
    const routeCoordinates = route.path.map(point => ({
      lat: parseFloat(point.lat),
      lng: parseFloat(point.lng)
    }));
    
    this.routePath = new google.maps.Polyline({
      path: routeCoordinates,
      geodesic: true,
      strokeColor: '#FF9800',
      strokeOpacity: 0.8,
      strokeWeight: 3
    });
    
    this.routePath.setMap(map);
    
    // Add markers for stops if available
    if (route.stops && Array.isArray(route.stops)) {
      route.stops.forEach(stop => {
        const marker = new google.maps.Marker({
          position: {
            lat: parseFloat(stop.lat),
            lng: parseFloat(stop.lng)
          },
          map: map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: '#4CAF50',
            fillOpacity: 0.7,
            strokeColor: '#FFFFFF',
            strokeWeight: 1
          },
          title: stop.name
        });
        
        // Add click listener to show stop info
        marker.addListener('click', () => {
          // Show info window with stop details
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div>
                <h4>${stop.name}</h4>
                <p>${stop.address || ''}</p>
              </div>
            `
          });
          
          infoWindow.open(map, marker);
        });
        
        this.stopMarkers.push(marker);
      });
    }
    
    // Fit map bounds to show the entire route
    const bounds = new google.maps.LatLngBounds();
    routeCoordinates.forEach(coord => bounds.extend(coord));
    map.fitBounds(bounds);
  }

  // Calculate distance between two points in meters
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

  // Clean up resources when leaving the page
  cleanup() {
    // Clear route from map
    if (this.routePath) {
      this.routePath.setMap(null);
      this.routePath = null;
    }
    
    // Clear stop markers
    this.stopMarkers.forEach(marker => marker.setMap(null));
    this.stopMarkers = [];
    
    this.currentBus = null;
  }
}

// Create bus details page instance and make it globally available
window.busDetailsPage = new BusDetailsPage();
