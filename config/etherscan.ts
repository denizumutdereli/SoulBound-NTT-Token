import { envSchema } from './env';

export const etherscan =  {
    apiKey: {
      polygonMumbai: envSchema.POLYGONSCAN_API_KEY,
      mainnet: envSchema.ETHERSCAN_API_KEY,
    },
  }