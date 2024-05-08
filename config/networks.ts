import { NetworksUserConfig } from 'hardhat/types/config';
import { envSchema } from './env';

export const networkConfig: NetworksUserConfig  = {
    ropsten: {
        url: `https://ropsten.infura.io/v3/${envSchema.INFURA_PROJECT_ID}`,
        accounts: envSchema.PRIVATE_KEY ? [envSchema.PRIVATE_KEY] : [],
    },
    goerli: {
        url: `https://goerli.infura.io/v3/${envSchema.INFURA_PROJECT_ID}`,
        accounts: envSchema.PRIVATE_KEY ? [envSchema.PRIVATE_KEY] : [],
    },
    sepolia: {
        url: `https://sepolia.infura.io/v3/${envSchema.INFURA_PROJECT_ID}`,
        accounts: envSchema.PRIVATE_KEY ? [envSchema.PRIVATE_KEY] : [],
    },
    mainnet: {
        url: `https://mainnet.infura.io/v3/${envSchema.INFURA_PROJECT_ID}`,
        accounts: envSchema.PRIVATE_KEY ? [envSchema.PRIVATE_KEY] : [],
    },
    mumbai: {
        url: `https://polygon-mumbai.infura.io/v3/${envSchema.INFURA_PROJECT_ID}`,
        accounts: envSchema.PRIVATE_KEY ? [envSchema.PRIVATE_KEY] : [],
    },
    polygon: {
        url: `https://polygon-mainnet.infura.io/v3/${envSchema.INFURA_PROJECT_ID}`,
        accounts: envSchema.PRIVATE_KEY ? [envSchema.PRIVATE_KEY] : [],
    }
};
