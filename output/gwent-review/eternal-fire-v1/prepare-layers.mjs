import{prepareLayers}from'../shared/prepare-layers.mjs';
import{fileURLToPath}from'node:url';
await prepareLayers(fileURLToPath(new URL('.',import.meta.url)),'eternal-fire',{interrogation:'<path d="M18 9h28v28H18Zm3 28v17m22-17v17M14 54h12m12 0h12M13 44h38"/>'});
