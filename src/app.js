/**
 * ==========================================
 * Co-creator 应用入口
 * ==========================================
 */

import { UI } from './ui/ui-manager.js';
import { TutorSystem } from './features/tutor-system.js';
import { SyncEngine } from './services/sync-engine.js';
import { ModelManager } from './services/model-manager.js';
import { Store } from './core/store.js';
import { eventBus, EVENTS } from './core/event-bus.js';

const App = {
  init() {
    console.log('[App] Initializing Co-creator...');
    
    Store.get('pd_theme', 'theme-apple');
    
    TutorSystem.init();
    
    UI.init();
    
    console.log('[App] Co-creator initialized successfully');
    
    this.exposeGlobals();
  },

  exposeGlobals() {
    window.UI = UI;
    window.TutorSystem = TutorSystem;
    window.SyncEngine = SyncEngine;
    window.ModelManager = ModelManager;
    window.Store = Store;
    window.eventBus = eventBus;
    window.EVENTS = EVENTS;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

export default App;
