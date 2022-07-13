/* eslint-disable @typescript-eslint/no-empty-function */
import { get, writable } from 'svelte/store';
import { Writable } from 'svelte/store';
import { stringify } from 'qs';
import { alphabeticalSort } from './utils';

export type FetchStore<T = any> = {
  data?: T;
  loading?: boolean;
  error?: unknown;
  noMore?: boolean;
};

type FetchFn<Data, Arguments> = (
  args: Arguments | undefined,
  fetcher: typeof fetch
) => Promise<Data> | Data;

type QueryOptions<Data> = {
  policy?: {
    merge?(original: Data | undefined, source: Data): Data;
    noMore?(source: Data): boolean;
  };
  /**
   * TODO: cache: 'public' | 'private'
   *
   * how can we design cache mechanism?
   * we want to reduce the rtt of fetching the remote resource
   * and doesn't wnat to break the way for sveltekit to do server-side-rendering
   * so it would need to fetch but use cache (refresh / validate)
   *
   * reuse response -> response.clone()
   */
};

class Query<
  Data,
  Arguments extends
    | Partial<Record<string, string | number | boolean>>
    | number
    | string
    | boolean
    | void = void
> {
  private _fetchFn: FetchFn<Data, Arguments>;
  private _prevArgs: Arguments | undefined;
  private _cacheMap: Map<string, Promise<void>> = new Map();
  private _policy: Required<Required<QueryOptions<Data>>['policy']> = {
    merge: (_, s) => s,
    noMore: () => false
  };
  private _shared: Writable<FetchStore<Data>>;
  private _store: Writable<FetchStore<Data>>;

  /**
   * there is a security issue about sharing the state in server side
   * so we need to store fetched result by request
   * therefore, we use weak map here, it'd save every store in it
   * also we  don't need to care about memory leak (because of auto GC)
   */
  private _storeMap = new WeakMap();

  /**
   * make query instance observable
   */
  public update: Writable<FetchStore<Data>>['update'];
  public subscribe: Writable<FetchStore<Data>>['subscribe'];
  public set: Writable<FetchStore<Data>>['set'];

  constructor(
    fetchFn: FetchFn<Data, Arguments>,
    options: QueryOptions<Data> = {}
  ) {
    this._fetchFn = fetchFn;

    this._shared = writable({});
    this._store = this._shared;
    this.update = this._store.update;
    this.subscribe = this._store.subscribe;
    this.set = this._store.set;
    this._policy = { ...this._policy, ...options.policy };
  }

  select = async (
    argsOrArgsFn?: ((prevArgs: Arguments | undefined) => Arguments) | Arguments,
    fetcher = fetch
  ) => {
    if (typeof window === 'undefined') {
      this._store = this._storeMap.get(fetcher) || this._shared;

      if (this._store === this._shared) {
        const s = writable({});
        this._storeMap.set(fetcher, s);
        this._store = s;
        this.update = this._store.update;
        this.subscribe = this._store.subscribe;
        this.set = this._store.set;
      }
    }

    const args =
      typeof argsOrArgsFn === 'function'
        ? argsOrArgsFn(this._prevArgs)
        : argsOrArgsFn;
    this._prevArgs = args;
    const key = stringify(args, { sort: alphabeticalSort });
    const cachedPromise = this._cacheMap.get(key);
    if (cachedPromise) return cachedPromise;

    const promise = (async () => {
      const store = get(this._store);
      console.log(store);
      if (store.noMore) return;

      try {
        this.update(state => ({ ...state, loading: true }));

        const data = await this._fetchFn(args, fetcher);

        this.update(state => ({
          ...state,
          data: this._policy.merge(state.data, data),
          noMore: this._policy.noMore(data)
        }));

        // TODO: support revalidate feature.
        this._cacheMap.delete(key);
      } catch (error) {
        this.update(state => ({ ...state, error }));
      } finally {
        this.update(state => ({ ...state, loading: false }));
      }
    })();

    this._cacheMap.set(key, promise);

    /**
     * Await for svelteKit fetch gathering feature
     * @see https://github.com/sveltejs/kit/blob/52fc5b367f34c79cba90ae7114db02b5cfbf9a59/packages/kit/src/runtime/server/page/load_node.js#L296-L305
     */
    if (typeof window == 'undefined') await promise;

    return this;
  };
}

export { Query };
