# Traceable
Inspired by [@ngrx/platform] for Angular applications, this library allows you to decorate any prototype with a functionality to track objects state created from it using Reactive Extension observables, see [ReactiveX/rxjs].
It's also possible to create side effects in the prototype level that runs automatically when the state of an object has changed or we're trying to make some actions on it.

## Setup
Install rxjs to use Observable interface:

```
npm i rxjs --save
```

## Usage
Some examples are listed in src/_examples, you can check them out and run them.
using Traceable decorator:

```ts
// declare what state we wish to trace
interface PersonData {
    age: string;
}

// declare which actions we can do to change that state
interface PersonOlderAction extends Action {
    type = 'older';

    constructor() {
    }
}

// declare function that change a state by a given action
function reducer(action: PersonOlderAction, previous_state: PersonData) {
    // We have new incoming action, and we decide which next state the object should have
    if (action.type === 'older') {
        return {
            age: previous_state.age++
        };
    }

    return previous_state;
}

// declare initialize function so every person will have initial state
function initialize() {
    return {
        age: 0
    }
}

// Here we bind the state and actions
@Traceable<PersonData, PersonOlderAction>({
    reduce: reducer,
    initialize: initialize
})
class Person() {
    ....
    older() {
        this.act(new PersonOlderAction());
    }
}

let person = new Person();

// Traceable decorator adds functions that were not exist in the original Person prototype
let personAge = person.state$('age');

personAge.subscribe(console.log);
// will print 0 than 1

person.older();
```
