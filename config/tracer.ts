import { TracerEnvUser } from 'hardhat-tracer';
import { envSchema } from './env';

export const tracerConfig:TracerEnvUser = {
    enabled: envSchema.TRACER ? true : false,
    defaultVerbosity: 0,
    showAddresses:  envSchema.TRACER_SHOW_ADDRESSES ? true : false,
    gasCost:true,
    tasks: ["deploy"]
}