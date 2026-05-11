import 'react-native-gesture-handler';
import { registerRootComponent } from 'expo';

// Global error handler to catch fatal initialization crashes before App mounts!
const originalHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[FATAL GLOBAL ERROR] App crashed during initialization!', {
    message: error.message,
    name: error.name,
    isFatal
  });
  console.log('--- STACK TRACE ---');
  console.log(error.stack);
  
  if (originalHandler) {
    originalHandler(error, isFatal);
  }
});

import App from './App';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
