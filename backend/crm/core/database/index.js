import { createDatabaseConnection } from "./connection.js";

export { createDatabaseConnection };
export {
  isRelationalAdapter,
  supportsRawSql,
  isMysqlAdapter,
} from "./adapter-utils.js";
