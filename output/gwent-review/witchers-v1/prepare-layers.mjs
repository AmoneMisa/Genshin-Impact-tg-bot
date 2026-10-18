import{prepareLayers}from'../shared/prepare-layers.mjs';
import{fileURLToPath}from'node:url';
const glyphs={
 igni:'<path d="M34 9c1 12 14 15 14 29a16 16 0 0 1-32 0c0-9 6-16 12-23-1 12 0 15 4 17 4-7 5-14 2-23Z" fill="#161816" stroke="none"/>',
 aard:'<path d="M10 20h25c16 0 20 18 7 18M9 32h17m-16 12h31c11 0 11 12 0 12M47 13l9 6-9 6"/>',
 yrden:'<circle cx="32" cy="32" r="21"/><path d="m17 47 15-29 15 29Zm0-30 15 29 15-29Z"/>',
 quen:'<path d="M12 17 32 9l20 8v17c0 12-11 19-20 23-9-4-20-11-20-23Z"/><path d="m22 31 8 8 13-16"/>',
 swallow:'<path d="m8 22 23 9 24-14-12 20 10 12-22-9-13 12 5-17Z" fill="#161816" stroke="none"/>',
 thunderbolt:'<path d="M35 7 15 36h15l-2 22 22-33H35Z" fill="#161816" stroke="none"/>',
 cat:'<path d="M8 32c12-18 36-18 48 0-12 18-36 18-48 0Z"/><path d="m31 18-5 14 5 14 5-14Z" fill="#161816" stroke="none"/>',
 oriole:'<path d="M28 9c-3 9-15 20-15 29a15 15 0 0 0 26 10M28 9c2 7 10 17 13 24"/><path d="m36 31 15-5 10 8v9c-3 8-8 12-12 14-7-4-13-9-13-17Z"/><path d="m43 41 5 5 8-10" stroke-width="3"/>'
};
await prepareLayers(fileURLToPath(new URL('.',import.meta.url)),'witchers',glyphs);
