import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const prisma = new PrismaClient();
const UPLOADS_ROOT = path.join(__dirname, '../../uploads/properties');

async function migrate() {
    console.log('🚀 Starting image migration from Base64 to files...');

    // 1. Ensure directory exists
    if (!fs.existsSync(UPLOADS_ROOT)) {
        fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
        console.log(`Created directory: ${UPLOADS_ROOT}`);
    }

    // 2. Fetch all properties
    const properties = await prisma.property.findMany();
    console.log(`Found ${properties.length} properties to check.`);

    let totalMigrated = 0;

    for (const property of properties) {
        let hasBase64 = false;
        const newImages: string[] = [];

        for (let i = 0; i < property.images.length; i++) {
            const img = property.images[i];

            if (img.startsWith('data:image/')) {
                hasBase64 = true;
                try {
                    // Extract base64 data
                    const matches = img.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
                    if (!matches || matches.length !== 3) {
                        newImages.push(img); // Skip invalid
                        continue;
                    }

                    const buffer = Buffer.from(matches[2], 'base64');
                    const filename = `prop-${property.id}-${Date.now()}-${i}.webp`;
                    const destPath = path.join(UPLOADS_ROOT, filename);

                    // Convert and save
                    await sharp(buffer)
                        .rotate()
                        .webp({ quality: 80 })
                        .toFile(destPath);

                    const publicPath = `/uploads/properties/${filename}`;
                    newImages.push(publicPath);
                    totalMigrated++;
                } catch (error) {
                    console.error(`Error migrating image ${i} for property ${property.id}:`, error);
                    newImages.push(img); // Keep original on failure
                }
            } else {
                newImages.push(img);
            }
        }

        if (hasBase64) {
            await prisma.property.update({
                where: { id: property.id },
                data: { images: newImages }
            });
            console.log(`✅ Updated property ${property.id} (${newImages.length} images)`);
        }
    }

    console.log(`
✨ Migration complete!
----------------------
Total images converted: ${totalMigrated}
Properties updated: ${properties.length}
    `);
}

migrate()
    .catch(err => {
        console.error('Migration failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
