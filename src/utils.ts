function alphabeticalSort(a: string, b: string) {
  return a.localeCompare(b);
}

export function pick<T extends Partial<Record<string, any>>>(
  obj: T,
  keys: (keyof T)[]
) {
  return keys.reduce<Partial<T>>((prev, cur) => {
    return {
      ...prev,
      ...(typeof obj[cur] !== 'undefined' && { [cur]: obj[cur] })
    };
  }, {});
}

/**
 * refer to https://github.com/goto-bus-stop/qs-stringify/blob/default/index.js
 */
export function stringify(any: unknown, prefix = ''): string {
  if (any == null || typeof any !== 'object') {
    return encodeURIComponent(any as any);
  }

  const pairs = [];

  for (const key in any) {
    if (!Object.prototype.hasOwnProperty.call(any, key)) {
      continue;
    }

    const value = (any as any)[key];
    const enkey = encodeURIComponent(key);
    let pair;
    if (typeof value === 'object') {
      pair = stringify(value, prefix ? prefix + '[' + enkey + ']' : enkey);
    } else {
      pair =
        (prefix ? prefix + '[' + enkey + ']' : enkey) +
        '=' +
        encodeURIComponent(value);
    }
    pairs.push(pair);
  }

  return pairs.sort(alphabeticalSort).join('&');
}
