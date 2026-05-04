import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

export function useOTAUpdates() {
  useEffect(() => {
    async function checkForUpdates() {
      try {
        // 1. Check if a new OTA update exists on the server
        const update = await Updates.checkForUpdateAsync();
        
        if (update.isAvailable) {
          // 2. Download the update in the background
          await Updates.fetchUpdateAsync();
          
          // 3. Prompt the user to apply it
          Alert.alert(
            "Update Available",
            "A new version of the app is ready. Restart to apply the update?",
            [
              { text: "Later", style: "cancel" },
              { 
                text: "Restart Now", 
                onPress: async () => {
                  // 4. Reload the app to apply the new JS bundle
                  await Updates.reloadAsync();
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error("Error fetching OTA update:", error);
      }
    }

    // Only run in production, OTA updates don't work in local development
    if (!__DEV__) {
      checkForUpdates();
    }
  }, []);
}