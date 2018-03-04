import { Observable } from 'rxjs/Observable';

export interface Action {
    type: string;
    payload?: any;
}

export type Transformer<T, V> = (state: T) => V;

export type Location<STATE, S> = string | string[] | Transformer<STATE, S>;

export type Reducer<STATE, ACTIONS extends Action> = (action: ACTIONS, state: STATE) => STATE;

export interface Traceable<STATE, ACTIONS extends Action> {
    state$<S>(location?: Location<STATE, S>, ...rest: string[]): Observable<S | STATE>;
    snapshot<S>(location?: Location<STATE, S>, ...rest: string[]): S | STATE;
    act(action: ACTIONS): void;
    action$(): Observable<Action>;
    start(): void;
    stop(): void;
}
