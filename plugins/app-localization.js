const { withXcodeProject, withStringsXml } = require("@expo/config-plugins");
const {
  getProjectName,
  ensureGroupRecursively,
  addResourceFileToGroup,
} = require("@expo/config-plugins/build/ios/utils/Xcodeproj");
const fs = require("fs");
const path = require("path");

/**
 * Config Plugin for localizing app name
 * Supports iOS and Android app name localization
 *
 * iOS: Creates InfoPlist.strings files AND registers them in Xcode project
 * Android: Creates/updates strings.xml files for each locale
 */
const withAppLocalization = (config) => {
  const appLocalizations = {
    en: "Cheftory",
    ko: "쉐프토리",
  };

  // iOS: Create InfoPlist.strings files and register in Xcode project
  config = withXcodeProject(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    const projectName = getProjectName(projectRoot);
    const project = config.modResults;

    Object.entries(appLocalizations).forEach(([locale, appName]) => {
      const lprojDir = path.join(
        platformProjectRoot,
        projectName,
        `${locale}.lproj`
      );
      const stringsFilePath = path.join(lprojDir, "InfoPlist.strings");

      // Create .lproj directory if it doesn't exist
      if (!fs.existsSync(lprojDir)) {
        fs.mkdirSync(lprojDir, { recursive: true });
      }

      // Write InfoPlist.strings file
      const stringsContent = `/* ${locale.toUpperCase()} Localization */\nCFBundleDisplayName = "${appName}";\n`;
      fs.writeFileSync(stringsFilePath, stringsContent, "utf-8");

      // Register in Xcode project (project.pbxproj)
      const groupPath = `${projectName}/${locale}.lproj`;
      const group = ensureGroupRecursively(project, groupPath);

      // Only add if not already registered
      if (
        !group?.children.some(
          ({ comment }) => comment === "InfoPlist.strings"
        )
      ) {
        config.modResults = addResourceFileToGroup({
          filepath: `${projectName}/${locale}.lproj/InfoPlist.strings`,
          groupName: groupPath,
          project: config.modResults,
          isBuildFile: true,
        });
      }

      // Register locale as known region
      project.addKnownRegion(locale);
    });

    return config;
  });

  // Android: Set default app_name via modifier, create locale files directly
  config = withStringsXml(config, (config) => {
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    const defaultAppName = appLocalizations.ko;

    // Default locale (ko): update via config.modResults to avoid being overwritten
    const appNameEntry = config.modResults.resources.string?.find(
      (s) => s.$?.name === "app_name"
    );
    if (appNameEntry) {
      appNameEntry._ = defaultAppName;
    } else {
      if (!config.modResults.resources.string) {
        config.modResults.resources.string = [];
      }
      config.modResults.resources.string.push({
        $: { name: "app_name" },
        _: defaultAppName,
      });
    }

    // Non-default locales: write separate strings.xml files directly
    Object.entries(appLocalizations).forEach(([locale, appName]) => {
      if (locale === "ko") return; // already handled above

      const valuesDir = path.join(
        platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        `values-${locale}`
      );
      const stringsXmlPath = path.join(valuesDir, "strings.xml");

      if (!fs.existsSync(valuesDir)) {
        fs.mkdirSync(valuesDir, { recursive: true });
      }

      let stringsContent;
      if (fs.existsSync(stringsXmlPath)) {
        stringsContent = fs.readFileSync(stringsXmlPath, "utf-8");

        if (stringsContent.includes('name="app_name"')) {
          stringsContent = stringsContent.replace(
            /<string name="app_name">.*?<\/string>/,
            `<string name="app_name">${appName}</string>`
          );
        } else {
          stringsContent = stringsContent.replace(
            /<resources>/,
            `<resources>\n  <string name="app_name">${appName}</string>`
          );
        }
      } else {
        stringsContent = `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <string name="app_name">${appName}</string>\n</resources>\n`;
      }

      fs.writeFileSync(stringsXmlPath, stringsContent, "utf-8");
    });

    return config;
  });

  return config;
};

module.exports = withAppLocalization;
