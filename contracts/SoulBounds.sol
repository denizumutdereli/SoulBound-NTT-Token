// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
    working on...
*/

// imports
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeERC20, IERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Pausable } from "@openzeppelin/contracts/security/Pausable.sol";
import { ERC721Enumerable } from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import { ERC721, IERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { ERC721Holder } from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import { IERC2981, ERC2981 } from "@openzeppelin/contracts/token/common/ERC2981.sol";
import { Strings } from "@openzeppelin/contracts/utils/Strings.sol";
import { Address } from "./libs/Address.sol";
import { IValidation } from "./libs/IValidation.sol";

/**
 * @title SoulBounds
 * @notice This contract allows minting, burning, and updating non-transferable (NTT) 
 * soul-bound tokens (SBTs) with unique identities.
 * @dev This contract is based on Ownable and Pausable modifiers and utilizes SafeERC20 and Address libraries.
 * It ensures the uniqueness of each soul by validating identities and URLs.
 * Provides functionalities for managing metadata associated with each soul.
 * The contract supports secure withdrawal of tokens and validates contract interactions.
 * Soul-bound tokens are not tradable and represent unique, non-transferable identities.
 * @dev This contract has the ability to schedule trading On/Off tokens with Royalties.
 */
contract SoulBounds is Ownable, Pausable, ERC721, ERC721Enumerable, ERC721Holder, ERC2981 {
    using SafeERC20 for IERC20;
    using Address for address;
    using Strings for uint256;

    uint256 public constant ZERO = 0;
    uint256 private _mintingPrice;
    address private _paymentToken;
    address private _royaltyReceiver;
    string private _baseUrl;
    bool private _tradeOnOff;
    
    /**
     * @dev Represents an individual's soul, consisting of their identity and metadata.
     */
    struct Soul {
        uint256 mintedAt;
        uint256 lastUpdate;
        bytes16 uuid;
        uint256 tokenId;
    }

    uint256 private constant _THOUSAND = 1_000;
    uint256 private constant _MAX_RETRIES = 2;
    uint256 private _soulTicker;
    bytes32 private _baseHash;

    mapping(address => Soul) private _souls;
    mapping(bytes16 => bool) private _uuidTicker;
    mapping(bytes32 => bool) private _allowedKeys;
    mapping(bytes32 => bool) private _immutableMetaDataKeys;
    mapping(address => mapping(bytes32 => bytes)) private _soulMetadata;
    mapping(address => bytes32[]) private _metadataKeys;

    /**
     * @dev Emitted when a new soul is minted.
     * @param _soul Address associated with the newly minted soul.
     */
    event Mint(address indexed _soul);

    /**
     * @dev Emitted when an existing soul is burned.
     * @param _soul Address associated with the burned soul.
     */
    event Burn(address indexed _soul);

    /**
     * @dev Emitted when a soul's data is updated.
     * @param _soul Address of the updated soul.
     */
    event Update(address indexed _soul);

    /**
     * @dev Emitted when tokens are withdrawn.
     * @param _owner Address initiating the withdrawal.
     * @param _destination Address receiving the withdrawn tokens.
     * @param _amount Amount of tokens withdrawn.
     */
    event Withdrawal(address indexed _owner, address indexed _destination, uint256 indexed _amount);
    event NativeTokenReceived(address indexed _sender, uint256 indexed _amount);
    event PaymentTokenUpdated(address indexed _paymentToken);
    event MintingPriceUpdated(uint256 indexed _mintingPrice);
    event TradePeriodUpdated(bool indexed _tradeOnOff);

    // Errors
    error IncorrectFundsSent();
    error MetadataKeyNotAllowed();
    error MetaKeyNotFound();
    error SoulAlreadyExist();
    error IdentityIsNotUnique();
    error EmptyUrl();
    error UnauthorizedBurning();
    error SoulDoesNotExist();
    error MaxRetriesReached();
    error InvalidAddressInteraction();
    error InvalidContractInteraction();
    error TokenAmountIsZero();
    error NotPermitted();
    error MintingDisabled();
    error TokenNotExist();
    error TheMetaDataKeyIsImmutable(string reason);
    error InvalidTradePeriod();

    // Modifiers

    /**
     * @dev Ensures that the caller is either the owner or the specified soul address.
     * @param _soul Address of the soul being validated.
     */
    modifier onlyOwnerOrUser(address _soul) {
        if (msg.sender != _soul && msg.sender != owner()) revert UnauthorizedBurning();
        _;
    }

    /**
     * @dev Validates that the provided address is a smart contract.
     * @param _address Address to validate.
     */
    modifier validContract(address _address) {
        if (!_address.isContract()) {
            revert InvalidContractInteraction();
        }
        _;
    }

    /**
     * @dev Validates that the provided address is not the zero address.
     * @param _address Address to validate.
     */
    modifier validAddress(address _address) {
        if (_address == address(0)) {
            revert InvalidAddressInteraction();
        }
        _;
    }

    /* setup -------------------------------------------------------------------------------------- */

    /**
     * @dev Sets up the base asset and computes the initial base hash.
     * @param tokenAddress Address of the base asset token.
     */
    constructor(
        address tokenAddress, 
        string memory url,
        string memory tokenName,
        string memory symbol,
        address royaltyReceiver,
        uint96 royaltyFeeNumerator
    ) ERC721(tokenName, symbol) {
        if (
            !IValidation.validateERC20Token(tokenAddress) 
            && tokenAddress != address(0)) revert InvalidContractInteraction();
        _paymentToken = tokenAddress;
        _baseHash = keccak256(abi.encodePacked(tokenAddress));
        _mintingPrice = 0.01 ether; // Default price in case of native token payment
        _baseUrl = url;
        _tradeOnOff = false;
        _royaltyReceiver = royaltyReceiver;
        _pause(); // Start paused
        _setDefaultRoyalty(royaltyReceiver, royaltyFeeNumerator);
    }

    receive() external payable {
        emit NativeTokenReceived(msg.sender, msg.value);
    }

    fallback() external payable {
        revert NotPermitted();
    }

    /* mechanics -----------------------------------------------------------------------------------*/

    /**
     * @notice Mints a new soul.
     * @dev Supports both ETH and ERC20 payments.
     */
    function mint() external payable whenNotPaused {
        address soulAddress = msg.sender;

        if (_paymentToken == address(0)) {
            if (msg.value != _mintingPrice) revert IncorrectFundsSent();
        } else {
            if (msg.value > ZERO) {
                revert IncorrectFundsSent();
            }
            IERC20(_paymentToken).safeTransferFrom(soulAddress, address(this), _mintingPrice);
        }

        _sanitizeAndValidate(soulAddress);

        uint256 tokenId = totalSupply() + 1;

        // Register the new soul
        Soul memory newSoul = Soul({
            mintedAt: block.timestamp,
            lastUpdate: block.timestamp,
            uuid: _generateUUID(soulAddress, 1),
            tokenId: tokenId
        });

        _souls[soulAddress] = newSoul;
        _uuidTicker[newSoul.uuid] = true;
        _soulTicker += 1;

        _safeMint(soulAddress, tokenId);

        emit Mint(soulAddress);
    }

    /**
    * @notice Burns an existing soul and clears all associated metadata.
    * @param soulAddress Address of the soul to be burned.
    */
    function burn(address soulAddress)
        external
        validAddress(soulAddress)
        onlyOwnerOrUser(soulAddress)
        whenNotPaused
    {
        Soul memory soulToBurn = _getValidSoul(soulAddress);

        bytes16 uuidToClear = soulToBurn.uuid;
        _uuidTicker[uuidToClear] = false;

        _clearAllMetadataInternal(soulAddress);

        delete _souls[soulAddress];

        _burn(soulToBurn.tokenId);

        emit Burn(soulAddress);
    }

    /* getters ------------------------------------------------------------------------------------ */

    /**
    * @notice Returns the data of a specified soul with optional metadata.
    * @param soulAddress Address of the soul.
    * @param includeMetadata If true, includes all metadata in the returned data.
    * @return soulData Memory struct representing the soul, including optional metadata.
    * @return keys Array of metadata keys.
    * @return values Array of metadata values.
    */
    function getSoul(address soulAddress, bool includeMetadata) 
    external view returns (Soul memory soulData, bytes32[] memory keys, bytes[] memory values) 
    {
        soulData = _getValidSoul(soulAddress);

        if (includeMetadata) {
            (keys, values) = _getMetadata(soulAddress);
        }

        return (soulData, keys, values);
    }

    function _getMetadata(address soulAddress) internal view returns (bytes32[] memory keys, bytes[] memory values) {
        uint256 metadataCount = _metadataKeys[soulAddress].length;
        bytes32[] memory tempKeys = new bytes32[](metadataCount);
        bytes[] memory tempValues = new bytes[](metadataCount);
    
        uint256 index = 0;
        for (uint256 i = 0; i < metadataCount; i++) {
            bytes32 key = _metadataKeys[soulAddress][i];
            if (_allowedKeys[key]) {
                tempKeys[index] = key;
                tempValues[index] = _soulMetadata[soulAddress][key];
                index++;
            }
        }
    
        bytes32[] memory filteredKeys = new bytes32[](index);
        bytes[] memory filteredValues = new bytes[](index);
    
        for (uint256 i = 0; i < index; i++) {
            filteredKeys[i] = tempKeys[index - 1 - i];
            filteredValues[i] = tempValues[index - 1 - i];
        }
    
        return (filteredKeys, filteredValues);
    }

    /**
    * @notice Returns metadata for a given soul address and key.
    * @param soulAddress Address of the soul.
    * @param key Metadata key.
    * @return value Metadata value.
    */
    function getMetadata(address soulAddress, bytes32 key) external view validAddress(soulAddress)
    returns (bytes memory value)
    {
        if (!_allowedKeys[key]) {
            revert MetadataKeyNotAllowed();
        }

        _getValidSoul(soulAddress);

        value = _soulMetadata[soulAddress][key];
    }


    /**
     * @notice Returns the address of the payment token.
     * @return address Address of the payment token.
     */
    function getPaymentToken() external view returns (address) {
        return _paymentToken;
    }

    function getTradeOnOff() external view returns (bool) {
        return _tradeOnOff;
    }

    /**
     * @notice Returns the minting price for the soul-bound tokens.
     * @dev Supports payment in native token or ERC20 token.
     * @return uint256 Current minting price.
     */
    function getMintingPrice() external view returns (uint256) {
        return _mintingPrice;
    }

    /**
     * @dev Returns the number of tokens minted so far.
     * @return uint256 The current token counter.
     */
    function soulTicker() external view returns (uint256) {
        return _soulTicker;
    }

    /**
     * @dev Returns the base URI for all tokens.
     * @return string Memory representing the base URI.
     */
    function _baseURI() internal view override returns (string memory) {
        return _baseUrl;
    }

    /**
     * @dev Returns the URI for a given token ID.
     * @param tokenId The token ID for which to return the URI.
     * @return string Memory representing the token URI.
     */
    function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
        if (!_exists(tokenId)) revert TokenNotExist();
        string memory baseURI = _baseURI();
        return bytes(baseURI).length > 0 ? string(abi.encodePacked(baseURI, tokenId.toString())) : "";
    }

    /**
     * @notice Checks if the soul for a given address exists.
     * @param soulAddress Address to check.
     * @return exists True if the soul exists, false otherwise.
     */
    function soulExists(address soulAddress) external view returns (bool) {
        return _souls[soulAddress].tokenId != 0;
    }

    /**
    * @notice Returns royalty information for a token.
    * @param tokenId Token ID to query.
    * @param salePrice Sale price of the token.
    * @return receiver Address receiving the royalty.
    * @return royaltyAmount Amount of royalty to be paid.
    */
    function royaltyInfo(uint256 tokenId, uint256 salePrice) public view override
    returns (address receiver, uint256 royaltyAmount)
    {
        return super.royaltyInfo(tokenId, salePrice);
    }

    /* setters ------------------------------------------------------------------------------------- */

    /**
     * @notice Sets or updates metadata for a given soul address.
     * @param soulAddress Address of the soul to update.
     * @param key Metadata key.
     * @param value Metadata value.
     */
    function setMetadata(address soulAddress, bytes32 key, bytes calldata value)
        external
        validAddress(soulAddress)
        onlyOwner
        whenNotPaused
    {
        if (!_allowedKeys[key]) {
            revert MetadataKeyNotAllowed();
        }
        
        _getValidSoul(soulAddress);

        bytes32[] storage keys = _metadataKeys[soulAddress];
        bool keyExists = false;

        for (uint256 i = 0; i < keys.length; i++) {
            if (keys[i] == key) {
                keyExists = true;
                continue;
            }
        }

        if (!keyExists) {
            _metadataKeys[soulAddress].push(key);
        }

        _soulMetadata[soulAddress][key] = value;
        _souls[soulAddress].lastUpdate = block.timestamp;

        emit Update(soulAddress);
    }

    /**
     * @notice Deletes a specific metadata key for a given soul address.
     * @param soulAddress Address of the soul.
     * @param key Metadata key to delete.
     */
    function deleteMetadata(address soulAddress, bytes32 key)
        external
        validAddress(soulAddress)
        onlyOwner
        whenNotPaused
    {
        if (!_allowedKeys[key]) {
            revert MetadataKeyNotAllowed();
        }

        _getValidSoul(soulAddress);

        if (_immutableMetaDataKeys[key]) revert TheMetaDataKeyIsImmutable("Use forceMetakeySwitch()");

        delete _soulMetadata[soulAddress][key];
        _souls[soulAddress].lastUpdate = block.timestamp;

        for (uint256 i = 0; i < _metadataKeys[soulAddress].length; i++) {
            if (_metadataKeys[soulAddress][i] == key) {
                _metadataKeys[soulAddress][i] = _metadataKeys[soulAddress][_metadataKeys[soulAddress].length - 1];
                _metadataKeys[soulAddress].pop();
                break;
            }
        }

        emit Update(soulAddress);
    }

    /**
    * @dev Clears all metadata for a given soul address.
    * @param _soul Address of the soul.
    */
    function clearAllMetadata(address _soul) external onlyOwner whenNotPaused {
        _clearAllMetadataInternal(_soul);
    }

    /**
     * @dev Adds a new metadata key to the whitelist.
     * @param _key The key to be added to the whitelist.
     */
    function allowMetadataKey(bytes32 _key, bool _isImmutable) external onlyOwner {
        if (_immutableMetaDataKeys[_key]) revert TheMetaDataKeyIsImmutable("Use forceMetakeySwitch()");
        _allowedKeys[_key] = true;
        _immutableMetaDataKeys[_key] = _isImmutable;
    }

    /**
     * @dev Removes a metadata key from the whitelist.
     * @param _key The key to be removed from the whitelist.
     */
    function disallowMetadataKey(bytes32 _key) external onlyOwner {
        if(_immutableMetaDataKeys[_key]) revert TheMetaDataKeyIsImmutable("Use forceMetakeySwitch()");
        _allowedKeys[_key] = false;
    }

    /**
    * @notice Forcefully switches a metadata key's allowed state and immutability.
    * This function is restricted to the contract owner.
    * 
    * @param _key The metadata key to be modified.
    * @param _isImmutable Boolean indicating whether the key should be immutable.
    */
    function forceMetakeySwitch(bytes32 _key, bool _isImmutable) external onlyOwner {
        _allowedKeys[_key] = true;
        _immutableMetaDataKeys[_key] = _isImmutable;
    }

    /* internal utilities ------------------------------------------------------------------------- */

    /**
     * @dev Validates and sanitizes the Soul data fields, considering only specific fields.
     * @param soulAddress Address associated with the Soul.
     */
    function _sanitizeAndValidate(address soulAddress) internal view {
        bool _soulExists = _souls[soulAddress].mintedAt != 0;

        if (_soulExists) {
            revert SoulAlreadyExist();
        }
    }

    /**
    * @dev Clears all metadata for a given soul address internally.
    * This function is intended to be called from within the contract,
    * and it bypasses the `onlyOwner` restriction.
    * 
    * @param soulAddress Address of the soul whose metadata is to be cleared.
    */
    function _clearAllMetadataInternal(address soulAddress) internal {
        _getValidSoul(soulAddress);

        bytes32[] storage keys = _metadataKeys[soulAddress];
        for (uint256 i = 0; i < keys.length; i++) {
            delete _soulMetadata[soulAddress][keys[i]];
        }

        delete _metadataKeys[soulAddress];
    }

    /**
     * @dev Returns the starting token ID for minting.
     * @return uint256 The starting token ID.
     */
    function _startTokenId() internal pure returns (uint256) {
        return _THOUSAND;
    }

    /**
     * @dev Returns the current chain ID.
     * @return uint256 Current chain ID.
     */
    function _chainID() internal view returns (uint256) {
        uint256 chainID;
        /* solhint-disable */
        assembly {
            chainID := chainid()
        }
        /* solhint-enable */
        return chainID;
    }

    /**
     * @dev Generates a unique UUID for a given soul.
     * @param _soul Address of the soul.
     * @param _retry Number of retries attempted so far.
     * @return bytes16 Generated UUID.
     */
    function _generateUUID(address _soul, uint256 _retry) internal view returns (bytes16) {
        bytes16 uuid = bytes16(keccak256(abi.encodePacked(
            block.timestamp, _soul, _soulTicker, _baseHash, _chainID())));
        if (_uuidTicker[uuid]) {
            if (_retry > _MAX_RETRIES) revert MaxRetriesReached();
            return _generateUUID(_soul, _retry + 1);
        } else {
            return uuid;
        }
    }

    /**
     * @dev Retrieves the valid soul data for a given address.
     * @param soulAddress Address of the soul to retrieve.
     * @return Soul memory struct representing the valid soul.
     */
    function _getValidSoul(address soulAddress) internal view returns (Soul memory) {
        Soul memory soulData = _souls[soulAddress];
        if (soulData.mintedAt == 0) {
            revert SoulDoesNotExist();
        }
        return soulData;
    }

    /* NFT Mechanics------------------------------------------------------------------------------- */
 
    function transferFrom(address from, address to, uint256 tokenId) public override(ERC721, IERC721) {
        if(!_tradeOnOff) revert NotPermitted();
        super.transferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from, 
        address to, 
        uint256 tokenId) public override(ERC721, IERC721) {
        if(!_tradeOnOff) revert NotPermitted();
        super.safeTransferFrom(from, to, tokenId);
    }

    function safeTransferFrom(
        address from, 
        address to, 
        uint256 tokenId, 
        bytes memory _data) public override(ERC721, IERC721) {
        if(!_tradeOnOff) revert NotPermitted();
        super.safeTransferFrom(from, to, tokenId, _data);
    }

    // The following functions are overrides required by Solidity.

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        if (from != address(0) && to != address(0)) {
            if (_tradeOnOff == false) revert NotPermitted();
        }
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /* administrator -------------------------------------------------------------------------------- */

    /**
     * @notice Sets the payment token address.
     * @param tokenAddress Address of the payment token.
     */
    function setPaymentToken(address tokenAddress) external onlyOwner validContract(tokenAddress) {
        if (!IValidation.validateERC20Token(tokenAddress)) {
            revert InvalidContractInteraction();
        }
        _pause();
        _paymentToken = tokenAddress;
        emit PaymentTokenUpdated(_paymentToken);
    }

    /**
     * @notice Sets the payment token address zero as the native token.
     */
    function setPaymentTokenAsNativeToken() external onlyOwner {
        _pause();
        _paymentToken = address(0);
        emit PaymentTokenUpdated(_paymentToken);
    }

    /**
     * @notice Sets the minting price.
     * @param price New minting price.
     */
    function setMintingPrice(uint256 price) external onlyOwner {
        _mintingPrice = price;
        emit MintingPriceUpdated(_mintingPrice);
    }

    /**
     * @notice Starts the mint sale.
     */
    function startMintSale() external onlyOwner {
        _unpause();
    }

    /**
     * @notice Stops the mint sale.
     */
    function stopMintSale() external onlyOwner {
        _pause();
    }

    function setTradingOnOff(bool _onOff) external onlyOwner {
        _tradeOnOff = _onOff;
        emit TradePeriodUpdated(_onOff);
    }

    function setDefaultRoyalityReceiver(address receiver, uint96 feeNumerator) 
    validAddress(receiver) external onlyOwner {
        super._setDefaultRoyalty(receiver, feeNumerator);
    }

    /**
     * @notice Withdraws tokens from the contract.
     * @dev Only the owner can withdraw tokens.
     * @param _tokenAddress Address of the token to withdraw.
     * @param _to Address to receive the withdrawn tokens.
     * @param _amount Amount of tokens to withdraw.
     */
    function rescueTokens(address _tokenAddress, address _to, uint256 _amount)
        external
        validContract(_tokenAddress)
        validAddress(_to)
        onlyOwner
    {
        if (_amount == 0) revert TokenAmountIsZero();
        SafeERC20.safeTransfer(IERC20(_tokenAddress), _to, _amount);
        emit Withdrawal(_tokenAddress, _to, _amount);
    }

    /**
    * @notice Pauses the contract, disabling state-changing functions.
    * @dev Only the owner can pause the contract.
    */
    function pause() external onlyOwner {
        _pause();
    }

    /**
    * @notice Unpauses the contract, enabling state-changing functions.
    * @dev Only the owner can unpause the contract.
    */
    function unpause() external onlyOwner {
        _unpause();
    }
}
