import { defineProxyService } from "@webext-core/proxy-service";
import { openDB, type IDBPDatabase } from "idb";
import type {
  PerformanceData,
  PerformanceTiming,
  IPData,
} from "../utils/types";

// 定义数据库 schema
interface PageLoadTimeDB {
  ipCache: {
    key: string;
    value: IPData;
    indexes: { timestamp: number; tabId: number };
  };
  performanceData: {
    key: number;
    value: PerformanceData;
    indexes: { timestamp: number };
  };
}

function createStorageService(
  dbPromise: Promise<IDBPDatabase<PageLoadTimeDB>>
) {
  return {
    // 性能数据操作
    async savePerformanceData(
      tabId: number,
      timing: PerformanceTiming
    ): Promise<void> {
      const db = await dbPromise;
      await db.put("performanceData", { tabId, timing, timestamp: Date.now() });
    },

    async getPerformanceData(tabId: number): Promise<PerformanceData | null> {
      const db = await dbPromise;
      const result = await db.get("performanceData", tabId);
      return result || null;
    },

    async deletePerformanceData(tabId: number): Promise<void> {
      const db = await dbPromise;
      await db.delete("performanceData", tabId);
    },

    // IP 数据操作
    async saveIPData(url: string, ip: string, tabId: number): Promise<void> {
      const db = await dbPromise;
      await db.put("ipCache", { url, ip, tabId, timestamp: Date.now() });
    },

    async getIPDataByTab(tabId: number): Promise<Record<string, string>> {
      const db = await dbPromise;
      const tx = db.transaction("ipCache", "readonly");
      const index = tx.store.index("tabId");
      const items = await index.getAll(tabId);

      return items.reduce<Record<string, string>>((acc, item) => {
        acc[item.url] = item.ip;
        return acc;
      }, {});
    },

    async deleteTabData(tabId: number): Promise<void> {
      const db = await dbPromise;
      const tx = db.transaction(["ipCache", "performanceData"], "readwrite");

      // 删除 IP 数据
      const ipIndex = tx.objectStore("ipCache").index("tabId");
      let cursor = await ipIndex.openCursor(IDBKeyRange.only(tabId));
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }

      // 删除性能数据
      await tx.objectStore("performanceData").delete(tabId);
      await tx.done;
    },

    async cleanupOldData(expiryTime: number = 3600000): Promise<number> {
      const db = await dbPromise;
      const cutoffTime = Date.now() - expiryTime;
      let deletedCount = 0;

      const tx = db.transaction(["ipCache", "performanceData"], "readwrite");

      // 清理 IP 缓存
      const ipIndex = tx.objectStore("ipCache").index("timestamp");
      let ipCursor = await ipIndex.openCursor(
        IDBKeyRange.upperBound(cutoffTime)
      );
      while (ipCursor) {
        await ipCursor.delete();
        deletedCount++;
        ipCursor = await ipCursor.continue();
      }

      // 清理性能数据
      const perfIndex = tx.objectStore("performanceData").index("timestamp");
      let perfCursor = await perfIndex.openCursor(
        IDBKeyRange.upperBound(cutoffTime)
      );
      while (perfCursor) {
        await perfCursor.delete();
        deletedCount++;
        perfCursor = await perfCursor.continue();
      }

      await tx.done;
      return deletedCount;
    },
  };
}

// 初始化数据库
const dbPromise = openDB<PageLoadTimeDB>("PageLoadTimeDB", 1, {
  upgrade(db) {
    // IP 缓存存储
    if (!db.objectStoreNames.contains("ipCache")) {
      const ipStore = db.createObjectStore("ipCache", { keyPath: "url" });
      ipStore.createIndex("timestamp", "timestamp");
      ipStore.createIndex("tabId", "tabId");
    }

    // 性能数据存储
    if (!db.objectStoreNames.contains("performanceData")) {
      const perfStore = db.createObjectStore("performanceData", {
        keyPath: "tabId",
      });
      perfStore.createIndex("timestamp", "timestamp");
    }
  },
});

export const [registerStorageService, getStorageService] = defineProxyService(
  "StorageService",
  () => createStorageService(dbPromise)
);
