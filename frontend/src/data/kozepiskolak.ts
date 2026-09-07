import type { MagyarIntezmeny } from './intezmeny-kereses';
import { MAGYAR_EGYETEMEK } from './egyetemek';

function k(nev: string, varos: string, aliasok: string[] = []): MagyarIntezmeny {
  return {
    id: `koz:${varos}:${nev}`,
    nev,
    tipus: 'kozepiskola',
    varos,
    aliasok,
  };
}

/**
 * Középiskolák — KIR alapján ismert, gyakori intézménynevek (gimnázium, szakgimnázium, technikum).
 * Ha nincs a listában, az űrlap egyedi nevet is elfogad.
 */
export const MAGYAR_KOZEPISKOLAK: MagyarIntezmeny[] = [
  // Budapest
  k('Fazekas Mihály Gimnázium', 'Budapest', ['Fazekas']),
  k('Radnóti Miklós Gimnázium', 'Budapest', ['Radnóti']),
  k('Trefort Ágoston Gimnázium', 'Budapest', ['Trefort']),
  k('Eötvös József Gimnázium', 'Budapest', ['Eötvös gimnázium']),
  k('Vörösmarty Mihály Gimnázium', 'Budapest', ['Vörösmarty']),
  k('Madách Imre Gimnázium', 'Budapest', ['Madách']),
  k('Kölcsey Ferenc Gimnázium', 'Budapest', ['Kölcsey']),
  k('Szent István Gimnázium', 'Budapest', ['Szent István']),
  k('Móricz Zsigmond Gimnázium', 'Budapest', ['Móricz']),
  k('Baár-Madas Református Gimnázium', 'Budapest', ['Baár-Madas']),
  k('Újpesti Károlyi István Gimnázium', 'Budapest', ['Károlyi Újpest']),
  k('Csepeli Eötvös József Gimnázium', 'Budapest', ['Csepel Eötvös']),
  k('Kőbányai Deák Ferenc Gimnázium', 'Budapest', ['Kőbánya Deák']),
  k('Budai Ciszterci Gimnázium', 'Budapest', ['Ciszterci']),
  k('Szent László Gimnázium', 'Budapest', ['Szent László']),
  k('Teleki Blanka Gimnázium', 'Budapest', ['Teleki Blanka']),
  k('Leövey Klára Gimnázium', 'Budapest', ['Leövey']),
  k('Szent Margit Gimnázium', 'Budapest', ['Szent Margit']),
  k('Ady Endre Gimnázium', 'Budapest', ['Ady Endre']),
  k('József Attila Gimnázium', 'Budapest', ['József Attila']),
  k('Városmajori Gimnázium', 'Budapest', ['Városmajor']),
  k('II. Rákóczi Ferenc Gimnázium', 'Budapest', ['Rákóczi gimnázium']),
  k('Budapesti Fazekas Mihály Gyakorló Általános Iskola és Gimnázium', 'Budapest', []),
  k('Budapesti Gazdasági Szakképzési Centrum', 'Budapest', ['BGSZC']),
  k('BMSZC Szily Kálmán Műszaki Technikum és Kollégium', 'Budapest', ['Szily Kálmán']),
  k('BMSZC Neumann János Számítástechnikai Szakgimnáziuma', 'Budapest', ['Neumann BMSZC']),
  k('BMSZC Puskás Tivadar Távközlési Technikum', 'Budapest', ['Puskás Tivadar']),
  k('BMSZC Károlyi Mihály Két Tanítási Nyelvű Közgazdasági Technikum', 'Budapest', []),
  k('BMSZC Szent István Közgazdasági Technikum', 'Budapest', []),
  k('Budapesti Műszaki Szakképzési Centrum', 'Budapest', ['BMSZC']),
  k('Szentendrei Református Gimnázium', 'Szentendre', ['Szentendre gimnázium']),
  // Debrecen
  k('Fazekas Mihály Gimnázium', 'Debrecen', ['Debreceni Fazekas']),
  k('Ady Endre Gimnázium', 'Debrecen', ['Debreceni Ady']),
  k('Csokonai Vitéz Mihály Gimnázium', 'Debrecen', ['Csokonai']),
  k('Debreceni Református Kollégium Gimnáziuma', 'Debrecen', ['DRK Gimnázium']),
  k('Kölcsey Ferenc Gimnázium', 'Debrecen', ['Debreceni Kölcsey']),
  k('Mihálygergei Református Gimnázium', 'Debrecen', []),
  k('DSZC Mechwart András Gépipari és Informatikai Technikum', 'Debrecen', ['Mechwart']),
  // Szeged
  k('Radnóti Miklós Gimnázium', 'Szeged', ['Szegedi Radnóti']),
  k('Szegedi Deák Ferenc Gimnázium', 'Szeged', ['Deák Szeged']),
  k('Szegedi Tisza Mihály Gimnázium', 'Szeged', ['Tisza Mihály']),
  k('Szegedi Nemzetközi Általános Iskola és Gimnázium', 'Szeged', ['SNI']),
  k('SZC Móra Ferenc Szakképző Iskola és Gimnázium', 'Szeged', []),
  // Pécs
  k('Zsigmond Móricz Gimnázium', 'Pécs', ['Pécsi Móricz']),
  k('Babits Mihály Gimnázium', 'Pécs', ['Babits']),
  k('Pécsi Református Gimnázium', 'Pécs', []),
  k('Janus Pannonius Gimnázium', 'Pécs', ['Janus Pannonius']),
  k('PSZC Pollack Mihály Technikum', 'Pécs', ['Pollack']),
  // Győr
  k('Révai Miklós Gimnázium', 'Győr', ['Révai']),
  k('Benedek Elek Gimnázium', 'Győr', ['Benedek Elek']),
  k('Xantus János Gimnázium', 'Győr', ['Xantus']),
  k('Győri SZC Hild József Építőipari Technikum', 'Győr', ['Hild']),
  // Miskolc
  k('Földes Ferenc Gimnázium', 'Miskolc', ['Földes']),
  k('Szent István Gimnázium', 'Miskolc', ['Miskolci Szent István']),
  k('Miskolci SZC Szent István Technikum', 'Miskolc', []),
  // Nyíregyháza
  k('Debreceni Református Kollégium Gimnáziuma', 'Nyíregyháza', []),
  k('Szabolcs Vezér Gimnázium', 'Nyíregyháza', []),
  k('Vay Ádám Gimnázium', 'Nyíregyháza', []),
  // Székesfehérvár
  k('Szent István Király Gimnázium', 'Székesfehérvár', ['Székesfehérvári SZIK']),
  k('Budai Nagy Antal Gimnázium', 'Székesfehérvár', ['BNA']),
  k('Fehérvári SZC Török Sándor Technikum', 'Székesfehérvár', []),
  // Szombathely
  k('Berzsenyi Dániel Gimnázium', 'Szombathely', ['Berzsenyi']),
  k('Körmendi Gimnázium', 'Körmend', []),
  k('Szombathelyi Kossuth Lajos Gimnázium', 'Szombathely', ['Kossuth Szombathely']),
  // Veszprém
  k('Veszprémi Közgazdasági Politechnikum', 'Veszprém', []),
  k('Pannonhalmi Bencés Gimnázium', 'Pannonhalma', ['Pannonhalma']),
  k('Veszprémi Szakképzési Centrum', 'Veszprém', []),
  // Kecskemét
  k('Kecskeméti Református Gimnázium', 'Kecskemét', []),
  k('Katona József Gimnázium', 'Kecskemét', ['Katona']),
  k('Kecskeméti SZC Kandó Kálmán Technikum', 'Kecskemét', ['Kandó']),
  // Szolnok
  k('Verseghy Ferenc Gimnázium', 'Szolnok', ['Verseghy']),
  k('Jász-Nagykun-Szolnok Vármegyei SZC Túri Sándor Technikum', 'Szolnok', []),
  // Eger
  k('Eszterházy Károly Gimnázium', 'Eger', ['Eszterházy gimnázium']),
  k('Bolyai János Gimnázium', 'Eger', ['Bolyai Eger']),
  // Tatabánya / Komárom-Esztergom
  k('Vértes Szakképzési Centrum', 'Tatabánya', []),
  k('Komáromi Szakképzési Centrum', 'Komárom', []),
  // Sopron
  k('Soproni Szakképzési Centrum', 'Sopron', []),
  k('Liszt Ferenc Gimnázium', 'Sopron', ['Sopron Liszt']),
  // Kaposvár
  k('Kaposvári SZC Noszlopy Gáspár Közgazdasági Technikum', 'Kaposvár', []),
  k('Kaposvári Egyetemi Gimnázium', 'Kaposvár', []),
  // Békéscsaba
  k('Békéscsabai SZC Rudnay Gyula Technikum', 'Békéscsaba', []),
  k('Szent József Gimnázium', 'Békéscsaba', []),
  // Szekszárd
  k('Szekszárdi SZC Garay János Technikum', 'Szekszárd', []),
  k('Babits Mihály Gimnázium', 'Szekszárd', []),
  // Zalaegerszeg
  k('Zalaegerszegi SZC Zrínyi Miklós Technikum', 'Zalaegerszeg', []),
  k('Zalaegerszegi Göcseji Gimnázium', 'Zalaegerszeg', []),
  // Érd / agglomeráció
  k('Érdi Szakképzési Centrum', 'Érd', []),
  k('Váczi Mihály Gimnázium', 'Érd', []),
  // Dunakeszi / Gödöllő
  k('Gödöllői Szakképzési Centrum', 'Gödöllő', []),
  k('Madách Imre Gimnázium', 'Gödöllő', ['Gödöllő Madách']),
  // Országosan ismert református / katolikus
  k('Lónyay Utcai Református Gimnázium', 'Budapest', ['Lónyay']),
  k('Apáczai Csere János Gimnázium', 'Budapest', ['Apáczai']),
  k('Szent István Gimnázium', 'Budapest', []),
  k('Piarista Gimnázium', 'Budapest', ['Piarista']),
  k('Premontrei Szent Norbert Gimnázium', 'Gödöllő', ['Premontrei']),
];

export const OSSZES_MAGYAR_INTEZMENY: MagyarIntezmeny[] = [
  ...MAGYAR_EGYETEMEK,
  ...MAGYAR_KOZEPISKOLAK,
];
