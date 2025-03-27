// Main App Controller

class App {
  constructor() {
    this.currentPage = 'home';
    this.initialized = false;
    this.installPrompt = null;
  }

  // Initialize the application
  init() {
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onDOMLoaded());
    } else {
      this.onDOMLoaded();
    }
    
    // Listen for PWA install event
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the default behavior
      e.preventDefault();
      // Store the event for later use
      this.installPrompt = e;
      // Show the install prompt
      this.showInstallPrompt();
    });
  }

  // Handle DOM loaded event
  onDOMLoaded() {
    if (this.initialized) return;
    
    // Initialize services
    if (window.busService) {
      window.busService.init();
    }
    
    if (window.notificationService) {
      window.notificationService.init();
    }
    
    // Setup event listeners
    this.setupEventListeners();
    
    // Setup search functionality
    this.setupSearch();
    
    // Initialize the current page
    this.initCurrentPage();
    
    this.initialized = true;
    
    // Check for tracked buses and load their data
    this.loadTrackedBuses();
  }

  // Setup event listeners
  setupEventListeners() {
    // Tab navigation
    const tabs = document.querySelectorAll('.mdl-layout__tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('href').substring(1);
        this.navigateTo(targetId);
      });
    });
    
    // Close bus info panel
    const closePanel = document.querySelector('.close-panel');
    if (closePanel) {
      closePanel.addEventListener('click', () => {
        document.getElementById('bus-info-panel').classList.remove('active');
      });
    }
    
    // Handle navigation links in drawer
    const navLinks = document.querySelectorAll('.mdl-navigation__link');
    navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const targetId = e.target.getAttribute('href').substring(1);
        this.navigateTo(targetId);
        
        // Close the drawer on mobile
        const layout = document.querySelector('.mdl-layout');
        if (layout.MaterialLayout) {
          layout.MaterialLayout.toggleDrawer();
        }
      });
    });
  }

  // Setup search functionality
  setupSearch() {
    const searchInput = document.getElementById('search');
    if (!searchInput) return;
    
    // Create search results container
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results';
    searchResults.style.display = 'none';
    searchInput.parentNode.appendChild(searchResults);
    
    let debounceTimeout;
    
    searchInput.addEventListener('input', () => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
        const query = searchInput.value.trim();
        
        if (query.length < 2) {
          searchResults.style.display = 'none';
          return;
        }
        
        // Perform search
        if (window.busService) {
          const results = window.busService.search(query);
          this.displaySearchResults(results, searchResults);
        }
      }, 300);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !searchResults.contains(e.target)) {
        searchResults.style.display = 'none';
      }
    });
    
    // Show results when focused
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 2) {
        searchResults.style.display = 'block';
      }
    });
  }

  // Display search results
  displaySearchResults(results, container) {
    container.innerHTML = '';
    
    const { buses, stops, routes } = results;
    const hasResults = buses.length > 0 || stops.length > 0 || routes.length > 0;
    
    if (!hasResults) {
      container.innerHTML = '<div class="search-result-item">No results found</div>';
      container.style.display = 'block';
      return;
    }
    
    // Add bus results
    if (buses.length > 0) {
      const busesHeading = document.createElement('div');
      busesHeading.className = 'search-result-category';
      busesHeading.textContent = 'Buses';
      container.appendChild(busesHeading);
      
      buses.slice(0, 5).forEach(bus => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `<i class="material-icons">directions_bus</i> Bus ${bus.busNumber} - ${bus.routeName || 'Unknown Route'}`;
        
        item.addEventListener('click', () => {
          if (window.mapController) {
            window.mapController.selectBus(bus.id, bus);
            this.navigateTo('home');
          }
          
          // Clear and hide search
          document.getElementById('search').value = '';
          container.style.display = 'none';
        });
        
        container.appendChild(item);
      });
    }
    
    // Add stop results
    if (stops.length > 0) {
      const stopsHeading = document.createElement('div');
      stopsHeading.className = 'search-result-category';
      stopsHeading.textContent = 'Bus Stops';
      container.appendChild(stopsHeading);
      
      stops.slice(0, 5).forEach(stop => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `<i class="material-icons">place</i> ${stop.name}`;
        
        item.addEventListener('click', () => {
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
            
            this.navigateTo('home');
          }
          
          // Clear and hide search
          document.getElementById('search').value = '';
          container.style.display = 'none';
        });
        
        container.appendChild(item);
      });
    }
    
    // Add route results
    if (routes.length > 0) {
      const routesHeading = document.createElement('div');
      routesHeading.className = 'search-result-category';
      routesHeading.textContent = 'Routes';
      container.appendChild(routesHeading);
      
      routes.slice(0, 5).forEach(route => {
        const item = document.createElement('div');
        item.className = 'search-result-item';
        item.innerHTML = `<i class="material-icons">timeline</i> ${route.name} (${route.from} to ${route.to})`;
        
        item.addEventListener('click', () => {
          // Get buses on this route
          if (window.busService) {
            const busesOnRoute = window.busService.getAllBuses().filter(bus => bus.routeId === route.id);
            
            if (busesOnRoute.length > 0) {
              // Select the first bus on this route
              if (window.mapController) {
                window.mapController.selectBus(busesOnRoute[0].id, busesOnRoute[0]);
                this.navigateTo('home');
              }
            } else {
              showSnackbar('No active buses on this route at the moment');
            }
          }
          
          // Clear and hide search
          document.getElementById('search').value = '';
          container.style.display = 'none';
        });
        
        container.appendChild(item);
      });
    }
    
    container.style.display = 'block';
  }

  // Initialize the current page
  initCurrentPage() {
    // Get the page from the URL hash or default to 'home'
    const hash = window.location.hash.substring(1);
    const page = hash || 'home';
    
    this.navigateTo(page);
  }

  // Navigate to a specific page
  navigateTo(pageId) {
    // Update active tab
    document.querySelectorAll('.mdl-layout__tab').forEach(tab => {
      const tabId = tab.getAttribute('href').substring(1);
      if (tabId === pageId) {
        tab.classList.add('is-active');
      } else {
        tab.classList.remove('is-active');
      }
    });
    
    // Show selected page content
    document.querySelectorAll('.mdl-layout__tab-panel').forEach(panel => {
      if (panel.id === pageId) {
        panel.classList.add('is-active');
      } else {
        panel.classList.remove('is-active');
      }
    });
    
    // Update the history state
    window.history.pushState(null, null, `#${pageId}`);
    
    // Handle specific page initializations
    switch (pageId) {
      case 'home':
        // Nothing special needed for home page
        break;
      case 'stops':
        this.loadBusStops();
        break;
      case 'favorites':
        this.updateFavoritesList();
        break;
    }
    
    this.currentPage = pageId;
  }

  // Load bus stops
  loadBusStops() {
    const stopsList = document.getElementById('stops-list');
    if (!stopsList) return;
    
    // Show loading spinner
    stopsList.innerHTML = '<div class="mdl-spinner mdl-js-spinner is-active"></div>';
    
    // Load stops from the bus service
    if (window.busService) {
      const stops = window.busService.getAllStops();
      
      if (!stops || stops.length === 0) {
        stopsList.innerHTML = '<div class="empty-state"><i class="material-icons">place</i><p>No bus stops available</p></div>';
        return;
      }
      
      // Clear loading spinner
      stopsList.innerHTML = '';
      
      // Add stop cards
      stops.forEach(stop => {
        // Get buses approaching this stop
        const approachingBuses = this.getApproachingBuses(stop);
        
        const stopCard = document.createElement('div');
        stopCard.className = 'mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-cell--12-col-phone';
        stopCard.innerHTML = `
          <div class="mdl-card mdl-shadow--2dp stop-card" style="width: 100%;">
            <div class="mdl-card__title">
              <h2 class="mdl-card__title-text">${stop.name}</h2>
            </div>
            <div class="mdl-card__supporting-text">
              ${stop.address || ''}
              <div class="stop-card__upcoming">
                <h4>Upcoming Buses:</h4>
                ${this.renderUpcomingBuses(approachingBuses)}
              </div>
            </div>
            <div class="mdl-card__actions mdl-card--border">
              <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect view-on-map" data-stop-id="${stop.id}">
                View on Map
              </a>
            </div>
          </div>
        `;
        
        // Add event listener to view on map button
        stopCard.querySelector('.view-on-map').addEventListener('click', () => {
          this.navigateTo('home');
          
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
          }
        });
        
        stopsList.appendChild(stopCard);
      });
      
      // Initialize Material Design components
      componentHandler.upgradeElements(stopsList);
    } else {
      stopsList.innerHTML = '<div class="error-message">Could not load bus stops. Please try again later.</div>';
    }
  }

  // Get buses approaching a specific stop
  getApproachingBuses(stop) {
    if (!window.busService) return [];
    
    const buses = window.busService.getAllBuses();
    const approachingBuses = [];
    
    // Find buses that have this stop as their next or upcoming stop
    buses.forEach(bus => {
      if (bus.nextStop && bus.nextStop.id === stop.id) {
        approachingBuses.push({
          bus: bus,
          eta: bus.nextStop.eta || 'Unknown'
        });
      }
    });
    
    // Sort by ETA
    return approachingBuses.sort((a, b) => {
      // Handle 'Arriving' case
      if (a.eta === 'Arriving') return -1;
      if (b.eta === 'Arriving') return 1;
      
      // Handle numeric ETAs
      const etaA = parseInt(a.eta);
      const etaB = parseInt(b.eta);
      
      if (!isNaN(etaA) && !isNaN(etaB)) {
        return etaA - etaB;
      }
      
      return 0;
    });
  }

  // Render HTML for upcoming buses at a stop
  renderUpcomingBuses(buses) {
    if (!buses || buses.length === 0) {
      return '<p>No upcoming buses at this time</p>';
    }
    
    let html = '';
    
    buses.slice(0, 5).forEach(({ bus, eta }) => {
      html += `
        <div class="upcoming-bus">
          <span>Bus ${bus.busNumber} - ${bus.routeName || 'Unknown Route'}</span>
          <span>${eta}</span>
        </div>
      `;
    });
    
    return html;
  }

  // Update the favorites list
  updateFavoritesList() {
    const favoritesList = document.getElementById('favorites-list');
    if (!favoritesList) return;
    
    const trackedBuses = JSON.parse(localStorage.getItem('trackedBuses') || '[]');
    const favoriteStops = JSON.parse(localStorage.getItem('favoriteStops') || '[]');
    
    if (!trackedBuses.length && !favoriteStops.length) {
      favoritesList.innerHTML = `
        <div class="empty-state" id="empty-favorites">
          <i class="material-icons">star_border</i>
          <p>No favorites yet. Track buses or favorite stops to add them here.</p>
        </div>
      `;
      return;
    }
    
    // Clear favorites list
    favoritesList.innerHTML = '';
    
    // Add section headers if both types of favorites exist
    if (trackedBuses.length && favoriteStops.length) {
      favoritesList.innerHTML += `
        <div class="mdl-cell mdl-cell--12-col">
          <h4>Favorite Buses</h4>
        </div>
      `;
    }
    
    // Get tracked buses data
    if (window.busService) {
      trackedBuses.forEach(busId => {
        const bus = window.busService.getBusById(busId);
        
        // Skip if bus data not available
        if (!bus) return;
        
        const busCard = document.createElement('div');
        busCard.className = 'mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-cell--12-col-phone';
        busCard.innerHTML = `
          <div class="mdl-card mdl-shadow--2dp" style="width: 100%;">
            <div class="mdl-card__title">
              <h2 class="mdl-card__title-text">Bus ${bus.busNumber}</h2>
            </div>
            <div class="mdl-card__supporting-text">
              <p><strong>Route:</strong> ${bus.routeName || 'Unknown'}</p>
              <p><strong>Status:</strong> ${bus.status || 'Active'}</p>
              <p><strong>Next Stop:</strong> ${bus.nextStop?.name || 'Unknown'}</p>
              <p><strong>ETA:</strong> ${bus.nextStop?.eta || 'Unknown'}</p>
            </div>
            <div class="mdl-card__actions mdl-card--border">
              <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect track-on-map" data-bus-id="${bus.id}">
                Track on Map
              </a>
              <button class="mdl-button mdl-button--icon mdl-button--colored remove-favorite" data-bus-id="${bus.id}">
                <i class="material-icons">star</i>
              </button>
            </div>
          </div>
        `;
        
        // Add event listener for tracking on map
        busCard.querySelector('.track-on-map').addEventListener('click', () => {
          this.navigateTo('home');
          
          if (window.mapController) {
            window.mapController.selectBus(bus.id, bus);
          }
        });
        
        // Add event listener for removing from favorites
        busCard.querySelector('.remove-favorite').addEventListener('click', () => {
          if (window.mapController) {
            window.mapController.toggleBusTracking(bus);
          }
          
          // Update favorites list
          this.updateFavoritesList();
        });
        
        favoritesList.appendChild(busCard);
      });
      
      // Add favorite stops section header if both types exist
      if (trackedBuses.length && favoriteStops.length) {
        const stopsHeader = document.createElement('div');
        stopsHeader.className = 'mdl-cell mdl-cell--12-col';
        stopsHeader.innerHTML = '<h4>Favorite Stops</h4>';
        favoritesList.appendChild(stopsHeader);
      }
      
      // Add favorite stops
      favoriteStops.forEach(stopId => {
        const stop = window.busService.getStopById(stopId);
        
        // Skip if stop data not available
        if (!stop) return;
        
        // Get approaching buses for this stop
        const approachingBuses = [];
        if (window.busStopsPage) {
          approachingBuses.push(...window.busStopsPage.getApproachingBuses(stop));
        } 
        
        const stopCard = document.createElement('div');
        stopCard.className = 'mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-cell--12-col-phone';
        stopCard.innerHTML = `
          <div class="mdl-card mdl-shadow--2dp favorite-stop" style="width: 100%;">
            <div class="mdl-card__title">
              <h2 class="mdl-card__title-text">${stop.name}</h2>
            </div>
            <div class="mdl-card__supporting-text">
              ${stop.address ? `<p>${stop.address}</p>` : ''}
              <div class="stop-card__upcoming">
                <h4>Upcoming Buses:</h4>
                ${window.busStopsPage ? window.busStopsPage.renderUpcomingBuses(approachingBuses) : '<p>No data available</p>'}
              </div>
            </div>
            <div class="mdl-card__actions mdl-card--border">
              <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect view-on-map" data-stop-id="${stop.id}">
                View on Map
              </a>
              <button class="mdl-button mdl-button--icon mdl-button--colored remove-stop-favorite" data-stop-id="${stop.id}">
                <i class="material-icons">star</i>
              </button>
            </div>
          </div>
        `;
        
        // Add event listener for view on map
        stopCard.querySelector('.view-on-map').addEventListener('click', () => {
          this.navigateTo('home');
          
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
                  <p><strong>Upcoming buses:</strong></p>
                  ${window.busStopsPage ? window.busStopsPage.renderUpcomingBusesForInfoWindow(approachingBuses) : '<p>No data available</p>'}
                </div>
              `
            });
            
            infoWindow.open(window.mapController.map, window.mapController.stopInfoMarker);
          }
        });
        
        // Add event listener for removing from favorites
        stopCard.querySelector('.remove-stop-favorite').addEventListener('click', () => {
          if (window.busStopsPage) {
            window.busStopsPage.toggleFavoriteStop(stop);
          }
          
          // Update favorites list
          this.updateFavoritesList();
        });
        
        favoritesList.appendChild(stopCard);
      });
      
      // Initialize Material Design components
      componentHandler.upgradeElements(favoritesList);
    } else {
      favoritesList.innerHTML = '<div class="error-message">Could not load favorites. Please try again later.</div>';
    }
  }

  // Load tracked buses from local storage
  loadTrackedBuses() {
    const trackedBuses = JSON.parse(localStorage.getItem('trackedBuses') || '[]');
    
    if (!trackedBuses.length) return;
    
    // Show a message that tracked buses are being loaded
    showSnackbar('Loading your tracked buses...');
    
    // Wait for bus data to be available
    if (window.busService) {
      window.busService.addListener((event, data) => {
        if (event === 'busUpdated' && trackedBuses.includes(data.id)) {
          // If the bus is being tracked, highlight it on the map
          if (window.mapController && window.mapController.markers[data.id]) {
            const icon = window.mapController.markers[data.id].getIcon();
            icon.fillColor = '#ff9800';
            window.mapController.markers[data.id].setIcon(icon);
          }
        }
      });
    }
  }

  // Show PWA install prompt
  showInstallPrompt() {
    // Check if we should show the prompt (don't show if user dismissed it before)
    if (localStorage.getItem('installPromptDismissed')) {
      const dismissedTime = parseInt(localStorage.getItem('installPromptDismissed'));
      // Only show again after 30 days
      if (Date.now() - dismissedTime < 30 * 24 * 60 * 60 * 1000) {
        return;
      }
    }
    
    // Create prompt element if it doesn't exist
    let promptElement = document.querySelector('.install-prompt');
    
    if (!promptElement) {
      promptElement = document.createElement('div');
      promptElement.className = 'install-prompt';
      promptElement.innerHTML = `
        <p>Install Maharashtra Bus Tracker for easy access and offline capabilities</p>
        <div class="install-prompt__buttons">
          <button class="mdl-button mdl-js-button install-dismiss">Later</button>
          <button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored install-accept">Install</button>
        </div>
      `;
      
      document.body.appendChild(promptElement);
      
      // Initialize Material Design components
      componentHandler.upgradeElement(promptElement);
      
      // Add event listeners
      promptElement.querySelector('.install-dismiss').addEventListener('click', () => {
        promptElement.classList.remove('visible');
        // Remember that user dismissed the prompt
        localStorage.setItem('installPromptDismissed', Date.now().toString());
      });
      
      promptElement.querySelector('.install-accept').addEventListener('click', () => {
        if (this.installPrompt) {
          this.installPrompt.prompt();
          
          this.installPrompt.userChoice.then(choiceResult => {
            if (choiceResult.outcome === 'accepted') {
              console.log('User accepted the install prompt');
            } else {
              console.log('User dismissed the install prompt');
            }
            
            // Clear the install prompt reference
            this.installPrompt = null;
          });
        }
        
        promptElement.classList.remove('visible');
      });
    }
    
    // Show the prompt
    setTimeout(() => {
      promptElement.classList.add('visible');
    }, 3000);
  }
}

// Initialize the app
window.app = new App();
window.app.init();

// Listen for tab navigation
window.addEventListener('hashchange', () => {
  const hash = window.location.hash.substring(1);
  if (hash) {
    window.app.navigateTo(hash);
  }
});
