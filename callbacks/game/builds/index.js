import builds from './builds.js';
import changeType from './changeType.js';
import collectResources from './collectResources.js';
import status from './status.js';
import upgrade from './upgrade.js';
import changeName from './changeName.js';
import forge from './forge.js';

export default [
    ...builds,
    ...changeType,
    ...collectResources,
    ...status,
    ...upgrade,
    ...changeName,
    ...forge
];