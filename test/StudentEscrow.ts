import { expect } from "chai";
import { ethers } from "hardhat";
import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("StudentEscrow", () => {
  async function setup() {
    const [arbiter, client, student, other] = await ethers.getSigners();
    const escrow = await (await ethers.getContractFactory("StudentEscrow")).deploy(arbiter.address);
    const now = await time.latest();
    const deadline = now + 7 * 86400;
    const review = 3 * 86400;
    const amount = ethers.parseEther("1");
    await escrow.connect(client).createJob(student.address, "Logo design", deadline, review, { value: amount });
    return { escrow, arbiter, client, student, other, deadline, review, amount };
  }

  it("locks funds on creation", async () => {
    const { escrow, amount } = await loadFixture(setup);
    expect(await ethers.provider.getBalance(await escrow.getAddress())).to.equal(amount);
    expect((await escrow.getJob(1)).status).to.equal(0);
  });

  it("rejects bad inputs", async () => {
    const { escrow, client, student, deadline, review } = await loadFixture(setup);
    await expect(escrow.connect(client).createJob(student.address, "x", deadline, review, { value: 0 })).to.be.reverted;
    await expect(escrow.connect(client).createJob(client.address, "x", deadline, review, { value: 1 })).to.be.reverted;
    await expect(escrow.connect(client).createJob(student.address, "x", 1, review, { value: 1 })).to.be.reverted;
  });

  it("happy path: submit -> approve pays the student", async () => {
    const { escrow, client, student, amount } = await loadFixture(setup);
    await escrow.connect(student).submitWork(1, "ipfs://demo");
    await expect(escrow.connect(client).approve(1)).to.changeEtherBalance(student, amount);
    expect((await escrow.getJob(1)).status).to.equal(2);
  });

  it("only the client can approve; only the student can submit", async () => {
    const { escrow, client, student, other } = await loadFixture(setup);
    await expect(escrow.connect(client).submitWork(1, "x")).to.be.revertedWithCustomError(escrow, "NotFreelancer");
    await escrow.connect(student).submitWork(1, "x");
    await expect(escrow.connect(student).approve(1)).to.be.revertedWithCustomError(escrow, "NotClient");
    await expect(escrow.connect(other).approve(1)).to.be.revertedWithCustomError(escrow, "NotClient");
  });

  it("auto-release protects student from ghosting client", async () => {
    const { escrow, student, amount, review } = await loadFixture(setup);
    await escrow.connect(student).submitWork(1, "ipfs://demo");
    await expect(escrow.connect(student).claimAfterReview(1)).to.be.revertedWithCustomError(escrow, "TooEarly");
    await time.increase(review + 1);
    await expect(escrow.connect(student).claimAfterReview(1)).to.changeEtherBalance(student, amount);
  });

  it("client refunds if student never delivers by deadline", async () => {
    const { escrow, client, amount, deadline } = await loadFixture(setup);
    await expect(escrow.connect(client).refundAfterDeadline(1)).to.be.revertedWithCustomError(escrow, "TooEarly");
    await time.increaseTo(deadline + 1);
    await expect(escrow.connect(client).refundAfterDeadline(1)).to.changeEtherBalance(client, amount);
  });

  it("cannot submit after deadline", async () => {
    const { escrow, student, deadline } = await loadFixture(setup);
    await time.increaseTo(deadline + 1);
    await expect(escrow.connect(student).submitWork(1, "late")).to.be.revertedWithCustomError(escrow, "TooLate");
  });

  it("student can decline and client is refunded", async () => {
    const { escrow, student, client, amount } = await loadFixture(setup);
    await expect(escrow.connect(student).declineJob(1)).to.changeEtherBalance(client, amount);
  });

  it("dispute: arbiter splits funds", async () => {
    const { escrow, arbiter, client, student, amount } = await loadFixture(setup);
    await escrow.connect(student).submitWork(1, "ipfs://demo");
    await escrow.connect(client).raiseDispute(1);
    await expect(escrow.connect(client).approve(1)).to.be.revertedWithCustomError(escrow, "WrongStatus");
    const half = amount / 2n;
    await expect(escrow.connect(arbiter).resolveDispute(1, half)).to.changeEtherBalances([student, client], [half, half]);
    expect((await escrow.getJob(1)).status).to.equal(5);
  });

  it("only arbiter resolves; share cannot exceed amount; outsiders cannot dispute", async () => {
    const { escrow, arbiter, client, other, amount } = await loadFixture(setup);
    await expect(escrow.connect(other).raiseDispute(1)).to.be.revertedWithCustomError(escrow, "NotParty");
    await escrow.connect(client).raiseDispute(1);
    await expect(escrow.connect(client).resolveDispute(1, 0)).to.be.revertedWithCustomError(escrow, "NotArbiter");
    await expect(escrow.connect(arbiter).resolveDispute(1, amount + 1n)).to.be.reverted;
  });

  it("cannot double-pay", async () => {
    const { escrow, client, student } = await loadFixture(setup);
    await escrow.connect(student).submitWork(1, "x");
    await escrow.connect(client).approve(1);
    await expect(escrow.connect(client).approve(1)).to.be.revertedWithCustomError(escrow, "WrongStatus");
    await expect(escrow.connect(student).claimAfterReview(1)).to.be.revertedWithCustomError(escrow, "WrongStatus");
  });

  it("tracks jobs per user", async () => {
    const { escrow, client, student } = await loadFixture(setup);
    expect(await escrow.getJobIdsOf(client.address)).to.deep.equal([1n]);
    expect(await escrow.getJobIdsOf(student.address)).to.deep.equal([1n]);
  });
});
