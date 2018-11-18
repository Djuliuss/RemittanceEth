pragma solidity 0.4.24;
import "./Pausable.sol";

  contract Remittance is Pausable {

    struct Payment { 
        address payer;
        address exchange;
        uint amount;
        uint timestampLimit;
    }
    mapping(bytes32 => Payment) public payments;

    uint constant defaultFee  = 30000;
    mapping (address => uint) public fees;
    uint public ownersFee;
    
    event LogCreatePayment (
          bytes32 indexed hashedPasswordPayee,
          address indexed  payer,
          address exchange,
          uint amount,
          uint fee
    );

    event LogProcessPayment (
        bytes32 indexed hashedPasswordPayee,
        address indexed exchange,
        uint amount
    );

    event LogWithdrawFees (
        address indexed owner,
        uint balance
    );

    event LogClaimPayment (
         bytes32 indexed hashedPasswordPayee,
         address indexed _payer,
         uint amount
    );
    
    function modifyFee (address customer, uint newFee) onlyAdmin public {
        fees[customer] = newFee;
    }

    function createPayment (address _payer, address _exchange, bytes32 _hashedPasswordPayee, uint _deadline) ifRunning 
                           payable public {
        require (payments[_hashedPasswordPayee].amount == 0 , "password already used"); 
        require ( _deadline <= 604800, "time limit can't be beyond one week");
        uint fee = fees[msg.sender]==0?defaultFee:fees[msg.sender];
        require(msg.value > fee, "fee needs to be lower than amount");
        ownersFee += fee;
        payments[_hashedPasswordPayee] = Payment(_payer,_exchange,msg.value-fee,block.timestamp + _deadline); 
        emit LogCreatePayment (_hashedPasswordPayee,_payer,_exchange,msg.value,fee);
    }
    
    function processPayment (bytes32 _hashedPasswordPayee) ifRunning public {
        Payment storage payment = payments[_hashedPasswordPayee];
        address exchange = payment.exchange; 
        uint transferAmount = payment.amount; 
        require (msg.sender == exchange , "Only the Exchange can execute process Payment function");
        require (now < payment.timestampLimit, "Current date is greater than time limit");
        require (transferAmount > 0, "Wrong password");
        delete(payments[_hashedPasswordPayee]);
        emit LogProcessPayment(_hashedPasswordPayee,exchange,transferAmount);
        exchange.transfer(transferAmount);
    }

    function claimPayment (bytes32 _hashedPasswordPayee) ifRunning public {
        Payment storage payment = payments[ _hashedPasswordPayee];
        uint transferAmount = payment.amount;
        require (now >= payment.timestampLimit, "Current date is lower than time limit");
        require (transferAmount > 0, "This payment was processed already");
        delete(payments[_hashedPasswordPayee]);
        emit LogClaimPayment (_hashedPasswordPayee,payment.payer,transferAmount);
        payment.payer.transfer(transferAmount);
    }
    
    function withdrawFees() onlyAdmin public {
        uint transferAmount = ownersFee; 
        require (transferAmount > 0,"no fees to withdraw");
        ownersFee = 0;
        address owner = getOwner();
        emit LogWithdrawFees(owner,transferAmount);
        owner.transfer(transferAmount);
    }  
    
    function hashPassword(bytes password) public pure returns (bytes32) {
        return keccak256(password);
    }
    
    function kill() onlyAdmin() public {
         selfdestruct(getOwner());
    }
    
}