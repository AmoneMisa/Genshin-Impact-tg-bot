// Import this before anything else: it picks the language and, for anything
// but Russian, loads the dictionary and starts translating the page.

import { currentLanguage } from './lang.js';
import { createTranslator } from './engine.js';
import { installDomTranslation } from './dom.js';

export const language = currentLanguage();
document.documentElement.lang = language;

export let translate = text => text;

if (language !== 'ru') {
  try {
    const { default: dictionary } = await import(`./${language}.js`);
    translate = createTranslator(dictionary);
    installDomTranslation(translate);
  } catch (error) {
    console.warn('translation unavailable', error);
  }
}
