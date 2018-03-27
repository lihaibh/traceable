import { Action } from '@lib/contracts/action';
import { Reducer } from '@lib/contracts/reducer';
import { Effect, getEffects } from '@lib/effect-decorator';
import { EFFECTS_META_KEY, SUBSCRIPTIONS_META_KEY, TRACEABLE_META_HOOK } from '@lib/meta';
import { StateTraceable } from '@lib/state-traceable';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';
import { isArray } from 'util';

/**
 * Adds traceable functionality to the prototype.
 *
 * @param {TraceableOptions<STATE, ACTIONS extends Action>} options configure the decorator factory
 * @returns {<T extends Function>(target: T) => T} the new prototype decorated with traceable functionality
 */
export function Traceable<STATE, ACTIONS extends Action>(options: TraceableOptions<STATE, ACTIONS> = {}): ClassDecorator {
    return <T extends Function>(target: T): T => {
        const original = target;

        // TODO: force implementing ITraceable interface
        const traceable_impl: Function = options.implementation || StateTraceable.prototype.constructor;

        // Check already decorated traceable in the prototype chain
        // We want to make sure whether traceable functionality is already exists so we wont assign it twice
        if (Reflect.hasMetadata(TRACEABLE_META_HOOK, target)) {
            const decorated_base_name = Reflect.getMetadata(TRACEABLE_META_HOOK, target);
            throw new Error(`The class ${target.name} already decorated with traceable decorator
            by it's base class: ${decorated_base_name}`);
        }

        // Declare the new prototype
        function _Traceable(...args: any[]) {
            original.apply(this, args);

            // Construct the traceable object using the traceable implementation
            traceable_impl.prototype.constructor.call(this);

            // NOTE: We should run the effects after the instance is constructed
        }

        // Extends the original prototype
        _Traceable.prototype = Object.create(original.prototype);
        _Traceable.prototype.constructor = _Traceable;

        if (options.reduce) {
            _Traceable.prototype.reduce = options.reduce;
        } else if (!target.prototype.reduce) {
            throw new Error('You must provide a reduce function to the traceable prototype');
        } else {
            // TODO: check metadata of reduce property to throw as soon as possible
        }

        if (options.initialize) {
            _Traceable.prototype.initialize = options.initialize;
        } else if (!target.prototype.initialize) {
            throw new Error('You must provide an initialize function to the traceable prototype');
        } else {
            // TODO: check metadata of initialize to throw as soon as possible
        }

        // Add metadata to the new decorated prototype and annotate that it is traceable
        Reflect.defineMetadata(TRACEABLE_META_HOOK, original.name, _Traceable);

        // Make this class traceable by choosing an implementation
        _makeTraceable(_Traceable, traceable_impl);

        return _Traceable as any as T;
    };
}

function _makeTraceable(target: Function, traceable_impl: Function) {
    // Add traceable functionality by copying implementation recursively except metadata
    _.assign(target.prototype,
        // if the traceable implementation inherits from another class, its important to copy data from its base class
        // and ignoring effect meta key in order to re-apply instance effects
        _.omit(_.assignIn({}, traceable_impl.prototype),
            [EFFECTS_META_KEY]));

    // Apply instance effects
    const original_instance_effects =
        getEffects.call(traceable_impl.prototype);

    if (isArray(original_instance_effects)) {
        // Get all effects from the traceable implementation and apply them on the new prototype
        // We want to copy decorations for instance properties
        _.each(getEffects.call(traceable_impl.prototype), (effect) => {
            Reflect.decorate([
                Effect(),
                Reflect.metadata('design:type', Observable),
            ], target.prototype, effect, void 0);
        });
    }

    // TODO: copy static data recursively from super class
    // Copy constructor data except metadata from the traceable prototype
    _.assign(target.prototype.constructor,
        _.omit(traceable_impl.prototype.constructor, [SUBSCRIPTIONS_META_KEY, EFFECTS_META_KEY]));

    const original_static_effects =
        getEffects.call(traceable_impl.prototype.constructor);

    if (isArray(original_static_effects)) {
        // Apply static effects metadata
        _.each(original_static_effects, (static_effect) => {
            Reflect.decorate([
                Effect(),
                Reflect.metadata('design:type', Observable),
            ], target.prototype.constructor, static_effect, void 0);
        });
    }
}

export interface TraceableOptions<STATE, ACTIONS extends Action> {
    // TODO: force implementing ITraceable interface
    implementation?: Function;
    reduce?: Reducer<STATE, ACTIONS>;
    initialize?: () => STATE;
}
