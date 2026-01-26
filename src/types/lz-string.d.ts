/**
 * lz-string 類型聲明
 */

declare module 'lz-string' {
  /**
   * 將字串壓縮為 Base64 格式
   */
  export function compressToBase64(input: string): string;

  /**
   * 從 Base64 格式解壓縮字串
   */
  export function decompressFromBase64(input: string): string | null;

  /**
   * 將字串壓縮為 UTF16 格式
   */
  export function compressToUTF16(input: string): string;

  /**
   * 從 UTF16 格式解壓縮字串
   */
  export function decompressFromUTF16(input: string): string | null;

  /**
   * 將字串壓縮為 URI 安全格式
   */
  export function compressToEncodedURIComponent(input: string): string;

  /**
   * 從 URI 安全格式解壓縮字串
   */
  export function decompressFromEncodedURIComponent(input: string): string | null;

  /**
   * 將字串壓縮
   */
  export function compress(input: string): string;

  /**
   * 解壓縮字串
   */
  export function decompress(input: string): string | null;

  /**
   * 將字串壓縮為 Uint8Array
   */
  export function compressToUint8Array(input: string): Uint8Array;

  /**
   * 從 Uint8Array 解壓縮字串
   */
  export function decompressFromUint8Array(input: Uint8Array): string | null;
}
