// =========================================================
// CONTENU PAR DÉFAUT DES LISTES (furets, portées, FAQ, réglages)
// Utilisé tant que rien n'a été enregistré depuis l'espace /admin
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
        depart: 'À partir de 12 semaines',
        description: "Notre toute première portée ! Les réservations ouvriront dès la confirmation de gestation. Inscrivez-vous sur la liste d'attente pour être prévenu en priorité.",
        petits: []
    }
];

// Exemple de petit à ajouter dans "petits" une fois la portée née :
// { nom: 'Arwen', sexe: 'f', robe: 'Putoisée', statut: 'dispo', description: '...', tags: ['Curieuse'], photo: '' }

export const faq = [
    {
        "question": "Est-ce qu'un furet sent mauvais ?",
        "reponse": "<p>Le furet a une odeur musquée naturelle, plus ou moins marquée selon les individus. Une litière propre, un couchage lavé régulièrement et une bonne alimentation suffisent à la rendre très discrète. Les bains fréquents sont au contraire à éviter : ils renforcent l'odeur.</p>"
    },
    {
        "question": "Faut-il adopter un seul furet ou deux ?",
        "reponse": "<p>Le furet est un animal très sociable. Si vous n'êtes pas souvent à la maison, nous recommandons vivement d'en adopter deux : ils jouent, dorment et se toilettent ensemble. Un furet seul a besoin de beaucoup de présence humaine.</p>"
    },
    {
        "question": "Un furet peut-il vivre avec d'autres animaux ?",
        "reponse": "<p>Avec un chat ou un chien calme, la cohabitation se passe souvent bien après des présentations progressives. En revanche, le furet reste un prédateur : lapins, rongeurs, oiseaux et reptiles ne doivent jamais être laissés à sa portée.</p>"
    },
    {
        "question": "Est-ce adapté aux enfants ?",
        "reponse": "<p>Oui, avec des enfants assez grands pour comprendre qu'un furet n'est pas une peluche, et toujours sous la surveillance d'un adulte. Ses petites dents sont pointues et il peut pincer en jouant.</p>"
    },
    {
        "question": "Et la stérilisation ?",
        "reponse": "<p>C'est un point important : une femelle non stérilisée qui n'est pas mise à la reproduction risque de rester en chaleur et de développer une grave anémie. Implant hormonal ou stérilisation chirurgicale : nous vous conseillerons et vous orienterons vers un vétérinaire spécialisé NAC.</p>"
    },
    {
        "question": "Combien coûte l'entretien d'un furet ?",
        "reponse": "<p>Comptez une alimentation de qualité, la litière, les rappels de vaccins, une visite vétérinaire annuelle et un peu de matériel (grande cage ou pièce dédiée, hamacs, jouets). Pensez aussi à prévoir une épargne pour les imprévus de santé. On vous donne une estimation détaillée lors de notre échange.</p>"
    },
    {
        "question": "Comment se passe la réservation ?",
        "reponse": "<p>Après la visite, un contrat de réservation est signé et un acompte confirme votre engagement ; il est déduit du prix final. Toutes les modalités (délais, conditions d'annulation) sont détaillées dans le contrat.</p>"
    },
    {
        "question": "Livrez-vous les furets ?",
        "reponse": "<p>Non. Nous tenons à rencontrer chaque famille et à passer du temps avec vous le jour du départ. Les furets sont à récupérer directement à l'élevage, sur rendez-vous.</p>"
    }
];

export const settings = {
    instagram: 'https://www.instagram.com/terra.mustela/',
    facebook: '',
    email: ''
};
