export const parseGPSCoordinates = (input: string) => {
  if (!input) return null;

  // 1. Try Decimal format: "36.85, 10.15" or "36.85 10.15"
  // Allow comma, space, or both as separator
  // Allow optional minus sign for south/west
  const decimalRegex = /^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/;
  const decimalMatch = input.trim().match(decimalRegex);

  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[3]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  // 2. Try DMS format: 36°52'15.6"N 10°16'54.3"E
  // Matches: D°M'S"[NS] D°M'S"[EW]
  const dmsRegex = /(\d+)[°\s]+(\d+)['\s]+(\d+(\.\d+)?)["\s]*([NS])[\s,]+(\d+)[°\s]+(\d+)['\s]+(\d+(\.\d+)?)["\s]*([EW])/i;
  const dmsMatch = input.trim().match(dmsRegex);

  if (dmsMatch) {
    const parseDMS = (d: string, m: string, s: string, dir: string) => {
      let dd = parseFloat(d) + parseFloat(m) / 60 + parseFloat(s) / 3600;
      if (dir.toUpperCase() === 'S' || dir.toUpperCase() === 'W') {
        dd = dd * -1;
      }
      return dd;
    };

    const lat = parseDMS(dmsMatch[1], dmsMatch[2], dmsMatch[3], dmsMatch[5]);
    const lng = parseDMS(dmsMatch[6], dmsMatch[7], dmsMatch[8], dmsMatch[10]);

    if (!isNaN(lat) && !isNaN(lng)) {
      return { lat, lng };
    }
  }

  return null;
};
