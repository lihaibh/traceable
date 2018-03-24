# Traceable

Inspired by [@ngrx/platform](https://github.com/ngrx/platform) for Angular applications, this library allows you to decorate any prototype / class with a functionality to track object states created from it as an event stream using Reactive Extension observables, see [ReactiveX/rxjs](https://github.com/ReactiveX/rxjs).
It's also possible to create side effects in the prototype level that runs automatically when the state of an object has changed or we're trying to make some actions on it.

## Setup

Please make sure to install rxjs first in order to use Observable interface:

```sh
npm i rxjs --save
```

Install our library:

```sh
npm i traceable-object
```

## Usage

Check out our pre maid [Examples](./src/_examples) to get sense of how to use this library properly.

using Traceable decorator:
the Traceable decorator adds functionality to a class / prototype (check type [Traceable<STATE, ACTIONS>](./src/types.ts)) so when an object of this prototype is created, you can track its changes.

in order to use decorators in Typescript you should enable experimentalDecorators compiler option in your tsconfig.json file like so:

```json
{
    "compilerOptions": {
        "target": "ES5",
        "experimentalDecorators": true
    }
}
```

Create a person object and track it's state:
```ts
// declare what state you wish to trace
interface PersonData {
    age: string;
}

// declare which actions you can do to change that state
interface PersonOlderAction extends Action {
    type = 'older';

    constructor() {
    }
}

type PersonActions = PersonOlderAction; // You can add as much actions as you like with the operator pipe "|"

// declare function that change a state by a given action
function reducer(action: PersonActions, previous_state: PersonData) {
    // We have new incoming action, and we decide which next state the object should have
    if (action.type === 'older') {
        return {
            age: previous_state.age + 1
        };
    }

    return previous_state;
}

// declare initialization function so every person will have an initial state
function initialize() {
    return {
        age: 0
    }
}

// Here we bind the state and actions to the Person prototype
@Traceable<PersonData, PersonActions>({
    reduce: reducer,
    initialize: initialize
})
class Person {
    ....
    older() {
        // Basically we can trigger actions where we want to
        this.act(new PersonOlderAction());
    }
}

let person = new Person();

// Traceable decorator adds functions that were not exist in the original Person prototype
// Check the interface @Traceable<STATE, ACTIONS>
// Here we are listening to be notified when the 'age' field of the person is changed
let personAge = person.state$('age');

personAge.subscribe(console.log); // when the age of the person is changed, it will be printed out

person.older(); // Will cause the age field in person to be increased

// We can also run action on person directly
person.act(new PersonOlderAction());
```
