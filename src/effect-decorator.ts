import 'reflect-metadata';

import { EFFECTS_META_KEY, SUBSCRIPTIONS_META_KEY, TRACEABLE_META_HOOK } from '@lib/meta';
import { chain, exists, has, isNotNil, isObservable, isPrototypeOf, prop } from '@lib/utils/common';
import * as _ from 'lodash';
import * as R from 'ramda';
import { Observable } from 'rxjs/Observable';
import { Subscription } from 'rxjs/Subscription';
import { noop } from 'rxjs/util/noop';
import { isArray } from 'util';

/**
 * Register a side effect to the prototype in order to run it in a traceable object.
 *
 * @returns {PropertyDecorator}
 */
export function Effect(): PropertyDecorator {
    return (target, effect: string): void => {
        // According the docs, target wil be a constructor for static members or prototype for instance members
        const original_target = target;
        const original_constructor = _getConstructor(target);
        const effect_is_static = _isConstructor(target);

        // Validate whether we are in a traceable class type
        if (!_isTraceable(original_target)) {
            throw new TypeError('You can\'t use @Effect decorator in a non traceable prototype');
        }

        // Validate Effect
        if (!_isEffectObservable(original_target, effect)) {
            throw new TypeError(`Side effect ${original_constructor.name}.${effect} is not an Observable`);
        }

        // Add the effect as a key to the target
        _addEffect(original_target, effect);

        if (effect_is_static) {
            // Run static effect
            _addSubscription(
                // Static members should be invoked as soon as they are initialized
                original_target,
                // Create a subscription (which activates the effect instantly)
                prop(effect as never, original_constructor).subscribe(noop),
            );
        }
    };
}

/**
 * Stop all effect subscriptions of a class and its base prototypes
 *
 * @param constructor
 */
export function STOP_ALL_EFFECTS(constructor_derived: { new(...args: any[]): any }) {
    _.each(_getConstructorChainDesc.call(constructor_derived), (constructor_base) => {
        STOP_OWN_EFFECTS(constructor_base);
    });
}

/**
 * Stops only static effects subscriptions of this own class.
 *
 * @param constructor
 */
export function STOP_OWN_EFFECTS(constructor: new (...args: any[]) => any) {
    if (!_isTraceable(constructor)) {
        throw new TypeError(`You can't stop static effects in a non traceable type: ${constructor.name}`);
    } else {
        const own_subscriptions = prop(SUBSCRIPTIONS_META_KEY as never, constructor);

        if (isArray(own_subscriptions)) {
            _.each(own_subscriptions, (subscription) => {
                if (isPrototypeOf(Subscription, subscription)) {
                    subscription.unsubscribe();
                }
            });

            _.remove(own_subscriptions, isPrototypeOf(Subscription));
        }
    }
}

function _isEffectObservable(target, effect): boolean {
    // Check the property type is in the right type
    const type = Reflect.getMetadata('design:type', target, effect);
    return (type === Observable.prototype.constructor) ||
        isObservable(prop(effect, target));
}

function _isTraceable(target: any): boolean {
    const constructor = _getConstructor(target);
    const prototype = _getPrototype(target);

    if (constructor.name === 'StateTraceable') {
        return true;
    } else {
        // In order to avoid circular dependencies - require the module on runtime
        const StateTraceable = require('@app/core/traceable/state-traceable').StateTraceable;
        return isPrototypeOf(StateTraceable, prototype) ||
            Reflect.hasMetadata(TRACEABLE_META_HOOK, constructor);
    }
}

function _getConstructor(target): { new(...args: any[]): any } {
    return _isConstructor(target) ? target : prop('constructor', target);
}

function _getPrototype(target): any {
    return _isConstructor(target) ? prop('prototype', target) : target;
}

export function getEffects() {
    let takeEffects = _takeInstanceEffects;

    if (_isConstructor(this)) {
        takeEffects = _takeStaticEffects;
    }

    // get only those in the prototype chain and order them by inheritance (super class first)
    return _.chain(_getConstructorChainDesc.call(this)).map(takeEffects).flattenDeep().filter(isNotNil).value() as string[];
}

function _isConstructor(target): boolean {
    return has('prototype', target);
}

export function getSubscriptions() {
    // get only those in the prototype chain and order them by inheritance (super class first)
    return _getConstructorChainDesc.call(this).map(_takeSubscription).filter(isPrototypeOf(Subscription)) as Subscription[];
}

function _takeSubscription(constructor: { new(...args: any[]): any }) {
    return prop(SUBSCRIPTIONS_META_KEY as never, constructor);
}

function _takeInstanceEffects(constructor: { new(...args: any[]): any }) {
    return prop(EFFECTS_META_KEY as never, constructor.prototype);
}

function _takeStaticEffects(constructor: { new(...args: any[]): any }) {
    return prop(EFFECTS_META_KEY as never, constructor);
}

export function START_OWN_EFFECTS(constructor: { new(...args: any[]): any }) {
    // TODO: what if we already subscribed?
}

export function START_ALL_EFFECTS(constructor: { new(...args: any[]): any }) {
    // TODO: what if we already subscribed
}

function _getConstructorChainDesc() {
    return _.reverse(_.uniqBy(chain.call(this), prop('name')));
}

const _addTargetMetaData = (meta_key: string, target: any, data: any) => {
    // Add data directly to the target (constructor or prototype)
    const target_own_data = target.hasOwnProperty(meta_key) ?
        target[meta_key] : _.set(target, meta_key, [])[meta_key];

    if (exists(data, target_own_data)) {
        throw new Error(`Trying to insert duplicated values to: ${meta_key} in target: ${_getConstructor(target).name}`);
    } else {
        target_own_data.push(data);
    }
};

const _addEffect = R.curry(_addTargetMetaData)(EFFECTS_META_KEY);
const _addSubscription = R.curry(_addTargetMetaData)(SUBSCRIPTIONS_META_KEY);
