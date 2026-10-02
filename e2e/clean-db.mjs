// DB E2E pulito a ogni esecuzione (T-001 su ambiente pulito)
import { rmSync } from "node:fs";
rmSync(".data/e2e", { recursive: true, force: true });
