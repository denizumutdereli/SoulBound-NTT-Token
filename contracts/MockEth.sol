// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
  /* solhint-disable */
import { Ownable, ERC20, ERC20Burnable, SafeERC20, IERC20 } from "../Base.sol";

contract MockEth is Ownable, ERC20, ERC20Burnable {
    using SafeERC20 for IERC20;
    constructor() ERC20("Eth Token", "ETH") {
        _mint(msg.sender, 800000000 * 10 ** decimals()); 
    }

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }

}
  /* solhint-enable */
