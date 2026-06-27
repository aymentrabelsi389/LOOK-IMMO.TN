"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSettings = exports.getSettings = void 0;
const redis_1 = require("../utils/redis");
const prisma_1 = require("../utils/prisma");
const getSettings = async (req, res) => {
    try {
        const cacheKey = 'settings:global';
        const cachedData = await (0, redis_1.getCache)(cacheKey);
        if (cachedData) {
            res.json(cachedData);
            return;
        }
        const defaultSettings = {
            websiteName: 'Look Immo',
            contactEmail: 'contact@lookimmo.tn',
            phoneNumber: '+216 70 123 456',
            address: 'Les Berges du Lac II, Tunis, Tunisie',
            socialMedia: {
                instagram: 'https://instagram.com/lookimmo',
                facebook: 'https://facebook.com/lookimmo',
                whatsapp: '+216 70 123 456'
            },
            workingHours: {
                weekdays: 'Lun - Ven: 09:00 - 18:00',
                saturday: 'Samedi: 09:00 - 13:00',
                sunday: 'Dimanche: Fermé'
            },
            aboutText: 'Look Immo vous accompagne dans vos projets immobiliers.',
        };
        let setting = await prisma_1.prisma.siteSetting.findUnique({
            where: { key: 'global' },
        });
        if (!setting) {
            setting = await prisma_1.prisma.siteSetting.create({
                data: {
                    key: 'global',
                    value: defaultSettings,
                },
            });
        }
        await (0, redis_1.setCache)(cacheKey, setting.value, 300); // 5-minute TTL
        res.json(setting.value);
    }
    catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const data = req.body;
        const setting = await prisma_1.prisma.siteSetting.upsert({
            where: { key: 'global' },
            update: { value: data },
            create: { key: 'global', value: data },
        });
        await (0, redis_1.deleteCache)('settings:global');
        res.json(setting.value);
    }
    catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
exports.updateSettings = updateSettings;
//# sourceMappingURL=settingController.js.map