import { Request, Response } from 'express';
import { getCache, setCache, deleteCache } from '../utils/redis';
import { prisma } from '../utils/prisma';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const cacheKey = 'settings:global';
    const cachedData = await getCache(cacheKey);
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

    let setting = await prisma.siteSetting.findUnique({
      where: { key: 'global' },
    });

    if (!setting) {
      setting = await prisma.siteSetting.create({
        data: {
          key: 'global',
          value: defaultSettings,
        },
      });
    }

    await setCache(cacheKey, setting.value, 300); // 5-minute TTL

    res.json(setting.value);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const data = req.body;

    const setting = await prisma.siteSetting.upsert({
      where: { key: 'global' },
      update: { value: data },
      create: { key: 'global', value: data },
    });

    await deleteCache('settings:global');

    res.json(setting.value);
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
