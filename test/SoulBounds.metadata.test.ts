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

describe("SouldBounds Metadata Tests", function () {
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
    
    describe("Administrative Metadata Management", function () {
        let ownerAddress: string;
        let trader2Address: string;
        let identity: string;
        let url: string;
        let metadataKey1: string;
        let metadataKey2: string;
        let metadataValue1: string;
        let metadataValue2: string;
        let metadataKey1Bytes: any;
        let metadataKey2Bytes: any;
    
        before(async function () {
            ownerAddress = await getAccountAddress(owner);
            trader2Address = await getAccountAddress(trader2);
            identity = uuidv4();
            url = "https://deniz.io/sbt";
            metadataKey1 = "additionalInfo";
            metadataKey2 = "userScore";
            metadataValue1 = "metadata_value";
            metadataValue2 = "1500";
            metadataKey1Bytes = ethers.encodeBytes32String(metadataKey1);
            metadataKey2Bytes = ethers.encodeBytes32String(metadataKey2);
        });
    
        beforeEach(async function () {
            // Mint a new soul for each test case
            const identityBytes = ethers.toUtf8Bytes(identity);
            const urlBytes = ethers.toUtf8Bytes(url);
            await sbt.mint(trader2Address, identityBytes, urlBytes);
        });
    
        afterEach(async function () {
            await sbt.burn(trader2Address);
        });
    
        it("should allow and disallow metadata keys", async function () {
            await sbt.allowMetadataKey(metadataKey1Bytes);
            await sbt.allowMetadataKey(metadataKey2Bytes);
    
            await sbt.disallowMetadataKey(metadataKey1Bytes);
    
            const metadataValue1Bytes = ethers.toUtf8Bytes(metadataValue1);
            await expect(sbt.setMetadata(trader2Address, metadataKey1Bytes, metadataValue1Bytes))
                .to.be.revertedWithCustomError(sbt, "MetadataKeyNotAllowed");
    
            const metadataValue2Bytes = ethers.toUtf8Bytes(metadataValue2);
            await sbt.setMetadata(trader2Address, metadataKey2Bytes, metadataValue2Bytes);
    
            const metadataRetrieved = await sbt.getMetadata(trader2Address, metadataKey2Bytes);
            const metadataValueDecoded = ethers.toUtf8String(metadataRetrieved);
            expect(metadataValueDecoded).to.equal(metadataValue2);
        });
    
        it("should delete existing metadata correctly", async function () {
            await sbt.allowMetadataKey(metadataKey1Bytes);
            const metadataValue1Bytes = ethers.toUtf8Bytes(metadataValue1);
            await sbt.setMetadata(trader2Address, metadataKey1Bytes, metadataValue1Bytes);
    
            await sbt.deleteMetadata(trader2Address, metadataKey1Bytes);
    
            await expect(sbt.getMetadata(trader2Address, metadataKey1Bytes))
                .to.be.revertedWithCustomError(sbt, "MetaKeyNotFound");
        });
    
        it("should return all metadata when _includeMetadata is true", async function () {
            await sbt.allowMetadataKey(metadataKey1Bytes);
            await sbt.allowMetadataKey(metadataKey2Bytes);
    
            const metadataValue1Bytes = ethers.toUtf8Bytes(metadataValue1);
            const metadataValue2Bytes = ethers.toUtf8Bytes(metadataValue2);
    
            await sbt.setMetadata(trader2Address, metadataKey1Bytes, metadataValue1Bytes);
            await sbt.setMetadata(trader2Address, metadataKey2Bytes, metadataValue2Bytes);
    
            const [soul, keys, values] = await sbt.getSoul(trader2Address, true);
    
            expect(soul.identity).to.equal(identity);
            expect(soul.url).to.equal(url);
    
            expect(keys.length).to.equal(2);
            expect(values.length).to.equal(2);
            expect(ethers.toUtf8String(values[0])).to.equal(metadataValue1);
            expect(ethers.toUtf8String(values[1])).to.equal(metadataValue2);
        });
        
    });   
});
