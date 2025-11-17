export interface PerformanceTiming {
  name: string;
  duration: number;
  startTime: number;
  fetchStart: number;
  redirectStart: number;
  redirectEnd: number;
  domainLookupStart: number;
  domainLookupEnd: number;
  connectStart: number;
  connectEnd: number;
  requestStart: number;
  responseStart: number;
  responseEnd: number;
  domComplete: number;
  domInteractive: number;
  domContentLoadedEventStart: number;
  domContentLoadedEventEnd: number;
  loadEventStart: number;
  loadEventEnd: number;
  startTimestamp: number;
  remoteIPAddress?: string;
  resources?: ResourceEntry[];
}
export interface ResourceEntry {
  name: string;
  entryType: string;
  startTime: number;
  duration: number;
  initiatorType: string;
  nextHopProtocol: string;
  transferSize: number;
  encodedBodySize: number;
  decodedBodySize: number;
  responseStatus: number;
  serverTiming: any[];
  remoteIPAddress: string;
}

export interface PerformanceData {
  tabId: number;
  timing: PerformanceTiming;
  timestamp: number;
}

export interface IPData {
  url: string;
  ip: string;
  tabId: number;
  timestamp: number;
}
