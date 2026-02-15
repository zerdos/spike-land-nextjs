import type { Dispatcher, AsyncDispatcher, Transition } from './ReactTypes.js';
export interface SharedState {
    H: Dispatcher | null;
    A: AsyncDispatcher | null;
    T: Transition | null;
    S: ((transition: Transition, value: unknown) => void) | null;
}
declare const ReactSharedInternals: SharedState;
export default ReactSharedInternals;
//# sourceMappingURL=ReactSharedInternals.d.ts.map