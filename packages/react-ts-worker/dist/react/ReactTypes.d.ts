export type ReactNode = ReactElement | string | number | bigint | boolean | null | undefined | Iterable<ReactNode> | ReactPortal | PromiseLike<ReactNode>;
export interface ReactElement<P = any, T extends string | symbol | ReactComponentType | object = string | symbol | ReactComponentType | object> {
    $$typeof: symbol;
    type: T;
    key: string | null;
    ref: Ref<any> | null;
    props: P;
    _owner: any;
}
export interface ReactPortal extends ReactElement {
    children: ReactNode;
}
export type ReactComponentType<P = any> = FunctionComponent<P> | ComponentClass<P>;
export type FunctionComponent<P = {}> = (props: P) => ReactNode;
export interface ComponentClass<P = {}> {
    new (props: P, context?: any): ComponentInstance<P>;
    defaultProps?: Partial<P>;
    displayName?: string;
    contextType?: ReactContext<any>;
}
export interface ComponentInstance<P = {}, S = {}> {
    props: Readonly<P>;
    state: Readonly<S>;
    context: any;
    refs: Record<string, any>;
    setState(state: S | ((prevState: Readonly<S>, props: Readonly<P>) => S | null) | null, callback?: () => void): void;
    forceUpdate(callback?: () => void): void;
    render(): ReactNode;
    componentDidMount?(): void;
    componentDidUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>, snapshot?: any): void;
    componentWillUnmount?(): void;
    shouldComponentUpdate?(nextProps: Readonly<P>, nextState: Readonly<S>, nextContext: any): boolean;
    getSnapshotBeforeUpdate?(prevProps: Readonly<P>, prevState: Readonly<S>): any;
    componentDidCatch?(error: Error, errorInfo: {
        componentStack: string;
    }): void;
}
export type Ref<T> = RefObject<T> | RefCallback<T> | null;
export interface RefObject<T> {
    current: T | null;
}
export type RefCallback<T> = (instance: T | null) => void;
export interface ReactContext<T> {
    $$typeof: symbol;
    Provider: ReactContext<T>;
    Consumer: ReactConsumer<T>;
    _currentValue: T;
    _currentValue2: T;
    displayName?: string;
}
export interface ReactConsumer<T> {
    $$typeof: symbol;
    _context: ReactContext<T>;
}
export interface ReactProviderType<T> {
    $$typeof: symbol;
    _context: ReactContext<T>;
}
export type Usable<T> = PromiseLike<T> | ReactContext<T>;
export interface MemoComponent<P = any> {
    $$typeof: symbol;
    type: FunctionComponent<P>;
    compare: ((prevProps: P, nextProps: P) => boolean) | null;
    displayName?: string;
}
export interface ForwardRefComponent<P = any, T = any> {
    $$typeof: symbol;
    render: (props: P, ref: Ref<T>) => ReactNode;
    displayName?: string;
}
export interface LazyComponent<T = any> {
    $$typeof: symbol;
    _payload: LazyPayload<T>;
    _init: (payload: LazyPayload<T>) => T;
}
export interface LazyPayload<T> {
    _status: number;
    _result: T | PromiseLike<T> | ((payload: LazyPayload<T>) => T);
}
export type Dispatcher = {
    useState<S>(initialState: (() => S) | S): [S, Dispatch<SetStateAction<S>>];
    useReducer<S, A>(reducer: (state: S, action: A) => S, initialArg: S, init?: undefined): [S, Dispatch<A>];
    useReducer<S, I, A>(reducer: (state: S, action: A) => S, initialArg: I, init: (arg: I) => S): [S, Dispatch<A>];
    useEffect(create: () => (() => void) | void, deps?: DependencyList): void;
    useLayoutEffect(create: () => (() => void) | void, deps?: DependencyList): void;
    useInsertionEffect(create: () => (() => void) | void, deps?: DependencyList): void;
    useCallback<T extends (...args: any[]) => any>(callback: T, deps: DependencyList): T;
    useMemo<T>(create: () => T, deps: DependencyList): T;
    useRef<T>(initialValue: T): RefObject<T>;
    useContext<T>(context: ReactContext<T>): T;
    useImperativeHandle<T>(ref: Ref<T> | undefined, create: () => T, deps?: DependencyList): void;
    useDebugValue<T>(value: T, format?: (value: T) => any): void;
    useTransition(): [boolean, (callback: () => void) => void];
    useDeferredValue<T>(value: T, initialValue?: T): T;
    useId(): string;
    useSyncExternalStore<T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T): T;
    use<T>(usable: Usable<T>): T;
    useOptimistic<S, A>(passthrough: S, reducer?: (state: S, action: A) => S): [S, (action: A) => void];
    useActionState<S, P>(action: (state: Awaited<S>, payload: P) => S, initialState: Awaited<S>, permalink?: string): [Awaited<S>, (payload: P) => void, boolean];
};
export type AsyncDispatcher = {
    getCacheForType<T>(resourceType: () => T): T;
};
export type Transition = {
    _callbacks: Set<(error?: unknown) => void> | null;
};
export type SetStateAction<S> = S | ((prevState: S) => S);
export type Dispatch<A> = (action: A) => void;
export type DependencyList = readonly unknown[] | any[] | null;
//# sourceMappingURL=ReactTypes.d.ts.map