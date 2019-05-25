module.exports = {
  "appId": "com.electron.pss",
  "productName": "Personal Shared Storage",
  "copyright": "Copyright © 2019, Ramtin Soltani",
  "directories": {
    "buildResources": "../resources",
    "output": "../build-win"
  },
  "win": {
    "target": "nsis",
    "icon": "icon.ico"
  },
  "nsis": {
    "oneClick": true,
    "installerIcon": "install.ico",
    "uninstallerIcon": "uninstall.ico",
    "deleteAppDataOnUninstall": true,
    "shortcutName": "Personal Shared Storage"
  }
};
