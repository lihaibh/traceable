import { Action } from '@lib/contracts/action';

export type Reducer<STATE, ACTIONS extends Action> = (action: ACTIONS, state: STATE) => STATE;
