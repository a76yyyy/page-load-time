NAME=page-load-time
VERSION=4.1

link_manifest_chrome:
	cp ./src/manifest.chrome.json ./src/manifest.json

link_manifest_firefox:
	cp ./src/manifest.firefox.json ./src/manifest.json

build_firefox: link_manifest_firefox
	mkdir -p build
	rm -f build/${NAME}-$(VERSION)_firefox.zip
	cd src && zip -r ../build/${NAME}-$(VERSION)_firefox.zip * && cd ..

build_chrome: link_manifest_chrome
	mkdir -p build
	rm -f build/${NAME}-$(VERSION)_chrome.zip
	cd src && zip -r ../build/${NAME}-$(VERSION)_chrome.zip * && cd ..

build: build_firefox build_chrome

extract_chrome:
	mkdir -p build/chrome
	unzip -o build/${NAME}-$(VERSION)_chrome.zip -d build/chrome

extract_firefox:
	mkdir -p build/firefox
	unzip -o build/${NAME}-$(VERSION)_firefox.zip -d build/firefox

extract: extract_chrome extract_firefox

clean:
	rm -rf build
