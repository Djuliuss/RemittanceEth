 pragma solidity 0.4.24;

  contract Ownable {
    address private owner;
    
    modifier  onlyAdmin {
        require(msg.sender == owner);   
         _;
    }
    
    constructor() public {
        owner = msg.sender;
    }

    function getOwner() public view returns (address)   {
        return owner;
    }
}
