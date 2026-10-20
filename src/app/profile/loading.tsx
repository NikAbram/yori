export default function ProfileLoading() {
  return (
    <div className="page-width account-page" role="status" aria-live="polite" aria-busy="true">
      <span className="visually-hidden">Загружаем профиль</span>
      <div className="skeleton skeleton-heading" aria-hidden="true" />
      <div className="profile-layout" aria-hidden="true">
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  );
}
