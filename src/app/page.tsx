import { Suspense } from "react";
import { HomeExperience } from "@/components/miniapp/home-experience";
import { getPublicCatalog } from "@/services/catalog";

export default function HomePage() {
  return <Suspense fallback={<HomeLoading />}><HomeContent /></Suspense>;
}

async function HomeContent() {
  const catalog = await getPublicCatalog();
  return <HomeExperience {...catalog} />;
}

function HomeLoading() {
  return <div className="page-width skeleton" style={{ minHeight: 620, borderRadius: 24 }} role="status" aria-live="polite" aria-busy="true"><span className="visually-hidden">Загружаем меню</span></div>;
}
