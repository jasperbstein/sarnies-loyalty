interface EmailOptions {
    to: string;
    subject: string;
    text: string;
    html?: string;
}
export declare const sendEmail: (options: EmailOptions) => Promise<void>;
export declare const sendOTPEmail: (email: string, otp: string, companyName?: string) => Promise<void>;
export declare const sendMagicLinkEmail: (email: string, magicLink: string) => Promise<void>;
export {};
//# sourceMappingURL=email.d.ts.map