import 'dotenv/config';

interface EnvSchema {
    PRIVATE_KEY: string;
    INFURA_PROJECT_ID: string;
    REPORT_GAS: boolean;
    TRACER: boolean;
    TRACER_SHOW_ADDRESSES:boolean;
    GAS_CURRENCY: string;
    ETHERSCAN_API_KEY:string;
    POLYGONSCAN_API_KEY:string;
    COIN_MARKETCAP_API_KEY:string;
}

function getRequiredEnvString(key: string): string {
    const value = process.env[key];
    if (value === undefined) {
        throw new Error(`ERROR: Missing required env variable "${key}"`);
    }
    return value;
}

function getRequiredEnvBoolean(key: string): boolean {
    const value = process.env[key];
    if (value === undefined) {
        throw new Error(`ERROR: Missing required env variable "${key}"`);
    }
    return value.toLowerCase() === 'true';
}

const envSchema: EnvSchema = {
    PRIVATE_KEY: getRequiredEnvString('PRIVATE_KEY'),
    INFURA_PROJECT_ID: getRequiredEnvString('INFURA_PROJECT_ID'),
    REPORT_GAS: getRequiredEnvBoolean('REPORT_GAS'),
    TRACER: getRequiredEnvBoolean('TRACER'),
    TRACER_SHOW_ADDRESSES: getRequiredEnvBoolean('TRACER_SHOW_ADDRESSES'),
    GAS_CURRENCY: getRequiredEnvString('GAS_CURRENCY'),
    ETHERSCAN_API_KEY: getRequiredEnvString('ETHERSCAN_API_KEY'),
    POLYGONSCAN_API_KEY: getRequiredEnvString('POLYGONSCAN_API_KEY'),
    COIN_MARKETCAP_API_KEY: getRequiredEnvString('COIN_MARKETCAP_API_KEY'),
};

export { envSchema };

