const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withLaptaBuild(config) {
  return withGradleProperties(config, (mod) => {
    const key = "org.gradle.jvmargs";
    const value = "-Xmx2048m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8";
    const existing = mod.modResults.find(
      (entry) => entry.type === "property" && entry.key === key,
    );
    if (existing) existing.value = value;
    else mod.modResults.push({ type: "property", key, value });
    return mod;
  });
};
