import { createToaster } from "@chakra-ui/react";

// One store, one subscriber. There was previously a second `mobileToaster`
// that the rendered toaster switched to below 48em — but every call site in
// the app publishes to this one, so on a phone the subscriber was listening to
// a store nothing ever wrote to and no toast appeared at all. Failures looked
// exactly like successes: nothing happened.
export const toaster = createToaster({
  placement: "bottom-end",
  pauseOnPageIdle: true,
});
