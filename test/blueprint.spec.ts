import { describe, expect, it } from '@jest/globals';
import { decode } from '../src/bp/blueprints';

describe('blueprint', () => {
  it('decodes examples', () => {
    const seTemplate = decode(
      '0eNqlU21vmzAQ/ivVfYZqmCRkaP9kqpCBS3KasZl9sEUR/33n0KRJS9ep+4SM73m5584nqM2AvSfLUJ6AGmcDlN9PEGhvtYn/+NgjlECMHSRgdRdPOgTsakN2n3a6OZDFVMGUANkWf0OZTcmHFMbtKTA1aXPAwKlumEZMe+9GatHfkKnpKQG0TEw4mzsfjpUduloqy+zvthLoXRCws9GLEKaZWj2uEzgKNP/yuBYpjw31/+Tqjbq6qu+0IMgG9CwXS7LqlWxLIjyXbBKQ8Nk7U9V40CM5H3EXP5Vctle2HfnA1X8HHKfNOo4+K+Kp67XXHIXh2/O9FX8Vu+rqwyL/cv4HlOwHnBbyyD+VR/Y6D7VAvXqvt14Gf9fcklh2F/4C/fo9eo8/B/l+yJs979K5utqREci8sZd3cVVAI416Z6MG+WYghpj3EIexKaK5y/a/LHc7attg+xag1A3gJX9xjGZu4a72KT6o866UN88/AaNrlHWCThtTPsz78nAT6SjdzLPZZqviqyqKbb7N8800/QGdqnC/',
    );
    expect(seTemplate).toMatchSnapshot();
  });
});
