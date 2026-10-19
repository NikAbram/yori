"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";

export function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("YŌRI route error", error);
  }, [error]);

  return (
    <div className="page-width route-state-wrap">
      <section className="state-panel" role="alert">
        <RotateCcw size={30} strokeWidth={1.7} aria-hidden="true" />
        <h1 className="display">Не удалось открыть раздел</h1>
        <p>Обновите данные раздела. Корзина и выбранные блюда останутся на месте.</p>
        <button className="primary-button" type="button" onClick={reset}>Попробовать снова</button>
      </section>
    </div>
  );
}
