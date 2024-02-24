import * as base64 from '@protobufjs/base64';

export function unB64(encoded: string): Uint8Array {
  const deWeb = encoded.replace(/-/g, '+').replace(/_/g, '/');
  const padded = deWeb.padEnd(
    deWeb.length + ((4 - (deWeb.length % 4)) % 4),
    '=',
  );
  const len = base64.length(padded);
  const buffer = new Uint8Array(len);
  base64.decode(padded, buffer, 0);
  return buffer;
}

export function enB64(arr: Uint8Array): string {
  return base64
    .encode(arr, 0, arr.length)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}
