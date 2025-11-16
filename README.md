# Page Load Time

[English](#page-load-time) | [中文](README_ZH.md)

A powerful browser extension for measuring and analyzing web page load performance. Supports modern browsers including Chrome, Firefox, and Edge.

## Features

- 📊 **Navigation Timing Analysis**: Detailed breakdown of page load timings using PerformanceNavigationTiming API
- 🔍 **Resource Analysis**: View detailed performance metrics for all sub-resources
- 📑 **Tabbed Interface**: Switch between navigation timing and resource analysis views
- 🔗 **Clickable Resources**: Click on any resource to view detailed performance information in a new tab
- 🌐 **IP Address Tracking**: Display server IP address for each resource
- 🚀 **Modern API**: Uses the latest PerformanceNavigationTiming API (replacing deprecated PerformanceTiming)
- 💾 **Local Storage**: Uses IndexedDB to store performance data with cross-browser context sharing
- 🔄 **Auto Cleanup**: Automatically cleans up expired data to prevent storage overflow

## Project Status

This extension has been updated with modern Web Performance APIs and enhanced features to provide a better performance analysis experience.

## Installation

### Install from App Store

- **Firefox**: [Mozilla Add-ons](https://addons.mozilla.org/en-CA/firefox/addon/load-timer/)
- **Chrome/Brave**: [Chrome Web Store](https://chrome.google.com/webstore/detail/page-load-time/fploionmjgeclbkemipmkogoaohcdbig/)
- **Edge**: [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/page-load-time/llcdjocbfkdndmjbgpaibfkdjkjogeho)

### Local Development Installation

#### Chrome/Edge

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project's `src` directory

#### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `src/manifest.firefox.json`

## Quick Start

### Project Structure

```
page-load-time/
├── src/                          # Source code
│   ├── background.js             # Background Script (Service Worker)
│   ├── performance.js            # Content Script (page injection)
│   ├── popup.html/js/css         # Popup UI
│   ├── storage-manager.js        # IndexedDB storage manager
│   ├── manifest.json             # Chrome manifest
│   ├── manifest.firefox.json     # Firefox manifest
│   └── fonts/                    # Font resources
├── build/                        # Build output
├── docs/                         # Documentation
│   ├── architecture.md           # Architecture design
│   └── development.md            # Development guide
├── screenshots/                  # Screenshots
└── README.md                     # This file
```

### Development

For detailed development guide, please refer to [docs/development.md](docs/development.md)

Main topics include:

- Environment setup and extension loading
- Debugging tips and common commands
- Logging system documentation
- Troubleshooting
- Code standards and best practices

### Architecture

For detailed architecture design, please refer to [docs/architecture.md](docs/architecture.md)

Main topics include:

- Core components overview
- Key design decisions
- Data flow and lifecycle
- Performance optimization strategies
- Cross-browser compatibility

## Core Features

### Performance Metrics

The extension collects the following performance metrics:

| Metric | Description |
|--------|-------------|
| DNS Lookup Time | Time spent on domain name resolution |
| TCP Connection Time | Time spent establishing connection |
| TLS Handshake Time | Time spent on HTTPS handshake |
| Time to First Byte (TTFB) | Time to receive the first byte |
| Content Download Time | Time spent downloading response body |
| DOM Parse Time | Time spent parsing HTML |
| Resource Load Time | Time spent loading all resources |
| Total Load Time | Total time for page to fully load |

### Resource Analysis

For each resource, displays:

- Resource URL
- Resource type (script, stylesheet, image, etc.)
- Load time
- Resource size
- Server IP address
- Detailed performance time breakdown

## Technology Stack

- **API**: WebExtensions API, Performance Navigation Timing API, Resource Timing API
- **Storage**: IndexedDB
- **Compatibility**: browser-polyfill.js
- **Browsers**: Chrome, Firefox, Edge

## Permissions

The extension requests the following permissions:

| Permission | Purpose |
|------------|---------|
| `webRequest` | Listen to network requests to collect IP addresses |
| `webNavigation` | Listen to navigation events to start listeners |
| `storage` | Store performance data and IP cache |
| `tabs` | Access tab information |
| `activeTab` | Access current tab |
| `<all_urls>` | Access all websites |

## Privacy and Security

- ✅ **Local Processing**: All data is processed locally and never uploaded to any server
- ✅ **Data Isolation**: Each tab's data is stored independently
- ✅ **Auto Cleanup**: Automatically cleans up related data when tabs close, and periodically cleans up expired data
- ✅ **Private Mode**: Data is stored only in memory in private browsing mode
- ✅ **Minimal Permissions**: Only requests necessary permissions

## License

This project is licensed under the MIT License. See [LICENSE.md](LICENSE.md) for details.

## Contributing

Issues and Pull Requests are welcome!

## Related Resources

- [Chrome Extension API Documentation](https://developer.chrome.com/docs/extensions/)
- [MDN WebExtensions Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [Navigation Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_timing_API)
- [Resource Timing API](https://developer.mozilla.org/en-US/docs/Web/API/Resource_Timing_API)
