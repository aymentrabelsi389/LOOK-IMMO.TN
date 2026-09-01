"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveGoogleMapsUrl = exports.updateSettings = exports.getSettings = void 0;
const redis_1 = require("../utils/redis");
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
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
        logger_1.logger.error('Error fetching settings:', error);
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
        logger_1.logger.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
};
exports.updateSettings = updateSettings;
const resolveGoogleMapsUrl = async (req, res) => {
    try {
        const url = req.query.url || req.body?.url;
        if (!url) {
            res.status(400).json({ error: 'URL is required' });
            return;
        }
        let targetUrl = url.trim();
        if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
            targetUrl = `https://${targetUrl}`;
        }
        const response = await fetch(targetUrl, {
            method: 'GET',
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
            }
        });
        const finalUrl = response.url || targetUrl;
        const bodyText = await response.text();
        // 1. /@(-?\d+\.\d+),(-?\d+\.\d+)
        let match = finalUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        // 2. !3d(-?\d+\.\d+)!4d(-?\d+\.\d+)
        if (!match) {
            const dMatch = finalUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || bodyText.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
            if (dMatch) {
                match = dMatch;
            }
        }
        // 3. ?q=(-?\d+\.\d+),(-?\d+\.\d+) or &ll=(-?\d+\.\d+),(-?\d+\.\d+)
        if (!match) {
            const qMatch = finalUrl.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/) || bodyText.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (qMatch) {
                match = qMatch;
            }
        }
        // 4. Meta property og:image with center=...
        if (!match) {
            const ogMatch = bodyText.match(/center=(-?\d+\.\d+)%2C(-?\d+\.\d+)/) || bodyText.match(/center=(-?\d+\.\d+),(-?\d+\.\d+)/);
            if (ogMatch) {
                match = ogMatch;
            }
        }
        // 5. App initialization state JSON arrays
        if (!match) {
            const initMatch = bodyText.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
            if (initMatch) {
                match = initMatch;
            }
        }
        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            res.json({ success: true, lat, lng, finalUrl });
            return;
        }
        res.json({ success: false, finalUrl });
    }
    catch (error) {
        logger_1.logger.error('Error resolving map URL:', error);
        res.status(500).json({ error: 'Failed to resolve map URL' });
    }
};
exports.resolveGoogleMapsUrl = resolveGoogleMapsUrl;
//# sourceMappingURL=settingController.js.map