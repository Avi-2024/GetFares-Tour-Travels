import type { IHttpClient } from "../../../shared/interfaces/IHttp.interface";
import { CmsSectionCatalog } from "../cms-section.catalog";
import { CmsTableCell } from "../models/cms-table-cell.model";
import { CmsTableRow } from "../models/cms-table-row.model";
import type { CmsSectionKey } from "../models/cms-section-key.type";
import type { CmsTableEntry } from "../types/cms-table-entry.type";
import type { JsonRecord } from "../types/json-record.type";
import { CmsRecordAccessor } from "./cms-record-accessor";

class CmsSectionEntryMapper {
  private readonly accessor: CmsRecordAccessor;
  private readonly httpClient: IHttpClient;

  constructor(
    httpClient: IHttpClient,
    accessor: CmsRecordAccessor = new CmsRecordAccessor(),
  ) {
    this.httpClient = httpClient;
    this.accessor = accessor;
  }

  public fallbackEntries(sectionKey: CmsSectionKey): CmsTableEntry[] {
    const section = CmsSectionCatalog.getByKey(sectionKey);
    return section.rows.map((row) => ({
      id: row.id,
      row,
      raw: {},
      readOnly: true,
    }));
  }

  public mapLandingEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");
      const updatedAt = this.accessor.getText(record, "updatedAt", "updated_at");
      const displayOrder =
        this.accessor.getNumber(record, "displayOrder", "display_order") ?? 0;

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          name: new CmsTableCell(this.accessor.getText(record, "name")),
          tag: new CmsTableCell(this.accessor.getText(record, "tag")),
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

  public mapDestinationEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");
      const hasSeo =
        this.accessor.getText(record, "metaTitle", "meta_title") !== "--" &&
        this.accessor.getText(record, "metaDescription", "meta_description") !==
          "--";

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          destination: new CmsTableCell(
            this.accessor.getText(record, "name", "title"),
          ),
          region: new CmsTableCell(this.accessor.getText(record, "region")),
          travelType: new CmsTableCell(
            this.accessor.getText(record, "travelType", "travel_type"),
          ),
          media: new CmsTableCell(
            this.accessor.getText(
              record,
              "mediaCount",
              "media_count",
              "galleryCount",
              "gallery_count",
            ),
          ),
          seo: new CmsTableCell(
            hasSeo ? "Ready" : "Missing Meta",
            hasSeo ? "success" : "warning",
          ),
          status: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
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

  public mapPublishedEntries(data: JsonRecord[]): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isPublished = this.accessor.getBoolean(
        record,
        "publishToWebsite",
        "publish_to_website",
      );

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          package: new CmsTableCell(
            this.accessor.getText(record, "name", "packageName"),
          ),
          destination: new CmsTableCell(this.accessor.getText(record, "destination")),
          duration: new CmsTableCell(this.accessor.getText(record, "duration")),
          price: new CmsTableCell(
            this.accessor.getText(
              record,
              "startingPrice",
              "starting_price",
              "price",
            ),
          ),
          crmState: new CmsTableCell(
            isPublished ? "Published" : "Draft",
            isPublished ? "success" : "warning",
          ),
          syncAt: new CmsTableCell(this.accessor.getText(record, "updatedAt", "updated_at")),
        }),
        readOnly: true,
      });
    }
    return entries;
  }

  public mapMainPackageEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }

      const displayOrder =
        this.accessor.getNumber(record, "displayOrder", "display_order") ?? 0;
      const featured = this.accessor.getBoolean(record, "isFeatured", "is_featured");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          mainPackage: new CmsTableCell(
            this.accessor.getText(record, "packageName", "name"),
          ),
          sourcePackage: new CmsTableCell(
            this.accessor.getText(record, "packageId", "package_id"),
          ),
          featured: new CmsTableCell(
            featured ? "Yes" : "No",
            featured ? "success" : "warning",
          ),
          linkedDestinations: new CmsTableCell(
            this.accessor.getText(
              record,
              "mappedDestinations",
              "destinationCount",
              "destination_count",
            ),
          ),
          displayOrder: new CmsTableCell(`#${displayOrder}`),
          updatedAt: new CmsTableCell(
            this.accessor.getText(record, "updatedAt", "updated_at"),
          ),
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

  public async mapSubPackageEntries(mainPath: string): Promise<CmsTableEntry[]> {
    const mainPayload = await this.httpClient.get<unknown>(mainPath);
    const mainPackages = this.accessor.toArray(mainPayload);
    const entries: CmsTableEntry[] = [];

    for (const mainPackage of mainPackages) {
      const mainId = this.accessor.getId(mainPackage);
      if (!mainId) {
        continue;
      }

      try {
        const subPayload = await this.httpClient.get<unknown>(`${mainPath}/${mainId}/sub`);
        const subPackages = this.accessor.toArray(subPayload);

        for (const subPackage of subPackages) {
          const id = this.accessor.getId(subPackage);
          if (!id) {
            continue;
          }
          const displayOrder =
            this.accessor.getNumber(subPackage, "displayOrder", "display_order") ??
            0;
          entries.push({
            id,
            raw: subPackage,
            row: new CmsTableRow(id, {
              variant: new CmsTableCell(
                this.accessor.getText(subPackage, "packageName", "name"),
              ),
              mainPackage: new CmsTableCell(
                this.accessor.getText(mainPackage, "packageName", "name"),
              ),
              duration: new CmsTableCell(this.accessor.getText(subPackage, "duration")),
              priceBand: new CmsTableCell(
                this.accessor.getText(subPackage, "startingPrice", "starting_price"),
              ),
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

  public mapVisaDestinationEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          country: new CmsTableCell(this.accessor.getText(record, "title", "name")),
          slug: new CmsTableCell(this.accessor.getText(record, "slug")),
          processingTime: new CmsTableCell(
            this.accessor.getText(record, "processingTime", "processing_time"),
          ),
          supportInfo: new CmsTableCell(
            this.accessor.getText(record, "supportInfo", "support_info"),
          ),
          heroReady: new CmsTableCell(
            this.accessor.getText(record, "heroImageUrl", "hero_image_url") !==
              "--"
              ? "Yes"
              : "No",
            this.accessor.getText(record, "heroImageUrl", "hero_image_url") !==
              "--"
              ? "success"
              : "warning",
          ),
          status: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
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

  public async mapVisaDetailEntries(visaBasePath: string): Promise<CmsTableEntry[]> {
    const visaPayload = await this.httpClient.get<unknown>(visaBasePath);
    const visaDestinations = this.accessor.toArray(visaPayload);
    const entries: CmsTableEntry[] = [];

    for (const destination of visaDestinations) {
      const destinationId = this.accessor.getId(destination);
      if (!destinationId) {
        continue;
      }
      try {
        const detailsPayload = await this.httpClient.get<unknown>(
          `${visaBasePath}/${destinationId}/details`,
        );
        const details = this.accessor.toArray(detailsPayload);
        for (const detail of details) {
          const detailId = this.accessor.getId(detail);
          if (!detailId) {
            continue;
          }

          entries.push({
            id: detailId,
            raw: detail,
            row: new CmsTableRow(detailId, {
              destination: new CmsTableCell(
                this.accessor.getText(destination, "title", "name"),
              ),
              sectionType: new CmsTableCell(
                this.accessor.getText(detail, "sectionType", "section_type"),
                "info",
              ),
              label: new CmsTableCell(this.accessor.getText(detail, "label")),
              value: new CmsTableCell(this.accessor.getText(detail, "value")),
              displayOrder: new CmsTableCell(
                `#${
                  this.accessor.getNumber(detail, "displayOrder", "display_order") ??
                  0
                }`,
              ),
              updatedAt: new CmsTableCell(
                this.accessor.getText(detail, "updatedAt", "updated_at"),
              ),
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

  public mapFeaturedEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }

      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");
      const originalPrice = this.accessor.getNumber(
        record,
        "originalPrice",
        "original_price",
      );
      const discountedPrice = this.accessor.getNumber(
        record,
        "discountedPrice",
        "discounted_price",
      );
      const priceHook =
        originalPrice !== null && discountedPrice !== null ?
          `${originalPrice} -> ${discountedPrice}`
        : this.accessor.getText(record, "priceHook", "price_hook", "duration");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          asset: new CmsTableCell(this.accessor.getText(record, "title", "name")),
          category: new CmsTableCell(this.accessor.getText(record, "category")),
          reference: new CmsTableCell(
            this.accessor.getText(
              record,
              "subtitle",
              "country",
              "referenceId",
              "reference_id",
            ),
          ),
          priceHook: new CmsTableCell(priceHook),
          badge: new CmsTableCell(
            this.accessor.getText(record, "badgeText", "badge_text"),
          ),
          status: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
        }),
        updatePath: `${basePath}/featured-picks/${id}`,
        deletePath: `${basePath}/featured-picks/${id}`,
        deleteMode: "delete",
        editableField: "title",
        readOnly: false,
      });
    }
    return entries;
  }

  public mapSeasonCardEntries(data: JsonRecord[], basePath: string): CmsTableEntry[] {
    const entries: CmsTableEntry[] = [];
    for (const record of data) {
      const id = this.accessor.getId(record);
      if (!id) {
        continue;
      }
      const isActive = this.accessor.getBoolean(record, "isActive", "is_active");

      entries.push({
        id,
        raw: record,
        row: new CmsTableRow(id, {
          cluster: new CmsTableCell(
            this.accessor.getText(record, "destinationName", "destination_name"),
          ),
          destinations: new CmsTableCell(this.accessor.getText(record, "title")),
          mainPackages: new CmsTableCell(
            this.accessor.getText(record, "fromMonth", "from_month"),
          ),
          subPackages: new CmsTableCell(
            this.accessor.getText(record, "toMonth", "to_month"),
          ),
          coverage: new CmsTableCell(this.accessor.getText(record, "tag"), "info"),
          status: new CmsTableCell(
            isActive ? "Active" : "Inactive",
            isActive ? "success" : "warning",
          ),
        }),
        updatePath: `${basePath}/season-cards/${id}`,
        deletePath: `${basePath}/season-cards/${id}`,
        deleteMode: "delete",
        editableField: "title",
        readOnly: false,
      });
    }
    return entries;
  }
}

export { CmsSectionEntryMapper };
