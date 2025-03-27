// Stop List Component - Handles displaying and managing lists of bus stops

class StopListComponent {
  constructor() {
    this.stops = [];
  }

  // Render a list of bus stops
  renderStopsList(stops, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    this.stops = stops || [];
    
    // Default options
    const defaultOptions = {
      showAddress: true,
      showUpcomingBuses: true,
      emptyMessage: 'No bus stops available',
      onSelect: null
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Clear container
    container.innerHTML = '';
    
    // Show empty state if no stops
    if (!this.stops || this.stops.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="material-icons">place</i>
          <p>${mergedOptions.emptyMessage}</p>
        </div>
      `;
      return;
    }
    
    // Create a grid for the stop cards
    const grid = document.createElement('div');
    grid.className = 'mdl-grid';
    
    // Create a card for each stop
    this.stops.forEach(stop => {
      const approachingBuses = mergedOptions.showUpcomingBuses ? 
        this.getApproachingBuses(stop) : [];
      
      const stopCard = document.createElement('div');
      stopCard.className = 'mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-cell--12-col-phone';
      stopCard.innerHTML = `
        <div class="mdl-card mdl-shadow--2dp stop-card" style="width: 100%;">
          <div class="mdl-card__title">
            <h2 class="mdl-card__title-text">${stop.name}</h2>
          </div>
          <div class="mdl-card__supporting-text">
            ${mergedOptions.showAddress && stop.address ? `<p>${stop.address}</p>` : ''}
            ${mergedOptions.showUpcomingBuses ? `
              <div class="stop-card__upcoming">
                <h4>Upcoming Buses:</h4>
                ${this.renderUpcomingBuses(approachingBuses)}
              </div>
            ` : ''}
          </div>
          <div class="mdl-card__actions mdl-card--border">
            <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect select-stop" data-stop-id="${stop.id}">
              View on Map
            </a>
          </div>
        </div>
      `;
      
      // Add event listener for selecting the stop
      const selectBtn = stopCard.querySelector('.select-stop');
      if (selectBtn) {
        selectBtn.addEventListener('click', () => {
          if (typeof mergedOptions.onSelect === 'function') {
            mergedOptions.onSelect(stop);
          } else {
            this.selectStop(stop);
          }
        });
      }
      
      // Add event listeners for upcoming buses
      if (mergedOptions.showUpcomingBuses) {
        const upcomingBusElements = stopCard.querySelectorAll('.upcoming-bus');
        upcomingBusElements.forEach(element => {
          element.addEventListener('click', () => {
            const busId = element.getAttribute('data-bus-id');
            if (busId && window.busService) {
              const bus = window.busService.getBusById(busId);
              if (bus) {
                this.selectBus(bus);
              }
            }
          });
        });
      }
      
      grid.appendChild(stopCard);
    });
    
    container.appendChild(grid);
    
    // Initialize Material Design components
    componentHandler.upgradeElements(container);
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

  // Select a bus stop (default action)
  selectStop(stop) {
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
  }

  // Select a bus (navigate to it on the map)
  selectBus(bus) {
    if (window.mapController) {
      window.mapController.selectBus(bus.id, bus);
      
      // Navigate to home page
      if (window.app) {
        window.app.navigateTo('home');
      }
    }
  }

  // Filter stops based on a search query
  filterStops(stops, query) {
    if (!query || query.trim() === '') {
      return stops;
    }
    
    query = query.toLowerCase().trim();
    
    return stops.filter(stop => {
      return stop.name.toLowerCase().includes(query) || 
             (stop.address && stop.address.toLowerCase().includes(query));
    });
  }

  // Sort stops by different criteria
  sortStops(stops, criteria = 'name') {
    if (!stops) return [];
    
    return [...stops].sort((a, b) => {
      switch (criteria) {
        case 'name':
          return a.name.localeCompare(b.name);
          
        case 'upcoming':
          // Sort by number of upcoming buses
          const busesA = this.getApproachingBuses(a).length;
          const busesB = this.getApproachingBuses(b).length;
          return busesB - busesA; // More buses first
          
        default:
          return 0;
      }
    });
  }
}

// Initialize the stop list component and make it globally available
window.stopListComponent = new StopListComponent();
