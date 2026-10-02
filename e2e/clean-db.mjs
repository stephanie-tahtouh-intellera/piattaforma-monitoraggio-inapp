// DB E2E pulito a ogni esecuzione (T-001 su ambiente pulito); argomento facoltativo: cartella dedicata
import { rmSync } from "node:fs";
rmSync(process.argv[2] ?? ".data/e2e", { recursive: true, force: true });
