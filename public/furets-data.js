// =========================================================
// DONNÉES DE L'ÉLEVAGE — à modifier ici, le site se met à jour seul
// =========================================================
// photo : chemin vers une image (ex: 'assets/img/furets/luna.jpg') ou '' pour l'illustration par défaut
// statut : 'repro' (reproducteur), 'dispo' (disponible), 'reserve' (réservé), 'avenir' (à naître)
// sexe : 'm' ou 'f'

export const reproducteurs = [
    {
        nom: 'Noisette',
        sexe: 'f',
        robe: 'Putoisée (sable)',
        naissance: '2025',
        description: "Notre douce matriarche : câline, curieuse et toujours la première à venir dire bonjour.",
        tags: ['Câline', 'Calme', 'Testée santé'],
        photo: '',
        couleurs: ['#e8c9a0', '#c49a6c']
    },
    {
        nom: 'Caramel',
        sexe: 'f',
        robe: 'Champagne',
        naissance: '2025',
        description: "Une boule d'énergie au pelage crème, reine incontestée du tunnel et de la danse de guerre.",
        tags: ['Joueuse', 'Sociable', 'Testée santé'],
        photo: '',
        couleurs: ['#f6e3c4', '#e2bf8f']
    },
    {
        nom: 'Ébène',
        sexe: 'm',
        robe: 'Black sable',
        naissance: '2024',
        description: "Un grand gaillard au cœur tendre, très patient avec les plus jeunes. Un vrai nounours.",
        tags: ['Patient', 'Robuste', 'Testé santé'],
        photo: '',
        couleurs: ['#b9a58e', '#5d3d21']
    }
];

export const portees = [
    {
        nom: 'Portée « A »',
        parents: ['Noisette', 'Ébène'],
        statut: 'avenir',
        naissance: 'Printemps 2027',
        depart: 'À partir de 10 semaines',
        description: "Notre toute première portée ! Les réservations ouvriront dès la confirmation de gestation. Inscrivez-vous sur la liste d'attente pour être prévenu en priorité.",
        petits: []
    }
];

// Exemple de petit à ajouter dans "petits" une fois la portée née :
// { nom: 'Arwen', sexe: 'f', robe: 'Putoisée', statut: 'dispo', description: '...', tags: ['Curieuse'], photo: '' }
