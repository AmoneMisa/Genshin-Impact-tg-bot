import infoCallbacks from './info.js';
import personalInfoCallback from './personalInfo.js';

export default [
    ...personalInfoCallback,
    ...infoCallbacks
];