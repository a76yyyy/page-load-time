import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",

  modules: ["@wxt-dev/i18n/module", "@wxt-dev/auto-icons"],

  autoIcons: {
    baseIconPath: "assets/icon.svg",
    developmentIndicator: "overlay",
    sizes: [16, 32, 48, 128],
  },

  manifest: {
    name: "__MSG_appName__",
    description: "__MSG_appDescription__",
    version: "4.1.0",
    default_locale: "en",

    permissions: [
      "webRequest",
      "webNavigation",
      "storage",
      "tabs",
      "activeTab",
    ],

    host_permissions: ["<all_urls>"],

    action: {
      default_popup: "popup.html",
    },
  },

  // 使用 webExt 替代 deprecated 的 runner
  webExt: {
    chromiumArgs: ["--auto-open-devtools-for-tabs"],
  },
});
