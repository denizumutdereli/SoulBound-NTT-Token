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

describe("SoulBounds Update Metadata Tests", function () {
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
    
    describe("Timely Metadata Updates for Multiple Traders", function () {
        let ownerAddress: string;
        let trader3Address: string;
        let trader4Address: string;
        let identity3: string;
        let identity4: string;
        let url3: string;
        let url4: string;
        let tweetsKey: string;
        let likesKey: string;
        let tweetsKeyBytes: any;
        let likesKeyBytes: any;
    
        before(async function () {
            ownerAddress = await getAccountAddress(owner);
            trader3Address = await getAccountAddress(trader3);
            trader4Address = await getAccountAddress(trader4);
            identity3 = uuidv4();
            identity4 = uuidv4();
            url3 = "https://deniz.io/sbt3";
            url4 = "https://deniz.io/sbt4";
            tweetsKey = "tweets";
            likesKey = "likes";
            tweetsKeyBytes = ethers.encodeBytes32String(tweetsKey);
            likesKeyBytes = ethers.encodeBytes32String(likesKey);
        });
    
        beforeEach(async function () {
            const identity3Bytes = ethers.toUtf8Bytes(identity3);
            const url3Bytes = ethers.toUtf8Bytes(url3);
            await sbt.mint(trader3Address, identity3Bytes, url3Bytes);
    
            const identity4Bytes = ethers.toUtf8Bytes(identity4);
            const url4Bytes = ethers.toUtf8Bytes(url4);
            await sbt.mint(trader4Address, identity4Bytes, url4Bytes);
    
            await sbt.allowMetadataKey(tweetsKeyBytes);
            await sbt.allowMetadataKey(likesKeyBytes);
        });
    
        afterEach(async function () {
            await sbt.burn(trader3Address);
            await sbt.burn(trader4Address);
        });
    
        it("should increment and validate tweets and likes for both traders over time", async function () {
            let tweetsCountTrader3 = 10;
            let tweetsCountTrader4 = 15;
            let likesCountTrader3 = 100;
            let likesCountTrader4 = 150;
    
            async function updateMetadataForTrader(traderAddress: string, tweetsCount: number, likesCount: number) {
                const tweetsCountBytes = ethers.toUtf8Bytes(tweetsCount.toString());
                const likesCountBytes = ethers.toUtf8Bytes(likesCount.toString());
                await sbt.setMetadata(traderAddress, tweetsKeyBytes, tweetsCountBytes);
                await sbt.setMetadata(traderAddress, likesKeyBytes, likesCountBytes);
            }
    
            await updateMetadataForTrader(trader3Address, tweetsCountTrader3, likesCountTrader3);
    
            await updateMetadataForTrader(trader4Address, tweetsCountTrader4, likesCountTrader4);
    
            await backToTheFuture(24 * 60 * 60)
    
            tweetsCountTrader3 += 5;
            likesCountTrader3 += 50;
            await updateMetadataForTrader(trader3Address, tweetsCountTrader3, likesCountTrader3);
    
            tweetsCountTrader4 += 7;
            likesCountTrader4 += 75;
            await updateMetadataForTrader(trader4Address, tweetsCountTrader4, likesCountTrader4);
    
            let tweetsRetrieved = await sbt.getMetadata(trader3Address, tweetsKeyBytes);
            let likesRetrieved = await sbt.getMetadata(trader3Address, likesKeyBytes);
            expect(ethers.toUtf8String(tweetsRetrieved)).to.equal(tweetsCountTrader3.toString());
            expect(ethers.toUtf8String(likesRetrieved)).to.equal(likesCountTrader3.toString());
    
            tweetsRetrieved = await sbt.getMetadata(trader4Address, tweetsKeyBytes);
            likesRetrieved = await sbt.getMetadata(trader4Address, likesKeyBytes);
            expect(ethers.toUtf8String(tweetsRetrieved)).to.equal(tweetsCountTrader4.toString());
            expect(ethers.toUtf8String(likesRetrieved)).to.equal(likesCountTrader4.toString());
        });

        it("should handle disallowed and redefined tags correctly", async function () {
            await sbt.allowMetadataKey(tweetsKeyBytes);
            await sbt.allowMetadataKey(likesKeyBytes);
        
            const initialTweetsTrader3 = 5;
            const initialLikesTrader3 = 20;
            const initialTweetsBytesTrader3 = ethers.toUtf8Bytes(initialTweetsTrader3.toString());
            const initialLikesBytesTrader3 = ethers.toUtf8Bytes(initialLikesTrader3.toString());
        
            await sbt.setMetadata(trader3Address, tweetsKeyBytes, initialTweetsBytesTrader3);
            await sbt.setMetadata(trader3Address, likesKeyBytes, initialLikesBytesTrader3);
        
            await sbt.disallowMetadataKey(tweetsKeyBytes);
        
            const newTweetsTrader3 = 10;
            const newTweetsBytesTrader3 = ethers.toUtf8Bytes(newTweetsTrader3.toString());
        
            await expect(sbt.setMetadata(trader3Address, tweetsKeyBytes, newTweetsBytesTrader3))
                .to.be.revertedWithCustomError(sbt, "MetadataKeyNotAllowed");
        
            const [soul, keys, values] = await sbt.getSoul(trader3Address, true);
        
            const keyExists = keys.some((key) => key === tweetsKeyBytes);
            expect(keyExists).to.be.false;
        
            const likesIndex = keys.indexOf(likesKeyBytes);
            expect(likesIndex).to.be.above(-1);
            expect(ethers.toUtf8String(values[likesIndex])).to.equal(initialLikesTrader3.toString());
        });
        
    });
});
