import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { annoncesAPI } from '../api/axios';
import Navbar from '../components/Navbar';
import '../styles/Components.css';

function Announcements() {
  const { isAuthenticated, role } = useAuth();
  const [annonces, setAnnonces] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showNewAnnonceForm, setShowNewAnnonceForm] = useState(false);
  const [newTitre, setNewTitre] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [commentInputs, setCommentInputs] = useState({});

  useEffect(() => {
    loadAnnonces();
  }, []);

  const loadAnnonces = async () => {
    try {
      const res = await annoncesAPI.getAll();
      setAnnonces(res.data);
    } catch (e) {
      console.error('Erreur chargement annonces', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnonce = async (e) => {
    e.preventDefault();
    if (!newTitre.trim() || !newDescription.trim()) return;
    
    try {
      await annoncesAPI.create({ titre: newTitre, description: newDescription });
      setNewTitre('');
      setNewDescription('');
      setShowNewAnnonceForm(false);
      loadAnnonces();
    } catch (e) {
      alert("Erreur lors de la création de l'annonce");
    }
  };

  const handleAddComment = async (annonceId) => {
    const contenu = commentInputs[annonceId];
    if (!contenu || !contenu.trim()) return;

    try {
      await annoncesAPI.addComment(annonceId, contenu);
      setCommentInputs({ ...commentInputs, [annonceId]: '' });
      loadAnnonces(); // Recharger pour voir le nouveau commentaire
    } catch (e) {
      alert("Erreur lors de l'ajout du commentaire");
    }
  };

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '800px', margin: '2rem auto', padding: '0 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1>Demandes Publiques</h1>
          {role === 'consumer' && (
            <button 
              onClick={() => setShowNewAnnonceForm(!showNewAnnonceForm)}
              style={{ background: '#6C63FF', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {showNewAnnonceForm ? 'Annuler' : '+ Nouvelle annonce'}
            </button>
          )}
        </div>

        {showNewAnnonceForm && role === 'consumer' && (
          <form onSubmit={handleCreateAnnonce} style={{ background: '#fff', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
            <h3>Publier une annonce</h3>
            <input 
              type="text" 
              placeholder="Titre de votre demande..." 
              value={newTitre}
              onChange={(e) => setNewTitre(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box' }}
              required
            />
            <textarea 
              placeholder="Décrivez ce dont vous avez besoin en détail..." 
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              style={{ width: '100%', padding: '0.75rem', marginBottom: '1rem', border: '1px solid #ccc', borderRadius: '6px', minHeight: '100px', boxSizing: 'border-box' }}
              required
            />
            <button type="submit" style={{ background: '#10b981', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
              Publier
            </button>
          </form>
        )}

        {loading ? (
          <div>Chargement des annonces...</div>
        ) : annonces.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '12px', color: '#64748b' }}>
            Aucune annonce publiée pour le moment.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {annonces.map((annonce) => (
              <div key={annonce.id} style={{ background: '#fff', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                <h2 style={{ marginTop: 0, marginBottom: '0.5rem', fontSize: '1.4rem' }}>{annonce.titre}</h2>
                <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>
                  Par <strong>{annonce.consommateur_nom}</strong> le {new Date(annonce.date_creation).toLocaleDateString()}
                </div>
                <p style={{ color: '#334155', lineHeight: '1.5', marginBottom: '1.5rem' }}>{annonce.description}</p>
                
                {/* Section Commentaires */}
                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 1rem 0' }}>Commentaires ({annonce.commentaires.length})</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1rem' }}>
                    {annonce.commentaires.map(c => (
                      <div key={c.id} style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px' }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#6C63FF', marginBottom: '0.25rem' }}>{c.auteur_nom}</div>
                        <div style={{ fontSize: '0.95rem', color: '#334155' }}>{c.contenu}</div>
                      </div>
                    ))}
                  </div>

                  {isAuthenticated && (
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <input 
                        type="text" 
                        placeholder="Écrire un commentaire..." 
                        value={commentInputs[annonce.id] || ''}
                        onChange={(e) => setCommentInputs({ ...commentInputs, [annonce.id]: e.target.value })}
                        style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '6px' }}
                      />
                      <button 
                        onClick={() => handleAddComment(annonce.id)}
                        style={{ background: '#6C63FF', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer' }}
                      >
                        Envoyer
                      </button>
                    </div>
                  )}
                  {!isAuthenticated && (
                    <div style={{ fontSize: '0.9rem', color: '#64748b' }}>Connectez-vous pour commenter.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Announcements;
