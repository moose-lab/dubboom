// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title TranslationFund
/// @notice Community funding for AI video dubbing on Monad testnet.
///         A supporter locks test MON against a video hash and target language.
///         When the translation is ready, the operator (translation service)
///         marks it complete and receives the funds. If it is not completed,
///         the funder can refund.
contract TranslationFund {
    enum Status {
        None,
        Funded,
        Completed,
        Refunded
    }

    struct Request {
        address funder;
        bytes32 videoHash;
        string targetLanguage;
        uint256 amount;
        Status status;
        string resultUri;
    }

    address public operator;
    uint256 public nextId;
    mapping(uint256 => Request) public requests;

    event OperatorUpdated(address indexed operator);
    event Funded(
        uint256 indexed id,
        address indexed funder,
        bytes32 videoHash,
        string targetLanguage,
        uint256 amount
    );
    event Completed(uint256 indexed id, string resultUri, address indexed to, uint256 amount);
    event Refunded(uint256 indexed id, address indexed funder, uint256 amount);

    error ZeroAmount();
    error EmptyLanguage();
    error ZeroHash();
    error NotFunder();
    error NotOperator();
    error BadStatus();
    error TransferFailed();
    error ZeroOperator();

    modifier onlyOperator() {
        if (msg.sender != operator) revert NotOperator();
        _;
    }

    constructor(address operator_) {
        if (operator_ == address(0)) revert ZeroOperator();
        operator = operator_;
        emit OperatorUpdated(operator_);
    }

    function setOperator(address operator_) external onlyOperator {
        if (operator_ == address(0)) revert ZeroOperator();
        operator = operator_;
        emit OperatorUpdated(operator_);
    }

    function fund(bytes32 videoHash, string calldata targetLanguage)
        external
        payable
        returns (uint256 id)
    {
        if (msg.value == 0) revert ZeroAmount();
        if (videoHash == bytes32(0)) revert ZeroHash();
        if (bytes(targetLanguage).length == 0) revert EmptyLanguage();

        id = nextId++;
        requests[id] = Request({
            funder: msg.sender,
            videoHash: videoHash,
            targetLanguage: targetLanguage,
            amount: msg.value,
            status: Status.Funded,
            resultUri: ""
        });
        emit Funded(id, msg.sender, videoHash, targetLanguage, msg.value);
    }

    function complete(uint256 id, string calldata resultUri) external onlyOperator {
        Request storage request = requests[id];
        if (request.status != Status.Funded) revert BadStatus();

        request.status = Status.Completed;
        request.resultUri = resultUri;
        uint256 amount = request.amount;
        address to = operator;

        emit Completed(id, resultUri, to, amount);

        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }

    function refund(uint256 id) external {
        Request storage request = requests[id];
        if (request.status != Status.Funded) revert BadStatus();
        if (msg.sender != request.funder) revert NotFunder();

        request.status = Status.Refunded;
        uint256 amount = request.amount;
        address funder = request.funder;

        emit Refunded(id, funder, amount);

        (bool ok,) = funder.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
