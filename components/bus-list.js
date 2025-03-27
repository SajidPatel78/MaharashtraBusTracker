// Bus List Component - Handles displaying and managing lists of buses

class BusListComponent {
  constructor() {
    this.buses = [];
  }

  // Render a list of buses
  renderBusList(buses, containerId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    this.buses = buses || [];
    
    // Default options
    const defaultOptions = {
      showRoute: true,
      showEta: true,
      showActions: true,
      emptyMessage: 'No buses available',
      onSelect: null,
      onTrack: null
    };
    
    const mergedOptions = { ...defaultOptions, ...options };
    
    // Clear container
    container.innerHTML = '';
    
    // Show empty state if no buses
    if (!this.buses || this.buses.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="material-icons">directions_bus</i>
          <p>${mergedOptions.emptyMessage}</p>
        </div>
      `;
      return;
    }
    
    // Create a grid for the bus cards
    const grid = document.createElement('div');
    grid.className = 'mdl-grid';
    
    // Create a card for each bus
    this.buses.forEach(bus => {
      const busCard = document.createElement('div');
      busCard.className = 'mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-cell--12-col-phone';
      busCard.innerHTML = `
        <div class="mdl-card mdl-shadow--2dp" style="width: 100%;">
          <div class="mdl-card__title">
            <h2 class="mdl-card__title-text">Bus ${bus.busNumber}</h2>
          </div>
          <div class="mdl-card__supporting-text">
            ${mergedOptions.showRoute ? `<p><strong>Route:</strong> ${bus.routeName || 'Unknown'}</p>` : ''}
            <p><strong>Status:</strong> ${bus.status || 'Active'}</p>
            ${mergedOptions.showEta && bus.nextStop ? `
              <p><strong>Next Stop:</strong> ${bus.nextStop.name || 'Unknown'}</p>
              <p><strong>ETA:</strong> ${bus.nextStop.eta || 'Unknown'}</p>
            ` : ''}
          </div>
          ${mergedOptions.showActions ? `
            <div class="mdl-card__actions mdl-card--border">
              <a class="mdl-button mdl-button--colored mdl-js-button mdl-js-ripple-effect select-bus" data-bus-id="${bus.id}">
                Select
              </a>
              <button class="mdl-button mdl-button--icon mdl-button--colored track-bus" data-bus-id="${bus.id}">
                <i class="material-icons">${this.isTracked(bus.id) ? 'star' : 'star_border'}</i>
              </button>
            </div>
          ` : ''}
        </div>
      `;
      
      // Add event listeners for actions
      if (mergedOptions.showActions) {
        const selectBtn = busCard.querySelector('.select-bus');
        if (selectBtn) {
          selectBtn.addEventListener('click', () => {
            if (typeof mergedOptions.onSelect === 'function') {
              mergedOptions.onSelect(bus);
            } else {
              this.selectBus(bus);
            }
          });
        }
        
        const trackBtn = busCard.querySelector('.track-bus');
        if (trackBtn) {
          trackBtn.addEventListener('click', () => {
            if (typeof mergedOptions.onTrack === 'function') {
              mergedOptions.onTrack(bus);
            } else {
              this.toggleTracking(bus);
            }
          });
        }
      }
      
      grid.appendChild(busCard);
    });
    
    container.appendChild(grid);
    
    // Initialize Material Design components
    componentHandler.upgradeElements(container);
  }

  // Check if a bus is being tracked
  isTracked(busId) {
    const trackedBuses = JSON.parse(localStorage.getItem('trackedBuses') || '[]');
    return trackedBuses.includes(busId);
  }

  // Select a bus (default action)
  selectBus(bus) {
    if (window.mapController) {
      window.mapController.selectBus(bus.id, bus);
      
      // Navigate to home page
      if (window.app) {
        window.app.navigateTo('home');
      }
    }
  }

  // Toggle tracking for a bus
  toggleTracking(bus) {
    if (window.mapController) {
      window.mapController.toggleBusTracking(bus);
    }
  }

  // Update a specific bus in the list
  updateBus(busId, busData) {
    if (!this.buses) return;
    
    // Find the bus in the list
    const index = this.buses.findIndex(bus => bus.id === busId);
    if (index !== -1) {
      // Update the bus data
      this.buses[index] = busData;
    }
  }

  // Filter buses based on a search query
  filterBuses(buses, query) {
    if (!query || query.trim() === '') {
      return buses;
    }
    
    query = query.toLowerCase().trim();
    
    return buses.filter(bus => {
      return bus.busNumber.toLowerCase().includes(query) || 
             (bus.routeName && bus.routeName.toLowerCase().includes(query));
    });
  }

  // Sort buses by different criteria
  sortBuses(buses, criteria = 'busNumber') {
    if (!buses) return [];
    
    return [...buses].sort((a, b) => {
      switch (criteria) {
        case 'busNumber':
          // Sort by bus number (numerically if possible)
          const numA = parseInt(a.busNumber);
          const numB = parseInt(b.busNumber);
          if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
          }
          return a.busNumber.localeCompare(b.busNumber);
          
        case 'route':
          // Sort by route name
          return (a.routeName || '').localeCompare(b.routeName || '');
          
        case 'eta':
          // Sort by ETA to next stop
          if (!a.nextStop || !b.nextStop) return 0;
          
          if (a.nextStop.eta === 'Arriving') return -1;
          if (b.nextStop.eta === 'Arriving') return 1;
          
          const etaA = parseInt(a.nextStop.eta);
          const etaB = parseInt(b.nextStop.eta);
          
          if (!isNaN(etaA) && !isNaN(etaB)) {
            return etaA - etaB;
          }
          
          return 0;
          
        default:
          return 0;
      }
    });
  }
}

// Initialize the bus list component and make it globally available
window.busListComponent = new BusListComponent();
