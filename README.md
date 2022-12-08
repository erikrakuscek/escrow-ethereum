# Escrow Contract for Ethereum

An escrow contract serves instead of the middleman between a vendor and a client. A client creates an escrow on the smart contract and the vendor fulfills it. The contract releases the funds (ERC-20 or ERC-721) when the escrow conditions are fulfilled. Escrow has a deadline. Either client or vendor can cancel escrow under certain conditions.

![alt text](https://github.com/erikrakuscek/escrow-ethereum/blob/main/escrow.jpg?raw=true)

## Table of Contents

- [Write methods](#write-methods)
  *  [register_token_contract](#register_token_contract)
  *  [create_eth_escrow](#create_eth_escrow)
  *  [create_token_escrow](#create_token_escrow)
  *  [fulfill_eth_escrow](#fulfill_eth_escrow)
  *  [fulfill_token_escrow](#fulfill_token_escrow)
  *  [cancel_escrow](#cancel_escrow)
  *  [approve_cancelation_request](#approve_cancelation_request)
  *  [decline_cancelation_request](#decline_cancelation_request)
  *  [client_commit_escrow](#client_commit_escrow)
  *  [vendor_commit_escrow](#vendor_commit_escrow)
- [Read methods](#read-methods)
  *  [get_escrow](#get_escrow)
- [Example Usage](#example-usage)

## Write methods

### `register_token_contract`

Owner-only method to register new tokens that can be exchanged using escrow.

### `create_eth_escrow`

The client calls this method to create an escrow where they pay with ETH. They must provide details about the tokens they expect in return, details about the vendor that can fulfill this escrow and the expiration date.

### `create_token_escrow`

The client calls this method to create an escrow where they offer ERC-20 or ERC-721 tokens. They must provide details about the tokens they expect in return, details about the vendor that can fulfill this escrow and the expiration date.

### `fulfill_eth_escrow`

The vendor calls this method to fulfill an escrow. The call requires payment in ETH.

### `fulfill_token_escrow`

The vendor calls this method to fulfill an escrow with ERC-20 or ERC-721 token.

### `cancel_escrow`

Using this method, the client can create an escrow cancelation request. In case escrow was already fulfilled the vendor can approve or decline the request. Client instantly gets back their tokens if the escrow was not yet fulfilled.

### `approve_cancelation_request`

The vendor approves the cancelation request. Both client and vendor receive their tokens back.

### `decline_cancelation_request`

The vendor declines the cancelation request. The escrow is fulfilled. The vendor receives tokens sent by the client and vice versa.

### `client_commit_escrow`

The client can commit escrow if it was successfully fulfilled by the vendor. The client receives tokens sent by the vendor and vice versa.

### `vendor_commit_escrow`

The vendor can commit escrow if it has expired. The vendor receives tokens sent by the client and vice versa.

## Read methods

### `get_escrow`

Get escrow details.

## Example Usage

Examples are available in the test folder.
