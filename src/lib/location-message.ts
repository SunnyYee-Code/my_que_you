// T16 4.4.1 位置消息工具函数

export interface LocationMessageMeta {
  address: string;
  lat: number;
  lng: number;
  /** ISO 8601 字符串，发送后 24 小时过期 */
  expires_at: string;
}

/** 位置消息有效期：24 小时 */
export const LOCATION_EXPIRY_HOURS = 24;

/** 从消息 metadata 中解析位置信息，返回 null 表示格式无效 */
export function parseLocationMeta(metadata: unknown): LocationMessageMeta | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const m = metadata as Record<string, unknown>;
  if (
    typeof m.address !== 'string' ||
    typeof m.lat !== 'number' ||
    typeof m.lng !== 'number' ||
    typeof m.expires_at !== 'string'
  ) {
    return null;
  }
  return { address: m.address, lat: m.lat, lng: m.lng, expires_at: m.expires_at };
}

/** 判断位置消息是否已过期 */
export function isLocationExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/** 构造位置消息元数据，有效期 24 小时 */
export function createLocationMeta(address: string, lat: number, lng: number): LocationMessageMeta {
  const expires_at = new Date(Date.now() + LOCATION_EXPIRY_HOURS * 60 * 60 * 1000).toISOString();
  return { address, lat, lng, expires_at };
}

/** 生成高德地图导航深链接（步行模式，支持 App 跳转） */
export function getAmapNavigationUrl(lat: number, lng: number, address: string): string {
  return `https://uri.amap.com/navigation?to=${lng},${lat},${encodeURIComponent(address)}&mode=walk&callnative=1`;
}

/** 生成高德静态地图图片 URL（用于位置卡片预览）*/
export function getAmapStaticMapUrl(lat: number, lng: number, key: string): string {
  return `https://restapi.amap.com/v3/staticmap?location=${lng},${lat}&zoom=14&size=300*150&markers=large,,A:${lng},${lat}&key=${key}`;
}

/** 构造位置消息的文本内容（fallback/预览用） */
export function buildLocationContent(address: string): string {
  return `[位置] ${address}`;
}
