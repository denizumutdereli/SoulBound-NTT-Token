import { backToTheFuture } from "@/scripts/time";
import { setUnits } from "@/scripts/units";
import {
    MockEth, MockUSDT,
    SoulBounds
} from "@/typechain-types";
import "@nomicfoundation/hardhat-toolbox";
import { prepareArtifactsForTesting, TArtifacts } from "@scripts/artifacts";
import { distributeTokens, getAccountAddress, getContractAddress } from "@scripts/misc";
import { expect } from "chai";
import { Signer } from "ethers";
import { ethers } from "hardhat";
import { v4 as uuidv4 } from "uuid";

describe("SouldBounds General Tests", function () {
    let sbt: SoulBounds;

    /* mocks */
    let mockUSDT: MockUSDT;
    let mockETH: MockEth;

    let sbtAddress:string;
    let usdtAddress:string;
    let mockEthAddress:string;
    let mock721Address:string;

    let owner: Signer, trader1: Signer, trader2: Signer, trader3: Signer, trader4: Signer, trader5: Signer;

    // prepare
    const [initialBalanceForTraders, initialSupplyUSDT] = setUnits(
        ["10000"],
        ["10000", 6]
    );

    /* helper functions -------------------------------------------------------------------------- */

    /* ------------------------------------------------------------------------------------------- */

    before(async () => {
        [owner, trader1, trader2, trader3, trader4, trader5] = await ethers.getSigners();
        
        const artifacts:TArtifacts = await prepareArtifactsForTesting();
        
        // signers
        owner = artifacts.owner;
        trader1 = artifacts.trader1;
        trader2 = artifacts.trader2;
        trader3 = artifacts.trader3;
        trader4 = artifacts.trader4;
        trader5 = artifacts.trader5;

        // contracts

        const SBT = await ethers.getContractFactory("SoulBounds");
        sbt = await SBT.deploy(getContractAddress(mockETH)) as SoulBounds;
        await sbt.waitForDeployment();
        sbtAddress = await sbt.getAddress();

        const MockERC721 = await ethers.getContractFactory("MockERC721");
        mockERC721 = await MockERC721.deploy("Mock NFT", "mNFT");
        await mockERC721.waitForDeployment();

        // mocks
        mockUSDT = artifacts.mockUSDT;
        mockETH = artifacts.mockETH;

        usdtAddress = await getContractAddress(mockUSDT);
        mockEthAddress = await getContractAddress(mockETH);

        // -------------------------------------------------------------------- -

        // Distribute initial Tokens to the traders
        const traders = [owner, trader1, trader2, trader3];
        const tokenAmounts = [
            { token: mockETH, amount: initialBalanceForTraders },
            { token: mockUSDT, amount: initialSupplyUSDT }
        ];

        await distributeTokens(traders, tokenAmounts);
    });


    describe("SBT Management", function () {
        let ownerAddress: string;
        let trader1Address: string;
        let identity: string;
        let url: string;
        let metadataKey: string;
        let metadataValue: string;
        let metadataKeyBytes: any;
    
        before(async function () {
            ownerAddress = await getAccountAddress(owner);
            trader1Address = await getAccountAddress(trader1);
            identity = uuidv4();
            url = "https://deniz.io/sbt";
            metadataKey = "additionalInfo";
            metadataValue = "metadata_value";
            metadataKeyBytes = ethers.encodeBytes32String(metadataKey);
        });

        it("should mint a new soul with unique identity", async function () {
            const identityBytes = ethers.toUtf8Bytes(identity);
            const urlBytes = ethers.toUtf8Bytes(url);
        
            await expect(sbt.mint(trader1Address, identityBytes, urlBytes))
                .to.emit(sbt, "Mint")
                .withArgs(trader1Address);
        
            const [soul, , ] = await sbt.getSoul(trader1Address, false);
        
            expect(soul.identity).to.equal(identity);
            expect(soul.url).to.equal(url);
        });
        
    
        it("should prevent minting a soul with an existing identity", async function () {
            const identityBytes = ethers.toUtf8Bytes(identity);
            const urlBytes = ethers.toUtf8Bytes(url);
    
            await expect(sbt.mint(trader1Address, identityBytes, urlBytes))
                .to.be.revertedWithCustomError(sbt, "IdentityIsNotUnique");
        });
    
        it("should allow metadata key and update the soul's metadata", async function () {
            const metadataValueBytes = ethers.toUtf8Bytes(metadataValue);

            await sbt.allowMetadataKey(metadataKeyBytes);
        
            await sbt.setMetadata(trader1Address, metadataKeyBytes, metadataValueBytes);
        
            const metadataRetrieved = await sbt.getMetadata(trader1Address, metadataKeyBytes);
        
            const metadataValueDecoded = ethers.toUtf8String(metadataRetrieved);
            expect(metadataValueDecoded).to.equal(metadataValue);

        });
    
        it("should burn the existing soul and clear its identity", async function () {
            await sbt.burn(trader1Address);
    
            await expect(sbt.getSoul(trader1Address, false))
                .to.be.revertedWithCustomError(sbt, "SoulDoesNotExist");
    
            const identityBytes = ethers.toUtf8Bytes(identity);
            const urlBytes = ethers.toUtf8Bytes(url);
            await sbt.mint(trader1Address, identityBytes, urlBytes);
    
            const [soul] = await sbt.getSoul(trader1Address, false);
            expect(soul.identity).to.equal(identity);
        });
    });    
});
