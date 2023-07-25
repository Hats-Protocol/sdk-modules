import { StakingEligibilityClient } from "../src/index";
import { HatsClient } from "@hatsprotocol/sdk-v1-core";
import { TOKEN_ABI, TOEKN_BYTECODE } from "./erc20-test-token";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { goerli } from "viem/chains";
import type {
  PublicClient,
  WalletClient,
  Address,
  PrivateKeyAccount,
} from "viem";

describe("Staking Eligibility Tests", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  let stakingEligibilityClient: StakingEligibilityClient;
  let hatsClient: HatsClient;
  let address1: Address;
  let address2: Address;
  let account1: PrivateKeyAccount;
  let account2: PrivateKeyAccount;

  let topHat: bigint;
  let hat_1_1: bigint;

  let testToken: Address;
  let instance: Address;

  beforeAll(async () => {
    address1 = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    address2 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
    account1 = privateKeyToAccount(
      // eslint-disable-next-line prettier/prettier
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    );
    account2 = privateKeyToAccount(
      // eslint-disable-next-line prettier/prettier
      "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d"
    );

    // init Viem clients
    publicClient = createPublicClient({
      chain: goerli,
      transport: http("http://127.0.0.1:8545"),
    });
    walletClient = createWalletClient({
      chain: goerli,
      transport: http("http://127.0.0.1:8545"),
    });

    // init staking eligibility and hats clients
    stakingEligibilityClient = new StakingEligibilityClient({
      publicClient,
      walletClient,
    });
    hatsClient = new HatsClient({
      chainId: goerli.id,
      publicClient,
      walletClient,
    });

    // create a test tree with one child hat
    const mintTopHatResult = await hatsClient.mintTopHat({
      account: account1,
      target: address1,
      details: "Top hat",
      imageURI: "Top hat image URI",
    });
    topHat = mintTopHatResult.hatId;

    const createHatResult = await hatsClient.createHat({
      account: account1,
      admin: topHat,
      details: "Hat 1.1 details",
      maxSupply: 3,
      eligibility: address1,
      toggle: address1,
      mutable: true,
      imageURI: "Hat 1.1 image URI",
    });
    hat_1_1 = createHatResult.hatId;

    // create a test erc-20 staking token
    const testTokenTxHash = await walletClient.deployContract({
      abi: TOKEN_ABI,
      account: account1,
      bytecode: TOEKN_BYTECODE,
      chain: goerli,
      args: [address1, parseEther("1")],
    });
    const testTokenTxReceipt = await publicClient.waitForTransactionReceipt({
      hash: testTokenTxHash,
    });
    testToken = testTokenTxReceipt.contractAddress as Address;

    // create a new staking eligibility instance
    const createInstanceResult = await stakingEligibilityClient.createInstance({
      account: account1,
      hatId: hat_1_1,
      minStake: parseEther("0.5"),
      judgeHat: topHat,
      recipientHat: topHat,
      coolDownPeriod: 3600n,
      token: testToken,
    });
    instance = createInstanceResult.newInstance;
  }, 30000);

  test("Test new instance creation", async () => {
    expect(
      // eslint-disable-next-line prettier/prettier
      (await stakingEligibilityClient.getToken(instance)).toLowerCase()
    ).toBe(testToken);
    expect(
      // eslint-disable-next-line prettier/prettier
      await stakingEligibilityClient.getMinStake(instance)
    ).toBe(parseEther("0.5"));
    expect(
      // eslint-disable-next-line prettier/prettier
      await stakingEligibilityClient.getJudgeHat(instance)
    ).toBe(topHat);
    expect(
      // eslint-disable-next-line prettier/prettier
      await stakingEligibilityClient.getRecipientHat(instance)
    ).toBe(topHat);
    expect(
      // eslint-disable-next-line prettier/prettier
      await stakingEligibilityClient.getCooldownPeriod(instance)
    ).toBe(3600n);

    const wearerStatus = await stakingEligibilityClient.getWearerStatus({
      instance,
      wearer: address2,
    });
    expect(wearerStatus.eligible).toBe(false);
    expect(wearerStatus.standing).toBe(true);
  });

  describe("User stakes", () => {
    beforeAll(async () => {
      // user gets tokens to stake
      await walletClient.writeContract({
        address: testToken,
        abi: TOKEN_ABI,
        functionName: "transfer",
        account: account1,
        args: [address2, parseEther("0.6")],
        chain: goerli,
      });
      await walletClient.writeContract({
        address: testToken,
        abi: TOKEN_ABI,
        functionName: "approve",
        account: account2,
        args: [instance, parseEther("0.5")],
        chain: goerli,
      });
      await stakingEligibilityClient.stake({
        account: account2,
        instance,
        amount: parseEther("0.5"),
      });
    });

    test("Test staking successful", async () => {
      const stake = await stakingEligibilityClient.getStake({
        instance,
        staker: address2,
      });
      expect(stake.stake).toEqual(parseEther("0.5"));
      expect(stake.isSlashed).toEqual(false);

      const cooldown = await stakingEligibilityClient.getCooldown({
        instance,
        staker: address2,
      });
      expect(cooldown.amount).toEqual(parseEther("0"));
      expect(cooldown.endsAt).toEqual(0n);

      const totalSlashed = await stakingEligibilityClient.getTotalSlashedStakes(
        // eslint-disable-next-line prettier/prettier
        instance
      );
      expect(totalSlashed).toEqual(0n);

      const wearerStatus = await stakingEligibilityClient.getWearerStatus({
        instance,
        wearer: address2,
      });
      expect(wearerStatus.eligible).toBe(true);
      expect(wearerStatus.standing).toBe(true);
    });
  });
});
