import{prepareLayers}from'../shared/prepare-layers.mjs';
import{fileURLToPath}from'node:url';
await prepareLayers(fileURLToPath(new URL('.',import.meta.url)),'sorceresses',{portal:'<ellipse cx="32" cy="32" rx="16" ry="24"/><ellipse cx="32" cy="32" rx="9" ry="18"/><path d="M8 23h6m36 18h6M12 9l5 5m30 36 5 5"/>',blessing:'<path d="m32 7 6 18 19 7-19 7-6 18-7-18-18-7 18-7Z"/><path d="m11 11 6 6m30 30 6 6m-42 0 6-6m30-30 6-6"/>',curse:'<path d="M13 14h38v36H13Z"/><path d="m36 14-9 13 12 8-10 15M21 22h3m16 20h3"/>'});
