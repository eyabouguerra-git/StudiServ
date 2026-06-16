import { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, reviewsAPI } from '../../api/axios';
import Sidebar from '../../components/Sidebar';
import Messaging from '../../components/Messaging';
import '../../styles/AdminDashboard.css';

/* ═══════════════════════════════════════════════════════════════
   AdminDashboard — Premium admin interface
   ═══════════════════════════════════════════════════════════════ */

function AdminDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────
  const [activeTab, setActiveTab]       = useState('overview');
  const [pendingCards, setPendingCards]  = useState([]);
  const [disputes, setDisputes]         = useState([]);
  const [disputeFilter, setDisputeFilter] = useState('open');
  const [stats, setStats]               = useState(null);
  const [topProviders, setTopProviders] = useState([]);
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [toast, setToast]               = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [rejectModal, setRejectModal]   = useState(null);   // { cardId }
  const [rejectReason, setRejectReason] = useState('');
  const [disputeNotes, setDisputeNotes] = useState({});     // { [id]: 'note...' }
  const [actionLoading, setActionLoading] = useState(null);

  // ── Toast helper ───────────────────────────────────────────────
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── Data Fetching ──────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [usersRes, statsRes, topRes, cardsRes, disputesRes] = await Promise.all([
        adminAPI.getUsers().catch(() => ({ data: [] })),
        adminAPI.getStatistics().catch(() => ({ data: {} })),
        reviewsAPI.getTopProviders().catch(() => ({ data: [] })),
        adminAPI.getPendingCards().catch(() => ({ data: [] })),
        adminAPI.getDisputes(disputeFilter).catch(() => ({ data: [] })),
      ]);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.results || []));
      setStats(statsRes.data || {});
      setTopProviders(topRes.data || []);
      setPendingCards(cardsRes.data || []);
      setDisputes(disputesRes.data || []);
    } catch {
      setStats({});
      setPendingCards([]);
      setDisputes([]);
    } finally {
      setLoading(false);
    }
  }, [disputeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (location.hash) {
      setActiveTab(location.hash.replace('#', ''));
    }
  }, [location.hash]);

  // Refetch disputes when filter changes
  useEffect(() => {
    (async () => {
      try {
        const res = await adminAPI.getDisputes(disputeFilter);
        setDisputes(res.data || []);
      } catch { /* keep current */ }
    })();
  }, [disputeFilter]);

  // ── Handlers ───────────────────────────────────────────────────

  const handleApproveCard = async (cardId) => {
    setActionLoading(`approve-${cardId}`);
    try {
      await adminAPI.reviewCard(cardId, 'approve');
      showToast('Carte étudiante approuvée ✓');
      setPendingCards(prev => prev.filter(c => c.id !== cardId));
    } catch {
      showToast("Erreur lors de l'approbation.", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (cardId) => {
    setRejectModal({ cardId });
    setRejectReason('');
  };

  const handleRejectCard = async () => {
    if (!rejectReason.trim()) {
      showToast('Veuillez saisir un motif de refus.', 'error');
      return;
    }
    setActionLoading(`reject-${rejectModal.cardId}`);
    try {
      await adminAPI.reviewCard(rejectModal.cardId, 'reject', rejectReason);
      showToast('Carte étudiante refusée.');
      setPendingCards(prev => prev.filter(c => c.id !== rejectModal.cardId));
      setRejectModal(null);
    } catch {
      showToast("Erreur lors du refus.", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveDispute = async (disputeId, resolution) => {
    setActionLoading(`dispute-${disputeId}`);
    const note = disputeNotes[disputeId] || '';
    try {
      await adminAPI.resolveDispute(disputeId, resolution, note);
      const resLabel = {
        refund: 'Remboursement effectué',
        completed: 'Prestation validée',
        partial: 'Résolution partielle appliquée',
        dismissed: 'Litige rejeté',
      };
      showToast(resLabel[resolution] || 'Litige résolu ✓');
      setDisputes(prev => prev.filter(d => d.id !== disputeId));
    } catch {
      showToast("Erreur lors de la résolution.", 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // ── Format date ────────────────────────────────────────────────
  const formatDate = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  // ── Stats data ─────────────────────────────────────────────────
  const statCards = [
    { icon: '👥', label: 'Utilisateurs', value: stats?.totalUsers || users.length || 0, color: 'accent' },
    { icon: '🎓', label: 'Prestataires', value: stats?.totalProviders || 0, color: 'info' },
    { icon: '🛒', label: 'Consommateurs', value: stats?.totalConsumers || 0, color: 'success' },
    { icon: '📦', label: 'Services actifs', value: stats?.totalServices || 0, color: 'warning' },
    { icon: '🧾', label: 'Commandes', value: stats?.totalOrders || 0, color: 'accent' },
    { icon: '⚠️', label: 'Cartes en attente', value: pendingCards.length, color: 'danger' },
  ];

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="admin-dashboard">
      <Sidebar role="admin" />

      <main className="admin-main">
        {/* ── Header ──────────────────────────────────────────── */}
        <header className="admin-header">
          <div className="admin-header-left">
            <h1>🛡️ Tableau de bord Admin</h1>
            <p>Bienvenue, {user?.first_name || 'Administrateur'}. Gérez la plateforme StudiServ.</p>
          </div>
          <div className="admin-header-right">
            <div className="admin-date-badge">
              📅 {today}
            </div>
          </div>
        </header>

        {/* ── Toast ───────────────────────────────────────────── */}
        {toast && (
          <div className={`admin-toast ${toast.type}`}>
            {toast.type === 'success' ? '✅' : '❌'} {toast.message}
          </div>
        )}

        {/* ── Tabs ────────────────────────────────────────────── */}
        <nav className="admin-tabs">
          {[
            { key: 'overview',      icon: '📊', label: 'Aperçu' },
            { key: 'verifications', icon: '🪪', label: 'Cartes étudiantes', badge: pendingCards.length },
            { key: 'litiges',       icon: '⚖️', label: 'Litiges',          badge: disputes.length },
            { key: 'reputation',    icon: '⭐', label: 'Réputation' },
            { key: 'messages',      icon: '💬', label: 'Messages' },
          ].map(({ key, icon, label, badge }) => (
            <button
              key={key}
              id={`admin-tab-${key}`}
              className={`admin-tab ${activeTab === key ? 'active' : ''}`}
              onClick={() => { setActiveTab(key); navigate(`/admin/dashboard#${key}`); }}
            >
              <span>{icon}</span>
              <span>{label}</span>
              {badge != null && badge > 0 && (
                <span className="tab-badge">{badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Loading ─────────────────────────────────────────── */}
        {loading ? (
          <div className="admin-loading">
            <div className="admin-spinner" />
            <p>Chargement des données…</p>
          </div>
        ) : (
          <>
            {/* ════════════════════════════════════════════════════
                APERÇU
               ════════════════════════════════════════════════════ */}
            {activeTab === 'overview' && (
              <div>
                <div className="admin-stats-grid">
                  {statCards.map((s, i) => (
                    <div key={i} className={`admin-stat-card ${s.color}`}>
                      <div className="admin-stat-icon">{s.icon}</div>
                      <p className="admin-stat-value">{s.value}</p>
                      <p className="admin-stat-label">{s.label}</p>
                    </div>
                  ))}
                </div>

                {/* Quick links */}
                {pendingCards.length > 0 && (
                  <div
                    style={{
                      background: 'rgba(245,158,11,0.1)',
                      border: '1px solid rgba(245,158,11,0.3)',
                      borderRadius: 'var(--admin-radius)',
                      padding: '1rem 1.5rem',
                      marginBottom: '1.5rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span style={{ color: '#fbbf24', fontWeight: 600 }}>
                      ⚠️ {pendingCards.length} carte{pendingCards.length > 1 ? 's' : ''} étudiante{pendingCards.length > 1 ? 's' : ''} en attente de vérification
                    </span>
                    <button
                      className="admin-btn approve"
                      style={{ flex: 'none' }}
                      onClick={() => { setActiveTab('verifications'); navigate('/admin/dashboard#verifications'); }}
                    >
                      Vérifier maintenant →
                    </button>
                  </div>
                )}

                {/* Top Providers */}
                <h2 className="admin-section-title">
                  <span className="title-icon">🏆</span> Top Prestataires
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        <th style={{ color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>#</th>
                        <th style={{ color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>Prestataire</th>
                        <th style={{ color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>Note</th>
                        <th style={{ color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>Score</th>
                        <th style={{ color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>Avis</th>
                        <th style={{ color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>Badge</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProviders.slice(0, 5).map((p, i) => (
                        <tr key={p.prestataire_id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                          <td style={{ color: 'var(--admin-text)', fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ color: '#fff', fontWeight: 600 }}>{p.nom}</td>
                          <td style={{ color: '#fbbf24' }}>⭐ {p.note_moyenne?.toFixed(1) ?? '—'}</td>
                          <td style={{ color: 'var(--admin-text)' }}>{p.score_global?.toFixed(1) ?? '—'}/5</td>
                          <td style={{ color: 'var(--admin-text-muted)' }}>{p.nb_avis}</td>
                          <td>
                            {p.badge_confiance ? (
                              <span className="dispute-status-badge resolved">✓ Confiance</span>
                            ) : (
                              <span style={{ color: 'var(--admin-text-muted)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {topProviders.length === 0 && (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: '2rem' }}>
                            Aucune donnée de réputation pour le moment.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                CARTES ÉTUDIANTES — Vérification
               ════════════════════════════════════════════════════ */}
            {activeTab === 'verifications' && (
              <div>
                <h2 className="admin-section-title">
                  <span className="title-icon">🪪</span> Cartes étudiantes en attente de vérification
                </h2>

                {pendingCards.length === 0 ? (
                  <div className="admin-empty-state">
                    <span className="empty-icon">✅</span>
                    <h3>Tout est à jour !</h3>
                    <p>Aucune carte étudiante n'est en attente de vérification.</p>
                  </div>
                ) : (
                  <div className="admin-cards-grid">
                    {pendingCards.map((card) => (
                      <div key={card.id} className="admin-verification-card">
                        {/* Image de la carte */}
                        <div
                          className="verification-card-image"
                          onClick={() => card.card_image_url && setPreviewImage(card.card_image_url)}
                          style={{ cursor: card.card_image_url ? 'pointer' : 'default' }}
                        >
                          {card.card_image_url ? (
                            <img
                              src={card.card_image_url}
                              alt={`Carte de ${card.user_name}`}
                              onError={(e) => { e.target.style.display = 'none'; }}
                            />
                          ) : (
                            <div className="no-image">
                              <span className="icon">🪪</span>
                              <span>Pas d'image</span>
                            </div>
                          )}
                          <span className="status-pill pending">En attente</span>
                        </div>

                        {/* Infos */}
                        <div className="verification-card-body">
                          <div className="user-info">
                            <div className="user-avatar">
                              {getInitials(card.user_name)}
                            </div>
                            <div className="user-details">
                              <h4>{card.user_name}</h4>
                              <p>ID utilisateur: {card.user_id}</p>
                            </div>
                          </div>

                          <div className="verification-card-meta">
                            📅 Soumise le {formatDate(card.submitted_at)}
                          </div>

                          {/* Actions */}
                          <div className="verification-card-actions">
                            <button
                              id={`approve-card-${card.id}`}
                              className="admin-btn approve"
                              disabled={actionLoading === `approve-${card.id}`}
                              onClick={() => handleApproveCard(card.id)}
                            >
                              {actionLoading === `approve-${card.id}` ? '⏳' : '✓'} Approuver
                            </button>
                            <button
                              id={`reject-card-${card.id}`}
                              className="admin-btn reject"
                              disabled={!!actionLoading}
                              onClick={() => openRejectModal(card.id)}
                            >
                              ✕ Refuser
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                LITIGES — Gestion
               ════════════════════════════════════════════════════ */}
            {activeTab === 'litiges' && (
              <div>
                <h2 className="admin-section-title">
                  <span className="title-icon">⚖️</span> Gestion des litiges
                </h2>

                {/* Filtres */}
                <div className="admin-filter-bar">
                  {[
                    { key: 'open', label: 'Ouverts' },
                    { key: 'resolved', label: 'Résolus' },
                  ].map(f => (
                    <button
                      key={f.key}
                      className={`admin-filter-btn ${disputeFilter === f.key ? 'active' : ''}`}
                      onClick={() => setDisputeFilter(f.key)}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {disputes.length === 0 ? (
                  <div className="admin-empty-state">
                    <span className="empty-icon">🎉</span>
                    <h3>Aucun litige {disputeFilter === 'open' ? 'en cours' : 'résolu'}</h3>
                    <p>
                      {disputeFilter === 'open'
                        ? "Parfait ! Aucun litige n'est actuellement ouvert."
                        : "Aucun litige résolu à afficher."}
                    </p>
                  </div>
                ) : (
                  <div className="admin-disputes-list">
                    {disputes.map((d) => (
                      <div key={d.id} className="admin-dispute-card">
                        {/* Header */}
                        <div className="dispute-header">
                          <div className="dispute-id">
                            <span className="id-badge">#{d.id}</span>
                            <span className="order-ref">
                              Commande #{d.order_id} {d.order_title && `— ${d.order_title}`}
                            </span>
                          </div>
                          <span className={`dispute-status-badge ${d.status}`}>
                            {d.status === 'open' && '🟡 Ouvert'}
                            {d.status === 'in_review' && '🔵 En révision'}
                            {d.status === 'resolved' && '🟢 Résolu'}
                            {d.status === 'closed' && '⚪ Fermé'}
                          </span>
                        </div>

                        {/* Body */}
                        <div className="dispute-body">
                          <div className="dispute-info-item">
                            <span className="label">Service</span>
                            <span className="value">{d.service || '—'}</span>
                          </div>
                          <div className="dispute-info-item">
                            <span className="label">Ouvert par</span>
                            <span className="value">{d.opened_by}</span>
                          </div>
                          <div className="dispute-info-item">
                            <span className="label">Date</span>
                            <span className="value">{formatDate(d.created_at)}</span>
                          </div>
                          {d.resolution && (
                            <div className="dispute-info-item">
                              <span className="label">Résolution</span>
                              <span className="value" style={{ textTransform: 'capitalize' }}>
                                {d.resolution === 'refund' && '💰 Remboursement'}
                                {d.resolution === 'completed' && '✅ Prestation validée'}
                                {d.resolution === 'partial' && '🔄 Partielle'}
                                {d.resolution === 'dismissed' && '❌ Rejeté'}
                              </span>
                            </div>
                          )}
                          <div className="dispute-description">
                            <span className="label">Description</span>
                            <p className="value">{d.description}</p>
                          </div>
                          {d.admin_note && (
                            <div className="dispute-description">
                              <span className="label">Note admin</span>
                              <p className="value">{d.admin_note}</p>
                            </div>
                          )}
                        </div>

                        {/* Actions (only for open disputes) */}
                        {(d.status === 'open' || d.status === 'in_review') && (
                          <>
                            <textarea
                              className="dispute-note-input"
                              placeholder="Note de l'administrateur (optionnel)…"
                              value={disputeNotes[d.id] || ''}
                              onChange={(e) => setDisputeNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
                            />
                            <div className="dispute-actions">
                              <button
                                id={`resolve-completed-${d.id}`}
                                className="admin-btn complete"
                                disabled={actionLoading === `dispute-${d.id}`}
                                onClick={() => handleResolveDispute(d.id, 'completed')}
                              >
                                ✓ Prestation validée
                              </button>
                              <button
                                id={`resolve-refund-${d.id}`}
                                className="admin-btn refund"
                                disabled={actionLoading === `dispute-${d.id}`}
                                onClick={() => handleResolveDispute(d.id, 'refund')}
                              >
                                💰 Rembourser
                              </button>
                              <button
                                id={`resolve-partial-${d.id}`}
                                className="admin-btn dismiss"
                                disabled={actionLoading === `dispute-${d.id}`}
                                onClick={() => handleResolveDispute(d.id, 'partial')}
                              >
                                🔄 Partiel
                              </button>
                              <button
                                id={`resolve-dismiss-${d.id}`}
                                className="admin-btn reject"
                                disabled={actionLoading === `dispute-${d.id}`}
                                onClick={() => handleResolveDispute(d.id, 'dismissed')}
                              >
                                ✕ Rejeter
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                RÉPUTATION
               ════════════════════════════════════════════════════ */}
            {activeTab === 'reputation' && (
              <div>
                <h2 className="admin-section-title">
                  <span className="title-icon">⭐</span> Classement des prestataires
                </h2>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ background: 'var(--admin-surface)', border: '1px solid var(--admin-border)', borderRadius: 'var(--admin-radius)' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                        {['#', 'Prestataire', 'Note moyenne', 'Taux complétion', 'Score global', 'Avis', 'Badge confiance'].map(h => (
                          <th key={h} style={{ color: 'var(--admin-text-muted)', borderBottom: '1px solid var(--admin-border)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topProviders.map((p, i) => (
                        <tr key={p.prestataire_id} style={{ borderTop: '1px solid var(--admin-border)' }}>
                          <td style={{ color: 'var(--admin-text)', fontWeight: 700 }}>{i + 1}</td>
                          <td style={{ color: '#fff', fontWeight: 600 }}>{p.nom}</td>
                          <td style={{ color: '#fbbf24' }}>⭐ {p.note_moyenne?.toFixed(1) ?? '—'}</td>
                          <td style={{ color: 'var(--admin-text)' }}>
                            {p.taux_completion != null ? `${Math.round(p.taux_completion * 100)}%` : '—'}
                          </td>
                          <td style={{ color: 'var(--admin-text)' }}>{p.score_global?.toFixed(1) ?? '—'}/5</td>
                          <td style={{ color: 'var(--admin-text-muted)' }}>{p.nb_avis}</td>
                          <td>
                            {p.badge_confiance ? (
                              <span className="dispute-status-badge resolved">✓ Confiance</span>
                            ) : (
                              <span style={{ color: 'var(--admin-text-muted)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                      {topProviders.length === 0 && (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', color: 'var(--admin-text-muted)', padding: '3rem' }}>
                            Aucune donnée de réputation disponible.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════════════
                MESSAGES
               ════════════════════════════════════════════════════ */}
            {activeTab === 'messages' && (
              <Messaging currentUserId={user?.id} />
            )}
          </>
        )}
      </main>

      {/* ══════════════════════════════════════════════════════════
          MODALS
         ══════════════════════════════════════════════════════════ */}

      {/* Image Preview */}
      {previewImage && (
        <div
          className="image-preview-overlay"
          onClick={() => setPreviewImage(null)}
        >
          <img src={previewImage} alt="Aperçu carte étudiante" />
        </div>
      )}

      {/* Reject Card Modal */}
      {rejectModal && (
        <div className="admin-modal-overlay" onClick={() => setRejectModal(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <h3>❌ Refuser la carte étudiante</h3>
            <p>Veuillez indiquer le motif du refus. L'utilisateur sera notifié.</p>
            <textarea
              autoFocus
              placeholder="Motif du refus (obligatoire)…"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div className="admin-modal-actions">
              <button
                className="admin-btn dismiss"
                onClick={() => setRejectModal(null)}
              >
                Annuler
              </button>
              <button
                className="admin-btn reject"
                disabled={!rejectReason.trim() || actionLoading}
                onClick={handleRejectCard}
              >
                {actionLoading ? '⏳ En cours…' : '✕ Confirmer le refus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
