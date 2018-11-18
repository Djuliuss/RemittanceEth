pragma solidity 0.4.24;

import "./Ownable.sol";
contract Pausable is Ownable {

    bool private stopSwitch;
    
    event LogStopSwitchSet(
	    address indexed authorizer,        
	    bool statusSwitch
    );
    
    modifier ifRunning {
        require(stopSwitch == false);
        _;
    }

    function getStopSwitch() public view returns (bool)   {return stopSwitch;}
    
    function setStopSwitch(bool _statusSwitch) onlyAdmin public {
        stopSwitch = _statusSwitch;
        emit LogStopSwitchSet(getOwner(), _statusSwitch);
    }

}

