/**
 * Generate improved static QR code with enhanced security
 */
export declare function generateStaticQR(customerId: number): Promise<{
    token: string;
    dataUrl: string;
    createdAt: Date;
}>;
/**
 * Validate and decode static QR token
 */
export declare function verifyStaticQR(token: string): {
    valid: boolean;
    customerId?: string;
    error?: string;
};
//# sourceMappingURL=qrCode.d.ts.map