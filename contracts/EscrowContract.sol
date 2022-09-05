pragma solidity ^0.8.0;

import "@openzeppelin/contracts/metatx/ERC2771Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EscrowContract is Ownable, IERC721Receiver {
    enum TokenType { Z, ERC20, ERC721 }

    uint auto_commit_deadline;
    uint last_escrow_id;

    struct Asset { 
        uint amount_or_token_id;
        address token_contract;
        address owner;
    }

    struct Escrow { 
        Asset client_asset;
        Asset vendor_asset;
        uint expire_at;
        uint fulfilled_at;
        uint canceled_at;
        uint ended_at;
    }

    mapping(uint => Escrow) public escrows;
    mapping(address => TokenType) public contracts;

    constructor(uint _auto_commit_deadline) {
        auto_commit_deadline = _auto_commit_deadline;
    }

    function get_escrow(uint escrow_id) public view returns(Escrow memory) {
        return escrows[escrow_id];
    }

    function register_token_contract(address token_contract, TokenType token_type) external onlyOwner {
        contracts[token_contract] = token_type;
    }

    function create_eth_escrow(
        address vendor_address,
        uint vendor_amount_or_token_id,
        address vendor_token_contract,
        uint expire_at
    ) external payable {
        create_escrow(
            msg.sender,
            msg.value,
            address(0),
            vendor_address,
            vendor_amount_or_token_id,
            vendor_token_contract,
            expire_at
        );
    }

    function create_token_escrow(
        uint client_amount_or_token_id,
        address client_token_contract,
        address vendor_address,
        uint vendor_amount_or_token_id,
        address vendor_token_contract,
        uint expire_at
    ) external {
        require(contracts[client_token_contract] != TokenType.Z, "Unregistered client token.");

        if (contracts[client_token_contract] == TokenType.ERC20) {
            IERC20 erc20 = IERC20(client_token_contract);
            erc20.transferFrom(msg.sender, address(this), client_amount_or_token_id);
        } else {
            IERC721 erc721 = IERC721(client_token_contract);
            erc721.safeTransferFrom(msg.sender, address(this), client_amount_or_token_id);
        }

        create_escrow(
            msg.sender,
            client_amount_or_token_id,
            client_token_contract,
            vendor_address,
            vendor_amount_or_token_id,
            vendor_token_contract,
            expire_at
        );
    }

    function create_escrow(
        address client_address,
        uint client_amount_or_token_id,
        address client_token_contract,
        address vendor_address,
        uint vendor_amount_or_token_id,
        address vendor_token_contract,
        uint expire_at
    ) private {
        require(contracts[vendor_token_contract] != TokenType.Z || vendor_token_contract == address(0), "Unregistered vendor token.");

        escrows[last_escrow_id++] = Escrow({
            client_asset: Asset({
                amount_or_token_id: client_amount_or_token_id,
                token_contract: client_token_contract,
                owner: client_address
            }),
            vendor_asset: Asset({
                amount_or_token_id: vendor_amount_or_token_id,
                token_contract: vendor_token_contract,
                owner: vendor_address
            }),
            expire_at: expire_at,
            fulfilled_at: 0,
            canceled_at: 0,
            ended_at: 0
        });
    }

    function fulfill_eth_escrow(uint escrow_id) external payable {
        require(
            escrows[escrow_id].vendor_asset.token_contract == address(0) &&
            escrows[escrow_id].vendor_asset.amount_or_token_id == msg.value,
            "Invalid vendor asset.");

        fulfill_escrow(escrow_id);
    }

    function fulfill_token_escrow(uint escrow_id) external {

        if (contracts[escrows[escrow_id].vendor_asset.token_contract] == TokenType.ERC20) {
            IERC20 erc20 = IERC20(escrows[escrow_id].vendor_asset.token_contract);
            bool succeeded = erc20.transferFrom(msg.sender, address(this), escrows[escrow_id].vendor_asset.amount_or_token_id);

            require(succeeded, "Transfer failure.");
        } else {
            IERC721 erc721 = IERC721(escrows[escrow_id].vendor_asset.token_contract);
            erc721.safeTransferFrom(msg.sender, address(this), escrows[escrow_id].vendor_asset.amount_or_token_id);
        }

        fulfill_escrow(escrow_id);
    }

    function fulfill_escrow(uint escrow_id) private {
        require(escrows[escrow_id].vendor_asset.owner == msg.sender, "Invalid vendor.");
        require(escrows[escrow_id].expire_at > block.timestamp, "Escrow expired.");
        require(escrows[escrow_id].fulfilled_at == 0, "Escrow already fulfilled.");
        require(escrows[escrow_id].ended_at == 0, "Escrow already ended.");
        escrows[escrow_id].fulfilled_at = block.timestamp;
    }

    function cancel_escrow(uint escrow_id) external {
        require(escrows[escrow_id].client_asset.owner == msg.sender, "Only creator can cancel escrow.");
        require(escrows[escrow_id].canceled_at == 0, "Escrow already canceled.");
        require(escrows[escrow_id].ended_at == 0, "Escrow already ended.");
        escrows[escrow_id].canceled_at = block.timestamp;

        if (escrows[escrow_id].fulfilled_at == 0) {
            escrows[escrow_id].ended_at = block.timestamp;

            if (contracts[escrows[escrow_id].client_asset.token_contract] == TokenType.ERC20) {
                IERC20 erc20 = IERC20(escrows[escrow_id].client_asset.token_contract);
                bool succeeded = erc20.transfer(msg.sender, escrows[escrow_id].client_asset.amount_or_token_id);
                
                require(succeeded, "Transfer failure.");
            } else {
                IERC721 erc721 = IERC721(escrows[escrow_id].client_asset.token_contract);
                erc721.safeTransferFrom(address(this), msg.sender, escrows[escrow_id].client_asset.amount_or_token_id);
            }
        }
    }

    function approve_cancelation_request(uint escrow_id) external {
        Asset memory client = escrows[escrow_id].client_asset;
        Asset memory vendor = escrows[escrow_id].vendor_asset;

        require(vendor.owner == msg.sender, "Only vendor can approve cancelation request.");
        require(escrows[escrow_id].fulfilled_at != 0, "Escrow not fulfilled.");
        require(escrows[escrow_id].canceled_at != 0, "Escrow not canceled.");
        require(escrows[escrow_id].ended_at == 0, "Escrow already ended.");
        escrows[escrow_id].ended_at = block.timestamp;

        if (contracts[client.token_contract] == TokenType.ERC20) {
            IERC20 erc20 = IERC20(client.token_contract);
            bool succeeded = erc20.transfer(client.owner, client.amount_or_token_id);
            
            require(succeeded, "Transfer failure.");
        } else if (contracts[client.token_contract] == TokenType.ERC721) {
            IERC721 erc721 = IERC721(client.token_contract);
            erc721.safeTransferFrom(address(this), client.owner, client.amount_or_token_id);
        } else {
            payable(client.owner).transfer(client.amount_or_token_id);
        }

        if (contracts[vendor.token_contract] == TokenType.ERC20) {
            IERC20 erc20 = IERC20(vendor.token_contract);
            bool succeeded = erc20.transfer(vendor.owner, vendor.amount_or_token_id);
            
            require(succeeded, "Transfer failure.");
        } else if (contracts[vendor.token_contract] == TokenType.ERC721) {
            IERC721 erc721 = IERC721(vendor.token_contract);
            erc721.safeTransferFrom(address(this), vendor.owner, vendor.amount_or_token_id);
        } else {
            payable(vendor.owner).transfer(vendor.amount_or_token_id);
        }
    }

    function decline_cancelation_request(uint escrow_id) external {
        require(escrows[escrow_id].vendor_asset.owner == msg.sender, "Only vendor can decline cancelation request.");
        require(escrows[escrow_id].fulfilled_at != 0, "Escrow not fulfilled.");
        require(escrows[escrow_id].canceled_at != 0, "Escrow not canceled.");
        require(escrows[escrow_id].ended_at == 0, "Escrow already ended.");

        commit_escrow(escrow_id);
    }

    function client_commit_escrow(uint escrow_id) external {
        require(escrows[escrow_id].client_asset.owner == msg.sender, "Not client.");
        require(escrows[escrow_id].fulfilled_at != 0, "Escrow not fulfilled.");
        require(escrows[escrow_id].canceled_at == 0, "Escrow canceled.");
        require(escrows[escrow_id].ended_at == 0, "Escrow already ended.");

        commit_escrow(escrow_id);
    }

    function vendor_commit_escrow(uint escrow_id) external {
        require(escrows[escrow_id].vendor_asset.owner == msg.sender, "Not vendor.");
        require(escrows[escrow_id].fulfilled_at != 0, "Escrow not fulfilled.");
        require(escrows[escrow_id].canceled_at == 0, "Escrow canceled.");
        require(escrows[escrow_id].ended_at == 0, "Escrow already ended.");
        require(block.timestamp > (escrows[escrow_id].fulfilled_at + auto_commit_deadline), "Escrow not expired yet.");
        commit_escrow(escrow_id);
    }

    function commit_escrow(uint escrow_id) private {
        escrows[escrow_id].ended_at = block.timestamp;

        Asset memory client = escrows[escrow_id].client_asset;
        Asset memory vendor = escrows[escrow_id].vendor_asset;

        if (contracts[vendor.token_contract] == TokenType.ERC20) {
            IERC20 erc20 = IERC20(vendor.token_contract);
            bool succeeded = erc20.transfer(client.owner, vendor.amount_or_token_id);
            
            require(succeeded, "Transfer failure.");
        } else if (contracts[vendor.token_contract] == TokenType.ERC721) {
            IERC721 erc721 = IERC721(vendor.token_contract);
            erc721.safeTransferFrom(address(this), client.owner, vendor.amount_or_token_id);
        } else {
            payable(client.owner).transfer(vendor.amount_or_token_id);
        }

        if (contracts[client.token_contract] == TokenType.ERC20) {
            IERC20 erc20 = IERC20(client.token_contract);
            bool succeeded = erc20.transfer(vendor.owner, client.amount_or_token_id);
            
            require(succeeded, "Transfer failure.");
        } else if (contracts[client.token_contract] == TokenType.ERC721) {
            IERC721 erc721 = IERC721(client.token_contract);
            erc721.safeTransferFrom(address(this), vendor.owner, client.amount_or_token_id);
        } else {
            payable(vendor.owner).transfer(client.amount_or_token_id);
        }
    }

    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
      return IERC721Receiver.onERC721Received.selector;
    }
}