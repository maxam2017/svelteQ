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
  private _store: Writable<FetchStore<Data>>;

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
    const store = writable({});

    this.update = store.update;
    this.subscribe = store.subscribe;
    this.set = store.set;
    this._store = store;
    this._policy = { ...this._policy, ...options.policy };
  }

  select = (
    argsOrArgsFn?: ((prevArgs: Arguments | undefined) => Arguments) | Arguments,
    fetcher = fetch
  ) => {
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

    return this;
  };
}

export { Query };
