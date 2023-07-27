import { info } from "./info";
import { ABI } from "./abi";
import { JokeraceEligibilityClient } from "./client";

export const JokeraceEligibilityInfo = {
  ...info,
  abi: ABI,
};

export { JokeraceEligibilityClient };
