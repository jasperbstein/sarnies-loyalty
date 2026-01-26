/**
 * Remove HTML tags and potentially dangerous characters from user input
 */
export declare function sanitizeHtml(input: string | null | undefined): string | null;
/**
 * Sanitize string input - removes HTML and dangerous characters
 */
export declare function sanitizeString(input: string | null | undefined): string | null;
/**
 * Sanitize object by recursively sanitizing all string values
 */
export declare function sanitizeObject(obj: any): any;
/**
 * Sanitize request body, skipping sensitive fields
 */
export declare function sanitizeRequestBody(body: any): any;
//# sourceMappingURL=sanitize.d.ts.map