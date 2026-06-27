import { PrismaClient, Role, PropertyType, PropertyStatus, PriceType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting seed...');

    // 1. Clean existing data
    await prisma.favorite.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.visit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.message.deleteMany();
    await prisma.blog.deleteMany();
    await prisma.location.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash('password123', 12);

    // 2. Create Users
    const admin = await prisma.user.create({
        data: {
            name: 'Admin Look Immo',
            email: 'admin@lookimmo.tn',
            password: hashedPassword,
            role: Role.admin,
            phone: '+216 98 720 473'
        }
    });

    const agent = await prisma.user.create({
        data: {
            name: 'Agent Sabri',
            email: 'agent@lookimmo.tn',
            password: hashedPassword,
            role: Role.agent,
            phone: '+216 22 333 444'
        }
    });

    const client = await prisma.user.create({
        data: {
            name: 'Client Test',
            email: 'client@test.com',
            password: hashedPassword,
            role: Role.client,
            phone: '+216 55 666 777'
        }
    });

    console.log('Users created');

    // 3. Create Properties
    const propertiesData = [
        {
            title: 'Villa de Luxe à Carthage',
            description: 'Magnifique villa avec vue sur mer, piscine et grand jardin.',
            price: 2500000,
            type: PropertyType.sale,
            city: 'Tunis',
            zone: 'Carthage',
            category: 'villa',
            isFeatured: true,
            isNew: true,
            isHotDeal: true,
            images: ['https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80'],
            latitude: 36.85,
            longitude: 10.33
        },
        {
            title: 'Appartement S+3 à Sousse',
            description: 'Bel appartement moderne situé au coeur de Sousse, proche de toutes commodités.',
            price: 1800,
            priceType: PriceType.total,
            type: PropertyType.rent,
            city: 'Sousse',
            zone: 'Khezama',
            category: 'apartment',
            isFeatured: true,
            images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80'],
            latitude: 35.82,
            longitude: 10.63
        },
        {
            title: 'Terrain Constructible à Hammamet',
            description: 'Terrain de 500m2 idéal pour la construction d\'une maison de vacances.',
            price: 450000,
            type: PropertyType.sale,
            city: 'Hammamet',
            zone: 'Hammamet Nord',
            category: 'land',
            images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'],
            latitude: 36.4,
            longitude: 10.6
        },
        {
            title: 'Local Commercial Tunis Centre',
            description: 'Idéal pour bureau ou commerce, situé sur une avenue principale.',
            price: 3500,
            type: PropertyType.rent,
            city: 'Tunis',
            zone: 'Centre Ville',
            category: 'commercial',
            images: ['https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80'],
            latitude: 36.8,
            longitude: 10.18
        },
        {
            title: 'Penthouse Moderne aux Berges du Lac 2',
            description: 'Penthouse d\'exception avec terrasse panoramique et finitions haut de gamme.',
            price: 4500000,
            type: PropertyType.sale,
            city: 'Tunis',
            zone: 'Berges du Lac 2',
            category: 'apartment',
            isFeatured: true,
            isHotDeal: true,
            images: ['https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'],
            latitude: 36.84,
            longitude: 10.28
        },
        {
            title: 'Grand Terrain de Promotion Immobilière aux Berges du Lac 2',
            description: 'Grand terrain stratégique à vocation R+5, idéal pour la construction d\'une résidence haut standing ou d\'un siège social de prestige.',
            price: 7200000,
            type: PropertyType.sale,
            city: 'Tunis',
            zone: 'Berges du Lac 2',
            category: 'land',
            isFeatured: true,
            isHotDeal: true,
            images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'],
            latitude: 36.835,
            longitude: 10.278,
            features: {
                area: 3200,
                vocation: 'Résidentiel R+5',
                cos: 0.8
            }
        },
        {
            title: 'Terrain de Promotion Résidentielle à Sousse',
            description: 'Superbe terrain de grande superficie situé dans une zone en pleine expansion à Sahloul 4, parfait pour un projet de promotion immobilière résidentielle.',
            price: 4600000,
            type: PropertyType.sale,
            city: 'Sousse',
            zone: 'Sahloul 4',
            category: 'land',
            isFeatured: true,
            isHotDeal: true,
            images: ['https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80'],
            latitude: 35.83,
            longitude: 10.60,
            features: {
                area: 5400,
                vocation: 'Résidentiel R+4',
                cos: 0.7
            }
        }
    ];

    for (const prop of propertiesData) {
        await prisma.property.create({
            data: {
                ...prop,
                ownerId: agent.id,
                status: PropertyStatus.available
            }
        });
    }

    console.log('Properties created');

    // 4. Create Blog Posts
    await prisma.blog.create({
        data: {
            title: 'Conseils pour acheter votre première maison',
            content: 'L\'achat d\'une première maison est une étape importante. Voici quelques conseils pour vous guider...',
            excerpt: 'Découvrez nos conseils pour réussir votre premier achat immobilier en Tunisie.',
            published: true,
            category: 'Conseils'
        }
    });

    console.log('Blog posts created');

    // 5. Create Messages
    await prisma.message.create({
        data: {
            name: 'Jean Dupont',
            email: 'jean@gmail.com',
            phone: '+33 6 12 34 56 78',
            message: 'Bonjour, je suis intéressé par la villa à Carthage.'
        }
    });

    console.log('Messages created');

    console.log('Seed completed successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
