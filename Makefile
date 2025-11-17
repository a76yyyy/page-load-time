.PHONY: dev dev-firefox dev-edge build build-firefox zip zip-firefox clean install help extract extract_chrome extract_firefox reinstall

# 项目配置
NAME=page-load-time
VERSION=$(shell node -e "console.log(require('./package.json').version)")

# ============================================================================
# 开发命令
# ============================================================================

# 安装依赖
install:
	pnpm install

# 开发模式（Chrome，带 HMR 和自动重载）
dev:
	pnpm dev

# 开发模式（Firefox）
dev-firefox:
	pnpm dev:firefox

# 开发模式（Edge）
dev-edge:
	pnpm dev:edge

# ============================================================================
# 构建命令
# ============================================================================

# 生产构建（Chrome）
build:
	pnpm build

# 生产构建（Firefox）
build-firefox:
	pnpm build:firefox

# 打包 ZIP（Chrome，用于发布）
zip:
	pnpm zip

# 打包 ZIP（Firefox，用于发布）
zip-firefox:
	pnpm zip:firefox

# ============================================================================
# 提取命令（从 .output 目录提取构建产物）
# ============================================================================

# 提取 Chrome 版本
extract_chrome:
	mkdir -p build/chrome
	unzip -o .output/${NAME}-$(VERSION)-chrome.zip -d build/chrome

# 提取 Firefox 版本
extract_firefox:
	mkdir -p build/firefox
	unzip -o .output/${NAME}-$(VERSION)-firefox.zip -d build/firefox

# 提取所有版本
extract: extract_chrome extract_firefox

# ============================================================================
# 清理命令
# ============================================================================

# 清理构建产物
clean:
	rm -rf .output
	rm -rf dist
	rm -rf build

# 完整清理（包括 node_modules）
clean-all: clean
	rm -rf node_modules
	rm -rf pnpm-lock.yaml

# 重新安装依赖
reinstall: clean-all install

# ============================================================================
# 帮助信息
# ============================================================================

help:
	@echo "Page Load Time - 浏览器扩展开发命令"
	@echo ""
	@echo "开发命令:"
	@echo "  make install      - 安装依赖"
	@echo "  make dev          - 开发模式（Chrome，带 HMR）"
	@echo "  make dev-firefox  - 开发模式（Firefox）"
	@echo "  make dev-edge     - 开发模式（Edge）"
	@echo ""
	@echo "构建命令:"
	@echo "  make build        - 生产构建（Chrome）"
	@echo "  make build-firefox - 生产构建（Firefox）"
	@echo "  make zip          - 打包 ZIP（Chrome，用于发布）"
	@echo "  make zip-firefox  - 打包 ZIP（Firefox，用于发布）"
	@echo ""
	@echo "提取命令:"
	@echo "  make extract      - 提取所有版本"
	@echo "  make extract_chrome - 提取 Chrome 版本"
	@echo "  make extract_firefox - 提取 Firefox 版本"
	@echo ""
	@echo "清理命令:"
	@echo "  make clean        - 清理构建产物"
	@echo "  make clean-all    - 完整清理（包括 node_modules）"
	@echo "  make reinstall    - 重新安装依赖"
	@echo ""
	@echo "其他:"
	@echo "  make help         - 显示此帮助信息"
