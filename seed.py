import os
import django
import sys

# Ajouter le répertoire courant au path pour trouver StudiServ
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'StudiServ.settings')
django.setup()

from django.contrib.auth.models import User
from marketplace.models import Compte, Utilisateur, Prestataire, Consommateur, Profil, Service, RoleUser, EtatCompte, ReputationScore

def create_provider(email, first_name, last_name, bio, price, category, service_title, rating, nb_avis):
    user, created = User.objects.get_or_create(username=email, defaults={'email': email, 'first_name': first_name, 'last_name': last_name})
    if created:
        user.set_password('test1234')
        user.save()
        compte = Compte.objects.create(user=user, etat=EtatCompte.ACTIF)
        utilisateur = Utilisateur.objects.create(compte=compte, prenom=first_name, nom=last_name, role=RoleUser.PRESTATAIRE)
        prestataire = Prestataire.objects.create(utilisateur=utilisateur, carte_verifiee=True)
        Profil.objects.create(utilisateur=utilisateur, biographie=bio, note_moyenne=rating, score_reputation=rating, nb_commandes_total=nb_avis)
        Service.objects.create(prestataire=prestataire, titre=service_title, description=bio, categorie=category, prix=price, delai_livraison=2, actif=True)
        # Badge si >= 4.5 et avis >= 10
        badge = (rating >= 4.5 and nb_avis >= 10)
        ReputationScore.objects.create(prestataire=prestataire, note_moyenne=rating, taux_completion=1.0, score_global=rating, nb_avis=nb_avis, nb_commandes_total=nb_avis, badge_confiance=badge)
        print(f"Créé prestataire: {first_name} {last_name} ({email}) / Note: {rating} / {service_title}")
    else:
        print(f"Le prestataire {email} existe déjà.")

def create_consumer(email, first_name, last_name):
    user, created = User.objects.get_or_create(username=email, defaults={'email': email, 'first_name': first_name, 'last_name': last_name})
    if created:
        user.set_password('test1234')
        user.save()
        compte = Compte.objects.create(user=user, etat=EtatCompte.ACTIF)
        utilisateur = Utilisateur.objects.create(compte=compte, prenom=first_name, nom=last_name, role=RoleUser.CONSOMMATEUR)
        Consommateur.objects.create(utilisateur=utilisateur)
        Profil.objects.create(utilisateur=utilisateur)
        print(f"Créé consommateur: {first_name} {last_name} ({email})")
    else:
        print(f"Le consommateur {email} existe déjà.")

print("Seeding database...")
# Les prestataires Spring Boot (différents ratings)
create_provider("spring_top@test.com", "Laura", "Benoit", "Ingénieur logiciel Java/Spring Boot expert.", 70.00, "development", "Développement Spring Boot", 5.0, 20)
create_provider("spring_mid@test.com", "Sami", "Farah", "Développeur backend Spring Boot intermédiaire.", 50.00, "development", "Développement Spring Boot", 4.5, 12)
create_provider("spring_low@test.com", "Julien", "Moreau", "Développeur junior Spring Boot, prix abordable.", 30.00, "development", "Développement Spring Boot", 3.2, 5)

# Autres prestataires
create_provider("react@test.com", "Ahmed", "Ben Ali", "Développeur Front-End spécialiste en React Native et applications mobiles performantes.", 60.00, "development", "Développement React Native", 4.9, 15)
create_provider("angular@test.com", "Sophie", "Dubois", "Expert Angular pour la création de vos applications web SPA.", 55.00, "development", "Développement Web Angular", 4.8, 10)

create_provider("c_avance@test.com", "Karim", "Zidi", "Je propose des cours particuliers en langage C et algorithmique avancée.", 30.00, "tutoring", "Cours particuliers en C avancé", 4.9, 8)
create_provider("design2@test.com", "Lina", "Gharbi", "Création de maquettes UI/UX sur Figma et design d'interfaces modernes.", 45.00, "design", "Design UI/UX et Maquettes", 4.8, 22)

# Consommateurs
create_consumer("client1@test.com", "Sami", "Consommateur")
create_consumer("client2@test.com", "Amira", "Cliente")
print("Done. Vous pouvez vous connecter avec client1@test.com et le mot de passe : test1234")
