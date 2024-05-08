import { ethers } from "hardhat";

export const backToTheFuture = async (letsGoFurther:number) => {
    await ethers.provider.send("evm_increaseTime", [letsGoFurther]); 
    await ethers.provider.send("evm_mine"); 
}; 

export const currentTime = async() => {
    const block = await ethers.provider.getBlock('latest');
    return block.timestamp;
}