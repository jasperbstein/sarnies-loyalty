import { Pool, PoolClient } from 'pg';
declare const pool: Pool;
export declare const query: (text: string, params?: any[]) => Promise<import("pg").QueryResult<any>>;
export declare const getClient: () => Promise<PoolClient>;
export declare const transaction: <T>(callback: (client: PoolClient) => Promise<T>) => Promise<T>;
export default pool;
//# sourceMappingURL=database.d.ts.map