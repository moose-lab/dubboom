// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TranslationFund} from "../src/TranslationFund.sol";

contract DeployTranslationFund is Script {
    function run() external {
        address operator = vm.envOr("OPERATOR", msg.sender);
        vm.startBroadcast();
        TranslationFund fund = new TranslationFund(operator);
        vm.stopBroadcast();
        console.log("TranslationFund deployed at:", address(fund));
        console.log("Operator:", operator);
    }
}
