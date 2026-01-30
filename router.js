// Simple Hash-based Router for FDOS
// Manages URL routing and browser history

const Router = {
  // Parse current URL hash into route object
  parseHash() {
    const hash = window.location.hash.slice(1) || '/overview'; // Remove # and default to /overview
    const parts = hash.split('/').filter(p => p); // Split by / and remove empty strings

    // Default route
    const route = {
      view: 'overview',
      product: null,
      site: null,
      week: null
    };

    if (parts.length === 0) {
      return route;
    }

    // Parse route patterns:
    // /overview
    // /decision-center
    // /mo-dashboard/product-a/wf/2026-w04
    // /mo-kpis/product-b
    // /data-foundation
    // /white-paper

    const viewMap = {
      'overview': 'overview',
      'decision-center': 'portfolio',
      'mo-dashboard': 'home',
      'mo-kpis': 'moKpis',
      'data-foundation': 'dataFoundation',
      'white-paper': 'whitePaper',
      // Program workspace sub-views
      'delivery-command-center': 'home',
      'production-plan': 'production-plan',
      'mfg-leadtime': 'mfg-leadtime',
      'bto-cto-leadtime': 'bto-cto-leadtime',
      'fv-tracker': 'fv-management',
      'labor-fulfillment': 'labor-fulfillment',
      'campus-status': 'campus-readiness'
    };

    const viewKey = parts[0];
    route.view = viewMap[viewKey] || 'overview';

    // Parse product, site, week for program workspace views
    if (parts.length > 1) {
      // Format: /mo-dashboard/product-a/wf/2026-w04
      if (parts[1]) {
        route.product = this.parseProductFromUrl(parts[1]);
      }
      if (parts[2]) {
        route.site = parts[2].toUpperCase();
      }
      if (parts[3]) {
        route.week = parts[3].toUpperCase();
      }
    }

    return route;
  },

  // Convert product name to ID (product-a -> A)
  parseProductFromUrl(urlProduct) {
    const match = urlProduct.match(/product-([a-d])/i);
    return match ? match[1].toUpperCase() : 'A';
  },

  // Convert product ID to URL format (A -> product-a)
  productToUrl(productId) {
    return `product-${productId.toLowerCase()}`;
  },

  // Build hash URL from route object
  buildHash(view, product = null, site = null, week = null) {
    const viewUrlMap = {
      'overview': 'overview',
      'portfolio': 'decision-center',
      'home': 'mo-dashboard',
      'moKpis': 'mo-kpis',
      'dataFoundation': 'data-foundation',
      'whitePaper': 'white-paper',
      // Program workspace sub-views
      'production-plan': 'mo-dashboard',
      'mfg-leadtime': 'mo-dashboard',
      'bto-cto-leadtime': 'mo-dashboard',
      'fv-management': 'mo-dashboard',
      'labor-fulfillment': 'mo-dashboard',
      'campus-readiness': 'mo-dashboard'
    };

    let hash = `/${viewUrlMap[view] || 'overview'}`;

    // Add product/site/week for program workspace views
    const programViews = ['home', 'production-plan', 'mfg-leadtime', 'bto-cto-leadtime',
                          'fv-management', 'labor-fulfillment', 'campus-readiness'];

    if (programViews.includes(view) && product) {
      hash += `/${this.productToUrl(product)}`;
      if (site) {
        hash += `/${site.toLowerCase()}`;
      }
      if (week) {
        hash += `/${week.toLowerCase()}`;
      }
    } else if (view === 'moKpis' && product) {
      hash += `/${this.productToUrl(product)}`;
    }

    return hash;
  },

  // Navigate to a new route
  navigate(view, product = null, site = null, week = null) {
    console.log('[Router.navigate] Called with:', { view, product, site, week });
    const hash = this.buildHash(view, product, site, week);
    console.log('[Router.navigate] Built hash:', hash);
    const oldHash = window.location.hash;
    console.log('[Router.navigate] Old hash:', oldHash);
    window.location.hash = hash;
    console.log('[Router.navigate] New hash set:', window.location.hash);

    // Force trigger route change if hash didn't actually change
    // (e.g., if we're already on the same view but with different product)
    if (oldHash === window.location.hash) {
      console.log('[Router.navigate] Hash unchanged, manually triggering route change');
      if (this.onRouteChangeCallback) {
        const newRoute = this.parseHash();
        this.onRouteChangeCallback(newRoute);
      }
    }
  },

  // Initialize router - load state from URL and setup listeners
  init(onRouteChange) {
    // Store callback for manual triggering
    this.onRouteChangeCallback = onRouteChange;

    // Load initial route from URL
    const route = this.parseHash();
    onRouteChange(route);

    // Listen for hash changes (back/forward buttons)
    window.addEventListener('hashchange', () => {
      console.log('[Router] hashchange event fired');
      const newRoute = this.parseHash();
      console.log('[Router] Parsed new route:', newRoute);
      onRouteChange(newRoute);
    });

    console.log('[Router] Initialized with route:', route);
  }
};

// Make Router globally available
window.Router = Router;
