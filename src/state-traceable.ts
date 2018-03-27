import 'rxjs/add/operator/distinctUntilChanged';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/filter';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/multicast';
import 'rxjs/add/operator/take';

import { Action } from '@lib/contracts/action';
import { Location } from '@lib/contracts/location';
import { Traceable } from '@lib/contracts/traceable';
import { Transformer } from '@lib/contracts/transformer';
import { Effect, getEffects } from '@lib/effect-decorator';
import { equals, isFunction, isObservable, path } from '@lib/utils/common';
import { selectOperator as select } from '@lib/utils/rx-operators/select';
import * as _ from 'lodash';
import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Observable } from 'rxjs/Observable';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import { Subscription } from 'rxjs/Subscription';
import { noop } from 'rxjs/util/noop';
import { Memoize } from 'typescript-memoize';
import { isArray, isString } from 'util';

export abstract class StateTraceable<STATE, ACTIONS extends Action> implements Traceable<STATE, ACTIONS> {
    /**
     * Start running side effects in the background from this class and sub-classes.
     */
    public start() {
        if (!this._initialized) {
            this.dispatch(this.initialize());
            this._initialized = true;
        }

        // Get effect property names
        const effects = getEffects.call(this);

        // subscribe all side effects
        this._side_effects = _.map(effects, (effect: string) => {
            const stream = this[effect];

            // subscribe to them
            if (isObservable(stream)) {
                return stream.subscribe(noop);
            } else {
                throw new Error(`${effect} is not an observable`);
            }
        });
    }

    /**
     * Dispatching a new state to listeners.
     *
     * @param {STATE} state - new state to dispatch
     */
    protected dispatch(state: STATE) {
        this._state_dispatcher.next(state);
    }

    /**
     * Feeding the dispatcher with an initialized state.
     * This is the first state we will emit to subscribers.
     *
     * @returns {STATE} the first state
     */
    protected abstract initialize(): STATE;

    /**
     * Get updates of new state changes as a stream.
     *
     * @param {string | string[]} location
     * @param {string} rest
     * @returns {Observable<S | STATE>}
     */
    @Memoize()
    public state$<S>(location?: Location<STATE, S>, ...rest: string[]): Observable<S | STATE> {
        const source$ = this._source$();

        if (isString(location)) {
            // TODO: Check if it has dots in it
            return source$.pipe(select(location, ...rest));
        } else if (isArray(location) || isFunction(location)) {
            return source$.pipe(select.apply(source$, location));
        }

        return source$;

        // when subscribing to data in any hierarchy
        // TODO: we might want to perform some actions to activate side effects before selecting data

        // TODO: support also selection by function by decorating the state that we pass to this function
        // with a property descriptor to track the path to each of the elements
    }

    @Memoize()
    private _source$(): Observable<STATE> {
        return this._state_dispatcher.asObservable()
            /* We need this line in order to compare by content rather than by reference
            * basically the dispatcher can dispatch same object reference with updated data */
            .map(state => _.cloneDeep(state))
            .distinctUntilChanged(equals)
            .multicast(new ReplaySubject(1)).refCount() as Observable<STATE>;
    }

    /**
     * Stops all side effects from running in the background.
     * it also stops default side effects that comes with this class.
     */
    public stop() {
        _.each(this._side_effects, (subscription: Subscription) => subscription.unsubscribe());
    }

    /**
     * Get the last state by selection.
     * We are getting the last emitted state
     *
     * @param {Function | string[]} location
     * @returns {S | STATE} the data located inside the current state by the path or the whole state
     */
    public snapshot<S>(location?: Location<STATE, S>, ...rest: string[]): STATE | S {
        let snapshot: STATE | S = this._state_dispatcher.getValue();

        if (isFunction(location)) {
            snapshot = (location as Transformer<STATE, S>)(snapshot);
        } else if (isString(location)) {
            snapshot = path(location, snapshot);
        }

        return snapshot as S | STATE;
    }

    /**
     * Get actions performed on this class as a stream.
     *
     * @returns {Observable<ACTIONS extends Action>}
     */
    @Memoize()
    public action$(): Observable<Action> {
        return this._actions_dispatcher.asObservable()
            .multicast(new ReplaySubject(1)).refCount();
    }

    /**
     * Perform a new action to trigger a side effect or to change the state.
     *
     * @param {ACTIONS} action
     */
    public act(action: ACTIONS): void {
        this._actions_dispatcher.next(action);
    }

    /**
     * Gets the action and the current state to compute a new state to dispatch.
     *
     * @param {ACTIONS} action - current action
     * @param {STATE} state
     * @see act
     */
    protected abstract reduce(action: ACTIONS, state: STATE): STATE;

    /**
     * Manage the actions to operate side effects and change state with new values.
     */
    protected _actions_dispatcher: ReplaySubject<ACTIONS> = new ReplaySubject(1);
    /*
    * We must have these data members initialized beforehand
    * so that we can declare side effects that will be initialized on class declaration time
    */
    protected _state_dispatcher: BehaviorSubject<STATE> = new BehaviorSubject<STATE>(null);

    /**
     * A side effect that binds the actions to the reducer function in order to dispatch state updates.
     * When a new action comes in, we execute the reducer function to compute the next state that will multicast
     * to listeners.
     * Other side effects from the subclasses might trigger an action to change the state or we can do it directly
     * by executing an action.
     */
    @Effect()
    private _state_update: Observable<any> = this.action$()
        // combine action with the current state
        // it will always generate new object so distinct function will compare by content rather than by reference
        .map(__ => [__, this.snapshot()])
        // spare calls to the reduce function if combination of action and state did not result with a new state
        .distinctUntilChanged(equals)
        /*
        * run reducer in order to calculate the new state by the given action.
        *
        * clone the state instance - to compare against the previous state.
        * because the reducer may not result with new instance, rather it modifies the state argument
        * without this line operator 'distinctUntilChanged' might fail detect changes.
        */
        .map(__ => this.reduce.apply(this, _.cloneDeep(__)))
        // deep scan for state changes against the previous
        .distinctUntilChanged(equals)
        // notify all state listeners about the change
        .do(this.dispatch.bind(this));

    /**
     * We basically handle all instance' side-effects subscriptions here.
     */
    private _side_effects: Subscription[];

    // Determine if the object was initialized
    private _initialized = false;
}
