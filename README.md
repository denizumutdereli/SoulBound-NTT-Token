# Custom SoulBound Token - SBT (ntt) Contract

## Overview

**SoulBounds** is a custom smart contract for minting and managing non-transferable, identity-bound tokens known as Soul-Bound Tokens (SBTs). These tokens securely represent unique identities and provide a decentralized identifier. They can be used in identity verification, reputation management, and decentralized autonomous organizations (DAOs).

## What is an SBT?

A Soul-Bound Token (SBT) is a non-transferable token (ntt) that uniquely identifies a person or entity on a blockchain. They are designed to function as digital badges that bind to a specific wallet address (soul). They can represent credentials like memberships, qualifications, or reputations. SBTs cannot be traded or moved, ensuring the identity and associated data remain bound to the original owner.

## Feature Planning

Even though the SBT pattern is known for being non-transferable, adding flags to allow the transfer of SBTs with payable support opens up new opportunities, such as the sale of in-game hero tokens. It's just for fun, so why not? :)

### Applications of SBTs

- **Identity Verification:** Digital identifiers can confirm ownership of memberships, licenses, or credentials.
- **Reputation Management:** SBTs can hold information about contributions, achievements, and track records.
- **Decentralized Autonomous Organizations (DAOs):** Voting or governance rights can be linked to SBTs.

## Contract Features

- **Minting and Burning:** 
  - **Minting:** The contract owner can create new souls (SBTs) with unique identities and metadata.
  - **Burning:** Souls can be revoked by the owner or the individual soul holder.
  
- **Metadata Management:**
  - Allows owners to whitelist specific metadata keys and manage the associated data securely.
  
- **Pausable:**
  - Provides administrative control for pausing or unpausing the contract during critical events.

- **Token Withdrawal:**
  - Allows the owner to rescue tokens in the contract and transfer them to a specified address.

## How to Create an SBT

1. **Minting:** 
   Use the `mint` function to create a new soul. Provide an address, unique identity, and URL associated with the new soul.

   ```solidity
   function mint(address _soul, bytes calldata _identity, bytes calldata _url);
   ```

2. **Unique ID Generation:**
   Each soul gets a unique identifier (UUID) generated from a combination of the wallet address, timestamp, and other data.

3. **Admin Metadata Creation:**
   Admins can whitelist metadata keys using `allowMetadataKey` and then add metadata with `setMetadata`. The metadata is securely linked to the SBT.

   ```solidity
   function allowMetadataKey(bytes32 _key);
   function setMetadata(address _soul, bytes32 _key, bytes calldata _value);
   ```

## License

This project is licensed under the MIT License.

## Contributing

Contributions to expand or improve the repository are welcome! 

[@denizumutdereli](https://www.linkedin.com/in/denizumutdereli)