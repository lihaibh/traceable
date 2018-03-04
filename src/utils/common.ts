import * as R from 'ramda';
import { Observable } from 'rxjs/Observable';

export const equals = R.equals;
export const has = R.has;
export const prop = R.prop;
export const isNotNil = R.complement(R.isNil);
export const isFunction = R.is(Function);
export const isPrototypeOf =
    R.curry((base: Function, derived) => base.prototype.isPrototypeOf(derived));
export const isObservable = isPrototypeOf(Observable);
export const path =
    R.cond([
        [R.is(String), R.useWith(R.path, [R.split('.')])],
        [R.T, R.path],
    ]);
export const findIndexEqual = R.useWith(R.findIndex, [equals]);
export const exists = (data, iterable) =>
    (findIndexEqual(data, iterable) !== -1);

export function chain(): Array<{ new(...args: any[]): any }> {
    const result = [];
    let target = this;
    const target_is_constructor = target.hasOwnProperty('prototype');
    const target_is_prototype = target.hasOwnProperty('constructor');
    if (!target_is_constructor && !target_is_prototype) {
        target = target.__proto__;
    }
    const target_constructor = target_is_constructor ? target : target.constructor;
    const target_prototype = target_is_constructor ? target.prototype : target;

    if ('Object' === target_constructor.name) {
        return [];
    } else {
        result.push(target_constructor);
    }

    return result.concat(chain.call(Object.getPrototypeOf(target_prototype)));
}
