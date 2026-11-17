import QRCode from "qrcode";

/** Registration page address for an intake (the link the QR code points to). */
export function registrationUrl(appUrl: string, intakeId: string): string {
  return `${appUrl.replace(/\/+$/, "")}/join/${intakeId}`;
}

/** QR code as an SVG string (dark modules on white, with a quiet zone). */
export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 2,
    color: { dark: "#101a14", light: "#ffffff" },
  });
}
