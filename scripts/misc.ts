import { IERC20 } from "@/typechain-types";
import { BigNumberish, Contract, Signer } from "ethers";
type Trader = {
    getAddress: () => Promise<string>;
};

type TokenContract = {
    transfer: (recipient: string, amount: BigNumberish) => Promise<any>;
}

export const getContractAddress = async (_contract:any):Promise<string> => {
    return await _contract.getAddress();
}

export const getAccountAddress = async (_account:Signer):Promise<string> => {
    return await _account.getAddress();
}

export const getBalanceOf = async (_contract:IERC20, _user:Signer):Promise<bigint> => {
    return await _contract.balanceOf(getAccountAddress(_user));
}

export const distributeTokens = async (
    traders: Trader[],
    tokenAmounts: { token: TokenContract; amount:BigNumberish }[]
) => {
    for (let trader of traders) {
        const address = await trader.getAddress();

        for (let { token, amount } of tokenAmounts) {
            await token.transfer(address, amount);
        }
    }
};

export const transferToContract = async(sourceContract:IERC20, targetContract:IERC20, amount:BigNumberish):Promise<void> => {
    try {
        await sourceContract.transfer(getContractAddress(targetContract), amount);
    } catch (err) {
        console.log(err);
    }
}

export const transferToUser = async(sourceContract:IERC20, account:Signer, amount:BigNumberish):Promise<void> => {
    try {
        await sourceContract.transfer(getAccountAddress(account), amount);
    } catch (err) {
        console.log(err);
    }
}

export const fuzzTransferSimulation = async (
    tokenContract: IERC20,
    owner: Signer,
    signers: Signer[],
    initialAmount: number,
    maxTransferAmount: number,
    transferTimes: number
) => {
    try {
        if(transferTimes > 5000) throw Error("Maximum transfer times reached. We may wait too long.");
        const tokenAmounts = [
            { token: tokenContract, amount: initialAmount }
        ];

        await distributeTokens(signers, tokenAmounts);

        const distributionPromises = signers.map(async (signer) => {
            const signerAddress = await signer.getAddress();
            return tokenContract.connect(owner).transfer(signerAddress, initialAmount);
        });

        await Promise.all(distributionPromises);
    
        for (let i = 0; i < transferTimes; i++) {
            let senderIndex: number, receiverIndex: number;
            do {
                senderIndex = Math.floor(Math.random() * signers.length);
                receiverIndex = Math.floor(Math.random() * signers.length);
            } while (senderIndex === receiverIndex);
    
            const sender = signers[senderIndex];
            const receiver = signers[receiverIndex];
    
            const transferAmount = Math.floor(Math.random() * (maxTransferAmount - 1)) + 1;
            const receiverAddress = await receiver.getAddress();

            await tokenContract.connect(sender).transfer(receiverAddress, transferAmount.toString());
        }
    
        return true;
    } catch (err) {
        console.error(err);
        return false;
    }
};


export const factorial = (n: number): number => n ? n * factorial(n - 1) : 1;

export const clear =  ()=> {
    process.stdout.write('\x1Bc');
}

export const hrl =  ()=> {
    console.log("----------------------------------------------------------------");
}

