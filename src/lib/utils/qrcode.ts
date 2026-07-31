import QRCode from "qrcode";

/**
 * Generate standard scannable QR Code Data URL using ISO/IEC 18004 Reed-Solomon Error Correction.
 * Compatible with Google Authenticator, 1Password, Authy, and mobile camera apps.
 */
export async function generateQrCodeDataUrl(
  text: string,
  options: { size?: number; margin?: number } = {}
): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: options.size || 220,
      margin: options.margin || 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
    });
  } catch (error) {
    console.error("[QRCode Utility] Failed to generate QR Code Data URL:", error);
    return "";
  }
}

/**
 * Generate SVG string for QR Code.
 */
export async function generateQrCodeSvg(
  text: string,
  options: { size?: number; margin?: number } = {}
): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: "svg",
      width: options.size || 220,
      margin: options.margin || 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#09090b",
        light: "#ffffff",
      },
    });
  } catch (error) {
    console.error("[QRCode Utility] Failed to generate QR Code SVG:", error);
    return "";
  }
}
