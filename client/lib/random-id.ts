type RandomCrypto = {
  randomUUID?: () => string;
  getRandomValues?: (array: Uint8Array) => Uint8Array;
};

export function createRandomId(
  length: number = 32,
  cryptoApi: RandomCrypto | undefined = globalThis.crypto
): string {
  if (length <= 0) {
    return '';
  }

  if (typeof cryptoApi?.randomUUID === 'function') {
    return cryptoApi.randomUUID().replace(/-/g, '').slice(0, length);
  }

  if (typeof cryptoApi?.getRandomValues === 'function') {
    const bytes = new Uint8Array(Math.ceil(length / 2));
    cryptoApi.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, length);
  }

  let result = '';
  while (result.length < length) {
    result += Math.random().toString(16).slice(2);
  }

  return result.slice(0, length);
}
