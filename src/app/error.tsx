"use client";

import { RotateCcw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="page-width"><div className="empty-state"><RotateCcw size={34} /><h1 className="display">Не удалось открыть меню</h1><p>Обновите раздел. Если ошибка повторится, вернитесь немного позже.</p><button type="button" className="primary-button" onClick={reset}>Попробовать снова</button></div></div>;
}
