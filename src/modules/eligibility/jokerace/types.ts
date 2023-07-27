import type { Address } from "viem";
import type { TransactionResult } from "../../../types";

export interface CreateInstanceResult extends TransactionResult {
  newInstance: Address;
}

export interface PullElectionResultsResult extends TransactionResult {}
