export default function ProtectedAdminLoading() {
  return (
    <div className="admin-workspace" role="status" aria-live="polite" aria-busy="true">
      <span className="admin-loading-label">Загружаем актуальные данные…</span>
      <div className="admin-loading-title" />
      <div className="admin-loading-metrics"><span /><span /><span /></div>
      <div className="admin-loading-rows"><span /><span /><span /><span /></div>
    </div>
  );
}
