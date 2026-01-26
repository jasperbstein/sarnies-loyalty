"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const runMigration = async (migrationFile) => {
    try {
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        const sql = fs.readFileSync(migrationPath, 'utf8');
        console.log(`Running migration: ${migrationFile}`);
        await (0, database_1.query)(sql);
        console.log(`✅ Migration ${migrationFile} completed successfully`);
    }
    catch (error) {
        console.error(`❌ Migration ${migrationFile} failed:`, error);
        process.exit(1);
    }
    finally {
        process.exit(0);
    }
};
const migrationFile = process.argv[2];
if (!migrationFile) {
    console.error('Usage: ts-node run-migration.ts <migration-file.sql>');
    process.exit(1);
}
runMigration(migrationFile);
//# sourceMappingURL=run-migration.js.map