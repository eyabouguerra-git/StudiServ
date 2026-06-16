import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { servicesAPI, ordersAPI } from '../api/axios';
import apiClient from '../api/axios';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import '../styles/Components.css';

function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, role, user } = useAuth();
  
  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Paiement state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);

  useEffect(() => {
    loadService();
  }, [id]);

  const loadService = async () => {
    try {
      const res = await servicesAPI.getById(id);
      setService(res.data);
    } catch (e) {
      console.error('Erreur chargement service', e);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingClick = () => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    setShowPaymentModal(true);
  };

  const submitPayment = async () => {
    if (!cardNumber.trim()) {
      alert('Veuillez entrer un numéro de carte.');
      return;
    }
    setPaymentLoading(true);
    try {
      await ordersAPI.create(service.id, { titre: service.titre, cardNumber });
      setShowPaymentModal(false);
      alert(`✅ Paiement validé ! La commande pour "${service.titre}" a été créée.`);
      navigate('/consumer/dashboard#orders');
    } catch (err) {
      alert(`❌ Erreur de paiement : ${err.response?.data?.message || 'Refus de débit'}`);
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }
    try {
      // Créer ou récupérer la conversation
      const res = await apiClient.post('/messaging/conversations/create/', {
        recipient_id: service.provider_id
      });
      // Rediriger vers la messagerie dans le dashboard avec la bonne conversation
      const dashRoute = role === 'consumer' ? '/consumer/dashboard' : '/provider/dashboard';
      navigate(`${dashRoute}#messages`, { state: { openConversation: res.data } });
    } catch (err) {
      alert("Erreur lors de la création de la conversation.");
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (!service) return <div>Service introuvable</div>;

  const rating = service.rating ?? 0;
  const providerRating = service.provider_rating ?? 0;
  const reviews = service.reviews_count ?? 0;

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '2rem auto', padding: '0 1rem' }}>
        <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: '#6C63FF', cursor: 'pointer', marginBottom: '1rem', fontSize: '1rem' }}>
          ← Retour
        </button>

        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Détails Service */}
          <div style={{ flex: '1 1 500px', background: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h1 style={{ marginTop: 0 }}>{service.titre}</h1>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <span style={{ background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '16px', fontSize: '0.9rem' }}>{service.categorie}</span>
              <span style={{ color: '#f59e0b', fontWeight: 'bold' }}>⭐ {rating} ({reviews} avis sur ce service)</span>
            </div>
            
            <p style={{ lineHeight: '1.6', color: '#475569' }}>{service.description}</p>
            
            <div style={{ marginTop: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Prix</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{service.prix} TND</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Délai</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 'bold', color: '#1e293b' }}>{service.delai_livraison} jours</div>
                </div>
                <button onClick={handleBookingClick} style={{ background: '#6C63FF', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>
                  Payer / Réserver
                </button>
              </div>
            </div>
          </div>

          {/* Profil Prestataire */}
          <div style={{ flex: '1 1 300px', background: '#fff', borderRadius: '12px', padding: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', height: 'fit-content' }}>
            <h3 style={{ marginTop: 0, borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>À propos du prestataire</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1rem 0' }}>
              <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                👤
              </div>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{service.provider_name}</div>
                <div style={{ color: '#f59e0b', fontSize: '0.9rem', marginTop: '0.25rem' }}>⭐ {providerRating} / 5 (Note globale)</div>
              </div>
            </div>
            
            <button onClick={handleSendMessage} style={{ width: '100%', background: '#fff', color: '#6C63FF', border: '1px solid #6C63FF', padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}>
              💬 Envoyer un message
            </button>
          </div>
        </div>

        {/* Modal Paiement (copié de ServiceCard) */}
        {showPaymentModal && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
          }}>
            <div style={{
              background: 'white', padding: '2rem', borderRadius: '12px', width: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
            }}>
              <h3 style={{ margin: '0 0 1rem 0' }}>Paiement sécurisé</h3>
              <p><strong>Service :</strong> {service.titre}</p>
              <p><strong>Montant à payer :</strong> <span style={{ color: '#6C63FF', fontWeight: 'bold' }}>{service.prix} TND</span></p>
              
              <div style={{ marginTop: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500, fontSize: '0.9rem' }}>Numéro de carte bancaire</label>
                <input 
                  type="text" 
                  placeholder="Ex: 4242 4242 4242 4242"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  style={{ width: '100%', padding: '0.75rem', border: '1px solid #ccc', borderRadius: '6px', fontSize: '1rem', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem', background: '#f8fafc', padding: '0.5rem', borderRadius: '4px' }}>
                  <strong>Cartes de test :</strong><br/>
                  ✅ Succès : 4242 4242 4242 4242<br/>
                  ❌ Refus : 4000 0000 0000 0002
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button 
                  onClick={() => setShowPaymentModal(false)} 
                  disabled={paymentLoading}
                  style={{ padding: '0.5rem 1rem', background: '#e2e8f0', color: '#334155', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                >
                  Annuler
                </button>
                <button 
                  onClick={submitPayment} 
                  disabled={paymentLoading} 
                  style={{ padding: '0.5rem 1rem', background: '#6C63FF', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                >
                  {paymentLoading ? 'Validation...' : 'Valider la commande'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ServiceDetail;
