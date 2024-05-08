import "@nomicfoundation/hardhat-toolbox";
import 'hardhat-contract-sizer';
import 'hardhat-docgen';
import 'hardhat-gas-reporter';
import 'hardhat-spdx-license-identifier';
import "hardhat-tracer";
import 'hardhat-watcher';
import { HardhatUserConfig, task } from "hardhat/config";
import 'solidity-coverage';
import "tsconfig-paths/register";
import { networkConfig } from "./config";
import { docgen } from "./config/docs";
import { etherscan } from "./config/etherscan";
import { gasReporter } from "./config/gas";
import { spdxLicenseIdentifier } from "./config/license";
import { tracerConfig } from "./config/tracer";
import { getVersion } from "./config/version";


const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  typechain: {
    outDir: 'typechain-types',
    target: 'ethers-v6',
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
    only: [], //':ERC20$'
  },
  paths: {
    artifacts: './artifacts',
    cache: './cache',
    sources: './contracts',
    tests: './test',
  },
  networks:networkConfig,
  gasReporter: gasReporter,
  tracer:tracerConfig,
  spdxLicenseIdentifier: spdxLicenseIdentifier,
  docgen: docgen,
  etherscan: etherscan
};

task("version", "Prints the latest repo version'", async () => {
  console.log(await getVersion());
});

export default config;