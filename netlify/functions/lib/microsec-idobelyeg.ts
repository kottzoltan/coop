import { createHash } from 'node:crypto';
import { envGet } from './netlify-env.js';

export type IdobelyegEredmeny = {
  id: string;
  mod: 'fake' | 'microsec';
  idobelyeg: string;
};

/** Teszt / preview: szimulált Microsec időbélyeg; élesben később valódi API. */
export function microsecIdobelyeg(dokumentumAzonosito: string): IdobelyegEredmeny {
  const hash = createHash('sha256').update(dokumentumAzonosito).digest('hex').slice(0, 16);
  const idopont = new Date().toISOString();

  const eles =
    envGet('MICROSEC_MODE') === 'production' &&
    (envGet('CONTEXT') === 'production' || envGet('NODE_ENV') === 'production');

  if (!eles) {
    return {
      id: `FAKE-MICROSEC-${hash}-${Date.now()}`,
      mod: 'fake',
      idobelyeg: idopont,
    };
  }

  return {
    id: `MICROSEC-STUB-${hash}`,
    mod: 'microsec',
    idobelyeg: idopont,
  };
}
