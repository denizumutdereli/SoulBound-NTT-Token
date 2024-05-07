// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/* solhint-disable no-unused-import */

// OZ
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {SafeERC20,IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {Context} from "@openzeppelin/contracts/utils/Context.sol";


library Address {
    function isContract(address _address) internal view returns(bool){
        return _address.code.length > 0 && _address != address(0);
    }

    function isZeroAddress(address _address) internal pure returns(bool){
        return _address == address(0);
    }
}

library IValidation {
    function validateERC20Token(address tokenAddress) internal view returns (bool) {
        bytes4 decimalsSig = bytes4(keccak256("decimals()"));

        (bool success, bytes memory data) = tokenAddress.staticcall(abi.encodeWithSelector(decimalsSig));

        return success && data.length == 32;
    }
}

library Math {
    error ZeroDivision();
    function min(uint256 a, uint256 b) internal pure returns(uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns(uint256) {
        return a > b ? a : b;
    }

    function floor(uint256 numerator, uint256 denominator) internal pure returns (uint256) {
        if(denominator==0) revert ZeroDivision();
        uint256 result = numerator / denominator; 
        return result;
    }
}
