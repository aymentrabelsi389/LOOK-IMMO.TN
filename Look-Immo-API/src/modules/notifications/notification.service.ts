import { prisma } from '../../core/database/prisma';
import { emitToAdmin, emitToUser } from '../../core/socket/socket';
import { logger } from '../../core/logger/logger';

interface CreateNotificationInput {
  type: string;
  title: string;
  message: string;
  icon?: string;
  link?: string;
  userId?: string | null;
  metadata?: any;
}

export const createNotification = async (data: CreateNotificationInput) => {
  try {
    const notification = await prisma.notification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        icon: data.icon || null,
        link: data.link || null,
        userId: data.userId || null,
        metadata: data.metadata || null,
        read: false
      },
      include: {
        user: {
          select: { id: true, name: true }
        }
      }
    });

    // Real-time broadcast
    if (notification.userId) {
      emitToUser(notification.userId, 'notification:new', notification);
    } else {
      emitToAdmin('notification:new', notification);
    }

    return notification;
  } catch (error) {
    logger.error('Failed to create notification:', error);
    throw error;
  }
};

export const checkPropertyMatchesAndNotify = async (property: any) => {
  try {
    // Fetch all active client demands (searching or contacted)
    const demands = await prisma.clientDemand.findMany({
      where: {
        status: {
          in: ['searching', 'contacted']
        }
      }
    });

    const typeMapping: Record<string, string[]> = {
      'appartement': ['apartment', 'studio', 'duplex', 'triplex', 'penthouse'],
      'villa': ['villa'],
      'terrain': ['land'],
      'bureau': ['commercial', 'depot'],
      'commerce': ['commerce', 'commercial']
    };

    for (const demand of demands) {
      // Hard exclude: if demand has contractType set, skip properties with a different listing type.
      // On the backend, property.type is 'rent' | 'sale' (the listing/contract type).
      if ((demand as any).contractType && property.type) {
        if ((demand as any).contractType !== property.type) continue;
      }

      // Calculate effective price (total price for land when priceType is per_m2)
      const isLand = property.category === 'land' || property.type === 'land';
      const isPerM2 = (property as any).priceType === 'per_m2' || (!(property as any).priceType && property.price < 20_000);
      const propArea = property.features ? (property.features as any).area : null;
      const effectivePrice = (isLand && isPerM2 && propArea && propArea > 0)
        ? property.price * propArea
        : property.price;

      // Budget tolerance: sale → max 15% over budget | rent → max 25% over budget
      if (demand.budget && demand.budget > 0) {
        const upperFactor = (demand as any).contractType === 'rent' ? 1.25 : 1.15;
        const lowerBound = demand.budget * 0.7;
        const upperBound = demand.budget * upperFactor;
        if (effectivePrice < lowerBound || effectivePrice > upperBound) {
          continue;
        }
      }

      let score = 0;

      // 1. Type Match (Critical: 40 points)
      const allowedTypes = typeMapping[demand.type] || [];
      const propCategory = property.category || 'apartment';
      if (allowedTypes.includes(propCategory)) {
        score += 40;
      } else {
        if (demand.type === 'appartement' && propCategory === 'villa') score += 5;
        if (demand.type === 'villa' && propCategory === 'apartment') score += 5;
      }

      // 2. Budget Match (Critical: 30 points)
      if (demand.budget && demand.budget > 0) {
        const priceDiff = (effectivePrice - demand.budget) / demand.budget;
        if ((demand as any).contractType === 'rent') {
          // Rent: up to 25% over — more tolerant
          if (priceDiff <= 0) score += 30;            // Within budget
          else if (priceDiff <= 0.1) score += 20;     // Up to 10% over
          else if (priceDiff <= 0.2) score += 15;     // Up to 20% over
          else score += 10;                            // 20–25% over
        } else {
          // Sale: up to 15% over — stricter
          if (priceDiff <= 0) score += 30;             // Within budget
          else if (priceDiff <= 0.1) score += 20;      // Up to 10% over
          else score += 10;                             // 10–15% over
        }
      } else {
        score += 20;
      }

      // 3. Location Match (20 points)
      const demandLoc = demand.location ? demand.location.toLowerCase().trim() : '';
      const propCity = (property.city || '').toLowerCase().trim();
      const propAddr = (property.description || '').toLowerCase().trim();

      if (demandLoc) {
        if (propCity && (propCity.includes(demandLoc) || demandLoc.includes(propCity))) {
          score += 20;
        } else if (propAddr && (propAddr.includes(demandLoc) || demandLoc.includes(propAddr))) {
          score += 12;
        }
      } else {
        score += 10;
      }

      // 4. Area Match (Attempt to extract from description) (10 points)
      const areaMatch = demand.description ? demand.description.match(/(\d+)\s*m[2²]/) : null;
      const propFeatures = property.features ? (property.features as any) : null;
      if (areaMatch && propFeatures?.area) {
        const requestedArea = parseInt(areaMatch[1]);
        const areaDiff = Math.abs(propFeatures.area - requestedArea) / requestedArea;
        if (areaDiff <= 0.2) score += 10;
        else if (areaDiff <= 0.4) score += 5;
      } else {
        score += 10;
      }

      const finalScore = Math.min(100, Math.max(0, Math.round(score)));

      // If it qualifies as a match (score >= 70)
      if (finalScore >= 70) {
        await createNotification({
          type: 'demand_match',
          title: 'Nouvelle Correspondance',
          message: `Le bien "${property.title}" correspond à la demande de ${demand.clientName}.`,
          icon: 'Sparkles',
          link: '/admin',
          userId: null, // Send to all admins/agents
          metadata: {
            demandId: demand.id,
            propertyId: property.id,
            clientName: demand.clientName,
            score: finalScore
          }
        });
      }
    }
  } catch (err) {
    logger.error('Failed to run match matching check:', err);
  }
};
