import { Action } from '@lib/contracts/action';
import * as R from 'ramda';
import { Observable } from 'rxjs/Observable';

/**
 * Filter Observable of actions by type.
 *
 * @param {string} type
 * @returns {(source: Observable<Action>) => Observable<any>}
 */
export default function ofType(type: string) {
    return (source: Observable<Action>) => {
        return source.filter(R.propEq('type', type));
    };
}
