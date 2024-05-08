import {
    MockEth, MockUSDT
} from "@/typechain-types";
import "@nomicfoundation/hardhat-toolbox";
import { Signer } from "ethers";
import { ethers } from "hardhat";

export type TArtifacts = {
    owner: Signer,
    trader1: Signer,
    trader2: Signer,
    trader3: Signer,
    trader4: Signer,
    trader5: Signer,
    mockUSDT: MockUSDT,
    mockETH: MockEth,
}

export const prepareArtifactsForTesting = async():Promise<TArtifacts> => {

    /* mocks */
    let mockUSDT: MockUSDT;
    let mockETH: MockEth;
    let usdtAddress:string;
    let mockEthAddress:string;

    let owner: Signer, trader1: Signer, trader2: Signer, trader3: Signer, trader4: Signer, trader5: Signer;

    // prepare
    const initialBalanceForTraders = ethers.parseUnits("50", 18);  
    const initialSupplyUSDT = ethers.parseUnits("10000", 6); // 10,000 MockUSDT for each trader

    [owner, trader1, trader2, trader3, trader4, trader5] = await ethers.getSigners();
        

    /* Mocks */
    const MockUSDT = await ethers.getContractFactory("MockUSDT");
    mockUSDT = await MockUSDT.deploy();
    await mockUSDT.waitForDeployment();
    usdtAddress = await mockUSDT.getAddress();

    const MockEth = await ethers.getContractFactory("MockEth");
    mockETH = await MockEth.deploy();
    await mockETH.waitForDeployment();
    mockEthAddress = await mockETH.getAddress();

    // ------------------------------------------------------------------------

    return {
        owner,
        trader1,
        trader2,
        trader3,
        trader4,
        trader5,
        mockUSDT,
        mockETH
    };
    
};