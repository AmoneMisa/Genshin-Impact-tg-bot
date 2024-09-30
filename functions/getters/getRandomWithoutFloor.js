import lodash from 'lodash';

export default function (min, max) {
    return lodash.round(min + Math.random() * (max - min), 3);
};