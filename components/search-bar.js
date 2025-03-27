// Search Bar Component - Handles search functionality

class SearchBarComponent {
  constructor() {
    this.searchInput = null;
    this.searchResults = null;
    this.searchTimeout = null;
  }

  // Initialize the search bar
  init() {
    this.searchInput = document.getElementById('search');
    if (!this.searchInput) return;
    
    // Create or get the search results container
    this.searchResults = document.querySelector('.search-results');
    if (!this.searchResults) {
      this.searchResults = document.createElement('div');
      this.searchResults.className = 'search-results';
      this.searchInput.parentNode.appendChild(this.searchResults);
    }
    
    // Hide search results initially
    this.searchResults.style.display = 'none';
    
    // Add event listeners
    this.addEventListeners();
  }

  // Add event listeners for search functionality
  addEventListeners() {
    if (!this.searchInput) return;
    
    // Input event for real-time search
    this.searchInput.addEventListener('input', () => {
      clearTimeout(this.searchTimeout);
      
      const query = this.searchInput.value.trim();
      
      // Only search if query has at least 2 characters
      if (query.length < 2) {
        this.searchResults.style.display = 'none';
        return;
      }
      
      // Debounce the search to avoid too many requests
      this.searchTimeout = setTimeout(() => {
        this.performSearch(query);
      }, 300);
    });
    
    // Focus event to show results if available
    this.searchInput.addEventListener('focus', () => {
      if (this.searchInput.value.trim().length >= 2) {
        this.searchResults.style.display = 'block';
      }
    });
    
    // Click outside to hide results
    document.addEventListener('click', (event) => {
      if (!this.searchInput.contains(event.target) && 
          !this.searchResults.contains(event.target)) {
        this.searchResults.style.display = 'none';
      }
    });
  }

  // Perform search using bus service
  performSearch(query) {
    if (!window.busService) {
      console.error('Bus service not found');
      return;
    }
    
    const results = window.busService.search(query);
    this.displaySearchResults(results);
  }

  // Display search results
  displaySearchResults(results) {
    // Clear previous results
    this.searchResults.innerHTML = '';
    
    const { buses, stops, routes } = results;
    const hasResults = buses.length > 0 || stops.length > 0 || routes.length > 0;
    
    if (!hasResults) {
      this.searchResults.innerHTML = '<div class="search-result-item">No results found</div>';
      this.searchResults.style.display = 'block';
      return;
    }
    
    // Add bus results
    if (buses.length > 0) {
      const busesHeader = document.createElement('div');
      busesHeader.className = 'search-result-category';
      busesHeader.textContent = 'Buses';
      this.searchResults.appendChild(busesHeader);
      
      buses.slice(0, 5).forEach(bus => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `<i class="material-icons">directions_bus</i> Bus ${bus.busNumber} - ${bus.routeName || 'Unknown Route'}`;
        
        item.addEventListener('click', () => {
          if (window.mapController) {
            window.mapController.selectBus(bus.id, bus);
            
            // Navigate to home page
            if (window.app) {
              window.app.navigateTo('home');
            }
          }
          
          // Clear and close search
          this.searchInput.value = '';
          this.searchResults.style.display = 'none';
        });
        
        this.searchResults.appendChild(item);
      });
    }
    
    // Add stop results
    if (stops.length > 0) {
      const stopsHeader = document.createElement('div');
      stopsHeader.className = 'search-result-category';
      stopsHeader.textContent = 'Stops';
      this.searchResults.appendChild(stopsHeader);
      
      stops.slice(0, 5).forEach(stop => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `<i class="material-icons">place</i> ${stop.name}`;
        
        item.addEventListener('click', () => {
          // Navigate to home page and focus on stop
          if (window.app) {
            window.app.navigateTo('home');
          }
          
          if (window.mapController && window.mapController.map) {
            const position = { lat: parseFloat(stop.lat), lng: parseFloat(stop.lng) };
            window.mapController.map.panTo(position);
            window.mapController.map.setZoom(17);
            
            // Create or update a marker for this stop
            if (window.mapController.stopInfoMarker) {
              window.mapController.stopInfoMarker.setPosition(position);
            } else {
              window.mapController.stopInfoMarker = new google.maps.Marker({
                position: position,
                map: window.mapController.map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: '#4CAF50',
                  fillOpacity: 1,
                  strokeColor: '#FFFFFF',
                  strokeWeight: 2
                },
                title: stop.name
              });
            }
            
            // Show info window with stop details
            const infoWindow = new google.maps.InfoWindow({
              content: `
                <div>
                  <h4>${stop.name}</h4>
                  <p>${stop.address || ''}</p>
                </div>
              `
            });
            
            infoWindow.open(window.mapController.map, window.mapController.stopInfoMarker);
          }
          
          // Clear and close search
          this.searchInput.value = '';
          this.searchResults.style.display = 'none';
        });
        
        this.searchResults.appendChild(item);
      });
    }
    
    // Add route results
    if (routes.length > 0) {
      const routesHeader = document.createElement('div');
      routesHeader.className = 'search-result-category';
      routesHeader.textContent = 'Routes';
      this.searchResults.appendChild(routesHeader);
      
      routes.slice(0, 5).forEach(route => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `<i class="material-icons">timeline</i> ${route.name} (${route.from} to ${route.to})`;
        
        item.addEventListener('click', () => {
          // Find buses on this route
          if (window.busService) {
            const busesOnRoute = window.busService.getAllBuses().filter(bus => bus.routeId === route.id);
            
            if (busesOnRoute.length > 0) {
              // Select the first bus on this route
              if (window.mapController) {
                window.mapController.selectBus(busesOnRoute[0].id, busesOnRoute[0]);
                
                // Navigate to home page
                if (window.app) {
                  window.app.navigateTo('home');
                }
              }
            } else {
              showSnackbar('No active buses on this route at the moment');
            }
          }
          
          // Clear and close search
          this.searchInput.value = '';
          this.searchResults.style.display = 'none';
        });
        
        this.searchResults.appendChild(item);
      });
    }
    
    // Show the results
    this.searchResults.style.display = 'block';
  }
}

// Initialize the search bar component when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const searchBar = new SearchBarComponent();
  searchBar.init();
  
  // Make searchBar accessible globally
  window.searchBar = searchBar;
});
