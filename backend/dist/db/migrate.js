"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = __importDefault(require("./database"));
async function migrate() {
    console.log('Running database migrations...');
    try {
        const schemaSQL = fs_1.default.readFileSync(path_1.default.join(__dirname, 'schema.sql'), 'utf-8');
        await database_1.default.query(schemaSQL);
        console.log('✅ Database schema created successfully');
        await database_1.default.end();
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Migration failed:', error);
        await database_1.default.end();
        process.exit(1);
    }
}
migrate();
//# sourceMappingURL=migrate.js.map