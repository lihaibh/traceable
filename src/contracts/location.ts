import { Transformer } from '@lib/contracts/transformer';

export type Location<STATE, S> = string | string[] | Transformer<STATE, S>;
