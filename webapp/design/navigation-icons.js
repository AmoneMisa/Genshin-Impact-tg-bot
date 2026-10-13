/** Small functional navigation symbols; decorative game artwork stays in the L2 icon catalogue. */
const paths={
 locate:'<circle cx="12" cy="12" r="6"/><path d="M12 2v5m0 10v5M2 12h5m10 0h5"/>',
 route:'<path d="m21 3-7 18-4-7-7-4 18-7Z"/>',
 pin:'<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
 next:'<path d="m9 5 7 7-7 7"/>',
};
export function navigationIcon(name){return paths[name]?`<svg class="ui-navigation-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${paths[name]}</svg>`:'';}
