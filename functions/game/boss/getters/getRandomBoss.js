import bossesTemplate from '../../../../template/bossTemplate.js';
import getRandom from '../../../getters/getRandom.js';

export default function () {
    return bossesTemplate[getRandom(0, bossesTemplate.length - 1)];
}