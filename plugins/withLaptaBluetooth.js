const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withLaptaBluetooth(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = manifest["uses-permission"] ?? [];
    manifest["uses-permission"] = permissions.filter(
      (entry) =>
        ![
          "android.permission.ACCESS_FINE_LOCATION",
          "android.permission.ACCESS_COARSE_LOCATION",
        ].includes(entry.$["android:name"]),
    );
    const scan = manifest["uses-permission"].find(
      (entry) =>
        entry.$["android:name"] === "android.permission.BLUETOOTH_SCAN",
    );
    if (scan) scan.$["android:usesPermissionFlags"] = "neverForLocation";
    return mod;
  });
};
