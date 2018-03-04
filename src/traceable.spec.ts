import 'reflect-metadata';
import 'rxjs/add/operator/skip';
import 'rxjs/add/operator/toPromise';
import 'should';

import { Effect } from '@lib/effect-decorator';
import { StateTraceable } from '@lib/state-traceable';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Observable';
import { noop } from 'rxjs/util/noop';
import { spy, stub } from 'sinon';

import { Dummy, DummyActions, DummyState, first_state } from './_dummy';

/// <reference types="jest" />
// TODO: what suppose to happen when in runtime, using non Observable effect? should we throw on error?
// tslint:disable-next-line:no-big-function
describe('Traceable', () => {
    const _design_type = 'design:type';

    describe('State', () => {
        // TODO: create traceable object (using @Traceable or inherit from StateTraceable)
        it('should update state for a new manually performed action', async () => {
            // spy reduce to check number of calls to it
            const spyOn_reducer = spy(Dummy.prototype, 'reduce' as any);

            let dummy = new Dummy();

            // sanity check that
            spyOn_reducer.callCount.should.be.eql(0);
            expect(dummy.snapshot()).toMatchSnapshot();

            // Trigger the action that should change the state
            dummy.manualChangeLvl0(200);

            // Take the current state after performing the action
            // because the action is synchronized it should immediately change the initialized state
            // and that's what we will check, if the action, will update the state under the hood
            const observation = dummy.state$().take(1);

            // Use this hook to run the checks after state updates
            await observation.toPromise();
            expect(dummy.snapshot()).toMatchSnapshot();
            spyOn_reducer.callCount.should.be.eql(1);
            spyOn_reducer.restore();
            dummy.stop();
            dummy = null;
        });
        it('should spare calls to the reduce method for executing same action that did not modify the state', () => {
            // spy reduce to check number of calls to it
            const spyOn_reducer = spy(Dummy.prototype, 'reduce' as any);
            let dummy = new Dummy(_.set(_.cloneDeep(first_state), 'lvl0.data', 0));

            // sanity check
            spyOn_reducer.callCount.should.be.eql(0);

            // manually invoke action to change state's property to particular value and doing so multiple times
            for (let i = 0; i < 10; ++i) {
                dummy.manualChangeLvl0(20);
            }

            // first time because its a new action, second time because the the action changed the state
            spyOn_reducer.callCount.should.be.eql(2);
            spyOn_reducer.restore();
            dummy.stop();
            dummy = null;
        });
        it('should dispatch new state when it changes automatically by an action through an effect', async () => {
            const original_reducer = Dummy.prototype['reduce'];

            // spy reduce to check number of calls to it
            const stub_reducer = stub(Dummy.prototype, 'reduce' as any);
            stub_reducer.callsFake(function () {
                return original_reducer.apply(this, arguments);
            });

            let dummy = new Dummy(_.set(_.cloneDeep(first_state), 'lvl0.lvl1.data', 1000));

            // Sanity checks
            stub_reducer.callCount.should.be.eql(0);
            expect(dummy.snapshot()).toMatchSnapshot();

            // it should be updated with 9 fibonacci sequence numbers
            // 2 first values of fibonacci are identical, though the reduce may be executed many times
            // we should be notified only when state really changed
            // the state should be changed 9 times, we skip the first initial value
            const observation = dummy.state$().skip(1).take(9);

            observation.subscribe((state) => {
                expect(state).toMatchSnapshot();
            }, noop, () => {
                // check total numbers of calls to the reduce - including the trigger action
                // 1 by the trigger action + 10 by the side effect
                stub_reducer.callCount.should.be.eql(11);
                stub_reducer.restore();

                dummy.stop();
                dummy = null;
            });

            // this action should trigger a side effect that updates the state with fibonacci numbers
            dummy.triggerEffectForStateAutoUpdate();
        });
        it('should notify subscribers only when state content changes');
        // TODO: create two instances of the same class
        // TODO: execute action in one instance, expect 0 calls from the second and 1 call from the origin
        // TODO: check the same for different types
        it('should not mess up state of different prototype instances');

        describe('snapshot', () => {
            it('should have initialized snapshot by object creation', () => {
                const dummy = new Dummy(first_state);
                expect(dummy.snapshot()).toMatchSnapshot();
            });
            it('should point last state and receive it synchronously');
            it('should be able to select partial of the snapshot by function');
            it('should be able to select partial of the snapshot by path array');
            it('should be able to select partial of the snapshot by path arguments');
        });

        describe('state$', () => {
            it('should be able to track entire state changes');
            // TODO: change the state once, change the state in another place and check the number of subscription hits
            // TODO: check if only distinct changes are emitted
            it('should be able to select partial of the state by function and track it\'s changes');
            it('should be able to select partial of the state by path array and track it\'s changes');
            it('should be able to select partial of the state by path arguments and track it\'s changes');
        });

        describe('start', () => {
            it('should run effects that are only of Observable type in different inheritance hierarchies');
            it('should run effects only once regardless amount of calls');
        });

        describe('stop', () => {
            it('should disable effects from running in different inheritance hierarchies');
            it('should disable effects only once regardless amount of calls');
        });

        describe('reduce', () => {
            it('should emit new states when reduce modifies the state instance');
        });
    });

    describe('@Effect', () => {
        it('should throw an error for effects that are not of type Observable by type reflection', () => {

            class TraceableWithBadEffectType extends StateTraceable<DummyState, DummyActions> {
                // Decorate fields that are not exists yes - only created by constructing an object
                @Reflect.metadata(_design_type, Number) // Typescript should add this automatically
                private _bad_effect_1: number;
                @Reflect.metadata(_design_type, String) // Typescript should add this automatically
                private _bad_effect_2: string;
                @Reflect.metadata(_design_type, Object) // Typescript should add this automatically
                private _bad_effect_3: Object;
                @Reflect.metadata(_design_type, Observable) // Typescript should add this automatically
                private _good_effect_4: Observable<any> = Observable.from([1, 2, 3]);

                protected reduce(action: DummyActions, state: DummyState): DummyState {
                    return null;
                }

                protected initialize(): DummyState {
                    return null;
                }
            }

            const effectDecorator: PropertyDecorator = Effect();

            // Check runtime exceptions for property types

            expect(() => effectDecorator(TraceableWithBadEffectType.prototype, '_bad_effect_0'))
                .toThrowErrorMatchingSnapshot(); // property doesn't exists
            expect(() => effectDecorator(TraceableWithBadEffectType.prototype, '_bad_effect_1'))
                .toThrowErrorMatchingSnapshot();
            expect(() => effectDecorator(TraceableWithBadEffectType.prototype, '_bad_effect_2'))
                .toThrowErrorMatchingSnapshot();
            expect(() => effectDecorator(TraceableWithBadEffectType.prototype, '_bad_effect_3'))
                .toThrowErrorMatchingSnapshot();
            expect(() => effectDecorator(TraceableWithBadEffectType.prototype, '_good_effect_4'))
                .not.toThrow();

            // TODO: check types of static effects
        });
        it('should throw an error for effects that are not of type Observable by value', () => {
            // tslint:disable-next-line:max-classes-per-file
            class TraceableWithBadEffectValue extends StateTraceable<DummyState, DummyActions> {
                public _bad_effect_1;
                public _bad_effect_2;
                public _bad_effect_3;
                public _good_effect_1;
                // private static _bad_static_effect_1 = 5;
                // public static _good_static_effect_1: Observable<any> = Observable.from([1, 2, 3]);

                protected reduce(action: DummyActions, state: DummyState): DummyState {
                    return null;
                }

                protected initialize(): DummyState {
                    return null;
                }
            }

            // Test by property value - we can test by value on design time for prototype properties
            // because when the decorator runs it does not instantiate a new object, rather it
            // reads metadata about fields and and properties from the prototype object
            TraceableWithBadEffectValue.prototype._bad_effect_1 = 1;
            TraceableWithBadEffectValue.prototype._bad_effect_2 = 'another-bad-effect';
            TraceableWithBadEffectValue.prototype._bad_effect_3 = { bad: 'effect' };
            TraceableWithBadEffectValue.prototype._good_effect_1 = Observable.from([1, 2]).take(1);

            const effectDecorate: PropertyDecorator = Effect();

            // Check runtime exceptions for prototype property values
            expect(() => effectDecorate(TraceableWithBadEffectValue.prototype, '_bad_effect_0'))
                .toThrowErrorMatchingSnapshot(); // doesn't exists
            expect(() => effectDecorate(TraceableWithBadEffectValue.prototype, '_bad_effect_1'))
                .toThrowErrorMatchingSnapshot();
            expect(() => effectDecorate(TraceableWithBadEffectValue.prototype, '_bad_effect_2'))
                .toThrowErrorMatchingSnapshot();
            expect(() => effectDecorate(TraceableWithBadEffectValue.prototype, '_bad_effect_3'))
                .toThrowErrorMatchingSnapshot();
            expect(() => effectDecorate(TraceableWithBadEffectValue.prototype, '_good_effect_1'))
                .not.toThrow();

            // TODO: Check static fields
        });
        it('should throw an error if not being used in a traceable prototype' +
            ' (inherit from StateTraceable or using @Traceable decorator)', () => {
                // Load modules to test
                const _effect_module = require('./effect-decorator');
                const _traceable_module = require('./traceable-decorator');

                // Save original instances
                const originalEffectFactory = _effect_module.Effect;
                const originalTraceableFactory = _traceable_module.Traceable;
                const originalEffectDecorator = originalEffectFactory();
                const originalTraceableDecorator = originalTraceableFactory({
                    reduce: noop,
                    initialize: noop,
                });

                // Mock and spy functions
                const effectTester = stub(_effect_module, 'Effect');
                effectTester.callsFake(function () {
                    const _original_property_decorator =
                        originalEffectFactory.apply(this, arguments);

                    return function (): PropertyDecorator {
                        return _original_property_decorator.apply(this, arguments);
                    };
                });

                // Declare a non traceable and a traceable prototypes the JavaScript way
                // non traceable
                function Foo() {
                    this._effect_type = Observable.from([1, 2, 3]);
                }

                Foo.prototype._effect_value = Observable.from([1, 2, 3]);

                Reflect.decorate([
                    Reflect.metadata(_design_type, Observable),
                ], Foo.prototype, '_effect_type');

                // Inherits from StateTraceable
                function TraceableBar() {
                    this._effect_type = Observable.from([1, 2, 3]);
                    StateTraceable.call(this);
                }

                TraceableBar.prototype = _.create(StateTraceable.prototype, {
                    constructor: TraceableBar,
                });

                TraceableBar.prototype._effect_value = Observable.from([1, 2]);

                // We add metadata so we will be able to access the type of the
                // property before we construct an object
                Reflect.decorate([
                    Reflect.metadata('design:type', Observable),
                ], TraceableBar.prototype, '_effect_type');

                // Make Foo traceable by using the @Traceable decorator
                const TraceableFoo = originalTraceableDecorator(Foo);

                // Even if we created a TraceableFoo, Foo prototype should not be traceable
                // @Traceable decorator should not change Foo prototype itself
                expect(() => originalEffectDecorator(Foo.prototype, '_effect_type'))
                    .toThrowErrorMatchingSnapshot();
                expect(() => originalEffectDecorator(Foo.prototype, '_effect_value'))
                    .toThrowErrorMatchingSnapshot();

                // TODO: save content of Foo prototype and check its content after using the Traceab

                // Validate traceable prototype by using the @Traceable decorator
                expect(() => originalEffectDecorator(TraceableFoo.prototype, '_effect_type'))
                    .not.toThrow();
                expect(() => originalEffectDecorator(TraceableFoo.prototype, '_effect_value'))
                    .not.toThrow();

                // Validate traceable prototype by using the 'StateTraceable' class inheritance
                expect(() => originalEffectDecorator(TraceableBar.prototype, '_effect_type'))
                    .not.toThrow();
                expect(() => originalEffectDecorator(TraceableBar.prototype, '_effect_value'))
                    .not.toThrow();

                // TODO: Check the TypeScript way
                // TODO: Check static types
            });
    });

    describe('@Traceable', () => {
        it('should make the decorated class as "StateTraceable"');
        it('should make the decorated abstract class as "StateTraceable"');
        it('should throw an error when trying to use it in deeper inheritance level than the decorated class');
        it('should throw an error when trying to use in "StateTraceable" class');
        it('should throw an error when reduce function is not exists');
        it('should throw an error when initialize function is not exists');
        it('should throw an error for invalid reduce function type');
        it('should throw an error for invalid initialize function type');
    });

    describe('START_OWN_EFFECTS', () => {
        // tslint:disable-next-line:no-duplicate-string
        it('should throw an error when not being used on a traceable type');
        it('should invoke static effects only once for a particular traceable type, ' +
            'regardless inheritance hierarchy, when being invoked more than once');
    });

    describe('START_ALL_EFFECTS', () => {
        it('should throw an error when not being used on a traceable type');
        it('should start static effects only once for each class in the inheritance hierarchy of a traceable type, ' +
            'when being invoked more than once');
        it('should not start static effects for classes in different inheritance hierarchy of the traceable type');
    });

    describe('STOP_OWN_EFFECTS', () => {
        it('should throw an error when not being used on a traceable type');
        it('should stop static effects only once for a particular traceable type, ' +
            'regardless inheritance hierarchy, when being invoked more than once');
    });

    describe('STOP_ALL_EFFECTS', () => {
        it('should throw an error when not being used on a traceable type');
        it('should stop static effects only once for each class in the inheritance hierarchy of a traceable type, ' +
            'when being invoked more than once');
        it('should not stop static effects for classes in different inheritance hierarchy of the traceable type');
    });
});
