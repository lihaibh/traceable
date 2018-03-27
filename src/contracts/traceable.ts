import { Action } from '@lib/contracts/action';
import { Location } from '@lib/contracts/location';
import { Observable } from 'rxjs/Observable';

export interface Traceable<STATE, ACTIONS extends Action> {
    state$<S>(location?: Location<STATE, S>, ...rest: string[]): Observable<S | STATE>;
    snapshot<S>(location?: Location<STATE, S>, ...rest: string[]): S | STATE;
    act(action: ACTIONS): void;
    action$(): Observable<Action>;
    start(): void;
    stop(): void;
}
