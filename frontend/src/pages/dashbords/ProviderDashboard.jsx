import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { providersAPI, annoncesAPI } from '../../api/axios';
import { deliverablesAPI } from '../../api/addons';
import Sidebar from '../../components/Sidebar';
import DashboardStats from '../../components/DashboardStats';
import '../../styles/Dashboard.css';
import Messaging from '../../components/Messaging';

function ProviderDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab]       = useState('overview');
  const [services, setServices]         = useState([]);
  const [orders, setOrders]             = useState([]);
  const [statistics, setStatistics]     = useState({});
  const [loading, setLoading]           = useState(true);
  const [showCreate, setShowCreate]     = useState(false);
  const [newService, setNewService]     = useState({ titre: '', description: '', categorie: '', prix: '', delai_livraison: '' });
  const [createError, setCreateError]   = useState('');
  
  const [uploadingOrder, setUploadingOrder] = useState(null);
  const [annonces, setAnnonces] = useState([]);
  const [commentInput, setCommentInput] = useState({});

  useEffect(() => {
    if (location.hash) {
      setActiveTab(location.hash.replace('#', ''));
    }
  }, [location.hash]);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [svcRes, ordRes, statRes, annRes] = await Promise.all([
        providersAPI.getServices(),
        providersAPI.getOrders(),
        providersAPI.getStatistics(),
        annoncesAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setServices(svcRes.data);
      setOrders(ordRes.data);
      setStatistics(statRes.data);
      setAnnonces(annRes.data);
    } catch {
      setServices(getMockServices());
      setOrders(getMockOrders());
      setStatistics(getMockStats());
      setAnnonces([]);
    } finally {
      setLoading(false);
    }
  };

  const getMockServices = () => [
    { id: 1, titre: 'Cours de Mathématiques', categorie: 'tutoring', prix: 25, actif: true, rating: 4.8, reviews_count: 12 },
    { id: 2, titre: 'Aide aux devoirs', categorie: 'tutoring', prix: 20, actif: true, rating: 4.7, reviews_count: 8 },
  ];
  const getMockOrders = () => [
    { id: 1, service_titre: 'Cours de Math', provider_name: 'Jean Dupont', statut: 'in_progress', date_creation: '2024-05-07', consommateur_nom: 'Client 1' },
    { id: 2, service_titre: 'Aide devoirs',  provider_name: 'Marie Leblanc', statut: 'completed',  date_creation: '2024-05-06', consommateur_nom: 'Client 2' },
  ];
  const getMockStats = () => ({ totalEarnings: 450, totalOrders: 20, completionRate: 95, reputation: 4.8, totalReviews: 24, totalServices: 2 });

  const handleCreateService = async (e) => {
    e.preventDefault();
    setCreateError('');
    try {
      await providersAPI.createService(newService);
      setShowCreate(false);
      setNewService({ titre: '', description: '', categorie: '', prix: '', delai_livraison: '' });
      fetchData();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Erreur lors de la création.');
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await providersAPI.updateOrderStatus(orderId, newStatus);
      fetchData(); // Rafraîchir les données
    } catch (err) {
      alert("Erreur lors de la mise à jour du statut.");
    }
  };

  const handleUploadDeliverable = async (e, orderId) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingOrder(orderId);
    try {
      await deliverablesAPI.upload(orderId, file, "Livrable final déposé par le prestataire.");
      alert("Livrable déposé avec succès !");
      // Mettre la commande à complétée si ce n'est pas déjà fait
      await handleUpdateOrderStatus(orderId, 'completed');
    } catch (err) {
      alert("Erreur lors du dépôt du livrable.");
    } finally {
      setUploadingOrder(null);
    }
  };

  const handleAddComment = async (annonceId) => {
    const text = commentInput[annonceId];
    if (!text || !text.trim()) return;
    try {
      await annoncesAPI.addComment(annonceId, text);
      setCommentInput({ ...commentInput, [annonceId]: '' });
      fetchData(); // refresh annonces
    } catch (err) {
      alert("Erreur lors de l'ajout du commentaire.");
    }
  };

  const statusLabel = { completed: 'Terminée', in_progress: 'En cours', pending: 'En attente', cancelled: 'Annulée' };

  return (
    <div className="dashboard">
      <Sidebar role="provider" />

      <div className="dashboard-content">
        <div className="dashboard-header">
          <div>
            <h1>Tableau de bord Prestataire</h1>
            <p>Bonjour {user?.first_name} ! Gérez vos services et commandes.</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            + Nouveau service
          </button>
        </div>

        {/* Modal création service */}
        {showCreate && (
          <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <h3 style={{ marginTop: 0 }}>Créer un service</h3>
            {createError && <div className="error-message" style={{ background: '#fef2f2', color: '#dc2626', padding: '0.6rem', borderRadius: '6px', marginBottom: '1rem' }}>{createError}</div>}
            <form onSubmit={handleCreateService} style={{ display: 'grid', gap: '0.75rem' }}>
              <input placeholder="Titre du service" value={newService.titre} onChange={e => setNewService({...newService, titre: e.target.value})} required style={{ padding: '0.6rem', border: '1.5px solid #d1d5db', borderRadius: '8px' }} />
              <textarea placeholder="Description" value={newService.description} onChange={e => setNewService({...newService, description: e.target.value})} required rows={3} style={{ padding: '0.6rem', border: '1.5px solid #d1d5db', borderRadius: '8px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <input placeholder="Catégorie (ex: tutoring)" value={newService.categorie} onChange={e => setNewService({...newService, categorie: e.target.value})} required style={{ padding: '0.6rem', border: '1.5px solid #d1d5db', borderRadius: '8px' }} />
                <input type="number" placeholder="Prix (TND)" value={newService.prix} onChange={e => setNewService({...newService, prix: e.target.value})} required style={{ padding: '0.6rem', border: '1.5px solid #d1d5db', borderRadius: '8px' }} />
                <input type="number" placeholder="Délai (jours)" value={newService.delai_livraison} onChange={e => setNewService({...newService, delai_livraison: e.target.value})} required style={{ padding: '0.6rem', border: '1.5px solid #d1d5db', borderRadius: '8px' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button type="submit" className="btn-primary" style={{ width: 'auto', padding: '0.6rem 1.5rem' }}>Créer</button>
                <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '0.6rem 1.5rem', background: 'white', border: '1.5px solid #d1d5db', borderRadius: '8px', cursor: 'pointer' }}>Annuler</button>
              </div>
            </form>
          </div>
        )}

        {/* Onglets */}
        <div className="tab-nav">
          {[
            { key: 'overview',    label: 'Aperçu' },
            { key: 'services',    label: `Mes services (${services.length})` },
            { key: 'orders',      label: `Commandes (${orders.length})` },
            { key: 'statistics',  label: 'Statistiques' },
            { key: 'annonces',    label: 'Demandes Étudiants' },
            { key: 'messages',    label: 'Messages' },
          ].map(({ key, label }) => (
            <button key={key} className={`tab-btn ${activeTab === key ? 'active' : ''}`} onClick={() => { setActiveTab(key); navigate(`/provider/dashboard#${key}`); }}>
              {label}
            </button>
          ))}
        </div>

        {loading ? <div className="loading-state">Chargement...</div> : (
          <>
            {activeTab === 'overview' && (
              <DashboardStats stats={[
                { label: 'Revenus totaux',   value: `${statistics.totalEarnings || 0} TND`, icon: '💰' },
                { label: 'Commandes',        value: statistics.totalOrders || 0, icon: '📦' },
                { label: 'Taux complétion',  value: `${statistics.completionRate || 0}%`, icon: '✅' },
                { label: 'Réputation',       value: `${statistics.reputation || 0}/5`, icon: '⭐' },
              ]} />
            )}

            {activeTab === 'services' && (
              <table className="data-table">
                <thead><tr><th>Service</th><th>Catégorie</th><th>Prix</th><th>Note</th><th>Statut</th></tr></thead>
                <tbody>
                  {services.map(s => (
                    <tr key={s.id}>
                      <td>{s.titre}</td>
                      <td>{s.categorie}</td>
                      <td>{s.prix} TND</td>
                      <td>⭐ {s.rating || 0}</td>
                      <td><span className={`status-badge ${s.actif ? 'active' : 'suspended'}`}>{s.actif ? 'Actif' : 'Inactif'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'orders' && (
              <table className="data-table">
                <thead><tr><th>Service</th><th>Client</th><th>Date</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td>{o.service_titre}</td>
                      <td>{o.consommateur_nom || o.provider_name}</td>
                      <td>{o.date_creation?.slice(0, 10)}</td>
                      <td>
                        <select 
                          value={o.statut} 
                          onChange={(e) => handleUpdateOrderStatus(o.id, e.target.value)}
                          style={{ padding: '0.3rem', borderRadius: '4px', border: '1px solid #ccc' }}
                        >
                          <option value="pending">En attente</option>
                          <option value="in_progress">En cours</option>
                          <option value="completed">Terminée</option>
                          <option value="cancelled">Annulée</option>
                        </select>
                      </td>
                      <td>
                        {o.statut !== 'cancelled' && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <label style={{ cursor: 'pointer', background: '#e0e7ff', color: '#4338ca', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: 600 }}>
                              {uploadingOrder === o.id ? 'Dépôt...' : '📎 Déposer Livrable (ZIP)'}
                              <input 
                                type="file" 
                                accept=".zip,application/zip" 
                                style={{ display: 'none' }} 
                                onChange={(e) => handleUploadDeliverable(e, o.id)} 
                                disabled={uploadingOrder === o.id}
                              />
                            </label>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'statistics' && (
              <DashboardStats stats={[
                { label: 'Revenus totaux',   value: `${statistics.totalEarnings || 0} TND`, icon: '💰' },
                { label: 'Avis reçus',       value: statistics.totalReviews || 0, icon: '💬' },
                { label: 'Services actifs',  value: statistics.totalServices || 0, icon: '📋' },
                { label: 'Réputation',       value: `${statistics.reputation || 0}/5`, icon: '⭐' },
              ]} />
            )}

            {activeTab === 'annonces' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <h2 style={{ margin: 0 }}>Besoins des étudiants</h2>
                {annonces.length === 0 ? <p>Aucune annonce pour le moment.</p> : annonces.map(a => (
                  <div key={a.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0' }}>{a.titre}</h3>
                    <p style={{ color: '#4b5563', margin: '0 0 1rem 0' }}>{a.description}</p>
                    <div style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1rem' }}>
                      Par: {a.consommateur?.utilisateur?.prenom || 'Un étudiant'} | Le {a.date_creation?.slice(0, 10)}
                    </div>
                    
                    <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '8px' }}>
                      <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem' }}>Réponses ({a.commentaires?.length || 0})</h4>
                      {a.commentaires?.map(c => (
                        <div key={c.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #e5e7eb', fontSize: '0.9rem' }}>
                          <strong style={{ color: '#374151' }}>{c.auteur?.prenom || 'Prestataire'} {c.auteur?.nom || ''}</strong>: {c.contenu}
                        </div>
                      ))}
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                        <input
                          type="text"
                          placeholder="Proposer vos services..."
                          value={commentInput[a.id] || ''}
                          onChange={e => setCommentInput({ ...commentInput, [a.id]: e.target.value })}
                          style={{ flex: 1, padding: '0.6rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        />
                        <button className="btn-primary" onClick={() => handleAddComment(a.id)} style={{ padding: '0.6rem 1rem', width: 'auto' }}>
                          Répondre
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'messages' && (
              <Messaging currentUserId={user?.id} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ProviderDashboard;
