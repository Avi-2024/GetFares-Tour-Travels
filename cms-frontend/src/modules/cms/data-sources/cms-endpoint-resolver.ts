import type { IHttpClient } from "../../../shared/interfaces/IHttp.interface";
import type { JsonRecord } from "../types/json-record.type";
import { CmsRecordAccessor } from "./cms-record-accessor";

interface CmsEndpointResult {
  path: string;
  data: JsonRecord[];
}

class CmsEndpointResolver {
  private readonly httpClient: IHttpClient;
  private readonly accessor: CmsRecordAccessor;

  constructor(
    httpClient: IHttpClient,
    accessor: CmsRecordAccessor = new CmsRecordAccessor(),
  ) {
    this.httpClient = httpClient;
    this.accessor = accessor;
  }

  public async tryGetFirst(paths: string[]): Promise<CmsEndpointResult | null> {
    for (const path of paths) {
      try {
        const payload = await this.httpClient.get<unknown>(path);
        const data = this.accessor.toArray(payload);
        return { path, data };
      } catch {
        // continue trying fallback paths
      }
    }
    return null;
  }
}

export type { CmsEndpointResult };
export { CmsEndpointResolver };
