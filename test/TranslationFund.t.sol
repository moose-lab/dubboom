// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {TranslationFund} from "../src/TranslationFund.sol";

contract TranslationFundTest is Test {
    TranslationFund internal fund;
    address internal operator = makeAddr("operator");
    address internal alice = makeAddr("alice");
    bytes32 internal videoHash = keccak256("demo-video");

    function setUp() public {
        fund = new TranslationFund(operator);
        vm.deal(alice, 10 ether);
    }

    function test_fundAndComplete() public {
        vm.prank(alice);
        uint256 id = fund.fund{value: 1 ether}(videoHash, "zh");
        assertEq(id, 0);
        assertEq(address(fund).balance, 1 ether);

        vm.prank(operator);
        fund.complete(id, "ipfs://result");
        assertEq(operator.balance, 1 ether);
        assertEq(address(fund).balance, 0);

        (address funder,, string memory lang, uint256 amount, TranslationFund.Status status, string memory uri) =
            fund.requests(id);
        assertEq(funder, alice);
        assertEq(lang, "zh");
        assertEq(amount, 1 ether);
        assertEq(uint256(status), uint256(TranslationFund.Status.Completed));
        assertEq(uri, "ipfs://result");
    }

    function test_refund() public {
        vm.prank(alice);
        uint256 id = fund.fund{value: 2 ether}(videoHash, "en");
        vm.prank(alice);
        fund.refund(id);
        assertEq(alice.balance, 10 ether);
        assertEq(address(fund).balance, 0);
    }

    function test_revertZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert(TranslationFund.ZeroAmount.selector);
        fund.fund{value: 0}(videoHash, "zh");
    }

    function test_onlyOperatorCanComplete() public {
        vm.prank(alice);
        uint256 id = fund.fund{value: 1 ether}(videoHash, "zh");
        vm.prank(alice);
        vm.expectRevert(TranslationFund.NotOperator.selector);
        fund.complete(id, "ipfs://x");
    }

    function test_onlyFunderCanRefund() public {
        vm.prank(alice);
        uint256 id = fund.fund{value: 1 ether}(videoHash, "zh");
        vm.prank(operator);
        vm.expectRevert(TranslationFund.NotFunder.selector);
        fund.refund(id);
    }
}
