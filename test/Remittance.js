var Remittance = artifacts.require("./Remittance.sol");
var BigNumber = require('bignumber.js');
const Promise = require("bluebird");
Promise.promisifyAll(web3.eth, { suffix: "Promise" });


contract('Remittance', function(accounts) {
       
	const account_Alice = accounts[1];
        const account_Bob = accounts[2];
        const account_Carol = accounts[3];
        const account_Dave = accounts[4];
        const account_Erin = accounts[5];
        const account_Frank = accounts[6];
        const account_owner = accounts[0];

        const password1 = "Show me the money!"
        hashed_password1 = web3.sha3(password1);
        const password2 = "Say hello to my little friend!"
        hashed_password2 = web3.sha3(password2);

        let instance;
	beforeEach("should create a Remittance contract", function() {
		return Remittance.new({ from: account_owner,gas:5000000 })
		.then(_instance => instance = _instance)
	})

        it ("should store owner's account (me)", function(){
                return instance.getOwner()
                .then ( owner  => {
                        assert.equal(owner,account_owner, "owner account not stored correctly")       
                })
        })

        it ("should process a new payment request", function () {
                let payment;
                return instance.createPayment(account_Alice,account_Carol,hashed_password1,259200,{value:web3.toWei(0.5,"ether"),gas:500000,gasPrice:1})
                .then ( txObj => {
                        assert.equal(txObj.receipt.status,1, "createPayment failed");
                        assert.equal(txObj.receipt.logs.length,1, "createPayment emitted an incorrect number of events at receipt");
                        assert.equal(txObj.logs.length,1, "createPayment emitted an incorrect number of events");
                        assert.equal(txObj.logs[0].event,"LogCreatePayment", "wrong event emitted at createPayment");		
                        assert.equal(txObj.logs[0].args.hashedPasswordPayee,hashed_password1, "should be hashed_password1");
                        assert.equal(txObj.logs[0].args.payer,account_Alice, "should be Alice account");
                        assert.equal(txObj.logs[0].args.exchange,account_Carol, "should be Carol account");
                        return instance.payments(hashed_password1)
                }) 
                .then ( _payment => {
                        payment = _payment;
                        assert.equal ( payment[0], account_Alice, "payer was not stored correctly");
                        assert.equal ( payment[1], account_Carol, "exchange was not stored correctly");
                // ...
                })
                
        })
        
        function calculateFee(txObj) {
                let GasPrice, fee;
                return web3.eth.getTransactionPromise(txObj.tx).
                then ( tx => {
                       gasPrice = new BigNumber (tx.gasPrice);
                       fee = new BigNumber(txObj.receipt.gasUsed).times(gasPrice);
                       return fee;
                });
        }

        it ("should settle a payment",function (){
                let balance_Carol_before,  fee, txObj, paymentIDstr;
                return instance.createPayment(account_Alice,account_Carol,hashed_password1,259200,{value:web3.toWei(0.5,"ether"),gas:500000,gasPrice:1})
                .then ( _txObj => {
                        txObj = _txObj;
                        return web3.eth.getBalancePromise(account_Carol);
                })
                .then (balance => {
                        balance_Carol_before = balance;
                        return instance.processPayment(hashed_password1,{from:account_Carol,gas:500000,gasPrice:1})
                })
                .then ( _txObj => {
                        txObj = _txObj; 
                        assert.equal(txObj.receipt.status,1, "processPayment failed");
                        assert.equal(txObj.receipt.logs.length,1, "processPayment emitted an incorrect number of events at processPayment");
                        assert.equal(txObj.logs.length,1, "processPayment emitted an incorrect number of events");
                        assert.equal(txObj.logs[0].event,"LogProcessPayment", "wrong event emitted at processPayment");		
                        assert.equal(txObj.logs[0].args.exchange,account_Carol,"should be Carol");
                        return calculateFee(txObj); 
                })
                .then ( _fee => {
                        fee = _fee;
                        return web3.eth.getBalancePromise(account_Carol);
                })     
                .then ( balance => {
                        let balance_Carol_after = new BigNumber (balance);
                        let balance_Carol_after_str = balance_Carol_after.toString(10);
                        let expected_balance_Carol = balance_Carol_before.plus(web3.toWei(0.5,"ether")).minus(30000).minus(fee);
                        let expected_balance_Carol_str = expected_balance_Carol.toString(10);
                        assert.strictEqual(balance_Carol_after_str,expected_balance_Carol_str);
                })
        })

        it ("should process and settle two payments",function (){
                let balance_Carol_before,  fee, txObj, balance_Frank_before, paymentIDstr_0, paymentIDstr_1
                return instance.createPayment(account_Alice,account_Carol,hashed_password1,259200,{value:web3.toWei(0.5,"ether"),gas:500000,gasPrice:1})
                .then ( _txObj => {
                        txObj = _txObj;
                        return instance.createPayment(account_Dave,account_Frank,hashed_password2,259200,{value:web3.toWei(0.8,"ether"),gas:500000,gasPrice:1})
                })       
                .then ( _txObj => {
                        txObj = _txObj;
                        // payment 0 Alice, Bob and Carol
                        return web3.eth.getBalancePromise(account_Carol)
                })
                .then (balance => {
                        balance_Carol_before = balance;
                        return instance.processPayment(hashed_password1,{from:account_Carol,gasPrice:1})
                })
                .then ( _txObj => {
                        txObj = _txObj; 
                        assert.equal(txObj.receipt.status,1, "processPayment failed");
                        assert.equal(txObj.receipt.logs.length,1, "processPayment emitted an incorrect number of events at receipt");
                        assert.equal(txObj.logs.length,1, "processPayment emitted an incorrect number of events");
                        assert.equal(txObj.logs[0].event,"LogProcessPayment", "wrong event emitted at processPayment");		
                        assert.equal(txObj.logs[0].args.exchange,account_Carol,"should be Carol");
                        return calculateFee(txObj);
                })
                .then ( _fee => {
                        fee = _fee;
                        return web3.eth.getBalancePromise(account_Carol)
                })     
                .then ( balance => {
                        let balance_Carol_after = new BigNumber (balance);
                        let balance_Carol_after_str = balance_Carol_after.toString(10);
                        let expected_balance_Carol = balance_Carol_before.plus(web3.toWei(0.5,"ether")).minus(30000).minus(fee);
                        let expected_balance_Carol_str = expected_balance_Carol.toString(10);
                        assert.strictEqual(balance_Carol_after_str,expected_balance_Carol_str);
                        // Payment 1 Dave, Erin and Frank
                        return web3.eth.getBalancePromise(account_Frank)
                })
                .then (balance => {
                        balance_Frank_before = balance;
                        return instance.processPayment(hashed_password2,{from:account_Frank,gasPrice:1})
                })
                .then ( _txObj => {
                        txObj = _txObj; 
                        assert.equal(txObj.receipt.status,1, "processPayment failed");
                        assert.equal(txObj.receipt.logs.length,1, "processPayment emitted an incorrect number of events at transaction");
                        assert.equal(txObj.logs.length,1, "processPayment emitted an incorrect number of events");
                        assert.equal(txObj.logs[0].event,"LogProcessPayment", "wrong event emitted at processPayment");		
                        assert.equal(txObj.logs[0].args.exchange,account_Frank,"should be Frank");
                        return calculateFee(txObj);
                })
                .then ( _fee => {
                        fee = _fee;
                        return web3.eth.getBalancePromise(account_Frank)
                })     
                .then ( balance => {
                        let balance_Frank_after = new BigNumber (balance);
                        let balance_Frank_after_str = balance_Frank_after.toString(10);
                        let expected_balance_Frank = balance_Frank_before.plus(web3.toWei(0.8,"ether")).minus(30000).minus(fee);
                        let expected_balance_Frank_str = expected_balance_Frank.toString(10);
                        assert.strictEqual(balance_Frank_after_str,expected_balance_Frank_str);
                })
        })
        
        it ("should allow owner withdraw funds",function () {
                        let txObj, fee
                        let balance_owner_before 
                        return instance.createPayment(account_Alice,account_Carol,hashed_password1,259200,{value:web3.toWei(0.5,"ether"),gas:500000,gasPrice:1})
                        .then ( () => {
                                return web3.eth.getBalancePromise(account_owner)
                        })
                        .then ( balance => {
                                balance_owner_before = new BigNumber(balance);
                                return instance.withdrawFees ({from:account_owner})
                        })
                        .then ( _txObj => {
                                txObj = _txObj; 
                                assert.equal(txObj.receipt.status,1, "withdrawFees failed");
                                assert.equal(txObj.receipt.logs.length,1, "withdrawFees emitted an incorrect number of events at receipt");
                                assert.equal(txObj.logs.length,1, "withdrawFees emitted an incorrect number of events");
                                assert.equal(txObj.logs[0].event,"LogWithdrawFees", "wrong event emitted at createPayment");		
                                return calculateFee(txObj);
                        })
                        .then ( _fee => {
                                fee = _fee;
                                return web3.eth.getBalancePromise(account_owner);
                        })
                        .then ( balance => {
                                let balance_owner_after = new BigNumber (balance);
                                let balance_owner_after_str = balance_owner_after.toString(10);
                                let expected_balance_owner = balance_owner_before.plus(30000).minus(fee);
                                let expected_balance_owner_str = expected_balance_owner.toString(10);
                                assert.strictEqual(balance_owner_after_str,expected_balance_owner_str);
                        })
        })
        
})


