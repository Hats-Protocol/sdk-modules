import { info } from "./info";
import { ABI } from "./abi";
import { StakingEligibilityClient } from "./client";

export const StakingEligibilityInfo = {
  ...info,
  abi: ABI,
};

export { StakingEligibilityClient };
