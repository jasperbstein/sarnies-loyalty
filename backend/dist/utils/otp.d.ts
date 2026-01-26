export declare const generateOTP: () => string;
export declare const saveOTP: (phone: string, otp: string) => Promise<void>;
export declare const verifyOTP: (phone: string, otp: string) => Promise<boolean>;
export declare const sendOTP: (phone: string, otp: string) => Promise<void>;
//# sourceMappingURL=otp.d.ts.map