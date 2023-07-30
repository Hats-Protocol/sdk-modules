import {
  PublicClient,
  WalletClient,
  encodePacked,
  encodeAbiParameters,
  decodeEventLog,
} from "viem";
import type { Account, Address } from "viem";
import {
  MissingPublicClientError,
  ChainIdMismatchError,
  MissingWalletClientError,
  TransactionRevertedError,
} from "../../../errors";
import {
  HATS_MODULE_FACTORY,
  HATS_MODULE_FACTORY_ABI,
} from "../../../constants";
import { IMPLEMENTATION_ADDRESS } from "./constants";
import type { CreateInstanceResult, PullElectionResultsResult } from "./types";
import { ABI } from "./abi";

export class JokeraceEligibilityClient {
  private readonly _publicClient: PublicClient;
  private readonly _walletClient: WalletClient | undefined;

  constructor({
    publicClient,
    walletClient,
  }: {
    publicClient: PublicClient;
    walletClient?: WalletClient;
  }) {
    if (publicClient === undefined) {
      throw new MissingPublicClientError("Public client is required");
    }

    if (
      walletClient !== undefined &&
      walletClient.chain?.id !== publicClient.chain?.id
    ) {
      throw new ChainIdMismatchError(
        // eslint-disable-next-line prettier/prettier
        "Provided chain id should match the wallet client chain id"
      );
    }

    this._publicClient = publicClient;
    this._walletClient = walletClient;
  }

  /*//////////////////////////////////////////////////////////////
                      Deploy Instance
    //////////////////////////////////////////////////////////////*/

  async createInstance({
    account,
    hatId,
    contest,
    termEnd,
    topK,
    adminHat,
  }: {
    account: Account | Address;
    hatId: bigint;
    contest: Address;
    termEnd: bigint;
    topK: bigint;
    adminHat?: bigint;
  }): Promise<CreateInstanceResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        // eslint-disable-next-line prettier/prettier
        "Wallet client is required to perform this action"
      );
    }

    const initArgs = encodeAbiParameters(
      [{ type: "address" }, { type: "uint256" }, { type: "uint256" }],
      // eslint-disable-next-line prettier/prettier
      [contest, termEnd, topK]
    );

    const otherImmutableArgs = encodePacked(
      ["uint256"],
      // eslint-disable-next-line prettier/prettier
      [adminHat === undefined ? 0n : adminHat]
    );

    try {
      const hash = await this._walletClient.writeContract({
        address: HATS_MODULE_FACTORY,
        abi: HATS_MODULE_FACTORY_ABI,
        functionName: "createHatsModule",
        args: [IMPLEMENTATION_ADDRESS, hatId, otherImmutableArgs, initArgs],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      const event = decodeEventLog({
        abi: HATS_MODULE_FACTORY_ABI,
        eventName: "HatsModuleFactory_ModuleDeployed",
        data: receipt.logs[1].data,
        topics: receipt.logs[1].topics,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
        newInstance: event.args.instance,
      };
    } catch (err) {
      console.log(err);
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /*//////////////////////////////////////////////////////////////
                      Write Functions
    //////////////////////////////////////////////////////////////*/

  async pullElectionResults({
    account,
    instance,
  }: {
    account: Account | Address;
    instance: Address;
  }): Promise<PullElectionResultsResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        // eslint-disable-next-line prettier/prettier
        "Wallet client is required to perform this action"
      );
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: instance,
        abi: ABI,
        functionName: "pullElectionResults",
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      console.log(err);
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  async reelection({
    account,
    instance,
    newContest,
    newTermEnd,
    newTopK,
  }: {
    account: Account | Address;
    instance: Address;
    newContest: Address;
    newTermEnd: bigint;
    newTopK: bigint;
  }): Promise<PullElectionResultsResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        // eslint-disable-next-line prettier/prettier
        "Wallet client is required to perform this action"
      );
    }

    try {
      const hash = await this._walletClient.writeContract({
        address: instance,
        abi: ABI,
        functionName: "reelection",
        args: [newContest, newTermEnd, newTopK],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  /*//////////////////////////////////////////////////////////////
                      Read Functions
    //////////////////////////////////////////////////////////////*/

  async getAdminHat(instance: Address): Promise<bigint> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "ADMIN_HAT",
    });

    return result;
  }

  async getContest(instance: Address): Promise<Address> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "underlyingContest",
    });

    return result;
  }

  async getTermEnd(instance: Address): Promise<bigint> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "termEnd",
    });

    return result;
  }

  async getTopK(instance: Address): Promise<bigint> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "topK",
    });

    return result;
  }

  async getEligibilityPerContest({
    instance,
    wearer,
    contest,
  }: {
    instance: Address;
    wearer: Address;
    contest: Address;
  }): Promise<boolean> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "eligibleWearersPerContest",
      args: [wearer, contest],
    });

    return result;
  }

  async getWearerStatus({
    instance,
    wearer,
  }: {
    instance: Address;
    wearer: Address;
  }): Promise<{ eligible: boolean; standing: boolean }> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "getWearerStatus",
      args: [wearer, 0n],
    });

    return { eligible: result[0], standing: result[1] };
  }

  async isReelectionAllowd({
    instance,
  }: {
    instance: Address;
  }): Promise<boolean> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "reelectionAllowed",
    });

    return result;
  }
}
