import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { ToborzasLayout } from './layout/ToborzasLayout';
import { ErdeklodokPage } from './pages/belso/ErdeklodokPage';
import { ErdeklodoReszletPage } from './pages/belso/ErdeklodoReszletPage';
import {
  ProjektekListaPage,
  ProjektReszletPage,
} from './pages/belso/ProjektekPage';
import {
  HirdetesListaPage,
  HirdetesSzerkesztesPage,
} from './pages/belso/HirdetesKezelesPage';
import { JelentkezesekListaPage } from './pages/belso/JelentkezesekListaPage';
import { JelentkezesReszletPage } from './pages/belso/JelentkezesReszletPage';
import { KampanyokListaPage, KampanyReszletPage } from './pages/belso/KampanyokPage';
import { ReszletesKeresoPage } from './pages/belso/ReszletesKeresoPage';
import { PartnerRegisztraciokPage } from './pages/belso/PartnerRegisztraciokPage';
import { PartnerMeghivokPage } from './pages/belso/PartnerMeghivokPage';
import { BelsoBelepesPage } from './pages/belso/BelsoBelepesPage';
import { BelsoBootstrapPage } from './pages/belso/BelsoBootstrapPage';
import { JogosultsagAdminPage } from './pages/belso/JogosultsagAdminPage';
import { TagokListaPage, TagReszletPage } from './pages/belso/TagokPage';
import {
  PartnerekListaPage,
  CrmPage,
  SzerzodesekPage,
  PartnerReszletPage,
} from './pages/belso/PartnerekPage';
import {
  BeosztasJelenletekPage,
  BeosztasMuszakokPage,
} from './pages/belso/BeosztasPage';
import { PvMunkateruletPage } from './pages/belso/PvMunkateruletPage';
import { FolyamatTerkepPage } from './pages/belso/FolyamatTerkepPage';
import {
  BerszamfejtesListaPage,
  FolyoszamlaListaPage,
  JelenletekListaPage,
  MunkalapReszletPage,
} from './pages/belso/BerszamfejtesPage';
import { BerFutasListaPage, BerFutasReszletPage } from './pages/belso/BerSzamfejtesFutasPage';
import { NavBevallasokListaPage, NavBevallasReszletPage } from './pages/belso/NavBevallasokPage';
import { SzjaKedvezmenyekListaPage } from './pages/belso/SzjaKedvezmenyekListaPage';
import { PenzugyPage } from './pages/belso/PenzugyPage';
import { BlogPage } from './pages/belso/BlogPage';
import { UgyfelszolgalatPage } from './pages/belso/UgyfelszolgalatPage';
import { EAlairasPage } from './pages/belso/EAlairasPage';

function HirdetesIdRedirect() {
  const { id } = useParams();
  return <Navigate to={`/belso/toborzas/hirdetesek/${id}`} replace />;
}

function JelentkezesekRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/belso/toborzas/jelentkezesek${search}`} replace />;
}

export function App() {
  return (
    <Routes>
      {/* Belső Coop ERP — nincs diák/partner portálválasztó */}
      <Route index element={<Navigate to="/belso" replace />} />
      <Route path="diak/*" element={<Navigate to="/belso" replace />} />
      <Route path="partner/*" element={<Navigate to="/belso" replace />} />

      <Route path="belso/belepes" element={<BelsoBelepesPage />} />
      <Route path="belso/bootstrap" element={<BelsoBootstrapPage />} />

      <Route path="belso" element={<AppLayout />}>
        <Route index element={<Navigate to="toborzas/hirdetesek" replace />} />
        <Route path="erdeklodok" element={<ErdeklodokPage />} />
        <Route path="erdeklodok/:id" element={<ErdeklodoReszletPage />} />
        <Route path="projektek" element={<ProjektekListaPage />} />
        <Route path="projektek/:id" element={<ProjektReszletPage />} />
        <Route path="partner-regisztraciok" element={<PartnerRegisztraciokPage />} />
        <Route path="partner-meghivok" element={<PartnerMeghivokPage />} />
        <Route path="tagok" element={<TagokListaPage />} />
        <Route path="tagok/:id" element={<TagReszletPage />} />
        <Route path="partnerek" element={<PartnerekListaPage />} />
        <Route path="partnerek/crm" element={<CrmPage />} />
        <Route path="partnerek/szerzodesek" element={<SzerzodesekPage />} />
        <Route path="partnerek/:id" element={<PartnerReszletPage />} />
        <Route path="beosztas" element={<BeosztasMuszakokPage />} />
        <Route path="beosztas/jelenletek" element={<BeosztasJelenletekPage />} />
        <Route path="pv-munkaterulet" element={<PvMunkateruletPage />} />
        <Route path="folyamat-terkep" element={<FolyamatTerkepPage />} />
        <Route path="berszamfejtes" element={<BerszamfejtesListaPage />} />
        <Route path="berszamfejtes/futasok" element={<BerFutasListaPage />} />
        <Route path="berszamfejtes/futasok/:id" element={<BerFutasReszletPage />} />
        <Route path="berszamfejtes/folyoszamla" element={<FolyoszamlaListaPage />} />
        <Route path="berszamfejtes/jelenletek" element={<JelenletekListaPage />} />
        <Route path="berszamfejtes/:id" element={<MunkalapReszletPage />} />
        <Route path="nav-bevallasok" element={<NavBevallasokListaPage />} />
        <Route path="nav-bevallasok/:id" element={<NavBevallasReszletPage />} />
        <Route path="szja-kedvezmenyek" element={<SzjaKedvezmenyekListaPage />} />
        <Route path="penzugy" element={<PenzugyPage />} />
        <Route path="blog" element={<BlogPage />} />
        <Route path="ugyfelszolgalat" element={<UgyfelszolgalatPage />} />
        <Route path="e-alairas" element={<EAlairasPage />} />
        <Route path="admin/jogosultsagok" element={<JogosultsagAdminPage />} />
        <Route path="kereso" element={<ReszletesKeresoPage />} />

        {/* Toborzás — élő hirdetések + jelentkezések */}
        <Route path="toborzas" element={<ToborzasLayout />}>
          <Route index element={<Navigate to="hirdetesek" replace />} />
          <Route path="hirdetesek" element={<HirdetesListaPage />} />
          <Route path="hirdetesek/:id" element={<HirdetesSzerkesztesPage />} />
          <Route path="jelentkezesek" element={<JelentkezesekListaPage />} />
          <Route path="jelentkezesek/:id" element={<JelentkezesReszletPage />} />
          <Route path="kampanyok" element={<KampanyokListaPage />} />
          <Route path="kampanyok/:id" element={<KampanyReszletPage />} />
        </Route>

        {/* Régi URL-ek átirányítása */}
        <Route path="hirdetesek" element={<Navigate to="/belso/toborzas/hirdetesek" replace />} />
        <Route path="hirdetesek/:id" element={<HirdetesIdRedirect />} />
        <Route path="munkak-kezeles" element={<Navigate to="/belso/toborzas/hirdetesek" replace />} />
        <Route path="jelentkezesek" element={<JelentkezesekRedirect />} />

        <Route
          path="projektek-mock"
          element={<Navigate to="/belso/projektek" replace />}
        />
      </Route>
    </Routes>
  );
}

export default App;
