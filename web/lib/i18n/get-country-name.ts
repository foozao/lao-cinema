/**
 * Convert ISO 3166-1 alpha-2 country code to country name
 */
export function getCountryName(countryCode: string | undefined | null): string {
  if (!countryCode) return '';
  
  const countries: Record<string, string> = {
    // Southeast Asia
    'LA': 'Laos',
    'TH': 'Thailand',
    'VN': 'Vietnam',
    'KH': 'Cambodia',
    'MM': 'Myanmar',
    'SG': 'Singapore',
    'MY': 'Malaysia',
    'ID': 'Indonesia',
    'PH': 'Philippines',
    'BN': 'Brunei',
    'TL': 'Timor-Leste',
    
    // East Asia
    'CN': 'China',
    'JP': 'Japan',
    'KR': 'South Korea',
    'KP': 'North Korea',
    'TW': 'Taiwan',
    'HK': 'Hong Kong',
    'MO': 'Macau',
    
    // South Asia
    'IN': 'India',
    'PK': 'Pakistan',
    'BD': 'Bangladesh',
    'LK': 'Sri Lanka',
    'NP': 'Nepal',
    'BT': 'Bhutan',
    'AF': 'Afghanistan',
    'MV': 'Maldives',
    
    // Middle East
    'SA': 'Saudi Arabia',
    'AE': 'United Arab Emirates',
    'IL': 'Israel',
    'TR': 'Turkey',
    'IR': 'Iran',
    'IQ': 'Iraq',
    'JO': 'Jordan',
    'LB': 'Lebanon',
    'SY': 'Syria',
    'YE': 'Yemen',
    'OM': 'Oman',
    'KW': 'Kuwait',
    'BH': 'Bahrain',
    'QA': 'Qatar',
    
    // Western Europe
    'ES': 'Spain',
    'FR': 'France',
    'DE': 'Germany',
    'IT': 'Italy',
    'GB': 'United Kingdom',
    'PT': 'Portugal',
    'NL': 'Netherlands',
    'BE': 'Belgium',
    'CH': 'Switzerland',
    'AT': 'Austria',
    'IE': 'Ireland',
    'GR': 'Greece',
    'IS': 'Iceland',
    
    // Northern Europe
    'SE': 'Sweden',
    'NO': 'Norway',
    'DK': 'Denmark',
    'FI': 'Finland',
    
    // Eastern Europe
    'PL': 'Poland',
    'CZ': 'Czech Republic',
    'HU': 'Hungary',
    'RO': 'Romania',
    'BG': 'Bulgaria',
    'HR': 'Croatia',
    'SI': 'Slovenia',
    'SK': 'Slovakia',
    'EE': 'Estonia',
    'LV': 'Latvia',
    'LT': 'Lithuania',
    'RU': 'Russia',
    'UA': 'Ukraine',
    'BY': 'Belarus',
    
    // Americas
    'US': 'United States',
    'CA': 'Canada',
    'MX': 'Mexico',
    'BR': 'Brazil',
    'AR': 'Argentina',
    'CL': 'Chile',
    'CO': 'Colombia',
    'PE': 'Peru',
    'VE': 'Venezuela',
    'EC': 'Ecuador',
    'BO': 'Bolivia',
    'PY': 'Paraguay',
    'UY': 'Uruguay',
    'CR': 'Costa Rica',
    'PA': 'Panama',
    'CU': 'Cuba',
    'DO': 'Dominican Republic',
    'GT': 'Guatemala',
    'HN': 'Honduras',
    'SV': 'El Salvador',
    'NI': 'Nicaragua',
    
    // Africa
    'ZA': 'South Africa',
    'EG': 'Egypt',
    'NG': 'Nigeria',
    'KE': 'Kenya',
    'ET': 'Ethiopia',
    'GH': 'Ghana',
    'TZ': 'Tanzania',
    'UG': 'Uganda',
    'MA': 'Morocco',
    'DZ': 'Algeria',
    'TN': 'Tunisia',
    'SN': 'Senegal',
    'CI': 'Ivory Coast',
    'CM': 'Cameroon',
    'RW': 'Rwanda',
    'ZW': 'Zimbabwe',
    'BW': 'Botswana',
    'NA': 'Namibia',
    'MZ': 'Mozambique',
    'AO': 'Angola',
    
    // Oceania
    'AU': 'Australia',
    'NZ': 'New Zealand',
    'FJ': 'Fiji',
    'PG': 'Papua New Guinea',
    'WS': 'Samoa',
    'TO': 'Tonga',
    'VU': 'Vanuatu',
  };
  
  return countries[countryCode.toUpperCase()] || countryCode;
}

/**
 * Get country display string for award shows (includes city if available)
 */
export function getAwardShowLocation(city?: string | null, countryCode?: string | null): string {
  const parts = [];
  
  if (city) parts.push(city);
  if (countryCode) parts.push(getCountryName(countryCode));
  
  return parts.join(', ');
}
