import { envSchema } from './env';

import { EthGasReporterConfig } from "hardhat-gas-reporter/dist/src/types";

export const gasReporter:Partial<EthGasReporterConfig> = {
    enabled: envSchema.REPORT_GAS ? true : false,
    currency: `${envSchema.GAS_CURRENCY || "USD"}`,
    token: "ETH",
    coinmarketcap:envSchema.COIN_MARKETCAP_API_KEY || "",
    rst: true,
    rstTitle: true,
    excludeContracts:[],
    gasPrice: 25,
    showTimeSpent: true,
    showMethodSig: true
}