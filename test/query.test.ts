import { FetchStore, Query } from '../src';
import { delay } from './utils';

globalThis.fetch = jest.fn();

describe('query', () => {
  it('should call fetcher after select()', () => {
    let fetcher = jest.fn();
    let fakeQ = new Query(async () => fetcher());
    expect(fetcher).not.toBeCalled();

    fakeQ.select();
    expect(fetcher).toBeCalledTimes(1);
  });

  it('should notify subscriber after finish select()', () => {
    let fetcher = jest.fn();
    let fakeQ = new Query(async () => fetcher());

    let callback = jest.fn();
    fakeQ.read().subscribe(callback);

    fakeQ.select();
    expect(callback).toBeCalled();
  });

  it('should dedupe request if args are same', () => {
    let fetcher = jest.fn();
    let fakeQ = new Query(async () => fetcher());

    fakeQ.select();
    fakeQ.select();
    fakeQ.select();
    fakeQ.select();
    fakeQ.select();

    expect(fetcher).toBeCalledTimes(1);
  });

  it('should abide by `noMore` policy', async () => {
    let count = 0;
    let maxCount = 3;
    let fetcher = jest.fn(() => (count += 1));
    let fakeQ = new Query(fetcher, {
      policy: {
        noMore: () => count === maxCount
      }
    });

    fakeQ.select(); // 1
    await delay();
    fakeQ.select(); // 2
    await delay();
    fakeQ.select(); // 3
    await delay();
    fakeQ.select(); // 4 - it's no-op
    expect(fetcher).toBeCalledTimes(maxCount);
  });

  it('should abide by `merge` policy', async () => {
    let fetcher = jest.fn(() => 1);
    let fakeQ = new Query(fetcher, {
      policy: {
        merge: (prev = 0, cur) => prev + cur
      }
    });

    let sum = 0;
    fakeQ.read().subscribe(store => (sum = store.data || 0));

    fakeQ.select();
    await delay();
    fakeQ.select();
    await delay();
    fakeQ.select();
    await delay();

    expect(sum).toBe(1 + 1 + 1);
  });

  it('should put error into store if error occurs', async () => {
    let fakeQ = new Query(() => {
      throw new Error();
    });

    let store: FetchStore;
    fakeQ.read().subscribe(cur => (store = cur));

    fakeQ.select();
    await delay();

    // @ts-ignore
    expect(store.error).toBeTruthy();
  });

  it('should make current argument by previous one', () => {
    let arg = {};
    let fakeQ = new Query<void, typeof arg>(() => {});

    fakeQ.select(arg);
    fakeQ.select(prev => {
      expect(prev).toBe(arg);
      return prev;
    });
  });
});
