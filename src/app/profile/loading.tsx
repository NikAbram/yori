export default function ProfileLoading() {
  return (
    <div className="page-width account-page" aria-label="Загрузка профиля" aria-busy="true">
      <div className="skeleton skeleton-heading" />
      <div className="profile-layout">
        <div className="skeleton skeleton-panel" />
        <div className="skeleton skeleton-panel" />
      </div>
    </div>
  );
}
