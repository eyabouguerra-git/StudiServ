// ProviderProfile.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api/axios';
import Sidebar from '../../components/Sidebar';
import '../../styles/Dashboard.css';
import '../../styles/Profile.css';

function ProviderProfile() {
  const { user, refreshUser } = useAuth();
  const [profile, setProfile]   = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving]     = useState(false);
  const [msg, setMsg]           = useState('');

  useEffect(() => {
    authAPI.getProfile().then(res => {
      setProfile(res.data);
      setFormData({
        first_name: res.data.first_name || '',
        last_name:  res.data.last_name  || '',
        biographie: res.data.profil?.biographie || '',
        universite: res.data.profil?.universite  || '',
        telephone:  res.data.profil?.telephone   || '',
        cv:         null, // pour l'upload d'un nouveau CV
      });
    }).catch(() => setProfile({ ...user, profil: {} }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const form = new FormData();
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && formData[key] !== undefined) {
          form.append(key, formData[key]);
        }
      });
      await authAPI.updateProfile(form); // On passe en FormData
      await refreshUser();
      setMsg('Profil mis à jour !');
      setIsEditing(false);
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Erreur.'); }
    finally { setSaving(false); }
  };

  if (!profile) return <div className="dashboard"><Sidebar role="provider" /><div className="dashboard-content loading-state">Chargement...</div></div>;

  return (
    <div className="dashboard">
      <Sidebar role="provider" />
      <div className="dashboard-content">
        <div className="dashboard-header"><h1>Mon profil Prestataire</h1></div>
        {msg && <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem' }}>{msg}</div>}

        <div className="profile-container">
          <div className="profile-card">
            <div className="profile-header-section">
              <div className="avatar-large">⭐</div>
              <div className="profile-header-info">
                <h2>{profile.first_name} {profile.last_name}</h2>
                <p className="email">{profile.email}</p>
                <p>📚 {profile.profil?.universite || 'Université non renseignée'}</p>
                <p style={{ color: '#f59e0b' }}>⭐ {profile.profil?.note_moyenne || 0}/5 · {profile.profil?.nb_commandes_total || 0} commandes</p>
              </div>
              <button className="btn-edit" onClick={() => setIsEditing(!isEditing)}>
                {isEditing ? 'Annuler' : '✏️ Modifier'}
              </button>
            </div>

            {isEditing ? (
              <div className="profile-form">
                <div className="form-row">
                  <div className="form-group"><label>Prénom</label><input value={formData.first_name} onChange={e => setFormData({...formData, first_name: e.target.value})} /></div>
                  <div className="form-group"><label>Nom</label><input value={formData.last_name} onChange={e => setFormData({...formData, last_name: e.target.value})} /></div>
                </div>
                <div className="form-group"><label>Université</label><input value={formData.universite} onChange={e => setFormData({...formData, universite: e.target.value})} /></div>
                <div className="form-group"><label>Téléphone</label><input value={formData.telephone} onChange={e => setFormData({...formData, telephone: e.target.value})} /></div>
                <div className="form-group"><label>CV (PDF ou Image)</label><input type="file" accept=".pdf,image/*" onChange={e => setFormData({...formData, cv: e.target.files[0]})} /></div>
                <div className="form-group"><label>Biographie</label><textarea rows={3} value={formData.biographie} onChange={e => setFormData({...formData, biographie: e.target.value})} /></div>
                <div className="form-actions">
                  <button className="btn-save" onClick={handleSave} disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</button>
                  <button className="btn-cancel" onClick={() => setIsEditing(false)}>Annuler</button>
                </div>
              </div>
            ) : (
              <div className="profile-section">
                <h3>Informations</h3>
                <div className="info-grid">
                  <div className="info-item"><label>Biographie</label><p>{profile.profil?.biographie || '—'}</p></div>
                  <div className="info-item"><label>Téléphone</label><p>{profile.profil?.telephone || '—'}</p></div>
                  <div className="info-item">
                    <label>Espace CV</label>
                    <p>
                      {profile.profil?.cv ? (
                        <a href={profile.profil.cv.startsWith('http') ? profile.profil.cv : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8000'}${profile.profil.cv}`} target="_blank" rel="noopener noreferrer" style={{color: '#6C63FF', textDecoration: 'none', fontWeight: 500}}>
                          📄 Voir mon CV
                        </a>
                      ) : (
                        'Aucun CV uploadé'
                      )}
                    </p>
                  </div>
                  <div className="info-item"><label>Réputation</label><p>{profile.profil?.score_reputation || 0}</p></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProviderProfile;
