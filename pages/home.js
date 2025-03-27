// Home page controller - Handles the map view and bus tracking

class HomePage {
  constructor() {
    this.initialized = false;
  }

  // Initialize the home page
  init() {
    // Wait for map controller to be available
    if (!window.mapController) {
      console.error('Map controller not found');
      return;
    }
    
    if (this.initialized) return;
    
    // Initialize the Google Maps
    if (!window.mapController.map) {
      window.mapController.initMap();
    }
    
    // Add bus info panel event listeners
    this.setupBusInfoPanel();
    
    this.initialized = true;
  }

  // Setup event listeners for the bus info panel
  setupBusInfoPanel() {
    const busInfoPanel = document.getElementById('bus-info-panel');
    const closeButton = busInfoPanel.querySelector('.close-panel');
    
    closeButton.addEventListener('click', () => {
      busInfoPanel.classList.remove('active');
      
      // Deselect bus
      if (window.mapController && window.mapController.selectedBusId) {
        const busId = window.mapController.selectedBusId;
        const marker = window.mapController.markers[busId];
        
        if (marker) {
          // Reset marker color
          const icon = marker.getIcon();
          icon.fillColor = '#0066cc';
          icon.scale = 5;
          marker.setIcon(icon);
        }
        
        window.mapController.selectedBusId = null;
      }
    });
    
    // Track button click event (defined in map-controller.js)
  }
}

// Initialize the home page when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const homePage = new HomePage();
  homePage.init();
  
  // Make homePage accessible globally
  window.homePage = homePage;
});
