import 'module-alias/register';
import 'rxjs/add/observable/from';
import 'rxjs/add/observable/interval';
import 'rxjs/add/operator/bufferCount';
import 'rxjs/add/operator/skip';

import { Effect } from '@lib/effect-decorator';
import { Traceable } from '@lib/traceable-decorator';
import { Action, Traceable as ITraceable } from '@lib/types';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';

const NotImplementedError = new Error('Method not implemented.');

class Base {
    foo = 2;
}

// tslint:disable-next-line:max-classes-per-file
@Traceable<STATE, FunnyAction>({
    reduce: (action: FunnyAction, state: STATE): STATE => {
        if (action.payload) {
            return _.set(state, 'happy', action.payload);
        }

        return state;
    },
})
abstract class Man<STATE extends BaseMoodState,
    ACTIONS extends Action> extends Base implements ITraceable<STATE, ACTIONS> {

    protected initialize(): STATE {
        return {
            happy: false,
        } as STATE;
    }

    state$<S>(location?: string | string[] | ((state: STATE) => S), ...rest: string[]): Observable<STATE | S> {
        throw NotImplementedError;
    }
    snapshot<S>(location?: string | string[] | ((state: STATE) => S), ...rest: string[]): STATE | S {
        throw NotImplementedError;
    }
    act(action: ACTIONS): void {
        throw NotImplementedError;
    }
    action$(): Observable<Action> {
        throw NotImplementedError;
    }
    start(): void {
        throw NotImplementedError;
    }
    stop(): void {
        throw NotImplementedError;
    }
}

type MoodActions = FunnyAction | StrongerAction;

// tslint:disable-next-line:max-classes-per-file
class SuperMan extends Man<SuperMoodState, MoodActions> {
    constructor() {
        super();
        this.start();
    }

    @Effect()
    _interval_make_stronger: Observable<any> = Observable.interval(100).take(10)
        .map(__ => new StrongerAction())
        .do(this.act.bind(this));

    reduce(action: MoodActions, state: SuperMoodState) {
        if (action.type === 'stronger') {
            return _.set(state, 'strength', state.strength + 1);
        } else {  // We cannot resolve new state by this action, forward the request to super prototype
            const _base = Object.getPrototypeOf(Object.getPrototypeOf(this));

            if (_base.hasOwnProperty('reduce')) {
                return _base.reduce.call(this, action, state);
            }
        }

        return state;
    }

    initialize(): SuperMoodState {
        return {
            strength: 0,
            happy: false, // TODO: fetch from Base mood as it already knows how to initialize happy property
        };
    }
}

// tslint:disable-next-line:max-classes-per-file
class FunnyAction implements Action {
    type = 'happier';

    constructor(public payload: boolean) {
    }
}

// tslint:disable-next-line:max-classes-per-file
class StrongerAction implements Action {
    type = 'stronger';
    constructor() {
    }
}

interface BaseMoodState {
    happy: boolean;
}

interface SuperMoodState extends BaseMoodState {
    strength: number;
}
const superman = new SuperMan();

superman.state$()
    .subscribe((data) => {
        console.log(data);
    });

superman.act({
    type: 'happy',
    payload: true,
});

superman.act({
    type: 'stronger',
});

superman.act({
    type: 'stronger',
});
