import { User } from '../types';

/**
 * Returns a clean shareable application URL without any third-party or dev platform branding.
 */
export const getCleanAppLink = (loginId?: string): string => {
  try {
    const origin = window.location.origin;
    const path = window.location.pathname;
    let url = `${origin}${path}`;
    
    if (loginId && loginId !== 'admin') {
      url += `?loginId=${encodeURIComponent(loginId)}`;
    }
    return url;
  } catch {
    return 'https://ais-pre-chaptzf6tltxhfwabakvqk-608892244532.asia-southeast1.run.app';
  }
};

/**
 * Generates a clean Marathi/English invitation message to share with employees or admins via WhatsApp/Email.
 */
export const generateShareMessage = (
  user?: User | null, 
  language: 'mr' | 'en' = 'mr',
  companyName: string = 'Blackworm Agritech Pvt Ltd'
): string => {
  // Never expose Admin credentials in share messages
  const isTargetAdmin = user && (user.role === 'admin' || user.loginId === 'admin' || user.id === 'USR-001');
  const targetUser = isTargetAdmin ? null : user;

  const link = getCleanAppLink(targetUser?.loginId);

  if (language === 'mr') {
    let msg = `🌱 *${companyName}*\n`;
    msg += `*अधिकृत एंटरप्राइज पोर्टल (Enterprise Portal)*\n\n`;
    msg += `नमस्कार,\nकंपनीच्या सिस्टिम ॲपवर लॉगिन करण्यासाठी खालील अधिकृत लिंकवर क्लिक करा:\n\n`;
    msg += `🔗 *ॲप लॉगिन लिंक:* \n${link}\n\n`;

    if (targetUser && targetUser.loginId) {
      msg += `👤 *युजर आयडी (Login ID):* ${targetUser.loginId}\n`;
      msg += `💼 *पद:* ${targetUser.designation || targetUser.role}\n\n`;
    }

    msg += `🔑 *टीप:* तुमचा पासवर्ड एडमिनकडून स्वतंत्रपणे मिळवून लॉगिन करा.\n\n`;
    msg += `टीप: ही कंपनीची अधिकृत व सुरक्षित वेब लिंक आहे. धन्यवाद!`;
    return msg;
  } else {
    let msg = `🌱 *${companyName}*\n`;
    msg += `*Official Enterprise App Portal*\n\n`;
    msg += `Hello,\nPlease click the official link below to log in to the company portal:\n\n`;
    msg += `🔗 *App Login Link:* \n${link}\n\n`;

    if (targetUser && targetUser.loginId) {
      msg += `👤 *Login ID:* ${targetUser.loginId}\n`;
      msg += `💼 *Role:* ${targetUser.designation || targetUser.role}\n\n`;
    }

    msg += `🔑 *Note:* Please obtain your password separately from Admin to log in.\n\n`;
    msg += `Note: This is an official company portal link. Thank you!`;
    return msg;
  }
};

/**
 * Opens WhatsApp share with the invitation message.
 */
export const shareViaWhatsApp = (message: string) => {
  const encoded = encodeURIComponent(message);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
};
