import { JokeraceEligibilityClient } from "../src/index";
import { HatsClient } from "@hatsprotocol/sdk-v1-core";
import {
  createPublicClient,
  createWalletClient,
  createTestClient,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { goerli } from "viem/chains";
import type {
  PublicClient,
  WalletClient,
  Address,
  PrivateKeyAccount,
  TestClient,
} from "viem";
import { createAnvil } from "@viem/anvil";
import type { Anvil } from "@viem/anvil";
import "dotenv/config";

describe("Jokerace Eligibility Tests Scenario 1", () => {
  let publicClient: PublicClient;
  let walletClient: WalletClient;
  let testClient: TestClient;
  let jokeraceEligibilityClient: JokeraceEligibilityClient;
  let hatsClient: HatsClient;
  let address1: Address;
  let deployerAddress: Address;
  let deployerAccount: PrivateKeyAccount;

  let topHat: bigint;
  let hat_1_1: bigint;

  let instance: Address;

  let anvil: Anvil;

  beforeAll(async () => {
    anvil = createAnvil({
      forkUrl: process.env.GOERLI_RPC,
      forkBlockNumber: 9428126n,
    });
    await anvil.start();
    address1 = "0x1364D1285457DaAd2204deF721c19Df308f4069b";
    deployerAddress = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    deployerAccount = privateKeyToAccount(
      // eslint-disable-next-line prettier/prettier
      "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
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
    testClient = createTestClient({
      mode: "anvil",
      transport: http("http://127.0.0.1:8545"),
    });

    // init jokerace eligibility and hats clients
    jokeraceEligibilityClient = new JokeraceEligibilityClient({
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
      account: deployerAccount,
      target: deployerAddress,
      details: "Top hat",
      imageURI: "Top hat image URI",
    });
    topHat = mintTopHatResult.hatId;

    const createHatResult = await hatsClient.createHat({
      account: deployerAccount,
      admin: topHat,
      details: "Hat 1.1 details",
      maxSupply: 3,
      eligibility: address1,
      toggle: address1,
      mutable: true,
      imageURI: "Hat 1.1 image URI",
    });
    hat_1_1 = createHatResult.hatId;

    // create a new jokerace eligibility instance
    const createInstanceResult = await jokeraceEligibilityClient.createInstance(
      {
        account: deployerAccount,
        hatId: hat_1_1,
        contest: "0xdf4d8d1004c1afa1b68ab2dd76a85302c8aa67b6",
        termEnd: 1690803340n,
        topK: 1n,
        adminHat: topHat,
        // eslint-disable-next-line prettier/prettier
      }
    );
    instance = createInstanceResult.newInstance;
  }, 30000);

  test("Test new instance creation", async () => {
    expect(
      // eslint-disable-next-line prettier/prettier
      await jokeraceEligibilityClient.getAdminHat(instance)
    ).toBe(topHat);
    expect(
      // eslint-disable-next-line prettier/prettier
      (await jokeraceEligibilityClient.getContest(instance)).toLowerCase()
    ).toBe("0xdf4d8d1004c1afa1b68ab2dd76a85302c8aa67b6");
    expect(
      // eslint-disable-next-line prettier/prettier
      await jokeraceEligibilityClient.getTermEnd(instance)
    ).toBe(1690803340n);
    expect(
      // eslint-disable-next-line prettier/prettier
      await jokeraceEligibilityClient.getTopK(instance)
    ).toBe(1n);
    expect(
      // eslint-disable-next-line prettier/prettier
      await jokeraceEligibilityClient.getEligibilityPerContest({
        instance,
        wearer: address1,
        contest: "0xdf4d8d1004c1afa1b68ab2dd76a85302c8aa67b6",
        // eslint-disable-next-line prettier/prettier
      })
    ).toBe(false);

    const wearerStatus = await jokeraceEligibilityClient.getWearerStatus({
      instance,
      wearer: address1,
    });
    expect(wearerStatus.eligible).toBe(false);
    expect(wearerStatus.standing).toBe(true);
  });

  describe("Election ended", () => {
    beforeAll(async () => {
      const currentBlock = await publicClient.getBlock();
      if (currentBlock.timestamp < 1690638036n) {
        await testClient.setNextBlockTimestamp({
          timestamp: 1690638036n,
        });
      }

      await jokeraceEligibilityClient.pullElectionResults({
        account: deployerAccount,
        instance,
      });
    }, 30000);

    test("Test election results", async () => {
      const wearerStatus = await jokeraceEligibilityClient.getWearerStatus({
        instance,
        wearer: address1,
      });
      expect(wearerStatus.eligible).toBe(true);
      expect(wearerStatus.standing).toBe(true);
    });
  });

  describe("Reelection", () => {
    beforeAll(async () => {
      await testClient.setNextBlockTimestamp({
        timestamp: 1690803341n,
      });
      await jokeraceEligibilityClient.reelection({
        account: deployerAccount,
        instance,
        newContest: "0x0d253264d33a6d8afc4c5710a9acb8e4e592eb7c",
        newTermEnd: 1690803341n + 86400n,
        newTopK: 2n,
      });
    }, 30000);

    test("Test reelection", async () => {
      expect(
        // eslint-disable-next-line prettier/prettier
        (await jokeraceEligibilityClient.getContest(instance)).toLowerCase()
      ).toBe("0x0d253264d33a6d8afc4c5710a9acb8e4e592eb7c");
      expect(
        // eslint-disable-next-line prettier/prettier
        await jokeraceEligibilityClient.getTermEnd(instance)
      ).toBe(1690803341n + 86400n);
      expect(
        // eslint-disable-next-line prettier/prettier
        await jokeraceEligibilityClient.getTopK(instance)
      ).toBe(2n);
      expect(
        // eslint-disable-next-line prettier/prettier
        await jokeraceEligibilityClient.getEligibilityPerContest({
          instance,
          wearer: address1,
          contest: "0x0d253264d33a6d8afc4c5710a9acb8e4e592eb7c",
          // eslint-disable-next-line prettier/prettier
        })
      ).toBe(false);

      const wearerStatus = await jokeraceEligibilityClient.getWearerStatus({
        instance,
        wearer: address1,
      });
      expect(wearerStatus.eligible).toBe(false);
      expect(wearerStatus.standing).toBe(true);
    });
  });

  afterAll(async () => {
    await anvil.stop();
  }, 30000);
});
