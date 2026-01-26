export interface JWTPayload {
    id: number;
    email?: string;
    phone?: string;
    role?: string;
    type: 'staff' | 'customer' | 'employee' | 'investor' | 'media';
}
export declare const generateToken: (payload: JWTPayload) => string;
export declare const verifyToken: (token: string) => JWTPayload;
export declare const generateQRToken: (data: any, expiresIn?: string) => string;
export declare const verifyQRToken: (token: string) => any;
//# sourceMappingURL=jwt.d.ts.map