import{prepareLayers}from'../shared/prepare-layers.mjs';
import{fileURLToPath}from'node:url';
await prepareLayers(fileURLToPath(new URL('.',import.meta.url)),'redania',{'traitor-hunt':'<circle cx="27" cy="27" r="14"/><path d="m37 37 17 17M20 27h14m-7-7v14"/>'});
