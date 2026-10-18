import{prepareLayers}from'../shared/prepare-layers.mjs';
import{fileURLToPath}from'node:url';
await prepareLayers(fileURLToPath(new URL('.',import.meta.url)),'velen',{ambush:'<path d="M15 13c27 10 27 28 0 38M15 13v38M9 32h44m-10-9 10 9-10 9"/>'});
