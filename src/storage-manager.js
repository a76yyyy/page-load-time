/**
 * IndexedDB 存储管理器
 * 用于管理 IP 缓存和性能数据的持久化存储
 */
class PageLoadStorageManager {
    constructor() {
        this.db = null;
        this.dbName = 'PageLoadTimeDB';
        this.version = 1;
        this.stores = {
            ipCache: 'ipCache',
            performanceData: 'performanceData'
        };
        this.config = {
            MAX_URLS_PER_TAB: 200,
            CACHE_EXPIRY_TIME: 3600000, // 1 小时
            BATCH_SIZE: 50 // 批量操作的大小
        };
    }

    /**
     * 初始化数据库
     */
    async init() {
        return new Promise((resolve, reject) => {
            console.log('[PageLoadStorageManager] 🔧 开始打开数据库:', this.dbName, 'v' + this.version);

            // 检查 IndexedDB 是否可用
            // 在 Service Worker 中使用 self.indexedDB，在页面中使用 window.indexedDB
            const idb = typeof self !== 'undefined' && self.indexedDB ? self.indexedDB :
                typeof window !== 'undefined' && window.indexedDB ? window.indexedDB :
                    indexedDB;

            if (!idb) {
                const error = new Error('IndexedDB 不可用');
                console.error('[PageLoadStorageManager] ❌', error.message);
                reject(error);
                return;
            }

            const request = idb.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('[PageLoadStorageManager] ❌ IndexedDB 打开失败:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('[PageLoadStorageManager] ✅ IndexedDB 初始化成功');
                console.log('[PageLoadStorageManager] 📍 this.db 已设置:', this.db);
                console.log('[PageLoadStorageManager] 📍 数据库名称:', this.db.name);
                console.log('[PageLoadStorageManager] 📍 对象存储:', Array.from(this.db.objectStoreNames));
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[DEBUG] 🔄 IndexedDB 升级中...');

                // 创建 IP 缓存存储
                if (!db.objectStoreNames.contains(this.stores.ipCache)) {
                    const ipStore = db.createObjectStore(this.stores.ipCache, { keyPath: 'url' });
                    ipStore.createIndex('timestamp', 'timestamp', { unique: false });
                    ipStore.createIndex('tabId', 'tabId', { unique: false });
                    console.log('[DEBUG] 📦 创建 ipCache 对象存储');
                }

                // 创建性能数据存储
                if (!db.objectStoreNames.contains(this.stores.performanceData)) {
                    const perfStore = db.createObjectStore(this.stores.performanceData, { keyPath: 'tabId' });
                    perfStore.createIndex('timestamp', 'timestamp', { unique: false });
                    console.log('[DEBUG] 📦 创建 performanceData 对象存储');
                }
            };
        });
    }

    /**
     * 保存 IP 数据
     * @param {string} url - 请求的 URL
     * @param {string} ip - IP 地址
     * @param {number} tabId - 标签页 ID
     */
    async saveIPData(url, ip, tabId) {
        if (!this.db) {
            console.warn('[DEBUG] ⚠️ 数据库未初始化');
            return false;
        }

        try {
            const tx = this.db.transaction([this.stores.ipCache], 'readwrite');
            const store = tx.objectStore(this.stores.ipCache);

            const data = {
                url,
                ip,
                tabId,
                timestamp: Date.now()
            };

            return new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onerror = () => {
                    console.error('[DEBUG] ❌ 保存 IP 数据失败:', request.error);
                    reject(request.error);
                };
                request.onsuccess = () => {
                    console.log(`[DEBUG] 💾 IP 数据已保存: ${url} → ${ip}`);
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('[DEBUG] ❌ 保存 IP 数据异常:', error?.message || String(error), error?.stack);
            return false;
        }
    }

    /**
     * 获取单个 IP 数据
     * @param {string} url - 请求的 URL
     */
    async getIPData(url) {
        if (!this.db) {
            console.warn('[DEBUG] ⚠️ 数据库未初始化');
            return null;
        }

        try {
            const tx = this.db.transaction([this.stores.ipCache], 'readonly');
            const store = tx.objectStore(this.stores.ipCache);

            return new Promise((resolve, reject) => {
                const request = store.get(url);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        console.log(`[DEBUG] 📥 获取 IP 数据: ${url} → ${result.ip}`);
                    }
                    resolve(result || null);
                };
            });
        } catch (error) {
            console.error('[DEBUG] ❌ 获取 IP 数据失败:', error?.message || String(error));
            return null;
        }
    }

    /**
     * 获取指定 tab 的所有 IP 数据
     * @param {number} tabId - 标签页 ID
     */
    async getIPDataByTab(tabId) {
        if (!this.db) {
            console.warn('[DEBUG] ⚠️ 数据库未初始化');
            return {};
        }

        try {
            const tx = this.db.transaction([this.stores.ipCache], 'readonly');
            const store = tx.objectStore(this.stores.ipCache);
            const index = store.index('tabId');

            return new Promise((resolve, reject) => {
                const request = index.getAll(tabId);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const results = request.result;
                    const ipCache = {};
                    results.forEach(item => {
                        ipCache[item.url] = {
                            ip: item.ip,
                            timestamp: item.timestamp
                        };
                    });
                    console.log(`[DEBUG] 📥 获取 Tab ${tabId} 的 IP 数据: ${results.length} 条记录`);
                    resolve(ipCache);
                };
            });
        } catch (error) {
            console.error('[DEBUG] ❌ 获取 Tab IP 数据失败:', error?.message || String(error));
            return {};
        }
    }

    /**
     * 保存性能数据
     * @param {number} tabId - 标签页 ID
     * @param {object} timing - 性能数据对象
     */
    async savePerformanceData(tabId, timing) {
        if (!this.db) {
            console.warn('[DEBUG] ⚠️ 数据库未初始化');
            return false;
        }

        try {
            // 清理性能数据
            const cleanedTiming = this.cleanDataForStorage(timing);

            const tx = this.db.transaction([this.stores.performanceData], 'readwrite');
            const store = tx.objectStore(this.stores.performanceData);

            const data = {
                tabId,
                timing: cleanedTiming,
                timestamp: Date.now()
            };

            return new Promise((resolve, reject) => {
                const request = store.put(data);
                request.onerror = () => {
                    console.error('[DEBUG] ❌ 保存性能数据失败:', request.error);
                    reject(request.error);
                };
                request.onsuccess = () => {
                    console.log(`[DEBUG] 💾 性能数据已保存: Tab ${tabId}`);
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('[DEBUG] ❌ 保存性能数据异常:', error?.message || String(error), error?.stack);
            return false;
        }
    }

    /**
     * 获取性能数据
     * @param {number} tabId - 标签页 ID
     */
    async getPerformanceData(tabId) {
        if (!this.db) {
            console.warn('[DEBUG] ⚠️ 数据库未初始化');
            return null;
        }

        try {
            const tx = this.db.transaction([this.stores.performanceData], 'readonly');
            const store = tx.objectStore(this.stores.performanceData);

            return new Promise((resolve, reject) => {
                const request = store.get(tabId);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    const result = request.result;
                    if (result) {
                        console.log(`[DEBUG] 📥 获取性能数据: Tab ${tabId}`);
                    }
                    resolve(result || null);
                };
            });
        } catch (error) {
            console.error('[DEBUG] ❌ 获取性能数据失败:', error?.message || String(error));
            return null;
        }
    }

    /**
     * 删除指定 tab 的所有数据
     * @param {number} tabId - 标签页 ID
     */
    async deleteTabData(tabId) {
        if (!this.db) {
            console.warn('[DEBUG] ⚠️ 数据库未初始化');
            return false;
        }

        try {
            // 删除 IP 数据
            const ipTx = this.db.transaction([this.stores.ipCache], 'readwrite');
            const ipStore = ipTx.objectStore(this.stores.ipCache);
            const ipIndex = ipStore.index('tabId');

            await new Promise((resolve, reject) => {
                const request = ipIndex.openCursor(IDBKeyRange.only(tabId));
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve();
                    }
                };
            });

            // 删除性能数据
            const perfTx = this.db.transaction([this.stores.performanceData], 'readwrite');
            const perfStore = perfTx.objectStore(this.stores.performanceData);

            return new Promise((resolve, reject) => {
                const request = perfStore.delete(tabId);
                request.onerror = () => reject(request.error);
                request.onsuccess = () => {
                    console.log(`[DEBUG] 🗑️ Tab ${tabId} 的数据已删除`);
                    resolve(true);
                };
            });
        } catch (error) {
            console.error('[DEBUG] ❌ 删除 Tab 数据失败:', error?.message || String(error));
            return false;
        }
    }

    /**
     * 清理过期数据
     * @param {number} expiryTime - 过期时间（毫秒），默认 1 小时
     */
    async cleanupOldData(expiryTime = this.config.CACHE_EXPIRY_TIME) {
        if (!this.db) {
            console.warn('[DEBUG] ⚠️ 数据库未初始化');
            return 0;
        }

        try {
            const cutoffTime = Date.now() - expiryTime;
            let deletedCount = 0;

            // 清理 IP 缓存
            const ipTx = this.db.transaction([this.stores.ipCache], 'readwrite');
            const ipStore = ipTx.objectStore(this.stores.ipCache);
            const ipIndex = ipStore.index('timestamp');

            deletedCount += await new Promise((resolve, reject) => {
                let count = 0;
                const request = ipIndex.openCursor(IDBKeyRange.upperBound(cutoffTime));
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        count++;
                        cursor.continue();
                    } else {
                        resolve(count);
                    }
                };
            });

            // 清理性能数据
            const perfTx = this.db.transaction([this.stores.performanceData], 'readwrite');
            const perfStore = perfTx.objectStore(this.stores.performanceData);
            const perfIndex = perfStore.index('timestamp');

            deletedCount += await new Promise((resolve, reject) => {
                let count = 0;
                const request = perfIndex.openCursor(IDBKeyRange.upperBound(cutoffTime));
                request.onerror = () => reject(request.error);
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        cursor.delete();
                        count++;
                        cursor.continue();
                    } else {
                        resolve(count);
                    }
                };
            });

            console.log(`[DEBUG] 🧹 清理过期数据: 删除 ${deletedCount} 条记录`);
            return deletedCount;
        } catch (error) {
            console.error('[DEBUG] ❌ 清理过期数据失败:', error?.message || String(error));
            return 0;
        }
    }

    /**
     * 获取数据库统计信息
     */
    async getStats() {
        if (!this.db) {
            console.warn('[DEBUG] ⚠️ 数据库未初始化');
            return null;
        }

        try {
            // 使用单个事务访问两个对象存储
            const tx = this.db.transaction([this.stores.ipCache, this.stores.performanceData], 'readonly');
            const ipStore = tx.objectStore(this.stores.ipCache);
            const perfStore = tx.objectStore(this.stores.performanceData);

            // 同时发起两个 count 请求
            const ipCountPromise = new Promise((resolve, reject) => {
                const request = ipStore.count();
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });

            const perfCountPromise = new Promise((resolve, reject) => {
                const request = perfStore.count();
                request.onerror = () => reject(request.error);
                request.onsuccess = () => resolve(request.result);
            });

            // 等待两个请求都完成
            const [ipCount, perfCount] = await Promise.all([ipCountPromise, perfCountPromise]);

            const stats = {
                ipCacheCount: ipCount,
                performanceDataCount: perfCount,
                totalRecords: ipCount + perfCount
            };

            console.log('[DEBUG] 📊 数据库统计:', stats);
            return stats;
        } catch (error) {
            console.error('[DEBUG] ❌ 获取统计信息失败:', error?.message || String(error));
            return null;
        }
    }

    /**
     * 清理数据以便序列化
     * @param {*} obj - 要清理的对象
     */
    cleanDataForStorage(obj) {
        if (obj === null || obj === undefined) {
            return null;
        }

        if (typeof obj !== 'object') {
            if (typeof obj === 'function' || typeof obj === 'symbol') {
                return undefined;
            }
            return obj;
        }

        if (obj instanceof Date) {
            return obj.toISOString();
        }

        if (obj instanceof RegExp) {
            return obj.source;
        }

        if (Array.isArray(obj)) {
            return obj.map(item => this.cleanDataForStorage(item)).filter(item => item !== undefined);
        }

        // 处理普通对象
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
            const cleanedValue = this.cleanDataForStorage(value);
            if (cleanedValue !== undefined) {
                cleaned[key] = cleanedValue;
            }
        }

        return cleaned;
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close();
            console.log('[DEBUG] ✅ 数据库连接已关闭');
        }
    }
}

// 不在这里创建全局实例，而是在各自的上下文中按需创建和挂载
