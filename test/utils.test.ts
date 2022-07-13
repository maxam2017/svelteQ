import { stringify } from '../src/utils';

describe('stringify implementation', () => {
  it('should works with undefined, null, empty string and 0', () => {
    expect(stringify(undefined)).toBe('undefined');
    expect(stringify(null)).toBe('null');
    expect(stringify('')).toBe('');
    expect(stringify(0)).toBe('0');
  });

  it('should works with boolean', () => {
    expect(stringify(true)).toBe('true');
    expect(stringify(false)).toBe('false');
  });

  it('should works with number', () => {
    expect(stringify(1)).toBe('1');
    expect(stringify(1.1)).toBe('1.1');
    expect(stringify(-1)).toBe('-1');
  });

  it('should works with string', () => {
    expect(stringify('hello world')).toBe('hello%20world');
    expect(stringify('Case Sensitive')).toBe('Case%20Sensitive');
  });

  it('should works with array', () => {
    expect(stringify([1, 2, 4, 8, 16])).toBe('0=1&1=2&2=4&3=8&4=16');
    expect(stringify([1, [2], [[3]]])).toBe('0=1&1[0]=2&2[0][0]=3');
  });

  it('should works with object', () => {
    expect(stringify({ a: 1, b: '2', c: true })).toBe('a=1&b=2&c=true');
    expect(stringify({ b: '2', a: 1, c: true })).toBe('a=1&b=2&c=true');
    expect(stringify({ c: true, b: '2', a: 1 })).toBe('a=1&b=2&c=true');
  });

  it('should works with nested object', () => {
    expect(stringify({ a: 1, b: { c: 2 } })).toBe('a=1&b[c]=2');
    expect(stringify({ b: { c: 2 }, a: 1 })).toBe('a=1&b[c]=2');
  });
});
