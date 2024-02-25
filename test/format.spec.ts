import { it, expect } from '@jest/globals';
import renderToString from 'preact-render-to-string';

import { handleColours } from '../src/blurb/format';

it('handles some colour cases', () => {
  const f = (text: string) => renderToString(handleColours(text));
  expect(f('plain string')).toMatchSnapshot();
  expect(
    f('one[color=1,2,3]two[/color]three[color=10,20,30]four[/color]five'),
  ).toMatchSnapshot();
});
