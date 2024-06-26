import 'preact/debug';
import { render } from 'preact';

import { App } from './app';

import './main.css';

export function init(element: HTMLElement) {
  element.innerHTML = 'JS woke up, booting...';
  (async () => {
    await new Promise((r) => setTimeout(r));
    element.innerHTML = '';
    render(<App />, element);
  })().catch(async (e) => {
    const { serializeError } = await import('serialize-error');
    console.error(e);
    // really
    element.innerHTML = `<pre>${JSON.stringify(serializeError(e), null, 2)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')}</pre>`;
  });
}

init(document.getElementById('app')!);
