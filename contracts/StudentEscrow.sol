// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title StudentEscrow
/// @notice Trustless escrow for student freelancers. A client locks native
///         tokens (MON on Monad Testnet) for a job; the student gets paid on
///         approval, auto-paid if the client ghosts, and disputes go to an arbiter.
contract StudentEscrow {
    enum Status {
        Funded,     // 0 - money locked, waiting for work
        Submitted,  // 1 - work delivered, waiting for client review
        Released,   // 2 - paid to freelancer
        Refunded,   // 3 - returned to client
        Disputed,   // 4 - frozen, arbiter decides
        Resolved    // 5 - arbiter split the funds
    }

    struct Job {
        uint256 id;
        address client;
        address freelancer;
        uint256 amount;
        uint64 deadline;      // freelancer must submit before this
        uint64 reviewPeriod;  // seconds client has to review before auto-release
        uint64 submittedAt;
        Status status;
        string title;
        string deliverable;   // link/IPFS hash submitted by freelancer
    }

    address public arbiter;
    uint256 public jobCount;
    uint256 public constant MIN_REVIEW_PERIOD = 1 minutes; // short for demos; use days in production

    mapping(uint256 => Job) private jobs;
    mapping(address => uint256[]) private userJobs;

    bool private locked;

    event JobCreated(uint256 indexed id, address indexed client, address indexed freelancer, uint256 amount, uint64 deadline, string title);
    event WorkSubmitted(uint256 indexed id, string deliverable);
    event PaymentReleased(uint256 indexed id, address indexed freelancer, uint256 amount, bool auto_);
    event Refunded(uint256 indexed id, address indexed client, uint256 amount);
    event DisputeRaised(uint256 indexed id, address indexed by);
    event DisputeResolved(uint256 indexed id, uint256 toFreelancer, uint256 toClient);
    event ArbiterChanged(address indexed newArbiter);

    error NotClient();
    error NotFreelancer();
    error NotArbiter();
    error NotParty();
    error WrongStatus(Status current);
    error InvalidInput(string reason);
    error TooEarly();
    error TooLate();
    error TransferFailed();
    error Reentrancy();

    modifier nonReentrant() {
        if (locked) revert Reentrancy();
        locked = true;
        _;
        locked = false;
    }

    constructor(address _arbiter) {
        if (_arbiter == address(0)) revert InvalidInput("arbiter=0");
        arbiter = _arbiter;
        emit ArbiterChanged(_arbiter);
    }

    // ───────────────────────── Client actions ─────────────────────────

    /// @notice Create a job and lock the payment (msg.value) in escrow.
    function createJob(
        address freelancer,
        string calldata title,
        uint64 deadline,
        uint64 reviewPeriod
    ) external payable returns (uint256 id) {
        if (msg.value == 0) revert InvalidInput("no funds");
        if (freelancer == address(0) || freelancer == msg.sender) revert InvalidInput("bad freelancer");
        if (deadline <= block.timestamp) revert InvalidInput("deadline in past");
        if (reviewPeriod < MIN_REVIEW_PERIOD) revert InvalidInput("review too short");
        if (bytes(title).length == 0 || bytes(title).length > 120) revert InvalidInput("title length");

        id = ++jobCount;
        jobs[id] = Job({
            id: id,
            client: msg.sender,
            freelancer: freelancer,
            amount: msg.value,
            deadline: deadline,
            reviewPeriod: reviewPeriod,
            submittedAt: 0,
            status: Status.Funded,
            title: title,
            deliverable: ""
        });
        userJobs[msg.sender].push(id);
        userJobs[freelancer].push(id);

        emit JobCreated(id, msg.sender, freelancer, msg.value, deadline, title);
    }

    /// @notice Client approves the delivered work and pays the freelancer.
    function approve(uint256 id) external nonReentrant {
        Job storage j = jobs[id];
        if (msg.sender != j.client) revert NotClient();
        if (j.status != Status.Submitted) revert WrongStatus(j.status);
        _release(j, false);
    }

    /// @notice Client reclaims funds if the freelancer never delivered by the deadline.
    function refundAfterDeadline(uint256 id) external nonReentrant {
        Job storage j = jobs[id];
        if (msg.sender != j.client) revert NotClient();
        if (j.status != Status.Funded) revert WrongStatus(j.status);
        if (block.timestamp <= j.deadline) revert TooEarly();
        _refund(j);
    }

    // ─────────────────────── Freelancer actions ───────────────────────

    /// @notice Freelancer delivers work (link / IPFS hash) before the deadline.
    function submitWork(uint256 id, string calldata deliverable) external {
        Job storage j = jobs[id];
        if (msg.sender != j.freelancer) revert NotFreelancer();
        if (j.status != Status.Funded) revert WrongStatus(j.status);
        if (block.timestamp > j.deadline) revert TooLate();
        if (bytes(deliverable).length == 0 || bytes(deliverable).length > 300) revert InvalidInput("deliverable length");

        j.deliverable = deliverable;
        j.submittedAt = uint64(block.timestamp);
        j.status = Status.Submitted;
        emit WorkSubmitted(id, deliverable);
    }

    /// @notice If the client ghosts after delivery, freelancer claims payment once the review window ends.
    function claimAfterReview(uint256 id) external nonReentrant {
        Job storage j = jobs[id];
        if (msg.sender != j.freelancer) revert NotFreelancer();
        if (j.status != Status.Submitted) revert WrongStatus(j.status);
        if (block.timestamp < uint256(j.submittedAt) + j.reviewPeriod) revert TooEarly();
        _release(j, true);
    }

    /// @notice Freelancer can decline an unstarted job; client is refunded.
    function declineJob(uint256 id) external nonReentrant {
        Job storage j = jobs[id];
        if (msg.sender != j.freelancer) revert NotFreelancer();
        if (j.status != Status.Funded) revert WrongStatus(j.status);
        _refund(j);
    }

    // ───────────────────────── Disputes ─────────────────────────

    /// @notice Either party can freeze the job while it is Funded or Submitted.
    function raiseDispute(uint256 id) external {
        Job storage j = jobs[id];
        if (msg.sender != j.client && msg.sender != j.freelancer) revert NotParty();
        if (j.status != Status.Funded && j.status != Status.Submitted) revert WrongStatus(j.status);
        j.status = Status.Disputed;
        emit DisputeRaised(id, msg.sender);
    }

    /// @notice Arbiter splits the escrow. freelancerAmount <= job amount; remainder goes to client.
    function resolveDispute(uint256 id, uint256 freelancerAmount) external nonReentrant {
        if (msg.sender != arbiter) revert NotArbiter();
        Job storage j = jobs[id];
        if (j.status != Status.Disputed) revert WrongStatus(j.status);
        if (freelancerAmount > j.amount) revert InvalidInput("share > amount");

        uint256 toClient = j.amount - freelancerAmount;
        j.status = Status.Resolved;
        emit DisputeResolved(id, freelancerAmount, toClient);

        if (freelancerAmount > 0) _send(j.freelancer, freelancerAmount);
        if (toClient > 0) _send(j.client, toClient);
    }

    function setArbiter(address newArbiter) external {
        if (msg.sender != arbiter) revert NotArbiter();
        if (newArbiter == address(0)) revert InvalidInput("arbiter=0");
        arbiter = newArbiter;
        emit ArbiterChanged(newArbiter);
    }

    // ───────────────────────── Views ─────────────────────────

    function getJob(uint256 id) external view returns (Job memory) {
        return jobs[id];
    }

    function getJobIdsOf(address user) external view returns (uint256[] memory) {
        return userJobs[user];
    }

    // ───────────────────────── Internals ─────────────────────────

    function _release(Job storage j, bool auto_) private {
        j.status = Status.Released;
        emit PaymentReleased(j.id, j.freelancer, j.amount, auto_);
        _send(j.freelancer, j.amount);
    }

    function _refund(Job storage j) private {
        j.status = Status.Refunded;
        emit Refunded(j.id, j.client, j.amount);
        _send(j.client, j.amount);
    }

    function _send(address to, uint256 amount) private {
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
