// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;
  /* solhint-disable */
import { Ownable, ERC20, ERC20Burnable, SafeERC20,IERC20 } from "../Base.sol";

contract MockUSDT is Ownable, ERC20, ERC20Burnable {
    using SafeERC20 for IERC20;
        constructor() ERC20("Mock USDT", "USDT") {
            _mint(msg.sender, 5000000 * 10 ** 6); 
        }

        function mint(address to, uint256 amount) public {
            _mint(to, amount);
        }

        function decimals() public view virtual override returns (uint8) {
            return 6;
        }
    }
  /* solhint-enable */
