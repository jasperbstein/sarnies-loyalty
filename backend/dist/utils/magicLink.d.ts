export declare const generateMagicToken: () => string;
export declare const saveMagicToken: (email: string, token: string) => Promise<void>;
export declare const verifyMagicToken: (token: string) => Promise<string | null>;
export declare const checkMagicLinkRateLimit: (email: string) => Promise<boolean>;
export declare const cleanupExpiredTokens: () => Promise<void>;
//# sourceMappingURL=magicLink.d.ts.map