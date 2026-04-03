import { serviceContainer } from "../../shared/core/service.container";
import type { IHttpClient } from "../../shared/interfaces/IHttp.interface";
import { CmsSectionCatalog } from "./cms-section.catalog";
import { CmsTableCell, CmsTableRow, type CmsSectionKey } from "./cms-section.models";

type JsonRecord = Record<string, unknown>;

type DeleteMode = "delete" | "softDeactivate";

interface CmsTableEntry {
  id: string;
  row: CmsTableRow;
  raw: JsonRecord;
  updatePath?: string;
  deletePath?: string;
  deleteMode?: DeleteMode;
  editableField?: string;
  readOnly: boolean;
}

class CmsDatasource {
  private readonly httpClient: IHttpClient;

  constructor(httpClient: IHttpClient = serviceContainer.getHttpClient()) {
    this.httpClient = httpClient;
  }

  private unwrapPayload(payload: unknown): unknown {
    if (!payload || typeof payload !== "object") {
      return payload;
    }

    const wrapped = payload as { data?: unknown };
    if ("data" in wrapped) {
      return wrapped.data;
    }
    return payload;
  }

  private toArray(payload: unknown): JsonRecord[] {
    const unwrapped = this.unwrapPayload(payload);
    if (Array.isArray(unwrapped)) {
      return unwrapped.filter(
        (item): item is JsonRecord =>
          typeof item === "object" && item !== null,
      );
    }
    return [];
  }

  private getText(record: JsonRecord, ...keys: string[]): string {
    for (const key of keys) {
      const value = record[key];
      if (value === null || value === undefined) {
        continue;
      }
      return String(value);
    }
    return "--";
  }

  private getNumber(record: JsonRecord, ...keys: string[]): number | null {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "number") {
        return value;
      }
      if (typeof value === "string" && value.trim()) {
        const parsed = Number(value);
        if (!Number.isNaN(parsed)) {
          return parsed;
        }
      }
    }
    return null;
  }

  private getBoolean(record: JsonRecord, ...keys: string[]): boolean {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "boolean") {
        return value;
      }
      if (typeof value === "string") {
        if (value.toLowerCase() === "true") {
          return true;
        }
        if (value.toLowerCase() === "false") {
          return false;
        }
      }
    }
    return false;
  }

  private getId(record: JsonRecord): string | null {
    const id = record.id;
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
    return null;
  }

  private async tryGetFirst(paths: string[]): Promise<{ path: string; data: JsonRecord[] } | null> {
    for (const path of paths) {
      try {
        const payload = await this.httpClient.get<unknown>(path);
        const data = this.toArray(payload);
        return { path, data };
      } catch {
        // continue trying fallback paths
      }
    }
    return null;
  }

  private fallbackEntries(sectionKey: CmsSectionKey): CmsTableEntry[] {
    const section = CmsSectionCatalog.getByKey(sectionKey);
    return section.rows.map((row) => ({
      id: row.id,
      row,
      raw: {},
      readOnly: true,
    }));
  }

  private mapLandingEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.getId(record);
      if (!id) {
        continue;
      }

      const isActive = this.getBoolean(record, "isActive", "is_active");
      const updatedAt = this.getText(record, "updatedAt", "updated_at");
      const displayOrder =
        this.getNumber(record, "displayOrder", "display_order") ?? 0;

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          name: new CmsTableCell(this.getText(record, "name")),
          tag: new CmsTableCell(this.getText(record, "tag")),
          displayOrder: new CmsTableCell(`#${displayOrder}`),
          isActive: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
          updatedAt: new CmsTableCell(updatedAt),
        }),
        updatePath: `${basePath}/${id}`,
        deletePath: `${basePath}/${id}`,
        deleteMode: "delete",
        editableField: "name",
        readOnly: false,
      });
    }
    return entries;
  }

  private mapDestinationEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.getId(record);
      if (!id) {
        continue;
      }

      const isActive = this.getBoolean(record, "isActive", "is_active");
      const hasSeo =
        this.getText(record, "metaTitle", "meta_title") !== "--" &&
        this.getText(record, "metaDescription", "meta_description") !== "--";

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          destination: new CmsTableCell(this.getText(record, "name", "title")),
          region: new CmsTableCell(this.getText(record, "region")),
          travelType: new CmsTableCell(this.getText(record, "travelType", "travel_type")),
          media: new CmsTableCell(
            this.getText(record, "mediaCount", "media_count", "galleryCount", "gallery_count"),
          ),
          seo: new CmsTableCell(hasSeo ? "Ready" : "Missing Meta", hasSeo ? "success" : "warning"),
          status: new CmsTableCell(isActive ? "Active" : "Inactive", isActive ? "success" : "warning"),
        }),
        updatePath: `${basePath}/${id}`,
        deletePath: `${basePath}/${id}`,
        deleteMode: "softDeactivate",
        editableField: "name",
        readOnly: false,
      });
    }
    return entries;
  }

  private mapPublishedEntries(data: JsonRecord[]): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.getId(record);
      if (!id) {
        continue;
      }

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          package: new CmsTableCell(this.getText(record, "name", "packageName")),
          destination: new CmsTableCell(this.getText(record, "destination")),
          duration: new CmsTableCell(this.getText(record, "duration")),
          price: new CmsTableCell(this.getText(record, "startingPrice", "starting_price", "price")),
          crmState: new CmsTableCell(
            this.getBoolean(record, "publishToWebsite", "publish_to_website")
              ? "Published"
              : "Draft",
            this.getBoolean(record, "publishToWebsite", "publish_to_website")
              ? "success"
              : "warning",
          ),
          syncAt: new CmsTableCell(this.getText(record, "updatedAt", "updated_at")),
        }),
        readOnly: true,
      });
    }
    return entries;
  }

  private mapMainPackageEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.getId(record);
      if (!id) {
        continue;
      }

      const displayOrder =
        this.getNumber(record, "displayOrder", "display_order") ?? 0;
      const featured = this.getBoolean(record, "isFeatured", "is_featured");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          mainPackage: new CmsTableCell(this.getText(record, "packageName", "name")),
          sourcePackage: new CmsTableCell(this.getText(record, "packageId", "package_id")),
          featured: new CmsTableCell(featured ? "Yes" : "No", featured ? "success" : "warning"),
          linkedDestinations: new CmsTableCell(this.getText(record, "mappedDestinations", "destinationCount", "destination_count")),
          displayOrder: new CmsTableCell(`#${displayOrder}`),
          updatedAt: new CmsTableCell(this.getText(record, "updatedAt", "updated_at")),
        }),
        updatePath: `${basePath}/${id}`,
        deletePath: `${basePath}/${id}`,
        deleteMode: "delete",
        editableField: "displayOrder",
        readOnly: false,
      });
    }
    return entries;
  }

  private async mapSubPackageEntries(mainPath: string): Promise<CmsTableEntry[]> {
    const mainPayload = await this.httpClient.get<unknown>(mainPath);
    const mainPackages = this.toArray(mainPayload);
    const entries: CmsTableEntry[] = [];

    for (const mainPackage of mainPackages) {
      const mainId = this.getId(mainPackage);
      if (!mainId) {
        continue;
      }

      try {
        const subPayload = await this.httpClient.get<unknown>(`${mainPath}/${mainId}/sub`);
        const subPackages = this.toArray(subPayload);

        for (const subPackage of subPackages) {
          const id = this.getId(subPackage);
          if (!id) {
            continue;
          }

          const displayOrder =
            this.getNumber(subPackage, "displayOrder", "display_order") ?? 0;

          entries.push({
            id,
            raw: subPackage,
            row: new CmsTableRow(id, {
              variant: new CmsTableCell(this.getText(subPackage, "packageName", "name")),
              mainPackage: new CmsTableCell(this.getText(mainPackage, "packageName", "name")),
              duration: new CmsTableCell(this.getText(subPackage, "duration")),
              priceBand: new CmsTableCell(this.getText(subPackage, "startingPrice", "starting_price")),
              displayOrder: new CmsTableCell(`#${displayOrder}`),
              status: new CmsTableCell("Active", "success"),
            }),
            updatePath: `${mainPath.replace("/main", "/sub")}/${id}`,
            deletePath: `${mainPath.replace("/main", "/sub")}/${id}`,
            deleteMode: "delete",
            editableField: "displayOrder",
            readOnly: false,
          });
        }
      } catch {
        // continue with next package
      }
    }

    return entries;
  }

  private mapVisaDestinationEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.getId(record);
      if (!id) {
        continue;
      }

      const isActive = this.getBoolean(record, "isActive", "is_active");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          country: new CmsTableCell(this.getText(record, "title", "name")),
          slug: new CmsTableCell(this.getText(record, "slug")),
          processingTime: new CmsTableCell(this.getText(record, "processingTime", "processing_time")),
          supportInfo: new CmsTableCell(this.getText(record, "supportInfo", "support_info")),
          heroReady: new CmsTableCell(
            this.getText(record, "heroImageUrl", "hero_image_url") !== "--" ? "Yes" : "No",
            this.getText(record, "heroImageUrl", "hero_image_url") !== "--" ? "success" : "warning",
          ),
          status: new CmsTableCell(isActive ? "Active" : "Inactive", isActive ? "success" : "warning"),
        }),
        updatePath: `${basePath}/${id}`,
        deletePath: `${basePath}/${id}`,
        deleteMode: "delete",
        editableField: "title",
        readOnly: false,
      });
    }
    return entries;
  }

  private async mapVisaDetailEntries(visaBasePath: string): Promise<CmsTableEntry[]> {
    const visaPayload = await this.httpClient.get<unknown>(visaBasePath);
    const visaDestinations = this.toArray(visaPayload);
    const entries: CmsTableEntry[] = [];

    for (const destination of visaDestinations) {
      const destinationId = this.getId(destination);
      if (!destinationId) {
        continue;
      }

      try {
        const detailsPayload = await this.httpClient.get<unknown>(
          `${visaBasePath}/${destinationId}/details`,
        );
        const details = this.toArray(detailsPayload);

        for (const detail of details) {
          const detailId = this.getId(detail);
          if (!detailId) {
            continue;
          }

          entries.push({
            id: detailId,
            raw: detail,
            row: new CmsTableRow(detailId, {
              destination: new CmsTableCell(this.getText(destination, "title", "name")),
              sectionType: new CmsTableCell(this.getText(detail, "sectionType", "section_type"), "info"),
              label: new CmsTableCell(this.getText(detail, "label")),
              value: new CmsTableCell(this.getText(detail, "value")),
              displayOrder: new CmsTableCell(
                `#${this.getNumber(detail, "displayOrder", "display_order") ?? 0}`,
              ),
              updatedAt: new CmsTableCell(this.getText(detail, "updatedAt", "updated_at")),
            }),
            updatePath: `${visaBasePath}/${destinationId}/details/${detailId}`,
            deletePath: `${visaBasePath}/${destinationId}/details/${detailId}`,
            deleteMode: "delete",
            editableField: "value",
            readOnly: false,
          });
        }
      } catch {
        // continue with next destination
      }
    }

    return entries;
  }

  public async list(sectionKey: CmsSectionKey): Promise<CmsTableEntry[]> {
    try {
      if (sectionKey === "landing-places") {
        const result = await this.tryGetFirst([
          "/api/cms/landing-places",
          "/cms/landing-places",
          "/cms",
        ]);
        if (result) {
          return this.mapLandingEntries(result.data, result.path);
        }
      }

      if (sectionKey === "destinations") {
        const result = await this.tryGetFirst([
          "/api/cms/destinations",
          "/cms/destinations",
        ]);
        if (result) {
          return this.mapDestinationEntries(result.data, result.path);
        }
      }

      if (sectionKey === "published-packages") {
        const result = await this.tryGetFirst([
          "/api/cms/packages/published",
          "/cms/packages/published",
        ]);
        if (result) {
          return this.mapPublishedEntries(result.data);
        }
      }

      if (sectionKey === "main-packages") {
        const result = await this.tryGetFirst([
          "/api/cms/packages/main",
          "/cms/packages/main",
        ]);
        if (result) {
          return this.mapMainPackageEntries(result.data, result.path);
        }
      }

      if (sectionKey === "sub-packages") {
        const result = await this.tryGetFirst([
          "/api/cms/packages/main",
          "/cms/packages/main",
        ]);
        if (result) {
          return this.mapSubPackageEntries(result.path);
        }
      }

      if (sectionKey === "visa-destinations") {
        const result = await this.tryGetFirst([
          "/api/cms/visa-destinations",
          "/cms/visa-destinations",
          "/cms/visa",
        ]);
        if (result) {
          return this.mapVisaDestinationEntries(result.data, result.path);
        }
      }

      if (sectionKey === "visa-details") {
        const result = await this.tryGetFirst([
          "/api/cms/visa-destinations",
          "/cms/visa-destinations",
          "/cms/visa",
        ]);
        if (result) {
          return this.mapVisaDetailEntries(result.path);
        }
      }
    } catch {
      // fall through to static catalog rows
    }

    return this.fallbackEntries(sectionKey);
  }

  public async create(sectionKey: CmsSectionKey, payload: JsonRecord): Promise<void> {
    if (sectionKey === "landing-places") {
      await this.httpClient.post("/api/cms/landing-places", payload).catch(() =>
        this.httpClient.post("/cms/landing-places", payload).catch(() =>
          this.httpClient.post("/cms", payload),
        ),
      );
      return;
    }

    if (sectionKey === "destinations") {
      await this.httpClient.post("/api/cms/destinations", payload).catch(() =>
        this.httpClient.post("/cms/destinations", payload),
      );
      return;
    }

    if (sectionKey === "main-packages") {
      await this.httpClient.post("/api/cms/packages/main", payload).catch(() =>
        this.httpClient.post("/cms/packages/main", payload),
      );
      return;
    }

    if (sectionKey === "sub-packages") {
      await this.httpClient.post("/api/cms/packages/sub", payload).catch(() =>
        this.httpClient.post("/cms/packages/sub", payload),
      );
      return;
    }

    if (sectionKey === "visa-destinations") {
      await this.httpClient.post("/api/cms/visa-destinations", payload).catch(() =>
        this.httpClient.post("/cms/visa-destinations", payload).catch(() =>
          this.httpClient.post("/cms/visa", payload),
        ),
      );
      return;
    }

    if (sectionKey === "visa-details") {
      const visaDestinationId = String(
        payload.visaDestinationId ?? payload.visa_destination_id ?? "",
      );
      if (!visaDestinationId) {
        throw new Error("visaDestinationId is required in payload.");
      }

      await this.httpClient
        .post(`/api/cms/visa-destinations/${visaDestinationId}/details`, payload)
        .catch(() =>
          this.httpClient.post(`/cms/visa-destinations/${visaDestinationId}/details`, payload).catch(() =>
            this.httpClient.post(`/cms/visa/${visaDestinationId}/details`, payload),
          ),
        );
      return;
    }

    throw new Error("Create is not supported for this section yet.");
  }

  public async update(
    sectionKey: CmsSectionKey,
    entry: CmsTableEntry,
    value: string,
  ): Promise<void> {
    if (!entry.updatePath || entry.readOnly) {
      throw new Error("This row is read-only.");
    }

    if (sectionKey === "main-packages" || sectionKey === "sub-packages") {
      const displayOrder = Number(value);
      if (Number.isNaN(displayOrder)) {
        throw new Error("Display order must be a number.");
      }
      await this.httpClient.put(entry.updatePath, { displayOrder });
      return;
    }

    if (sectionKey === "visa-details") {
      await this.httpClient.put(entry.updatePath, { value });
      return;
    }

    if (sectionKey === "visa-destinations") {
      await this.httpClient.put(entry.updatePath, { title: value });
      return;
    }

    if (sectionKey === "destinations") {
      await this.httpClient.put(entry.updatePath, { name: value });
      return;
    }

    await this.httpClient.put(entry.updatePath, { name: value });
  }

  public async remove(sectionKey: CmsSectionKey, entry: CmsTableEntry): Promise<void> {
    if (entry.readOnly) {
      throw new Error("This row is read-only.");
    }

    if (!entry.deletePath) {
      throw new Error("Delete path is unavailable for this row.");
    }

    if (sectionKey === "destinations" || entry.deleteMode === "softDeactivate") {
      await this.httpClient.put(entry.deletePath, { isActive: false });
      return;
    }

    await this.httpClient.delete(entry.deletePath);
  }
}

const cmsDatasource = new CmsDatasource();

export type { CmsTableEntry };
export { CmsDatasource, cmsDatasource };
