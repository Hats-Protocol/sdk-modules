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
import type {
  StakeResult,
  BeginUnstakeResult,
  CompleteUnstakeResult,
  SlashResult,
  ForgiveResult,
  WithdrawResult,
  ChangeMinStakeResult,
  ChangeJudgeHatResult,
  ChangeRecipientHatResult,
  ChangeCooldownPeriodResult,
  CreateInstanceResult,
} from "./types";
import { ABI } from "./abi";

export class StakingEligibilityClient {
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
    minStake,
    judgeHat,
    recipientHat,
    coolDownPeriod,
    token,
  }: {
    account: Account | Address;
    hatId: bigint;
    minStake: bigint;
    judgeHat: bigint;
    recipientHat: bigint;
    coolDownPeriod: bigint;
    token: Address;
  }): Promise<CreateInstanceResult> {
    if (this._walletClient === undefined) {
      throw new MissingWalletClientError(
        // eslint-disable-next-line prettier/prettier
        "Wallet client is required to perform this action"
      );
    }

    const initArgs = encodeAbiParameters(
      [
        { type: "uint248" },
        { type: "uint256" },
        { type: "uint256" },
        { type: "uint256" },
      ],
      // eslint-disable-next-line prettier/prettier
      [minStake, judgeHat, recipientHat, coolDownPeriod]
    );

    const otherImmutableArgs = encodePacked(["address"], [token]);

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
        abi: ABI,
        eventName: "StakingEligibility_Deployed",
        data: receipt.logs[0].data,
        topics: receipt.logs[0].topics,
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

  async stake({
    account,
    instance,
    amount,
  }: {
    account: Account | Address;
    instance: Address;
    amount: bigint;
  }): Promise<StakeResult> {
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
        functionName: "stake",
        args: [amount],
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

  async beginUnstake({
    account,
    instance,
    amount,
  }: {
    account: Account | Address;
    instance: Address;
    amount: bigint;
  }): Promise<BeginUnstakeResult> {
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
        functionName: "beginUnstake",
        args: [amount],
        account,
        chain: this._walletClient.chain,
      });

      const receipt = await this._publicClient.waitForTransactionReceipt({
        hash,
      });

      const event = decodeEventLog({
        abi: ABI,
        eventName: "StakingEligibility_UnstakeBegun",
        data: receipt.logs[0].data,
        topics: receipt.logs[0].topics,
      });

      return {
        status: receipt.status,
        transactionHash: receipt.transactionHash,
        cooldownEnd: event.args.cooldownEnd,
      };
    } catch (err) {
      throw new TransactionRevertedError("Transaction reverted");
    }
  }

  async completeUnstake({
    account,
    instance,
    staker,
  }: {
    account: Account | Address;
    instance: Address;
    staker: Address;
  }): Promise<CompleteUnstakeResult> {
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
        functionName: "completeUnstake",
        args: [staker],
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

  async slash({
    account,
    instance,
    staker,
  }: {
    account: Account | Address;
    instance: Address;
    staker: Address;
  }): Promise<SlashResult> {
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
        functionName: "slash",
        args: [staker],
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

  async forgive({
    account,
    instance,
    staker,
  }: {
    account: Account | Address;
    instance: Address;
    staker: Address;
  }): Promise<ForgiveResult> {
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
        functionName: "forgive",
        args: [staker],
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

  async withdraw({
    account,
    instance,
    recipient,
  }: {
    account: Account | Address;
    instance: Address;
    recipient: Address;
  }): Promise<WithdrawResult> {
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
        functionName: "withdraw",
        args: [recipient],
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

  async changeMinStake({
    account,
    instance,
    minStake,
  }: {
    account: Account | Address;
    instance: Address;
    minStake: bigint;
  }): Promise<ChangeMinStakeResult> {
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
        functionName: "changeMinStake",
        args: [minStake],
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

  async changeJudgeHat({
    account,
    instance,
    judgeHat,
  }: {
    account: Account | Address;
    instance: Address;
    judgeHat: bigint;
  }): Promise<ChangeJudgeHatResult> {
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
        functionName: "changeJudgeHat",
        args: [judgeHat],
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

  async changeRecipientHat({
    account,
    instance,
    recipientHat,
  }: {
    account: Account | Address;
    instance: Address;
    recipientHat: bigint;
  }): Promise<ChangeRecipientHatResult> {
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
        functionName: "changeRecipientHat",
        args: [recipientHat],
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

  async changeCooldownPeriod({
    account,
    instance,
    cooldownPeriod,
  }: {
    account: Account | Address;
    instance: Address;
    cooldownPeriod: bigint;
  }): Promise<ChangeCooldownPeriodResult> {
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
        functionName: "changeCooldownPeriod",
        args: [cooldownPeriod],
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

  async getToken(instance: Address): Promise<Address> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "TOKEN",
    });

    return result;
  }

  async getMinStake(instance: Address): Promise<bigint> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "minStake",
    });

    return result;
  }

  async getJudgeHat(instance: Address): Promise<bigint> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "judgeHat",
    });

    return result;
  }

  async getRecipientHat(instance: Address): Promise<bigint> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "recipientHat",
    });

    return result;
  }

  async getCooldownPeriod(instance: Address): Promise<bigint> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "cooldownPeriod",
    });

    return result;
  }

  async getStake({
    instance,
    staker,
  }: {
    instance: Address;
    staker: Address;
  }): Promise<{ stake: bigint; isSlashed: boolean }> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "stakes",
      args: [staker],
    });

    return { stake: result[0], isSlashed: result[1] };
  }

  async getCooldown({
    instance,
    staker,
  }: {
    instance: Address;
    staker: Address;
  }): Promise<{ amount: bigint; endsAt: bigint }> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "cooldowns",
      args: [staker],
    });

    return { amount: result[0], endsAt: result[1] };
  }

  async getTotalSlashedStakes(instance: Address): Promise<bigint> {
    const result = await this._publicClient.readContract({
      address: instance,
      abi: ABI,
      functionName: "totalSlashedStakes",
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
}
