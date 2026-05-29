const { withAndroidManifest } = require('@expo/config-plugins');

const withRemoveOrientation = (config) => {
  return withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;

    if (androidManifest.manifest && androidManifest.manifest.application) {
      const application = androidManifest.manifest.application[0];

      if (application.activity) {
        application.activity = application.activity.map((activity) => {
          // Remove the screenOrientation attribute from ALL activities
          if (activity.$ && activity.$['android:screenOrientation']) {
            delete activity.$['android:screenOrientation'];
          }
          return activity;
        });
      }
    }

    return config;
  });
};

module.exports = withRemoveOrientation;
