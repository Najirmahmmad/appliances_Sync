import { Buffer } from 'buffer';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}

const OriginalTextDecoder = global.TextDecoder;
if (OriginalTextDecoder) {
  global.TextDecoder = function (encoding?: string, options?: any) {
    if (encoding === 'latin1') {
      // Return a mocked TextDecoder for fast-png which uses latin1
      return {
        encoding: 'latin1',
        fatal: false,
        ignoreBOM: false,
        decode: (data: Uint8Array) => {
          let str = '';
          if (data) {
            for (let i = 0; i < data.length; i++) {
              str += String.fromCharCode(data[i]);
            }
          }
          return str;
        }
      } as any;
    }
    return new OriginalTextDecoder(encoding, options);
  } as any;
}

