// Bus Stops page controller - Handles the list of all bus stops

class BusStopsPage {
  constructor() {
    this.initialized = false;
    this.stops = [];
    this.filteredStops = [];
    this.searchQuery = '';
    this.favoriteStops = JSON.parse(localStorage.getItem('favoriteStops') || '[]');
  }

  // Initialize the bus stops page
  init() {
    if (this.initialized) return;
    
    // Create search input for stops
    this.createSearchInput();
    
    // Load bus stops
    this.loadBusStops();
    
    this.initialized = true;
  }

  // Create search input for filtering stops
  createSearchInput() {
    const stopsTabPanel = document.getElementById('stops');
    if (!stopsTabPanel) return;
    
    // Create search container if it doesn't exist
    let searchContainer = stopsTabPanel.querySelector('.stop-search-container');
    
    if (!searchContainer) {
      searchContainer = document.createElement('div');
      searchContainer.className = 'stop-search-container';
      searchContainer.innerHTML = `
        <div class="mdl-textfield mdl-js-textfield mdl-textfield--expandable mdl-textfield--floating-label">
          <label class="mdl-button mdl-js-button mdl-button--icon" for="stop-search">
            <i class="material-icons">search</i>
          </label>
          <div class="mdl-textfield__expandable-holder">
            <input class="mdl-textfield__input" type="text" id="stop-search" placeholder="Search stops...">
            <label class="mdl-textfield__label" for="stop-search">Search stops...</label>
          </div>
        </div>
      `;
      
      // Insert at the beginning of the stops container
      const stopsContainer = stopsTabPanel.querySelector('.stops-container');
      if (stopsContainer) {
        stopsContainer.insertBefore(searchContainer, stopsContainer.firstChild);
        
        // Initialize Material Design components
        componentHandler.upgradeElements(searchContainer);
        
        // Add event listener for search input
        const searchInput = document.getElementById('stop-search');
        searchInput.addEventListener('input', () => {
          this.searchQuery = searchInput.value.trim().toLowerCase();
          this.filterStops();
        });
      }
    }
  }

  // Load bus stops from the service
  loadBusStops() {
    if (!window.busService) {
      console.error('Bus service not found');
      return;
    }
    
    // Check if already loaded
    const stops = window.busService.getAllStops();
    if (stops && stops.length > 0) {
      this.stops = stops;
      this.displayStops();
    } else {
      // If not loaded yet, add a listener
      window.busService.addListener((event, data) => {
        if (event === 'stopsLoaded') {
          this.stops = window.busService.getAllStops();
          this.displayStops();
        }
      });
    }
  }

  // Filter stops based on search query
  filterStops() {
    if (!this.searchQuery) {
      this.filteredStops = this.stops;
    } else {
      this.filteredStops = this.stops.filter(stop => 
        stop.name.toLowerCase().includes(this.searchQuery) ||
        (stop.address && stop.address.toLowerCase().includes(this.searchQuery))
      );
    }
    
    this.displayStops();
  }

  // Display the stops in the UI
  displayStops() {
    const stopsList = document.getElementById('stops-list');
    if (!stopsList) return;
    
    // Clear current list
    stopsList.innerHTML = '';
    
    const stopsToDisplay = this.filteredStops.length > 0 ? this.filteredStops : this.stops;
    
    if (stopsToDisplay.length === 0) {
      if (this.searchQuery) {
        stopsList.innerHTML = '<div class="empty-state"><p>No stops matching your search</p></div>';
      } else {
        stopsList.innerHTML = '<div class="empty-state"><i class="material-icons">place</i><p>No bus stops available</p></div>';
      }
      return;
    }
    
    // Sort stops alphabetically by name
    stopsToDisplay.sort((a, b) => a.name.localeCompare(b.name));
    
    // Add stop cards
    stopsToDisplay.forEach(stop => {
      // Get buses approaching this stop
      const approachingBuses = this.getApproachingBuses(stop);
      
      // Check if this stop is a favorite
      const isFavorite = this.isStopFavorite(stop.id);
      
      const stopCard = document.createElement('div');
      stopCard.className = 'mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-cell--12-col-phone';
      stopCard.innerHTML = `
        <div class="mdl-card mdl-shadow--2dp stop-card${isFavorite ? ' favorite-stop' : ''}" style="width: 100%;">
          <div class="mdl-card__title">
            <h2 class="mdl-card__title-text">${stop.name}</h2>
            <button class="mdl-button mdl-button--icon mdl-js-button mdl-js-ripple-effect favorite-toggle" data-stop-id="${stop.id}">
              <i class="material-icons">${isFavorite ? 'star' : 'star_border'}</i>
            </button>
          </div>
          <div class="mdl-card__supporting-text">
            ${stop.address ? `<p>${stop.address}</p>` : ''}
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
                <p><strong>Upcoming buses:</strong></p>
                ${this.renderUpcomingBusesForInfoWindow(approachingBuses)}
              </div>
            `
          });
          
          infoWindow.open(window.mapController.map, window.mapController.stopInfoMarker);
        }
      });
      
      // Add event listener for favorite toggle button
      const favoriteBtn = stopCard.querySelector('.favorite-toggle');
      if (favoriteBtn) {
        favoriteBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.toggleFavoriteStop(stop);
        });
      }
      
      stopsList.appendChild(stopCard);
    });
    
    // Initialize Material Design components
    componentHandler.upgradeElements(stopsList);
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
        <div class="upcoming-bus" data-bus-id="${bus.id}">
          <span>Bus ${bus.busNumber} - ${bus.routeName || 'Unknown Route'}</span>
          <span>${eta}</span>
        </div>
      `;
    });
    
    return html;
  }

  // Render HTML for upcoming buses in info window
  renderUpcomingBusesForInfoWindow(buses) {
    if (!buses || buses.length === 0) {
      return '<p>No upcoming buses at this time</p>';
    }
    
    let html = '<ul style="padding-left: 20px; margin: 5px 0;">';
    
    buses.slice(0, 5).forEach(({ bus, eta }) => {
      html += `
        <li>Bus ${bus.busNumber}: ${eta}</li>
      `;
    });
    
    html += '</ul>';
    return html;
  }

  // Refresh the stops data
  refresh() {
    this.loadBusStops();
  }
  
  // Check if a stop is in favorites
  isStopFavorite(stopId) {
    return this.favoriteStops.includes(stopId);
  }
  
  // Toggle favorite status for a stop
  toggleFavoriteStop(stop) {
    const stopId = stop.id;
    const index = this.favoriteStops.indexOf(stopId);
    
    if (index === -1) {
      // Add to favorites
      this.favoriteStops.push(stopId);
      showSnackbar(`Added ${stop.name} to favorites`);
    } else {
      // Remove from favorites
      this.favoriteStops.splice(index, 1);
      showSnackbar(`Removed ${stop.name} from favorites`);
    }
    
    // Save to localStorage
    localStorage.setItem('favoriteStops', JSON.stringify(this.favoriteStops));
    
    // Update UI
    this.displayStops();
    
    // Update favorites list if it's visible and app is available
    if (window.app && document.getElementById('favorites-list')) {
      window.app.updateFavoritesList();
    }
  }
}

// Initialize the bus stops page when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  const busStopsPage = new BusStopsPage();
  
  // Initialize when the stops tab is shown
  const stopsTab = document.querySelector('a[href="#stops"]');
  if (stopsTab) {
    stopsTab.addEventListener('click', () => {
      busStopsPage.init();
    });
  }
  
  // Make busStopsPage accessible globally
  window.busStopsPage = busStopsPage;
});
