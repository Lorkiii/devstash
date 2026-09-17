import { z } from "zod";

// Configure Zod before schemas are created so its eval probe stays out of strict CSPs.
z.config({ jitless: true });

export { z };
