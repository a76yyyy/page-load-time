# Page Load Time

[中文](README_ZH.md) | English

A powerful browser extension for measuring and analyzing web page load performance. Supports Chrome, Firefox, and Edge.

## 🚀 Features

- 📊 **Navigation Timing Analysis**: Detailed page load time breakdown using Performance Navigation Timing API
- 🔍 **Resource Analysis**: View detailed performance metrics for all sub-resources
- 🌐 **IP Address Tracking**: Display server IP address for each resource
- 📈 **Visual Performance Metrics**: Interactive charts and tables
- 💾 **Export Data**: Export performance data as JSON
- 🌍 **Multi-language Support**: English & 中文
- ⚡ **Performance Optimized**: DOM reuse optimization (10-13x faster)
- 🔄 **Auto Cleanup**: Automatic cleanup of expired data

## 📦 Installation

### From App Stores

- **Firefox**: [Mozilla Add-ons](https://addons.mozilla.org/en-CA/firefox/addon/load-timer/)
- **Chrome/Brave**: [Chrome Web Store](https://chrome.google.com/webstore/detail/page-load-time/fploionmjgeclbkemipmkogoaohcdbig/)
- **Edge**: [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/page-load-time/llcdjocbfkdndmjbgpaibfkdjkjogeho)

### Local Development

#### Chrome/Edge

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `.output/chrome-mv3-dev` directory

#### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `.output/firefox-mv2-dev/manifest.json`

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm (recommended)

### Quick Start

```bash
# Install dependencies
pnpm install

# Start development (Chrome)
pnpm dev

# Start development (Firefox)
pnpm dev:firefox

# Start development (Edge)
pnpm dev:edge

# Build for production
pnpm build

# Create distribution ZIP
pnpm zip

# Type check
pnpm compile
```

### Using Makefile

```bash
# View all available commands
make help

# Development
make dev              # Chrome development mode
make dev-firefox      # Firefox development mode
make dev-edge         # Edge development mode

# Build
make build            # Chrome production build
make build-firefox    # Firefox production build

# Package
make zip              # Chrome ZIP package
make zip-firefox      # Firefox ZIP package

# Extract
make extract          # Extract all versions
make extract_chrome   # Extract Chrome version
make extract_firefox  # Extract Firefox version

# Cleanup
make clean            # Clean build artifacts
make clean-all        # Clean everything including node_modules
make reinstall        # Reinstall dependencies
```

### Project Structure

```
page-load-time/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts       # Background service worker
│   │   ├── content.ts          # Content script
│   │   └── popup/              # Popup UI
│   │       ├── main.ts
│   │       ├── NavigationRenderer.ts
│   │       ├── ResourcesRenderer.ts
│   │       └── VirtualScroller.ts
│   ├── services/
│   │   └── storage.service.ts  # IndexedDB storage
│   ├── utils/
│   │   ├── types.ts
│   │   ├── messaging.ts
│   │   ├── guards.ts
│   │   ├── formatters.ts
│   │   └── calculators.ts
│   ├── locales/                # i18n translations
│   └── assets/                 # Icons and resources
├── docs/                       # Documentation
├── Makefile                    # Development commands
└── package.json
```

## 🏗️ Tech Stack

- **Framework**: [WXT](https://wxt.dev/) - Next-gen web extension framework
- **Language**: TypeScript
- **Storage**: IndexedDB via [idb](https://github.com/jakearchibald/idb)
- **Messaging**: [@webext-core/messaging](https://webext-core.aklinker1.io/)
- **i18n**: [@wxt-dev/i18n](https://wxt.dev/i18n.html)
- **UI**: Vanilla TypeScript (no framework overhead)

## 🌐 Browser Support

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Firefox 109+

## 📋 How It Works

### Architecture

1. **Background Script** (`background.ts`)
   - Monitors navigation events via `webNavigation.onBeforeNavigate`
   - Collects IP addresses via `webRequest.onCompleted`
   - Manages tab lifecycle and listeners
   - Stores data in IndexedDB with automatic cleanup

2. **Content Script** (`content.ts`)
   - Captures performance timing using Performance API
   - Collects resource timing data
   - Communicates with background script via type-safe messaging
   - Associates IP addresses with resources

3. **Storage Service** (`storage.service.ts`)
   - IndexedDB-based storage with automatic cleanup
   - Type-safe proxy service interface
   - Efficient indexed queries

4. **Popup UI** (`popup/`)
   - Navigation timing visualization
   - Resource list with sorting and filtering
   - DOM reuse optimization for performance
   - Virtual scrolling for large resource lists

### Data Flow

```
User navigates
    ↓
webNavigation.onBeforeNavigate
    └─ Start webRequest listener
    ↓
webRequest.onCompleted (concurrent)
    └─ Save IP to IndexedDB
    ↓
Content script collects performance data
    ↓
getIPData request
    └─ Retrieve from IndexedDB
    ↓
savePerformanceData
    └─ Store in IndexedDB
    ↓
Popup displays metrics
```

## 📚 Documentation

- **[Architecture](docs/architecture.md)** - System design, components, and optimization strategies
- **[Development Guide](docs/development.md)** - Setup, debugging, testing, and best practices
- **[Documentation Index](docs/README.md)** - Overview of all documentation

## 🔒 Privacy & Security

- ✅ **Local Processing**: All data processed locally, never uploaded
- ✅ **Data Isolation**: Each tab's data stored independently
- ✅ **Auto Cleanup**: Automatic cleanup on tab close and periodic cleanup
- ✅ **Minimal Permissions**: Only requests necessary permissions
- ✅ **No External Communication**: No external API calls

## 📄 License

MIT License - See [LICENSE.md](LICENSE.md)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🙏 Acknowledgments

- Built with [WXT](https://wxt.dev/)
- Uses [webext-core](https://webext-core.aklinker1.io/) utilities
- Inspired by browser DevTools Performance panel
