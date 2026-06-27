import { Property, User } from './types';

export const MOCK_PROPERTIES: Property[] = [
  {
    id: '1',
    title: 'Luxury Seaside Villa',
    description: 'A stunning 5-bedroom villa with panoramic ocean views, private infinity pool, and modern smart-home features. Located in the exclusive Santa Monica district.',
    price: 4500000,
    location: {
      city: 'Santa Monica',
      address: '123 Ocean Drive',
      lat: 34.0195,
      lng: -118.4912
    },
    features: {
      bedrooms: 5,
      bathrooms: 6,
      area: 4500,
      parking: true,
      pool: true
    },
    type: 'villa',
    listingType: 'sale',
    images: [
      'https://picsum.photos/800/600?random=1',
      'https://picsum.photos/800/600?random=11'
    ],
    agentId: 'agent1',
    isFeatured: true
  },
  {
    id: '2',
    title: 'Modern Downtown Loft',
    description: 'Chic industrial-style loft in the heart of the city. High ceilings, exposed brick, and floor-to-ceiling windows. Perfect for young professionals.',
    price: 3500,
    location: {
      city: 'Los Angeles',
      address: '456 Main St',
      lat: 34.0522,
      lng: -118.2437
    },
    features: {
      bedrooms: 1,
      bathrooms: 1,
      area: 1200,
      parking: true,
      pool: false
    },
    type: 'apartment',
    listingType: 'rent',
    images: [
      'https://picsum.photos/800/600?random=2',
      'https://picsum.photos/800/600?random=22'
    ],
    agentId: 'agent1',
    isFeatured: true
  },
  {
    id: '3',
    title: 'Suburban Family Home',
    description: 'Spacious family home with a large backyard, renovated kitchen, and close proximity to top-rated schools. A peaceful retreat.',
    price: 850000,
    location: {
      city: 'Pasadena',
      address: '789 Oak Lane',
      lat: 34.1478,
      lng: -118.1445
    },
    features: {
      bedrooms: 4,
      bathrooms: 3,
      area: 2800,
      parking: true,
      pool: false
    },
    type: 'depot',
    listingType: 'sale',
    images: [
      'https://picsum.photos/800/600?random=3'
    ],
    agentId: 'agent2'
  },
  {
    id: '4',
    title: 'Corporate Office Space',
    description: 'Premium office suite in a Class A building. Includes conference rooms, kitchenette, and high-speed fiber internet.',
    price: 5000,
    location: {
      city: 'Los Angeles',
      address: '101 Business Blvd',
      lat: 34.0522,
      lng: -118.2500
    },
    features: {
      bedrooms: 0,
      bathrooms: 2,
      area: 2000,
      parking: true,
      pool: false
    },
    type: 'commercial',
    listingType: 'rent',
    images: [
      'https://picsum.photos/800/600?random=4'
    ],
    agentId: 'agent2'
  },
  {
    id: '5',
    title: 'Beverly Hills Mansion',
    description: 'Iconic estate featuring a tennis court, home theater, guest house, and lush gardens. The epitome of luxury living.',
    price: 12500000,
    location: {
      city: 'Beverly Hills',
      address: '90210 Luxury Way',
      lat: 34.0736,
      lng: -118.4004
    },
    features: {
      bedrooms: 8,
      bathrooms: 10,
      area: 12000,
      parking: true,
      pool: true
    },
    type: 'villa',
    listingType: 'sale',
    images: [
      'https://picsum.photos/800/600?random=5'
    ],
    agentId: 'agent1',
    isFeatured: true
  },
  {
    id: '6',
    title: 'Terrain Constructible - Zone Urbaine',
    description: 'Excellent terrain constructible situé en zone urbaine avec un coefficient d\'occupation du sol de 0.8. Parfait pour un projet résidentiel ou commercial.',
    price: 350000,
    location: {
      city: 'Sousse',
      address: 'Route de la Corniche',
      lat: 35.8256,
      lng: 10.6344
    },
    features: {
      bedrooms: 0,
      bathrooms: 0,
      area: 2100,
      parking: false,
      pool: false,
      vocation: 'R+10',
      cos: 0.8
    },
    type: 'land',
    listingType: 'sale',
    images: [
      'https://picsum.photos/800/600?random=6'
    ],
    agentId: 'agent2',
    isNew: true
  }
];

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Alex Johnson',
  email: 'alex@example.com',
  phone: '+216 70 123 456',
  role: 'admin',
  favorites: ['2', '5'],
  avatar: 'https://picsum.photos/100/100?random=user',
  registrationDate: Date.now() - 86400000 * 90, // 90 days ago
  lastLogin: Date.now() - 86400000 * 2 // 2 days ago
};

export const ADMIN_STATS = [
  { name: 'Jan', visits: 400, leads: 24 },
  { name: 'Feb', visits: 300, leads: 13 },
  { name: 'Mar', visits: 550, leads: 38 },
  { name: 'Apr', visits: 480, leads: 29 },
  { name: 'May', visits: 600, leads: 42 },
  { name: 'Jun', visits: 700, leads: 55 },
];

export const MOCK_BLOG_POSTS = [
  {
    id: 'blog1',
    title: 'Les tendances immobilières en Tunisie pour 2024',
    category: 'Marché',
    excerpt: 'Découvrez les principales tendances qui façonnent le marché immobilier tunisien cette année.',
    content: `Le marché immobilier tunisien connaît une transformation majeure en 2024. Les investisseurs se tournent de plus en plus vers les zones côtières et les projets écologiques.

Les prix ont connu une hausse modérée de 5% par rapport à l'année précédente, avec une demande croissante pour les appartements modernes et les villas avec piscine.

Les régions les plus prisées restent Tunis, Sousse et Hammamet, mais de nouvelles zones comme Bizerte et Mahdia gagnent en popularité.`,
    image: 'https://picsum.photos/800/400?random=blog1',
    createdAt: Date.now() - 86400000 * 5,
    updatedAt: Date.now() - 86400000 * 5
  },
  {
    id: 'blog2',
    title: 'Comment bien préparer son investissement immobilier',
    category: 'Conseils',
    excerpt: 'Nos experts partagent leurs conseils pour réussir votre premier investissement immobilier.',
    content: `Investir dans l'immobilier est une décision importante qui nécessite une préparation minutieuse. Voici nos conseils essentiels :

1. Définissez votre budget et vos objectifs
2. Étudiez le marché local
3. Visitez plusieurs propriétés avant de décider
4. Faites appel à un professionnel pour l'estimation
5. Vérifiez tous les documents légaux

Un bon investissement immobilier peut générer des revenus passifs significatifs tout en constituant un patrimoine durable.`,
    image: 'https://picsum.photos/800/400?random=blog2',
    createdAt: Date.now() - 86400000 * 12,
    updatedAt: Date.now() - 86400000 * 10
  },
  {
    id: 'blog3',
    title: 'Les avantages de la location saisonnière',
    category: 'Location',
    excerpt: 'La location saisonnière offre des opportunités uniques pour les propriétaires en Tunisie.',
    content: `La location saisonnière est devenue une option très attractive pour les propriétaires tunisiens, notamment dans les zones touristiques.

Avantages principaux :
- Revenus plus élevés par rapport à la location classique
- Flexibilité dans l'utilisation de votre bien
- Possibilité de profiter de votre propriété hors saison

Avec l'essor des plateformes de réservation en ligne, gérer une location saisonnière n'a jamais été aussi simple.`,
    image: 'https://picsum.photos/800/400?random=blog3',
    createdAt: Date.now() - 86400000 * 20,
    updatedAt: Date.now() - 86400000 * 18
  }
];
