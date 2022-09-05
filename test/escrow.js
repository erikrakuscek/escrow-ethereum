const EscrowContract = artifacts.require("EscrowContract");
const TestERC20Token = artifacts.require("TestERC20Token");
const TestERC721Token = artifacts.require("TestERC721Token");

contract("EscrowContract", (accounts) => {
    const client = accounts[1];
    const vendor = accounts[2];

    it("should create eth escrow, fulfill it and commit by client", async () => {
        // Create
        const EscrowContractInstance = await EscrowContract.deployed();
        const TestERC20TokenIstance = await TestERC20Token.deployed();

        await EscrowContractInstance.register_token_contract(TestERC20TokenIstance.address, 1);

        const expire_at = 9999999999;
        const client_amount_or_token_id = 100;
        const vendor_amount_or_token_id = 25;
        await EscrowContractInstance.create_eth_escrow(vendor, vendor_amount_or_token_id, TestERC20TokenIstance.address, expire_at, {from: client, value: client_amount_or_token_id});

        let escrow = await EscrowContractInstance.get_escrow(0);
        assert.equal(escrow.expire_at, expire_at, "expire_at is incorrect");
        assert.equal(escrow.client_asset.amount_or_token_id, client_amount_or_token_id, "client amount is incorrect");
        assert.equal(escrow.client_asset.owner, client, "client address is incorrect");
        assert.equal(escrow.client_asset.token_contract, 0, "client token contract is incorrect");
        assert.equal(escrow.vendor_asset.amount_or_token_id, vendor_amount_or_token_id, "vendor amount is incorrect");
        assert.equal(escrow.vendor_asset.owner, vendor, "vendor address is incorrect");
        assert.equal(escrow.vendor_asset.token_contract, TestERC20TokenIstance.address, "vendor token contract is incorrect");

        // Fulfill
        await TestERC20TokenIstance.mint(vendor, 50);
        await TestERC20TokenIstance.approve(EscrowContractInstance.address, 25, {from: vendor});
        await EscrowContractInstance.fulfill_token_escrow(0, {from: vendor});

        escrow = await EscrowContractInstance.get_escrow(0);
        assert.notEqual(escrow.client_asset.fulfilled_at, 0, "Escrow not fulfilled.");
        assert.equal((await TestERC20TokenIstance.balanceOf(vendor)).toString(), 25, "Vendor balance incorrect.");

        // Client commit
        await EscrowContractInstance.client_commit_escrow(0, {from: client});
        escrow = await EscrowContractInstance.get_escrow(0);
        assert.notEqual(escrow.client_asset.ended_at, 0, "Escrow not ended.");
        assert.equal((await TestERC20TokenIstance.balanceOf(client)).toString(), 25, "Client balance incorrect.");
    });

    it("should create token escrow, fulfill it, cancel by client and approve cancelation", async () => {
        // Create
        const EscrowContractInstance = await EscrowContract.deployed();
        const TestERC20TokenIstance = await TestERC20Token.deployed();
        const TestERC721TokenIstance = await TestERC721Token.deployed();

        await EscrowContractInstance.register_token_contract(TestERC20TokenIstance.address, 1);
        await EscrowContractInstance.register_token_contract(TestERC721TokenIstance.address, 2);
        await TestERC20TokenIstance.mint(client, 15);
        await TestERC20TokenIstance.approve(EscrowContractInstance.address, 10, {from: client});

        const expire_at = 9999999999;
        const client_amount_or_token_id = 10;
        const vendor_amount_or_token_id = 1;
        await EscrowContractInstance.create_token_escrow(client_amount_or_token_id, TestERC20TokenIstance.address, vendor, vendor_amount_or_token_id, TestERC721TokenIstance.address, expire_at, {from: client});

        let escrow = await EscrowContractInstance.get_escrow(1);
        assert.equal(escrow.expire_at, expire_at, "expire_at is incorrect");
        assert.equal(escrow.client_asset.amount_or_token_id, client_amount_or_token_id, "client amount is incorrect");
        assert.equal(escrow.client_asset.owner, client, "client address is incorrect");
        assert.equal(escrow.client_asset.token_contract, TestERC20TokenIstance.address, "client token contract is incorrect");
        assert.equal(escrow.vendor_asset.amount_or_token_id, vendor_amount_or_token_id, "vendor amount is incorrect");
        assert.equal(escrow.vendor_asset.owner, vendor, "vendor address is incorrect");
        assert.equal(escrow.vendor_asset.token_contract, TestERC721TokenIstance.address, "vendor token contract is incorrect");
        assert.equal((await TestERC20TokenIstance.balanceOf(client)).toString(), 30, "Client balance incorrect.");

        // Fulfill
        await TestERC721TokenIstance.mint(vendor);
        await TestERC721TokenIstance.approve(EscrowContractInstance.address, 1, {from: vendor});
        await EscrowContractInstance.fulfill_token_escrow(1, {from: vendor});

        escrow = await EscrowContractInstance.get_escrow(1);
        assert.notEqual(escrow.client_asset.fulfilled_at, 0, "Escrow not fulfilled.");
        assert.equal((await TestERC721TokenIstance.balanceOf(vendor)).toString(), 0, "Vendor balance incorrect.");

        // Cancel by client
        await EscrowContractInstance.cancel_escrow(1, {from: client});

        escrow = await EscrowContractInstance.get_escrow(1);
        assert.notEqual(escrow.client_asset.canceled_at, 0, "Escrow not canceled.");

        // Approve cancelation request
        await EscrowContractInstance.approve_cancelation_request(1, {from: vendor});

        escrow = await EscrowContractInstance.get_escrow(1);
        assert.notEqual(escrow.client_asset.ended_at, 0, "Escrow not ended.");
        assert.equal((await TestERC20TokenIstance.balanceOf(client)).toString(), 40, "Client ERC20 balance incorrect.");
        assert.equal((await TestERC721TokenIstance.balanceOf(client)).toString(), 0, "Client ERC721 balance incorrect.");
        assert.equal((await TestERC20TokenIstance.balanceOf(vendor)).toString(), 25, "Vendor ERC20 balance incorrect.");
        assert.equal((await TestERC721TokenIstance.balanceOf(vendor)).toString(), 1, "Vendor ERC721 balance incorrect.");
    });

    it("should create token escrow and canceled by client", async () => {
        // Create
        const EscrowContractInstance = await EscrowContract.deployed();
        const TestERC20TokenIstance = await TestERC20Token.deployed();
        const TestERC721TokenIstance = await TestERC721Token.deployed();

        await EscrowContractInstance.register_token_contract(TestERC20TokenIstance.address, 1);
        await EscrowContractInstance.register_token_contract(TestERC721TokenIstance.address, 2);
        await TestERC20TokenIstance.mint(client, 15);
        await TestERC20TokenIstance.approve(EscrowContractInstance.address, 10, {from: client});

        const expire_at = 9999999999;
        const client_amount_or_token_id = 10;
        const vendor_amount_or_token_id = 1;
        await EscrowContractInstance.create_token_escrow(client_amount_or_token_id, TestERC20TokenIstance.address, vendor, vendor_amount_or_token_id, TestERC721TokenIstance.address, expire_at, {from: client});

        let escrow = await EscrowContractInstance.get_escrow(2);
        assert.equal(escrow.expire_at, expire_at, "expire_at is incorrect");
        assert.equal(escrow.client_asset.amount_or_token_id, client_amount_or_token_id, "client amount is incorrect");
        assert.equal(escrow.client_asset.owner, client, "client address is incorrect");
        assert.equal(escrow.client_asset.token_contract, TestERC20TokenIstance.address, "client token contract is incorrect");
        assert.equal(escrow.vendor_asset.amount_or_token_id, vendor_amount_or_token_id, "vendor amount is incorrect");
        assert.equal(escrow.vendor_asset.owner, vendor, "vendor address is incorrect");
        assert.equal(escrow.vendor_asset.token_contract, TestERC721TokenIstance.address, "vendor token contract is incorrect");
        assert.equal((await TestERC20TokenIstance.balanceOf(client)).toString(), 45, "Client balance incorrect.");

        // Cancel by client
        await TestERC20TokenIstance.approve(EscrowContractInstance.address, 10, {from: client});
        await EscrowContractInstance.cancel_escrow(2, {from: client});

        escrow = await EscrowContractInstance.get_escrow(2);
        assert.notEqual(escrow.client_asset.canceled_at, 0, "Escrow not canceled.");
        assert.notEqual(escrow.client_asset.ended_at, 0, "Escrow not ended.");
        assert.equal((await TestERC20TokenIstance.balanceOf(client)).toString(), 55, "Client ERC20 balance incorrect.");
    });

    it("should create token escrow, fulfill eth escrow, cancel by client and decline cancelation", async () => {
        // Create
        const EscrowContractInstance = await EscrowContract.deployed();
        const TestERC721TokenIstance = await TestERC721Token.deployed();

        await EscrowContractInstance.register_token_contract(TestERC721TokenIstance.address, 2);
        await TestERC721TokenIstance.mint(client);
        await TestERC721TokenIstance.approve(EscrowContractInstance.address, 2, {from: client});

        const expire_at = 9999999999;
        const client_amount_or_token_id = 2;
        const vendor_amount_or_token_id = 10000;
        await EscrowContractInstance.create_token_escrow(client_amount_or_token_id, TestERC721TokenIstance.address, vendor, vendor_amount_or_token_id, '0x0000000000000000000000000000000000000000', expire_at, {from: client});

        let escrow = await EscrowContractInstance.get_escrow(3);
        assert.equal(escrow.expire_at, expire_at, "expire_at is incorrect");
        assert.equal(escrow.client_asset.amount_or_token_id, client_amount_or_token_id, "client amount is incorrect");
        assert.equal(escrow.client_asset.owner, client, "client address is incorrect");
        assert.equal(escrow.client_asset.token_contract, TestERC721TokenIstance.address, "client token contract is incorrect");
        assert.equal(escrow.vendor_asset.amount_or_token_id, vendor_amount_or_token_id, "vendor amount is incorrect");
        assert.equal(escrow.vendor_asset.owner, vendor, "vendor address is incorrect");
        assert.equal(escrow.vendor_asset.token_contract, 0, "vendor token contract is incorrect");
        assert.equal((await TestERC721TokenIstance.balanceOf(client)).toString(), 0, "Client balance incorrect.");

        // Fulfill
        await EscrowContractInstance.fulfill_eth_escrow(3, {from: vendor, value: vendor_amount_or_token_id});

        escrow = await EscrowContractInstance.get_escrow(3);
        assert.notEqual(escrow.client_asset.fulfilled_at, 0, "Escrow not fulfilled.");

        // Cancel by client
        await EscrowContractInstance.cancel_escrow(3, {from: client});

        escrow = await EscrowContractInstance.get_escrow(3);
        assert.notEqual(escrow.client_asset.canceled_at, 0, "Escrow not canceled.");

        // Decline cancelation request
        await EscrowContractInstance.decline_cancelation_request(3, {from: vendor});

        escrow = await EscrowContractInstance.get_escrow(3);
        assert.notEqual(escrow.client_asset.ended_at, 0, "Escrow not ended.");
        assert.equal((await TestERC721TokenIstance.balanceOf(client)).toString(), 0, "Client ERC721 balance incorrect.");
        assert.equal((await TestERC721TokenIstance.balanceOf(vendor)).toString(), 2, "Vendor ERC721 balance incorrect.");
    });
});