import 'rxjs/add/observable/from';
import 'rxjs/add/operator/switchMapTo';

import { Effect } from '@lib/effect-decorator';
import ofType from '@lib/rx-operators/oftype';
import { StateTraceable } from '@lib/state-traceable';
import { Action } from '@lib/types';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';

export const first_state = {
    lvl0: {
        data: 0,
        lvl1: {
            data: 1,
        },
    },
};

export class Dummy extends StateTraceable<DummyState, DummyActions> {
    constructor(private _init_state = first_state) {
        super();
        this.start();
    }

    public manualChangeLvl0(change_to: number) {
        this.act(new ChangeLvl0(change_to));
    }

    public triggerEffectForStateAutoUpdate() {
        this.act(new AutoUpdateLvl1());
    }

    protected reduce(action: DummyActions, state: DummyState): DummyState {
        // We must create new object instance because distinctUntilChanged might compare by references
        if (action.type === 'change-lvl0') {
            return _.set(state, 'lvl0.data', (action as ChangeLvl0).payload);
        } else if (action.type === 'change-lvl1') {
            return _.set(state, 'lvl0.lvl1.data', (action as ChangeLvl1).payload);
        }

        return state;
    }

    protected initialize(): DummyState {
        return this._init_state;
    }

    @Effect()
    private _update_lvl1_data_action: Observable<any> =
        this.action$().pipe(ofType('auto-update'))
            .switchMapTo(
                Observable.from(fibonacci() as any).take(10)
                    .map((x: number) => new ChangeLvl1(x)),
        )
            // Invoke the action
            .do(this.act.bind(this));
}

// tslint:disable-next-line:max-classes-per-file
export class ChangeLvl0 implements Action {
    type = 'change-lvl0';

    constructor(public payload: number) {
    }
}

// tslint:disable-next-line:max-classes-per-file
export class ChangeLvl1 implements Action {
    type = 'change-lvl1';

    constructor(public payload: number) {
    }
}

// tslint:disable-next-line:max-classes-per-file
export class AutoUpdateLvl1 implements Action {
    type = 'auto-update';

    constructor() {
    }
}

export type DummyActions = ChangeLvl0 | ChangeLvl1 | AutoUpdateLvl1;

export interface DummyState {
    lvl0: {
        data: number,
        lvl1: {
            data: number,
        },
    };
}

export function* fibonacci() {
    let val1 = 1;
    let val2 = 1;
    let current;

    while (true) {
        current = val1;
        val1 = val2; // advance next value
        val2 = val2 + current;
        yield current;
    }
}
