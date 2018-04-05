import 'module-alias/register';

import { Dummy } from '@lib/_dummy';
import * as R from 'ramda';

const dummy = new Dummy();

dummy.state$().subscribe((data) => {
    console.log(R.toString(data));
}, () => {
    console.log('error');
}, () => console.log('completed!'));

dummy.manualChangeLvl0(500);
dummy.manualChangeLvl0(300);
dummy.manualChangeLvl0(200);
dummy.manualChangeLvl0(200);
dummy.manualChangeLvl0(700);
dummy.manualChangeLvl0(600);

dummy.triggerEffectForStateAutoUpdate();
