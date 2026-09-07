export interface IrodaInfo {
  nev: string;
  cim: string;
  email: string;
  telefon: string;
  kapcsolat: string;
}

const IRODAK: Record<string, IrodaInfo> = {
  Budapest: {
    nev: 'Meló-Diák Universitas Budapest',
    cim: '1117 Budapest, Irinyi József u. 4-20.',
    email: 'budapest@melodiak.hu',
    telefon: '+36 1 372 0240',
    kapcsolat: 'Kornya József',
  },
  Pécs: {
    nev: 'Meló-Diák Pécs',
    cim: '7622 Pécs, Bajcsy-Zsilinszky u. 11.',
    email: 'pecs@melodiak.hu',
    telefon: '+36 72 514 990',
    kapcsolat: 'Nagy Eszter',
  },
  Székesfehérvár: {
    nev: 'Meló-Diák Székesfehérvár',
    cim: '8000 Székesfehérvár, Fő u. 14.',
    email: 'szekesfehervar@melodiak.hu',
    telefon: '+36 22 510 420',
    kapcsolat: 'Tóth Gábor',
  },
  Sopron: {
    nev: 'Meló-Diák Sopron',
    cim: '9400 Sopron, Széchenyi tér 7.',
    email: 'sopron@melodiak.hu',
    telefon: '+36 99 312 880',
    kapcsolat: 'Horváth Anna',
  },
  Debrecen: {
    nev: 'Meló-Diák Debrecen',
    cim: '4024 Debrecen, Piac u. 20.',
    email: 'debrecen@melodiak.hu',
    telefon: '+36 52 412 300',
    kapcsolat: 'Kiss Péter',
  },
  Győr: {
    nev: 'Meló-Diák Győr',
    cim: '9021 Győr, Baross Gábor út 5.',
    email: 'gyor@melodiak.hu',
    telefon: '+36 96 520 110',
    kapcsolat: 'Varga Lilla',
  },
};

const ALAP_IRODA: IrodaInfo = {
  nev: 'Meló-Diák Központ',
  cim: '1117 Budapest, Irinyi József u. 4-20.',
  email: 'info@melodiak.hu',
  telefon: '+36 1 372 0240',
  kapcsolat: 'Ügyfélszolgálat',
};

export function irodaVarosra(varos: string): IrodaInfo {
  return IRODAK[varos] ?? ALAP_IRODA;
}
